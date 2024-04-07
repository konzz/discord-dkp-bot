const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adddkp')
        .setDescription('Add DKP to a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(true))
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('comment').setDescription('Reason').setRequired(true)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player');
        const dkp = interaction.options.getInteger('dkp');
        const comment = interaction.options.getString('comment');
        manager.addDKP(guild, player.id, dkp, comment);

        const gplayer = await interaction.guild.members.fetch(player.id);
        await interaction.reply(`Added ${dkp} DKPs to ${gplayer.nickname || gplayer.user.username}`);
    },
    restricted: true,
};