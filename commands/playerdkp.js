require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playerdkp')
        .setDescription('Shows the DKP of a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
    async execute(interaction, manager) {
        interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player') || interaction.user;

        if (process.env.LOG_LEVEL === 'DEBUG') {
            console.log(`Executed playerdkp command with player: ${player.id}`);
        }

        try {
            const currentDKP = await manager.getPlayerDKP(guild, player.id);
            await interaction.editReply({ content: '` ' + currentDKP + ' ` DKP', ephemeral: true });
        } catch (e) {
            console.log(`Error getting playerdkp for player ${player.id}`, e);
        }
    },
    restricted: false,
};