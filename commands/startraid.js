const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startraid')
        .setDescription('Create a new raid')
        .addStringOption(option => option.setName('name').setDescription('Name').setRequired(true))
        .addIntegerOption(option => option.setName('dkpspertick').setDescription('The amount of DKP to add each tick').setMinValue(0).setRequired(true))
        .addNumberOption(option => option.setName('tickduration').setDescription('Time between ticks (1 = 6m, 0,5 = 3m, 10 = 1h)').setMinValue(0.1).setRequired(true)),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const name = interaction.options.getString('name');
        const dkpsPerTick = interaction.options.getInteger('dkpspertick');
        const tickDuration = interaction.options.getNumber('tickduration') * 6 * 60000;
        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const raidChannel = guildConfig.raidChannel;

        if (!raidChannel) {
            await interaction.reply({ content: ':prohibited: Raid channel not set, use /configure to set it', ephemeral: true });
            return;
        }

        const channel = await interaction.guild.channels.fetch(raidChannel);
        const playersInChannel = [...channel.members.keys()];

        let playersInSecondChannel = [];
        const secondRaidChannel = guildConfig.secondRaidChannel;
        if (secondRaidChannel) {
            const secondChannel = await interaction.guild.channels.fetch(secondRaidChannel);
            playersInSecondChannel = [...secondChannel.members.keys()];
        }


        if (playersInChannel.length === 0) {
            await interaction.reply({ content: ':prohibited: No players in raid channel', ephemeral: true });
            return;
        }

        const alreadyActiveRaid = await manager.getActiveRaid(guild);
        if (alreadyActiveRaid) {
            await interaction.reply({ content: `:prohibited: There is already an active raid: ${alreadyActiveRaid.name}`, ephemeral: true });
            return;
        }

        const comment = 'Start';
        const raid = await manager.createRaid(guild, name, tickDuration, dkpsPerTick);
        playersInChannel.forEach(async player => {
            await manager.addDKP(guild, player, dkpsPerTick, comment, raid);
        });

        playersInSecondChannel.forEach(async player => {
            await manager.addDKP(guild, player, dkpsPerTick, comment, raid);
        });

        manager.addRaidAttendance(guild, raid, [...playersInChannel, ...playersInSecondChannel], comment, dkpsPerTick);

        const minutes = tickDuration / 60000;
        await interaction.reply({ content: `Raid ${name} started with ${dkpsPerTick} DKP per tick every ${minutes} minutes`, ephemeral: true }
        );

        logger.sendRaidEmebed(guildConfig, raid, [...playersInChannel, ...playersInSecondChannel], 5763719, `${name} raid Start`);
    },
    restricted: true,
};