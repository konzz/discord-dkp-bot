const { ObjectId } = require('mongodb');
const log = require('../debugger.js');

/**
 * Process RaidHelper event DKP for a raid
 * @param {Object} params Parameters object
 * @param {string} params.guild Guild ID
 * @param {string} params.raidId Raid ID
 * @param {string} params.eventId RaidHelper event ID
 * @param {number} params.dkp Amount of DKP to award
 * @param {Object} params.manager DKP manager instance
 * @param {Object} params.guildInstance Discord guild instance
 * @param {Object} params.logger Logger instance
 * @param {Object} params.logChannel Discord channel for logging
 * @returns {Promise<Object>} Object containing results of the DKP distribution
 */
async function processRaidHelperEventDKP({
    guild,
    raidId,
    eventId,
    dkp,
    manager,
    guildInstance,
    logger,
    logChannel
}) {
    const eventUrl = `https://raid-helper.dev/api/v2/events/${eventId}`;
    const eventData = await fetch(eventUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
    });

    if (!eventData.ok) {
        throw new Error(`Failed to fetch RaidHelper event: ${eventData.status}`);
    }

    const eventJson = await eventData.json();
    const raid = await manager.getRaidById(guild, new ObjectId(raidId));

    if (!raid) {
        throw new Error('Raid not found');
    }

    // Calculate attendance
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

    // Find eligible players
    const eligiblePlayers = eventJson.signUps.filter(signup => {
        return !statusesToIgnore.includes(signup.className) &&
            attendance[signup.userId] &&
            attendance[signup.userId].count >= attendanceRequired;
    });

    // Award DKP to eligible players
    if (dkp > 0) {
        for (const player of eligiblePlayers) {
            await manager.addDKP(
                guild,
                player.userId,
                dkp,
                `Subscribed and attended raid event`,
                raid
            );
        }
    }

    // Find players who subscribed but didn't attend
    const subscribedButNotAttended = eventJson.signUps.filter(signup => {
        return !statusesToIgnore.includes(signup.className) && !attendance[signup.userId];
    });

    // Find players who attended but didn't subscribe
    const attendedButNotSubscribed = Object.keys(attendance).filter(player => {
        return !eventJson.signUps.find(signup => signup.userId === player) &&
            attendance[player].count >= attendanceRequired;
    });

    // Find players with insufficient attendance
    const notEnoughAttendance = eventJson.signUps.filter(signup => {
        return !statusesToIgnore.includes(signup.className) &&
            attendance[signup.userId] &&
            attendance[signup.userId].count < attendanceRequired;
    });

    // Get player names for reporting
    const [rewardedNames, subscribedButNotAttendedNames, attendedButNotSubscribedNames, notEnoughAttendanceNames] =
        await Promise.all([
            Promise.all(eligiblePlayers.map(async p => {
                try {
                    const player = await guildInstance.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                } catch (e) {
                    log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            })),
            Promise.all(subscribedButNotAttended.map(async p => {
                try {
                    const player = await guildInstance.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                } catch (e) {
                    log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            })),
            Promise.all(attendedButNotSubscribed.map(async p => {
                try {
                    const player = await guildInstance.members.fetch(p);
                    return `- ${player.nickname || player.user.globalName || player.user.username}`;
                } catch (e) {
                    log('Error fetching player:', e);
                    return `- ${p}`;
                }
            })),
            Promise.all(notEnoughAttendance.map(async p => {
                try {
                    const player = await guildInstance.members.fetch(p.userId);
                    return `- ${player.nickname || player.user.globalName || player.user.username} (${attendance[p.userId].count} / ${attendanceRequired})`;
                } catch (e) {
                    log('Error fetching player:', e);
                    return `- ${p.userId}`;
                }
            }))
        ]);

    // Prepare log message
    const rewarded = logger.playerChunks("Rewarded", rewardedNames, 10);
    const notSubscribed = logger.playerChunks("NOT subscribed", attendedButNotSubscribedNames, 10);
    const notAttended = logger.playerChunks("NOT attended", subscribedButNotAttendedNames, 10);
    const notEnoughAttendanceChunks = logger.playerChunks("NOT enough attendance", notEnoughAttendanceNames, 10);

    // Send log message
    if (logChannel) {
        try {
            await logChannel.send({
                embeds: [{
                    color: 15105570,
                    title: `Raid Event DKP - ${eventJson.title}`,
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
            });
        } catch (e) {
            log('Error sending log message:', e);
        }
    }

    return {
        event: eventJson,
        raid,
        eligiblePlayers,
        subscribedButNotAttended,
        attendedButNotSubscribed,
        notEnoughAttendance,
        attendanceRequired
    };
}

module.exports = {
    processRaidHelperEventDKP
}; 