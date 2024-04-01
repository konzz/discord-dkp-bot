const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setraidchannel')
		.setDescription('Set the channel where the bot gets the attendance from')
        .addChannelOption(option => option.setName('channel').setDescription('The channel').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        
		const raidChannel = interaction.options.getRole('channel');
		await manager.saveGuildOptions(guild, {...guildConfig, raidChannel: raidChannel.id});
		
		await interaction.reply(`Added role ${role.name}`);
	},
};