const Logger = require('../utils/Logger');

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
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
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

            const enoughTimePassedSinceLastTick = raid.attendance[raid.attendance.length - 1].date + raid.tickDuration < new Date().getTime();
            if (enoughTimePassedSinceLastTick) {
                this.tick(guildOptions, raid);
            }
        }
    }


    async runFastTasks() {
        const guilds = await this.manager.guildOptions.find({}).toArray();
        await this.processRaids(guilds);

    }

    async runSlowTasks() {
        const guilds = await this.manager.guildOptions.find({}).toArray();
        await this.deprecateRaids(guilds);
    }
}