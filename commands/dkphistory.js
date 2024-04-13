const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dkphistory')
		.setDescription('Shows the DKP history of a player')
		.addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const user = interaction.options.getUser('player') || interaction.user;
		try {
			const player = await manager.getPlayer(guild, user.id);
			const reply = player.log.map(e => `- <t:${Math.floor(e.date / 1000)}:d>  **${e.dkp}**${e.raid ? ` *${e.raid.name}* ` : ' '}*${e.comment}*`);
			await interaction.reply({ content: reply.join('\n'), ephemeral: true });
		}
		catch (error) {
			await interaction.reply({ content: `:prohibited: ${error}`, ephemeral: true });
		}
	},
}; 