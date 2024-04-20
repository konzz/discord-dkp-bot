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
        const itemSearch = new ItemSearch();
        const items = await itemSearch.searchItem(search);

        logger.itemsSearchToEmbed(interaction, items, false);
    },
};