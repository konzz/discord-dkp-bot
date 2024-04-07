const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Set bot configuration')
        .addRoleOption(option => option.setName('role').setDescription('Officer role who can handle raids and dkps').setRequired(true))
        .addChannelOption(option => option.setName('raidchannel').setDescription('The raid channel where members must be during raid').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption(option => option.setName('logchannel').setDescription('Channel to ouput DKP log movements').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addNumberOption(option => option.setName('raiddeprecationtime').setDescription('Time to deprecate raids for atendance (1 = 1 days)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;

        const raidChannel = interaction.options.getChannel('raidchannel');
        const logChannel = interaction.options.getChannel('logchannel');
        const role = interaction.options.getRole('role');
        const raidDeprecationTime = interaction.options.getNumber('raiddeprecationtime') * 86400000;
        await manager.saveGuildOptions(guild, { raidChannel: raidChannel.id, adminRole: role.id, logChannel: logChannel?.id, raidDeprecationTime });

        await interaction.reply(`Updated configuration, use /showconfig to see the current configuration`);
    },
};