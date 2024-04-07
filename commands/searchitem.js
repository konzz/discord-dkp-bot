const { SlashCommandBuilder } = require('discord.js');
const ItemSearch = require('../ItemSearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchitem')
        .setDescription('Search an item in TAKP database')
        .addStringOption(option => option.setName('search').setDescription('Item name or id').setRequired(true)),
    async execute(interaction, manager) {
        const search = interaction.options.getString('search');
        const itemSearch = new ItemSearch();
        const items = await itemSearch.searchItem(search);

        if (!items) {
            interaction.reply({
                embeds: [{
                    title: 'No results found for ' + search
                }]
            });

            return;
        }

        if (Array.isArray(items)) {

            interaction.reply({
                embeds: [{
                    title: 'Search Results for ' + search,
                    description: items.map(item => `#${item.id}${' '.repeat(10 - item.id.length)}${item.name} - ${item.type}`).join('\n')
                }]
            });

            return;
        }

        let separator = '--------------------------------------------------------\n';
        await interaction.reply({
            embeds: [{
                title: items.name + ' #' + items.id,
                description: separator + items.data,
                url: items.url,
                thumbnail: { url: items.image },
            }]
        });
    },
};