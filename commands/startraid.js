const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startraid')
        .setDescription('Create a new raid')
        .addStringOption(option => option.setName('name').setDescription('Name'))
        .addIntegerOption(option => option.setName('dkpspertick').setDescription('The amount of DKP to add each tick').setMinValue(0))
        .addNumberOption(option => option.setName('tickduration').setDescription('Time between ticks (1 = 1m, 0,5 = 30s, 10 = 10m)').setMinValue(0.1)),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        let name = interaction.options.getString('name');
        const guildConfig = await manager.getGuildOptions(guild) || {};
        const dkpsPerTick = interaction.options.getInteger('dkpspertick') || 1;
        const tickDuration = interaction.options.getNumber('tickduration') * 60000 || 6 * 60000;

        const raidChannel = guildConfig.raidChannel;
        let eventId = null;

        if (guildConfig.raidHelperAPIKey) {
            const guildRaidHelpetEvents = await fetch(`https://raid-helper.dev/api/v3/servers/${guild}/events`, {
                headers: {
                    'Authorization': guildConfig.raidHelperAPIKey,
                    'StartTimeFilter': (Date.now() - 10 * 60000) / 1000,
                    'EndTimeFilter': (Date.now() + 10 * 60000) / 1000
                }
            });
            //find an event starting in +- 10 minutes
            if (guildRaidHelpetEvents.ok) {
                const guildRaidHelpetEventsData = await guildRaidHelpetEvents.json();
                const event = guildRaidHelpetEventsData.postedEvents.find(event => event.startTime * 1000 > Date.now() - 10 * 60000 && event.startTime * 1000 < Date.now() + 10 * 60000);
                if (event && !name) {
                    name = event.title;
                    eventId = event.id;
                }
            }
        }

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

        const alreadyActiveRaid = await manager.getActiveRaid(guild);
        if (alreadyActiveRaid) {
            await interaction.reply({ content: `:prohibited: There is already an active raid: ${alreadyActiveRaid.name}`, ephemeral: true });
            return;
        }

        if (!name) {
            //if no name is provided, use the current date in seconds
            name = `<t:${Math.floor(Date.now() / 1000)}:D>`;
        }
        const comment = 'Start';
        const raid = await manager.createRaid(guild, name, tickDuration, dkpsPerTick, eventId);
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