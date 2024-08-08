const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endraid')
        .setDescription('End current raid'),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const activeRaid = await manager.getActiveRaid(guild);
        if (!activeRaid) {
            await interaction.reply({ content: ':prohibited: There is no active raid', ephemeral: true });
            return;
        }
        await manager.endRaid(guild);

        await interaction.reply({ content: `Raid ${activeRaid.name} ended`, ephemeral: true });
        const guildConfig = await manager.getGuildOptions(guild) || {};
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
    },
    restricted: true,
};