const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('showconfig')
		.setDescription('Show the current configuration of the bot in this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
		const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};

		const adminRole = guildConfig.adminRole ? interaction.guild.roles.cache.get(guildConfig.adminRole) : null;
		const raidChannel = guildConfig.raidChannel ? interaction.guild.channels.cache.get(guildConfig.raidChannel) : null;

		const config = [
			{ name: 'Admin role', value: adminRole ? adminRole.name : 'Not set' },
			{ name: 'Raid channel', value: raidChannel ? raidChannel.name : 'Not set' },
		];

		await interaction.reply({ embeds: [{ title: 'Current configuration', fields: config }] });
	},
};