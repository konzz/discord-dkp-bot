const { SlashCommandBuilder, Routes, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayersdkps')
        .setDescription('List all players and their current DKP'),
    async execute(interaction, manager, logger) {
        const guild = interaction.guild.id;
        const currentPage = 0;
        let { players, total } = await manager.listPlayers(guild, currentPage);

        if (total === 0) {
            await interaction.reply({ content: ':prohibited: No players found', ephemeral: true });
            return;
        }

        const totalPages = Math.ceil(total / 10);
        const currentPlayer = await manager.getPlayer(guild, interaction.user.id);

        const embed = logger.playerListToEmbed(players, currentPlayer);
        embed.author = {
            name: `${currentPage + 1}/${totalPages}`,
        };

        const previousPageButton = new ButtonBuilder().setCustomId('previousPage').setLabel('Previous Page').setDisabled(true).setStyle(ButtonStyle.Primary);
        const nextPageButton = new ButtonBuilder().setCustomId('nextPage').setLabel('Next Page').setStyle(ButtonStyle.Primary);
        if (totalPages === 1) {
            nextPageButton.setDisabled(true);
        }
        const row = new ActionRowBuilder().addComponents(previousPageButton, nextPageButton);

        interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        })

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ time: 120_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (i.customId === 'previousPage') {
                currentPage--;
            } else if (i.customId === 'nextPage') {
                currentPage++;
            }

            if (currentPage === 0) {
                previousPageButton.setDisabled(true);
            }

            if (currentPage === totalPages - 1) {
                nextPageButton.setDisabled(true);
            }

            const { players } = await manager.listPlayers(guild, currentPage);
            const currentPlayer = await manager.getPlayer(guild, interaction.user.id);

            const embed = logger.playerListToEmbed(players, currentPlayer);
            embed.author = {
                name: `${currentPage + 1}/${totalPages}`,
            };

            await i.update({
                embeds: [embed]
            });
        });

    },
};