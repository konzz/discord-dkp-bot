const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('backup')
		.setDescription('Create a backup of the current DKP state')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(interaction, manager) {
        const guild = interaction.guild.id;
        if (!fs.existsSync('./backups')){
            fs.mkdirSync('./backups');
        }
        
        const filePath = `./backups/${guild}.json`;
        if(fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
		const data = await manager.getAll(guild);
        fs.writeFileSync(filePath, JSON.stringify(data));
		
		await interaction.reply({content: `Backup created ${new Date().toLocaleString()}`, files: [filePath]});
	},
};