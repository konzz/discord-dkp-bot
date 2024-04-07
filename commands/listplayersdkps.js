const { SlashCommandBuilder, Routes } = require('discord.js');
var { AsciiTable3, AlignmentEnum } = require('ascii-table3');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayersdkps')
        .setDescription('List all players and their current DKP'),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        let list = await manager.listPlayers(guild);
        list = list.sort((a, b) => b.current - a.current);
        const data = await Promise.all(list.map(async e => {
            const player = await interaction.guild.members.fetch(e.player);
            return [player.nickname || player.user.globalName, e.current, e.attendance, e.maxBid];
        }));

        if (data.length === 0) {
            await interaction.reply(':prohibited: No players found', { ephemeral: true });
            return;
        }

        var table =
            new AsciiTable3()
                .setHeading('Player', 'DKP', 'Attendance %', 'Max bid')
                .setAlign(3, AlignmentEnum.CENTER)
                .addRowMatrix(data);

        await interaction.reply('```\n' + table.toString() + '\n```', { ephemeral: true });
    },
};