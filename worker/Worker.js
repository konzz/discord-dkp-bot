const Logger = require('../utils/Logger');
const Auction = require('../Auctioner/Auction');
const log = require('../debugger.js');

module.exports = class Worker {
    constructor(client, manager) {
        this.client = client;
        this.manager = manager;
        this.logger = new Logger(client);
    }

    async start() {
        console.log('Worker started');
        this.fastInterval = setInterval(() => this.runFastTasks(), 10000); // 10 seconds
        this.slowInterval = setInterval(() => this.runSlowTasks(), 60 * 60 * 1000); // 1 hour
    }

    stop() {
        console.log('Worker stopped');
        clearInterval(this.fastInterval);
        clearInterval(this.slowInterval);
    }

    async tick(guildOptions, raid) {
        let discordGuild;
        try {
            discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        }
        catch (error) {
            console.log(`Error fetching guild ${guildOptions.guild} for raid: ${raid.name}`);
            this.manager.endRaid(guildOptions.guild);
            return;
        }
        const raidChannel = await discordGuild.channels.fetch(guildOptions.raidChannel);
        const playersInChannel = [...raidChannel.members.keys()];

        let playersInSecondChannel = [];
        const secondRaidChannel = guildOptions.secondRaidChannel;
        if (secondRaidChannel) {
            const secondChannel = await discordGuild.channels.fetch(secondRaidChannel);
            playersInSecondChannel = [...secondChannel.members.keys()];
        }

        playersInChannel.forEach(async player => {
            await this.manager.addDKP(guildOptions.guild, player, raid.dkpsPerTick, 'Tick', raid);
        });

        playersInSecondChannel.forEach(async player => {
            await this.manager.addDKP(guildOptions.guild, player, raid.dkpsPerTick, 'Tick', raid);
        });

        await this.manager.addRaidAttendance(guildOptions.guild, raid, [...playersInChannel, ...playersInSecondChannel], 'Tick', raid.dkpsPerTick);

        this.logger.sendRaidEmebed(guildOptions, raid, [...playersInChannel, ...playersInSecondChannel], 3447003, `${raid.name} raid *tick*`);
    }

    async deprecateRaids(guilds) {
        for (const guildOptions of guilds) {
            const time = new Date().getTime() - guildOptions.raidDeprecationTime;
            await this.manager.deprecateOldRaids(guildOptions.guild, time);
        }
    }

    async processRaids(guilds) {
        for (const guildOptions of guilds) {
            const raid = await this.manager.getActiveRaid(guildOptions.guild);

            if (!raid) {
                continue;
            }

            const enoughTimePassedSinceLastTick = raid.attendance.length === 0 || raid.attendance[raid.attendance.length - 1].date + raid.tickDuration < new Date().getTime();
            if (enoughTimePassedSinceLastTick) {
                this.tick(guildOptions, raid);
            }
        }
    }

    async processAuctions(guilds) {
        for (const guildOptions of guilds) {
            const activeAuctions = await this.manager.getActiveAuctions(guildOptions.guild);
            const finishedActiveAuctions = activeAuctions.filter(auction => auction.auctionEnd < new Date().getTime());
            const unFinishedActiveAuctions = activeAuctions.filter(auction => auction.auctionEnd > new Date().getTime());
            unFinishedActiveAuctions.forEach(auction => {
                this.logger.updateLongAuctionEmbed(guildOptions, auction);
            });

            finishedActiveAuctions.forEach(async auctionData => {
                //instantaite a new auction from ../Auctioner/Auction.js
                const auction = new Auction(auctionData.guild, auctionData.item, auctionData.minBid, auctionData.numberOfItems, auctionData.minBidToLockForMain, auctionData.overBidtoWinMain);
                auction.bids = auctionData.bids;
                const players = await Promise.all(auction.bids.map(async bid => await this.manager.getPlayer(auctionData.guild, bid.player, false)));
                const w = auction.calculateWinner(players);
                auctionData.winners = [];
                if (w) {
                    auctionData.winners = w.length ? w : [w];
                }
                log('Auction ended', {
                    guild: auctionData.guild,
                    item: auctionData.item.name,
                });
                await this.manager.endAuction(guildOptions.guild, auctionData._id);
                this.logger.updateLongAuctionEmbed(guildOptions, auctionData);
            });
        }
    }

    async runFastTasks() {
        const guilds = await this.manager.guildOptions.find({}).toArray();
        await this.processRaids(guilds);
        await this.processAuctions(guilds);
    }

    async runSlowTasks() {
        const guilds = await this.manager.guildOptions.find({}).toArray();
        await this.deprecateRaids(guilds);
    }
}