const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Set bot configuration')
        .addRoleOption(option => option.setName('role').setDescription('Officer role who can handle raids and dkps').setRequired(true))
        .addChannelOption(option => option.setName('raidchannel').setDescription('The raid channel where members must be during raid').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption(option => option.setName('logchannel').setDescription('Channel to ouput DKP log movements').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option => option.setName('auctionchannel').setDescription('Channel to ouput Auctions').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addNumberOption(option => option.setName('raiddeprecationtime').setDescription('Time to deprecate raids for atendance (1 = 1 days)').setRequired(false))
        .addIntegerOption(option => option.setName('bidtime').setDescription('Bids time duration (1 = 1 second)').setMaxValue(1000).setMinValue(30).setRequired(false))
        .addChannelOption(option => option.setName('longauctionchannel').setDescription('Channel to ouput Long Auctions').setRequired(false).addChannelTypes(ChannelType.GuildText))
        .addChannelOption(option => option.setName('secondraidchannel').setDescription('Second raid channel to take attendance').addChannelTypes(ChannelType.GuildVoice))
        .addIntegerOption(option => option.setName('minbidtolockformain').setDescription('Minimum bid to be main bid').setMinValue(0).setRequired(false))
        .addIntegerOption(option => option.setName('overbidtowinmain').setDescription('Over bid amount to win main bids as an alt').setMinValue(0).setRequired(false))
        .addIntegerOption(option => option.setName('minbid').setDescription('Minimum bid').setMinValue(0).setRequired(false))
        .addStringOption(option => option.setName('raidhelperapikey').setDescription('raidhelper api key').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const guildConfig = await manager.getGuildOptions(guild) || {};
        const raidChannel = interaction.options.getChannel('raidchannel');
        const secondRaidChannel = interaction.options.getChannel('secondraidchannel');
        if (raidChannel.id === secondRaidChannel?.id) {
            return interaction.reply({ content: ':prohibited: Raid channel and second raid channel must be different', ephemeral: true });
        }

        const logChannel = interaction.options.getChannel('logchannel');
        const auctionChannel = interaction.options.getChannel('auctionchannel');
        const longAuctionChannel = interaction.options.getChannel('longauctionchannel');
        const role = interaction.options.getRole('role');
        const raidDeprecationTime = interaction.options.getNumber('raiddeprecationtime') * 86400000 || guildConfig.raidDeprecationTime || 90;
        const bidTime = interaction.options.getInteger('bidtime') || guildConfig.bidTime || 60;
        const minBid = interaction.options.getInteger('minbid') || guildConfig.minBid || 0;
        const minBidToLockForMain = interaction.options.getInteger('minbidtolockformain') || guildConfig.minBidToLockForMain;
        const overBidtoWinMain = interaction.options.getInteger('overbidtowinmain') || guildConfig.overBidtoWinMain;
        const raidHelperAPIKey = interaction.options.getString('raidhelperapikey') || guildConfig.raidHelperAPIKey;
        await manager.saveGuildOptions(guild, {
            raidChannel: raidChannel.id,
            adminRole: role.id,
            logChannel: logChannel?.id,
            raidDeprecationTime,
            bidTime,
            auctionChannel: auctionChannel.id,
            longAuctionChannel: longAuctionChannel?.id,
            secondRaidChannel: secondRaidChannel?.id,
            minBid,
            minBidToLockForMain,
            overBidtoWinMain,
            raidHelperAPIKey,
        });

        await interaction.reply({ content: 'Configuration saved', ephemeral: true });
    },
};