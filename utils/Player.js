const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, StreamType, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const path = require('node:path');
const fs = require('node:fs');

const playSound = async (guild, channelId, soundRelativePath) => {
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
        });

        player.on('error', error => {
            console.error(`Error: ${error.message} with resource ${error.resource.metadata}`);
            connection.destroy();
        });
    } catch (error) {
        console.error(error);
        connection.destroy();
    }
}

module.exports = {
    playSound
};