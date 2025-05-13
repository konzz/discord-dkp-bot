const { SlashCommandBuilder } = require('discord.js');
const { processRaidHelperEventDKP } = require('../utils/raidHelperUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addraideventdkp')
        .setDescription('Add DKP to raid atendants that subscribed to the event')
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('raidid').setDescription('Raid ID').setRequired(true))
        .addStringOption(option => option.setName('eventid').setDescription('Event ID').setRequired(true)),
    async execute(interaction, manager, logger) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const dkp = interaction.options.getInteger('dkp');
        const raidid = interaction.options.getString('raidid');
        const eventid = interaction.options.getString('eventid');

        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const logChannel = await interaction.guild.channels.cache.get(guildConfig.logChannel);

        try {
            const result = await processRaidHelperEventDKP({
                guild,
                raidId: raidid,
                eventId: eventid,
                dkp,
                manager,
                guildInstance: interaction.guild,
                logger,
                logChannel
            });

            await interaction.editReply({
                content: `Adding ${dkp} DKP to players that subscribed and attended raid event: ${result.event.title}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error processing RaidHelper event DKP:', error);
            await interaction.editReply({
                content: `:prohibited: ${error.message}`,
                ephemeral: true
            });
        }
    },
    restricted: true,
};