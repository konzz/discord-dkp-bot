require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adddkp')
        .setDescription('Add DKP to a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(true))
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setMinValue(1).setRequired(true))
        .addStringOption(option => option.setName('comment').setDescription('Reason').setRequired(true)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player');
        const dkp = interaction.options.getInteger('dkp');
        const comment = interaction.options.getString('comment');

        if (process.env.LOG_LEVEL === 'DEBUG') {
            console.log(`Executed adddkp command with player: ${player.id}, dkp: ${dkp}, comment: ${comment}`);
        }

        manager.addDKP(guild, player.id, dkp, comment);
        await interaction.reply(`Added ${dkp} DKPs to <@${player.id}>. ${comment}`);
    },
    restricted: true,
};