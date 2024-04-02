const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Set bot configuration')
        .addChannelOption(option => option.setName('channel').setDescription('The channel').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addRoleOption(option => option.setName('role').setDescription('Officer role who can handle raids and dkps').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;

        const raidChannel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');
        await manager.saveGuildOptions(guild, { raidChannel: raidChannel.id, adminRole: role.id });

        await interaction.reply(`Updated configuration, use /showconfig to see the current configuration`);
    },
};