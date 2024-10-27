require('dotenv').config()
const uniqid = require('uniqid');
const { SlashCommandBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchlogs')
        .setDescription('Search logs for an specific comment')
        .addStringOption(option => option.setName('search').setDescription('Search term').setRequired(true)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const search = interaction.options.getString('search');

        //regex to check if searching for 'Tick' or 'tick' or any other case
        const regex = new RegExp(/tick/i);
        const isSearchingForTick = regex.test(search);
        if (isSearchingForTick) {
            return interaction.reply({ content: 'DKP - bot scowls at you. What do you want your tombstone to say?', ephemeral: true });
        }

        const logs = await manager.searchLogs(guild, search);
        if (logs.length === 0) {
            return interaction.reply({ content: 'No logs found', ephemeral: true });
        }

        const entriesPerPage = 20;
        const pages = Math.ceil(logs.length / entriesPerPage);
        let currentPage = 0;
        const id = uniqid();
        const previousPageButton = new ButtonBuilder().setCustomId(`previousPage_${id}`).setLabel('Previous Page').setDisabled(true).setStyle(ButtonStyle.Primary);
        const nextPageButton = new ButtonBuilder().setCustomId(`nextPage_${id}`).setLabel('Next Page').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(previousPageButton, nextPageButton);
        const logsEmbed = {
            color: 0x0099ff,
            title: `Logs for: ${search} (${logs.length} results)`,
            description: logs.slice(currentPage * entriesPerPage, (currentPage + 1) * entriesPerPage).map(log => {
                const playerDiscordUser = interaction.guild.members.cache.get(log.player);
                const displayName = playerDiscordUser.nickname || playerDiscordUser.user.globalName || playerDiscordUser.user.username;
                return `- <t:${Math.floor(log.date / 1000)}:d>  **${log.dkp}** ${log.item ? `[${log.item.name}](${log.item.url})` : `*${log.comment}*`} ` + "`" + displayName + "`";
            }).join('\n'),
            footer: {
                text: `${currentPage + 1}/${pages}`,
            },
        };

        await interaction.reply({ embeds: [logsEmbed], components: [row], ephemeral: true });

        const collectorFilter = i => i.user.id === interaction.user.id && i.customId.endsWith(id);
        const collector = interaction.channel.createMessageComponentCollector({ time: 120_000, filter: collectorFilter });
        collector.on('collect', async i => {
            await i.deferUpdate();
            if (i.customId.startsWith('previousPage')) {
                currentPage--;
            } else if (i.customId.startsWith('nextPage')) {
                currentPage++;
            }

            previousPageButton.setDisabled(currentPage === 0);
            nextPageButton.setDisabled(currentPage === pages - 1);

            logsEmbed.description = logs.slice(currentPage * entriesPerPage, (currentPage + 1) * entriesPerPage).map(log => {
                const playerDiscordUser = interaction.guild.members.cache.get(log.player);
                const displayName = playerDiscordUser.nickname || playerDiscordUser.user.globalName || playerDiscordUser.user.username;
                return `- <t:${Math.floor(log.date / 1000)}:d>  **${log.dkp}** ${log.item ? `[${log.item.name}](${log.item.url})` : `*${log.comment}*`}` + "`" + displayName + "`";
            }).join('\n');
            logsEmbed.footer.text = `${currentPage + 1}/${pages}`;

            await i.editReply({ embeds: [logsEmbed], components: [row] });
        });

        collector.on('end', async () => {
            previousPageButton.setDisabled(true);
            nextPageButton.setDisabled(true);
            await interaction.editReply({ embeds: [logsEmbed], components: [row], ephemeral: true });
        });
    },
    restricted: true,
};