require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');
const ItemSearch = require('../search/ItemSearch');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchitem')
        .setDescription('Search an item in TAKP database')
        .addStringOption(option => option.setName('search').setDescription('Item name or id').setRequired(true))
        .addStringOption(option => option.setName('database').setDescription('quarm | takp').setRequired(false)),
    async execute(interaction, manager, logger) {
        await interaction.deferReply();
        const search = interaction.options.getString('search');
        const database = interaction.options.getString('database') || 'quarm';
        if (database !== 'quarm' && database !== 'takp') {
            interaction.editReply({ content: 'Invalid database option. Must be quarm or takp', ephemeral: true });
            return;
        }

        if (process.env.LOG_LEVEL === 'DEBUG') {
            log(`Executed searchitem command`, {
                search,
                database
            });
        }

        const itemSearch = new ItemSearch();
        const items = await itemSearch.searchItem(search, database);

        if (!items) {
            interaction.editReply({ content: 'No items found', ephemeral: true });
            return;
        }

        if (items.length && items.length > 25) {
            interaction.editReply({ embeds: [logger.itemsToEmbededList(items, database)], ephemeral: true });
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
        const item = await itemSearch.searchItem(itemId, database);
        await logger.sendItemEmbed(interaction, item, false);
    },
};