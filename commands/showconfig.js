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
		const secondRaidChannel = guildConfig.secondRaidChannel ? interaction.guild.channels.cache.get(guildConfig.secondRaidChannel) : null;
		const logChannel = guildConfig.logChannel ? interaction.guild.channels.cache.get(guildConfig.logChannel) : null;
		const auctionChannel = guildConfig.auctionChannel ? interaction.guild.channels.cache.get(guildConfig.auctionChannel) : null;
		const raidDeprecationTime = guildConfig.raidDeprecationTime || 0;
		const bidTime = guildConfig.bidTime || 0;

		const config = [
			{ name: 'DKP Officer role', value: adminRole ? adminRole.name : 'Not set' },
			{ name: 'Raid deprecation time', value: raidDeprecationTime ? `${raidDeprecationTime / 86400000} days` : 'Not set' },
			{ name: 'Raid channel', value: raidChannel ? raidChannel.name : 'Not set' },
			{ name: 'Second raid channel', value: secondRaidChannel ? secondRaidChannel.name : 'Not set' },
			{ name: 'Log channel', value: logChannel ? logChannel.name : 'Not set' },
			{ name: 'Auction channel', value: auctionChannel ? auctionChannel.name : 'Not set' },
			{ name: 'Bid time', value: bidTime ? `${bidTime} seconds` : 'Not set' },
		];

		await interaction.reply({ embeds: [{ title: 'Current configuration', fields: config, color: 5763719 }] });
	},
};