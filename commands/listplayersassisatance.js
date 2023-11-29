const { SlashCommandBuilder, Routes } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('listplayersassistance')
        .setDescription('List all players and their assistance'),
	async execute(interaction, manager) {
        const guild = interaction.guild.id;
        let list = await manager.listPlayers(guild);
        list  = list.sort((a, b) => b.assistance - a.assistance);
        const max = list[0].assistance;
        const reply = await Promise.all(list.map(async e => {
            const percentage = Math.round((e.assistance / max) * 100);
            const squares = Math.floor(percentage / 10);
            const player = await interaction.guild.members.fetch(e.player);
            const color = percentage > 80 ? ':green_square:' : percentage > 50 ? ':blue_square:' : ':red_square:';
            return `- ${player.nickname || player.user.username}: ${color.repeat(squares)} ${e.assistance}`;
        }));
		await interaction.reply(reply.join('\n'));
	},
};