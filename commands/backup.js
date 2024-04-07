const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');


const getBackUpFile = async (manager, guild, collection) => {
    if (!fs.existsSync('./backups')) {
        fs.mkdirSync('./backups');
    }

    const filePath = `./backups/${guild}_${collection}.json`;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    const data = await manager.getAll(guild, collection);
    fs.writeFileSync(filePath, JSON.stringify(data));
    return filePath;
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Create a backup of the current DKP state')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const playersFile = await getBackUpFile(manager, guild, 'players');
        const raidsFile = await getBackUpFile(manager, guild, 'raids');

        await interaction.reply({ content: `Backup created ${new Date().toLocaleString()}`, files: [playersFile, raidsFile] });
    },
};