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
		const longAuctionChannel = guildConfig.longAuctionChannel ? interaction.guild.channels.cache.get(guildConfig.longAuctionChannel) : null;
		const raidDeprecationTime = guildConfig.raidDeprecationTime || 0;
		const bidTime = guildConfig.bidTime || 0;
		const minBid = guildConfig.minBid || 0;
		const minBidToLockForMain = guildConfig.minBidToLockForMain || 0;
		const overBidtoWinMain = guildConfig.overBidtoWinMain || 0;

		const config = [
			{ name: 'DKP Officer role', value: adminRole ? adminRole.name : 'Not set' },
			{ name: 'Raid deprecation time', value: raidDeprecationTime ? `${raidDeprecationTime / 86400000} days` : 'Not set' },
			{ name: 'Raid channel', value: raidChannel ? raidChannel.name : 'Not set' },
			{ name: 'Second raid channel', value: secondRaidChannel ? secondRaidChannel.name : 'Not set' },
			{ name: 'Log channel', value: logChannel ? logChannel.name : 'Not set' },
			{ name: 'Auction channel', value: auctionChannel ? auctionChannel.name : 'Not set' },
			{ name: 'Long auction channel', value: longAuctionChannel ? longAuctionChannel.name : 'Not set' },
			{ name: 'Bid time', value: bidTime ? `${bidTime} seconds` : 'Not set' },
			{ name: 'Minimum bid', value: minBid ? `${minBid} DKP` : 'Not set' },
			{ name: 'Minimum bid to lock for main', value: minBidToLockForMain ? `${minBidToLockForMain} DKP` : 'Not set' },
			{ name: 'Over bid to win main', value: overBidtoWinMain ? `${overBidtoWinMain} DKP` : 'Not set' },
		];

		await interaction.reply({ embeds: [{ title: 'Current configuration', fields: config, color: 5763719 }] });
	},
};