const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const zip = new require('node-zip')();


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
        await interaction.deferReply();
        const guild = interaction.guild.id;
        try {
            log('Creating backup', { guild });
            const playersFile = await getBackUpFile(manager, guild, 'players');
            const raidsFile = await getBackUpFile(manager, guild, 'raids');
            //compress files
            zip.file('players.json', fs.readFileSync(playersFile));
            zip.file('raids.json', fs.readFileSync(raidsFile));
            const zipContent = zip.generate({ base64: false, compression: 'DEFLATE' });
            const zipFile = Buffer.from(zipContent, 'binary');

            //send files as .zip	
            await interaction.editReply({ content: `Backup created ${new Date().toLocaleString()}`, files: [{ attachment: zipFile, name: 'backup.zip' }] });
        } catch (error) {
            await interaction.editReply({ content: `Error creating backup ${error}`, ephemeral: true });
        }
    },
};