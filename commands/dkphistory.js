const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dkphistory')
		.setDescription('Shows the DKP history of a player')
		.addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const user = interaction.options.getUser('player') || interaction.user;
		const player = await manager.getPlayer(guild, user.id);
		if (!player) {
			await interaction.reply(`:prohibited: ${user.username} has no DKP history`, { ephemeral: true });
			return;
		}
		const reply = player.log.map(e => `- <t:${Math.floor(e.date / 1000)}:d>  **${e.dkp}** *${e.raid?.name}* *${e.comment}*`);
		await interaction.reply(reply.join('\n'), { ephemeral: true });
	},
};