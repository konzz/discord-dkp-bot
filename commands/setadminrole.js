const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setadminrole')
		.setDescription('Add roles that can handle DKPs')
        .addRoleOption(option => option.setName('role').setDescription('The role').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        
		const role = interaction.options.getRole('role');
		await manager.saveGuildOptions(guild, {...guildConfig, adminRole: role.id});
		
		await interaction.reply(`Added role ${role.name}`);
	},
};