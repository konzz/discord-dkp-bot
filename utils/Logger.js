module.exports = class Worker {
    constructor(client) {
        this.client = client;
    }

    async sendRaidEmebed(guildOptions, raid, playersInChannel, color, title, logMessage = null) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const logChannel = discordGuild.channels.cache.get(guildOptions.logChannel);

        if (!logChannel) {
            return;
        }

        const players = await Promise.all(playersInChannel.map(async p => {
            const player = await discordGuild.members.fetch(p);
            return `- ${player.nickname || player.user.globalName}`;
        }));

        const totalPlayers = players.length;

        const playerChunks = [];
        while (players.length) {
            playerChunks.push(players.splice(0, 15));
        }

        const playerFields = playerChunks.map((chunk, index) => {
            const name = index == 0 ? `Players (${totalPlayers})` : '\u200B';
            return {
                name,
                value: chunk.join('\n'),
                inline: true
            }
        })

        const log = logMessage ? [{ name: 'Log', value: logMessage.join('\n') }] : [];

        await logChannel
            .send({
                embeds: [{
                    color: color,
                    title,
                    fields: [
                        { name: "Time", value: `<t:${Math.floor(new Date().getTime() / 1000)}:t>`, inline: true },
                        { name: "DKPs", value: raid.dkpsPerTick, inline: true },
                        { name: '\u200B', value: '\u200B' },
                        ...playerFields,
                        ...log,

                    ],
                }]
            })
    }

    async sendRaidEndEmbed(guildOptions, raid, logMessage) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const logChannel = discordGuild.channels.cache.get(guildOptions.logChannel);

        if (!logChannel) {
            return;
        }
        const now = new Date().getTime();

        await logChannel
            .send({
                embeds: [{
                    color: 15277667,
                    title: `${raid.name} raid Ended`,
                    fields: [
                        { name: "Date", value: `<t:${Math.floor(now / 1000)}:d> <t:${Math.floor(now / 1000)}:t>` },
                        { name: "Log", value: logMessage.join('\n') }
                    ]
                }]
            })
    }
}