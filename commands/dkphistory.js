const { SlashCommandBuilder, PermissionFlagsBits  } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dkphistory')
		.setDescription('Shows the DKP history of a player')
        .addUserOption(option => option.setName('player').setDescription('The player').setRequired(false)),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
        const user = interaction.options.getUser('player') || interaction.user;
        const player = await manager.getPlayer(guild, user.id);
		const reply = player.log.map(e => `- ${new Date(e.date).toDateString()}:  **${e.dkp}** *${e.comment}*`);
		await interaction.reply(reply.join('\n'));
	},
};