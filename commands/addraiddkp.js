const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addraiddkp')
        .setDescription('Add DKP to a player')
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('comment').setDescription('Reason').setRequired(true)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const dkp = interaction.options.getInteger('dkp');
        const comment = interaction.options.getString('comment');


        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const raidChannel = guildConfig.raidChannel;
        if (!raidChannel) {
            await interaction.reply('Please set the raid channel first with /setraidchannel');
            return;
        }

        const channel = await interaction.guild.channels.fetch(raidChannel);
        const playersInChannel = [...channel.members.keys()];
        if (playersInChannel.length === 0) {
            await interaction.reply('No players in the raid channel');
            return;
        }


        const activeRaid = await manager.getActiveRaid(guild);
        if (!activeRaid) {
            await interaction.reply(`There is no active raid, use /startraid to start one first`);
            return;
        }

        playersInChannel.forEach(async player => {
            await manager.addDKP(guild, player, dkp, comment, activeRaid);
        });

        await manager.updateRaidAttendance(guild, activeRaid, playersInChannel, comment);
        await interaction.reply(`Added ${dkp} DKP to all players (${playersInChannel.length}) in the raid channel`);
    },
    restricted: true,
};