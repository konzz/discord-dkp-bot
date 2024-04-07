const Logger = require('../utils/Logger');

module.exports = class Worker {
    constructor(client, manager) {
        this.client = client;
        this.manager = manager;
        this.logger = new Logger(client);
    }

    async start() {
        console.log('Worker started');
        this.interval = setInterval(() => this.run(), 30000);
    }

    stop() {
        console.log('Worker stopped');
        clearInterval(this.interval);
    }

    async tick(guildOptions, raid) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const raidChannel = await discordGuild.channels.fetch(guildOptions.raidChannel);
        const playersInChannel = [...raidChannel.members.keys()];

        await this.manager.updateRaidAttendance(guildOptions.guild, raid, playersInChannel, 'Tick', raid.dkpsPerTick);
        playersInChannel.forEach(async player => {
            await this.manager.addDKP(guildOptions.guild, player, raid.dkpsPerTick, 'Tick', raid);
        });

        this.logger.sendRaidEmebed(guildOptions, raid, playersInChannel, 3447003, `${raid.name} raid Tick`);
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


    async run() {
        const guilds = await this.manager.guildOptions.find({}).toArray();
        await this.processRaids(guilds);
        await this.deprecateRaids(guilds);
    }
}