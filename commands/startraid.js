const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startraid')
        .setDescription('Create a new raid')
        .addStringOption(option => option.setName('name').setDescription('Name').setRequired(true))
        .addIntegerOption(option => option.setName('dkpspertick').setDescription('The amount of DKP to add each tick').setRequired(true))
        .addNumberOption(option => option.setName('tickduration').setDescription('Time between ticks (1 = 6m, 0,5 = 3m, 10 = 1h)').setRequired(true)),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const name = interaction.options.getString('name');
        const dkpsPerTick = interaction.options.getInteger('dkpspertick');
        const tickDuration = interaction.options.getNumber('tickduration') * 60000;

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

        const minutes = tickDuration / 60000;
        await interaction.reply(`Raid ${name} started with ${playersInChannel.length} players on it. ${dkpsPerTick} every ${minutes} minutes`, { ephemeral: true });

        logger.sendRaidEmebed(guildConfig, raid, playersInChannel, 5763719, `${name} raid Start`);
    },
    restricted: true,
};