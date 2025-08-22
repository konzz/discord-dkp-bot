const { SlashCommandBuilder } = require('discord.js');
const { processRaidHelperEventDKP } = require('../utils/raidHelperUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endraid')
        .setDescription('End current raid'),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const guildConfig = await manager.getGuildOptions(guild) || {};

        const activeRaid = await manager.getActiveRaid(guild);
        if (!activeRaid) {
            await interaction.reply({ content: ':prohibited: There is no active raid', ephemeral: true });
            return;
        }
        await manager.endRaid(guild);

        await interaction.reply({ content: `Raid ${activeRaid.name} ended`, ephemeral: true });
        const raidChannel = await interaction.guild.channels.fetch(guildConfig.raidChannel);
        const playersInChannel = [...raidChannel.members.keys()];

        let playersInSecondChannel = [];
        const secondRaidChannel = guildConfig.secondRaidChannel;
        if (secondRaidChannel) {
            const secondChannel = await interaction.guild.channels.fetch(secondRaidChannel);
            playersInSecondChannel = [...secondChannel.members.keys()];
        }

        await manager.addRaidAttendance(guild, activeRaid, [...playersInChannel, ...playersInSecondChannel], 'End', 0);

        const log = await manager.getRaidDKPMovements(guild, activeRaid._id);
        const logMessage = await Promise.all(log.map(async (entry) => {
            const player = entry.player ? await interaction.guild.members.fetch(entry.player) : '';
            if (player && entry.item) {
                return `<t:${Math.floor(entry.date / 1000)}:t> *${player}* won [${entry.item.name}](${entry.item.url}) for ${Math.abs(entry.dkps)} dkps`;
            }
            if (player) {
                return `<t:${Math.floor(entry.date / 1000)}:t> *${player}* ${entry.dkps > 0 ? 'gained' : 'lost'} ${Math.abs(entry.dkps)} dkps *${entry.comment}*`;
            }

            return `<t:${Math.floor(entry.date / 1000)}:t> *${entry.comment}*`;
        }));

        logger.sendRaidEndEmbed(guildConfig, activeRaid, logMessage);

        if (activeRaid.eventId) {

            const logChannel = await interaction.guild.channels.fetch(guildConfig.logChannel);
            const result = await processRaidHelperEventDKP({
                guild,
                raidId: activeRaid._id,
                eventId: activeRaid.eventId,
                dkp: 5,
                manager,
                guildInstance: interaction.guild,
                logger,
                logChannel
            })
        }

    },
    restricted: true,
};