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
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const dkp = interaction.options.getInteger('dkp');
        const raidid = interaction.options.getString('raidid');
        const eventid = interaction.options.getString('eventid');


        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const logChannel = await interaction.guild.channels.cache.get(guildConfig.logChannel);

        const eventUrl = `https://raid-helper.dev/api/v2/events/${eventid}`;
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
                await interaction.editReply(':prohibited: Raid not found', { ephemeral: true });
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

            const totalAttendance = Object.keys(attendance).length;
            const halfAttendance = Math.floor(totalAttendance / 2) || 1;
            const attendanceRequired = halfAttendance > 10 ? 10 : halfAttendance;

            const statusesToIgnore = ['Absence', 'Bench'];

            const eligiblePlayers = eventJson.signUps.filter(singup => {
                return !statusesToIgnore.includes(singup.className) && attendance[singup.userId] && attendance[singup.userId].count >= attendanceRequired;
            });

            if (dkp > 0) {
                eligiblePlayers.forEach(async player => {
                    await manager.addDKP(guild, player.userId, dkp, `Subscribed and attended raid event ${eventJson.name}`, raid._id);
                });
            }

            const subscribedButNotAttended = eventJson.signUps.filter(singup => {
                return !statusesToIgnore.includes(singup.className) && !attendance[singup.userId];
            });

            const attendedButNotSubscribed = Object.keys(attendance).filter(player => {
                return eventJson.signUps.find(singup => singup.userId === player) === undefined && attendance[player].count >= attendanceRequired;
            });

            const rewardedNames = await Promise.all(eligiblePlayers.map(async p => {
                try {
                    const player = await interaction.guild.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                }
                catch (e) {
                    console.log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            }));
            const subscribedButNotAttendedNames = await Promise.all(subscribedButNotAttended.map(async p => {
                try {
                    const player = await interaction.guild.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                }
                catch (e) {
                    console.log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            }));

            const attendedButNotSubscribedNames = await Promise.all(attendedButNotSubscribed.map(async p => {
                try {
                    const player = await interaction.guild.members.fetch(p);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                }
                catch (e) {
                    console.log('Error fetching player:', e);
                    return `- ${p}`;
                }
            }));

            const notEnoughAttendance = eventJson.signUps.filter(singup => {
                return !statusesToIgnore.includes(singup.className) && attendance[singup.userId] && attendance[singup.userId].count < attendanceRequired;
            }
            );

            const notEnoughAttendanceNames = await Promise.all(notEnoughAttendance.map(async p => {
                try {
                    const player = await interaction.guild.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username} (${attendance[p.userId].count} / ${attendanceRequired})`;
                }
                catch (e) {
                    console.log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            }));


            const rewarded = logger.playerChunks("Rewarded", rewardedNames, 10);
            const notSubscribed = logger.playerChunks("NOT subscribed", attendedButNotSubscribedNames, 10);
            const notAttended = logger.playerChunks("NOT attended", subscribedButNotAttendedNames, 10);
            const notEnoughAttendanceChunks = logger.playerChunks("NOT enough attendance", notEnoughAttendanceNames, 10);


            interaction.editReply({ content: `Adding ${dkp} DKP to players that subscribed and attended raid event: ${eventJson.description}`, ephemeral: true });
            try {
                await logChannel
                    .send({
                        embeds: [{
                            color: 15105570,
                            title: `Raid Event DKP - ${eventJson.description}`,
                            description: `Adding ${dkp} DKP to players that subscribed and attended raid event with over 50% participation or 1 hour`,
                            fields: [
                                ...rewarded,
                                { name: '\u200b', value: '\u200b', inline: false },
                                ...notEnoughAttendanceChunks,
                                { name: '\u200b', value: '\u200b', inline: false },
                                ...notSubscribed,
                                { name: '\u200b', value: '\u200b', inline: false },
                                ...notAttended,
                            ],
                        }]
                    })
            } catch (e) {
                console.log('Error sending log message:', e);
            }

        }
        catch (error) {
            console.log(error);
            await interaction.reply(':prohibited: Error fetching event data', { ephemeral: true });
            return;
        }

    },
    restricted: true,
};