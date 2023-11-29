const { SlashCommandBuilder, Routes } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('listplayersdkps')
        .setDescription('List all players and their current DKP'),
	async execute(interaction, manager) {
        const guild = interaction.guild.id;
        let list = await manager.listPlayers(guild);
        list = list.sort((a, b) => b.current - a.current);
        const reply = await Promise.all(list.map(async e => {
            const player = await interaction.guild.members.fetch(e.player);
            return `${player.nickname || player.user.username}: ${e.current}`;
        }));
		await interaction.reply(reply.join('\n'));
	},
};