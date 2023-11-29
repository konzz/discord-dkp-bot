const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('removedkp')
		.setDescription('Remove DKP from a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(true))
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('comment').setDescription('The log to parse').setRequired(true))
        .addBooleanOption(option => option.setName('loot').setDescription('Is this a loot?').setRequired(true)),
	async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const player = interaction.options.getUser('player');
        const dkp = interaction.options.getInteger('dkp');
        const comment = interaction.options.getString('comment');
        const loot = interaction.options.getBoolean('loot');
        manager.removeDKP(guild, player.id, dkp, comment, loot);

        const gplayer = await interaction.guild.members.fetch(player.id);
		await interaction.reply(`Removed ${dkp} DKPs from ${gplayer.nickname || gplayer.user.username}`);
	},
    restricted: true,
};