const { SlashCommandBuilder, Routes } = require('discord.js');
var { AsciiTable3, AlignmentEnum } = require('ascii-table3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayersdkps')
        .setDescription('List all players and their current DKP'),
    async execute(interaction, manager) {
        await interaction.deferReply();
        const guild = interaction.guild.id;
        let list = await manager.listPlayers(guild);
        list = list.sort((a, b) => b.current - a.current);
        let data = await Promise.all(list.map(async e => {
            const player = await interaction.guild.members.fetch(e.player);
            return [player.nickname || player.user.globalName || player.user.username, e.current, e.attendance, e.maxBid];
        }));

        if (data.length === 0) {
            await interaction.editReply({ content: ':prohibited: No players found', ephemeral: true });
            return;
        }

        if (data.length <= 30) {
            var table =
                new AsciiTable3()
                    .setHeading('Player', 'DKP', 'Attendance %', 'Max bid')
                    .setAlign(3, AlignmentEnum.CENTER)
                    .addRowMatrix(data);

            await interaction.editReply({ content: '```\n' + table.toString() + '\n```', ephemeral: true });
            return;
        }

        await interaction.editReply('Sending in chunks...');
        let chunks = [];
        while (data.length) {
            chunks.push(data.splice(0, 30));
        }

        for (let chunk of chunks) {
            var table =
                new AsciiTable3()
                    .setHeading('Player', 'DKP', 'Attendance %', 'Max bid')
                    .setAlign(3, AlignmentEnum.CENTER)
                    .addRowMatrix(chunk);

            await interaction.channel.send({ content: '```\n' + table.toString() + '\n```' });
        }

    },
};