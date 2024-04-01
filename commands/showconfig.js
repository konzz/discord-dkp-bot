const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('showconfig')
		.setDescription('Show the current configuration of the bot in this server')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};

        const adminRole = guildConfig.adminRole ? interaction.guild.roles.cache.get(guildConfig.adminRole) : null;
        const raidChannel = guildConfig.raidChannel ? interaction.guild.channels.cache.get(guildConfig.raidChannel) : null;
        
		await interaction.reply(`Admin roles: ${adminRole ? adminRole.name : 'Not set'}\nRaid channel: ${raidChannel ? raidChannel.name : 'Not set'}`);
	},
};