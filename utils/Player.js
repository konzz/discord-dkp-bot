const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const path = require('node:path');
const fs = require('node:fs');

const playSound = async (guild, channelId, soundRelativePath) => {
    return new Promise((resolve, reject) => {
        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        try {
            const player = createAudioPlayer();
            const resource = createAudioResource(fs.createReadStream(path.join(__dirname, soundRelativePath)), { inputType: StreamType.Arbitrary });
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                resolve();
            });

            player.on('error', error => {
                console.error(`Error: ${error.message} with resource ${error.resource.metadata}`);
                connection.destroy();
                reject(error);
            });
        } catch (error) {
            console.error(error);
            connection.destroy();
            reject(error);
        }
    });
}

module.exports = {
    playSound
};