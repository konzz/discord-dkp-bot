require('dotenv').config()
const { SlashCommandBuilder, Routes, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const uniqid = require('uniqid');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listplayersdkps')
        .setDescription('List all players and their current DKP'),
    async execute(interaction, manager, logger) {
        await interaction.deferReply({ ephemeral: true });
        const guildConfig = await manager.getGuildOptions(interaction.guild.id)
        const lastPlayerActivityInMs = guildConfig.raidDeprecationTime;
        const lastPlayerActivity = new Date(Date.now() - lastPlayerActivityInMs);

        if (process.env.LOG_LEVEL === 'DEBUG') {
            log(`Executed listplayersdkps command`, {
                user: interaction.user.id,
            });
        }
        const guild = interaction.guild.id;
        const alreadyActiveRaid = await manager.getActiveRaid(guild);
        if (alreadyActiveRaid) {
            await interaction.editReply({ content: `:prohibited: DKP Bot scowls at you. This command is forbiden during raids.`, ephemeral: true });
            return;
        }
        let currentPage = 0;
        const pageSize = 10;
        let { players, total } = await manager.listPlayers(guild, currentPage, pageSize, lastPlayerActivity);

        if (total === 0) {
            await interaction.editReply({ content: ':prohibited: No players found', ephemeral: true });
            return;
        }

        const totalPages = Math.ceil(total / pageSize);
        const currentPlayer = await manager.getPlayer(guild, interaction.user.id);

        const embed = logger.playerListToEmbed(players, currentPlayer, currentPage, pageSize);
        embed.author = {
            name: `${currentPage + 1}/${totalPages}`,
        };

        const id = uniqid();
        const previousPageButton = new ButtonBuilder().setCustomId(`previousPage_${id}`).setLabel('Previous Page').setDisabled(true).setStyle(ButtonStyle.Primary);
        const nextPageButton = new ButtonBuilder().setCustomId(`nextPage_${id}`).setLabel('Next Page').setStyle(ButtonStyle.Primary);
        if (totalPages === 1) {
            nextPageButton.setDisabled(true);
        }
        const row = new ActionRowBuilder().addComponents(previousPageButton, nextPageButton);

        const message = await interaction.editReply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        })

        const collectorFilter = i => i.user.id === interaction.user.id && i.customId.endsWith(id);
        const collector = message.createMessageComponentCollector({ time: 120_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (!i.customId.startsWith('previousPage') && !i.customId.startsWith('nextPage')) {
                return;
            }
            await i.deferUpdate();

            if (i.customId.startsWith('previousPage')) {
                currentPage--;
            } else if (i.customId.startsWith('nextPage')) {
                currentPage++;
            }

            if (currentPage <= 0) {
                previousPageButton.setDisabled(true);
            } else {
                previousPageButton.setDisabled(false);
            }

            if (currentPage >= totalPages - 1) {
                nextPageButton.setDisabled(true);
            } else {
                nextPageButton.setDisabled(false);
            }

            const { players } = await manager.listPlayers(guild, currentPage, pageSize, lastPlayerActivity);

            const embed = logger.playerListToEmbed(players, currentPlayer, currentPage, pageSize);
            embed.author = {
                name: `${currentPage + 1}/${totalPages}`,
            };

            await i.editReply({
                embeds: [embed],
                components: [row]
            });
        });

        collector.on('end', async () => {
            previousPageButton.setDisabled(true);
            nextPageButton.setDisabled(true);
            await interaction.editReply({
                components: [row]
            });
        });
    },
};