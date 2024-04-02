const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startraid')
        .setDescription('Create a new raid')
        .addStringOption(option => option.setName('name').setDescription('Name').setRequired(true))
        .addIntegerOption(option => option.setName('dkpspertick').setDescription('The amount of DKP to add each tick (default: 1)').setRequired(false))
        .addIntegerOption(option => option.setName('tickduration').setDescription('Time between ticks (default: 1, 1 = 1h, 0.5 = 30m)').setRequired(false)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const name = interaction.options.getString('name');
        const dkpsPerTick = interaction.options.getInteger('dkpspertick') || 1;
        const _tickDuration = interaction.options.getInteger('tickduration') || 1;
        const tickDuration = _tickDuration * 60000 * 60;

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

        const alreadyActiveRaid = await manager.getActiveRaid(guild);
        if (alreadyActiveRaid) {
            await interaction.reply(`There is already an active raid: ${alreadyActiveRaid.name}, use /endraid to end it first`);
            return;
        }

        const raid = await manager.createRaid(guild, name, playersInChannel, tickDuration, dkpsPerTick);
        playersInChannel.forEach(async player => {
            await manager.addDKP(guild, player, dkpsPerTick, 'Start', raid);
        });

        await interaction.reply(`Raid ${name} started with ${playersInChannel.length} players on it. Remember to end it with /endraid`);
    },
    restricted: true,
};