const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('backup')
		.setDescription('Create a backup of the current DKP state')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
		const guild = interaction.guild.id;
		const data = await manager.getAll(guild);
        if (!fs.existsSync('./backups')){
            fs.mkdirSync('./backups');
        }
        if(fs.existsSync(`./backups/${guild}.json`)) {
            fs.unlinkSync(`./backups/${guild}.json`);
        }
        
        const file = fs.createWriteStream(`./backups/${guild}.json`);
        file.write(JSON.stringify(data));
        file.end();
		
		await interaction.reply(`Backup created ${new Date().toLocaleString()}`, { files: [`./backups/${guild}.json`]});
	},
};