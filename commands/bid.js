const { SlashCommandBuilder } = require('discord.js');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bid')
        .setDescription('Bid on a long auction')
        .addStringOption(option => option.setName('auctionid').setDescription('auctionid').setRequired(true))
        .addIntegerOption(option => option.setName('dkps').setDescription('The ammount of dkps').setRequired(true))
        .addBooleanOption(option => option.setName('bidformain').setDescription('Bid for main').setRequired(false)),
    async execute(interaction, manager) {
        await interaction.deferReply({ ephemeral: true });
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
            if (process.env.LOG_LEVEL === 'DEBUG') {
                log(`Executed command bid`, {
                    user: interaction.user.id,
                    item: auction.item.name,
                    dkps: dkps,
                });
            }
            if (dkps === 0) {
                await manager.removeBid(guild, auctionId, player);
                await interaction.editReply({ content: `Removed bid on ${auction.item.name}`, ephemeral: true });
                return;
            }
            await manager.bid(guild, auctionId, dkps, player, bidForMain);
            await interaction.editReply({ content: `Bid ${dkps} DKPs as ${bidForMain ? 'MAIN' : 'ALT'}  on ${auction.item.name} `, ephemeral: true });
        }
        catch (err) {
            await interaction.editReply({ content: err.message, ephemeral: true });
        }
    },
    restricted: false,
};