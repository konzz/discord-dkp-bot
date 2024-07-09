require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');
const ItemSearch = require('../ItemSearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchitem')
        .setDescription('Search an item in TAKP database')
        .addStringOption(option => option.setName('search').setDescription('Item name or id').setRequired(true)),
    async execute(interaction, manager, logger) {
        await interaction.deferReply();
        const search = interaction.options.getString('search');

        if (process.env.LOG_LEVEL === 'DEBUG') {
            console.log(`Executed searchitem command with search: ${search}`);
        }

        const itemSearch = new ItemSearch();
        const items = await itemSearch.searchItem(search);

        if (!items) {
            interaction.editReply({ content: 'No items found', ephemeral: true });
            return;
        }

        if (items.length && items.length > 25) {
            interaction.editReply({ embeds: [this.itemsToEmbededList(items)], ephemeral: true });
            return;
        }

        if (!Array.isArray(items)) {
            await logger.sendItemEmbed(interaction, items, false);
            return;
        }

        const itemId = await logger.itemsSearchToEmbed(interaction, items, false);
        if (!itemId) {
            return;
        }
        const item = await itemSearch.searchItem(itemId);
        await logger.sendItemEmbed(interaction, item, false);
    },
};