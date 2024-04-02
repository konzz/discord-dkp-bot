const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('endraid')
        .setDescription('End current raid'),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const activeRaid = await manager.getActiveRaid(guild);
        if (!activeRaid) {
            await interaction.reply('There is no active raid');
            return;
        }
        await manager.endRaid(guild);

        await interaction.reply(`Raid ${activeRaid.name} ended`);
    },
    restricted: true,
};