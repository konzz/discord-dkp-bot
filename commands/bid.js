const { SlashCommandBuilder } = require('discord.js');
const LogParser = require('../logParser/logParser');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bid')
        .setDescription('Bid on a long auction')
        .addStringOption(option => option.setName('auctionid').setDescription('auctionid').setRequired(true))
        .addIntegerOption(option => option.setName('dkps').setDescription('The ammount of dkps').setRequired(true))
        .addBooleanOption(option => option.setName('bidformain').setDescription('Bid for main').setRequired(false)),
    async execute(interaction, manager) {
        const guild = interaction.guild.id;
        const auctionId = interaction.options.getString('auctionid');
        const dkps = interaction.options.getInteger('dkps');
        let bidForMain = interaction.options.getBoolean('bidformain');
        if (bidForMain === null) {
            bidForMain = true;
        }
        const player = await manager.getPlayer(guild, interaction.user.id);
        try {
            const auction = await manager.getAuction(guild, auctionId);
            await manager.bid(guild, auctionId, dkps, player, bidForMain);
            await interaction.reply({ content: `Bid ${dkps} DKPs as ${bidForMain ? 'MAIN' : 'ALT'}  on ${auction.item.name} `, ephemeral: true });
        }
        catch (err) {
            console.error(err);
            await interaction.reply({ content: err.message, ephemeral: true });
        }
    },
    restricted: false,
};