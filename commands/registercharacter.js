const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('registercharacter')
		.setDescription('Register a character')
        .addStringOption(option => option.setName('name').setDescription('The character name').setRequired(true)),
	async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const name = interaction.options.getString('name');
        try {
            await manager.addCharacter(guild, interaction.user.id, name);
            await interaction.reply(`Successfully registered ${name}!`);
        }
        catch (e) {
            await interaction.reply(`Error: ${e}`);
        }
	},
};