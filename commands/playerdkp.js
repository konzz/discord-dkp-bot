require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playerdkp')
        .setDescription('Shows the DKP of a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
    async execute(interaction, manager) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player') || interaction.user;

        if (process.env.LOG_LEVEL === 'DEBUG') {
            log(`Executed playerdkp`, {
                user: interaction.user.id,
                player: player.id
            });
        }

        try {
            const currentDKP = await manager.getPlayerDKP(guild, player.id);
            await interaction.editReply({ content: '` ' + currentDKP + ' ` DKP', ephemeral: true });
        } catch (e) {
            log(`Error getting playerdkp for player`, {
                player: player.id,
                error: JSON.stringify(e)
            });
        }
    },
    restricted: false,
};