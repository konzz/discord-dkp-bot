const { SlashCommandBuilder } = require('discord.js');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removedkp')
        .setDescription('Remove DKP from a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(true))
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('comment').setDescription('The log to parse').setRequired(true)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player');
        const dkp = interaction.options.getInteger('dkp');
        const comment = interaction.options.getString('comment');
        const activeRaid = await manager.getActiveRaid(guild);
        manager.removeDKP(guild, player.id, dkp, comment, activeRaid);

        if (process.env.LOG_LEVEL === 'DEBUG') {
            log(`Executed removedkp command`, {
                player: player.id,
                dkp,
                comment
            });
        }

        await interaction.reply(`Removed ${dkp} DKPs from <@${player.id}>. ${comment}`);
    },
    restricted: true,
};