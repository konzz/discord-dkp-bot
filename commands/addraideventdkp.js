const { SlashCommandBuilder } = require('discord.js');
const { ObjectId } = require('mongodb');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addraideventdkp')
        .setDescription('Add DKP to raid atendants that subscribed to the event')
        .addIntegerOption(option => option.setName('dkp').setDescription('The amount of DKP to add').setRequired(true))
        .addStringOption(option => option.setName('raidid').setDescription('Raid ID').setRequired(true))
        .addStringOption(option => option.setName('eventid').setDescription('Event ID').setRequired(true)),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const dkp = interaction.options.getInteger('dkp');
        const raidid = interaction.options.getString('raidid');
        const eventid = interaction.options.getString('eventid');


        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const raidChannel = guildConfig.raidChannel;
        if (!raidChannel) {
            await interaction.reply(':prohibited: Please set the raid channel first with /setraidchannel', { ephemeral: true });
            return;
        }

        const eventUrl = `https://raid-helper.dev/api/v2/events/${eventid}`;
        //fetch the event data
        try {
            const eventData = await fetch(eventUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
            });
            const eventJson = await eventData.json();
            const raid = await manager.getRaidById(guild, new ObjectId(raidid));
            if (!raid) {
                await interaction.reply(':prohibited: Raid not found', { ephemeral: true });
                return;
            }
            const attendance = raid.attendance.reduce((acc, entry) => {
                entry.players.forEach(player => {
                    if (!acc[player]) {
                        acc[player] = { count: 0 };
                    }
                    acc[player].count++;
                });
                return acc;
            }, {});

            const eligiblePlayers = eventJson.signUps.filter(singup => {
                return singup.status === 'primary' && attendance[singup.userId] && attendance[singup.userId].count > 1;
            });
            eligiblePlayers.forEach(async player => {
                await manager.addDKP(guild, player.userId, dkp, `Subscribed and attended raid event ${eventJson.name}`, raid._id);
            });

            const subscribedButNotAttended = eventJson.signUps.filter(singup => {
                return singup.status === 'primary' && !attendance[singup.userId];
            });

            interaction.reply(`Adding ${dkp} DKP to players that subscribed and attended raid event: ${eventJson.description} \n
                ${eligiblePlayers.map(player => `${player.name}`).join(', ')} \n
                This players subscribed but did not attend: \n
                ${subscribedButNotAttended.map(player => `${player.name}`).join(', ')}`);

        }
        catch (error) {
            console.log(error);
            await interaction.reply(':prohibited: Error fetching event data', { ephemeral: true });
            return;
        }

    },
    restricted: true,
};