const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endraid')
        .setDescription('End current raid'),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const activeRaid = await manager.getActiveRaid(guild);
        if (!activeRaid) {
            await interaction.reply(':prohibited: There is no active raid', { ephemeral: true });
            return;
        }
        await manager.endRaid(guild);

        await interaction.reply(`Raid ${activeRaid.name} ended`, { ephemeral: true });
        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};

        const log = await manager.getRaidDKPMovements(guild, activeRaid._id);
        const logMessage = await Promise.all(log.map(async (entry) => {
            const player = entry.player ? await interaction.guild.members.fetch(entry.player) : 'All present';
            const action = entry.dkps > 0 ? 'Added' : 'Removed';
            return `<t:${Math.floor(entry.date / 1000)}:t> ${action} ${entry.dkps} dkps to *${player}* - ${entry.comment}`;
        }));

        logger.sendRaidEndEmbed(guildConfig, activeRaid, logMessage);
    },
    restricted: true,
};