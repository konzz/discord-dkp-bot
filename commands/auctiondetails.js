require('dotenv').config()
const { SlashCommandBuilder } = require('discord.js');
const log = require('../debugger.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auctiondetails')
        .setDescription('Show the details of an auction')
        .addStringOption(option => option.setName('auctionid').setDescription('The auction id').setRequired(true)),
    async execute(interaction, manager) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild.id;
        const auctionid = interaction.options.getString('auctionid');
        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};

        if (process.env.LOG_LEVEL === 'DEBUG') {
            log(`Executed auctiondetails command`, {
                auctionid: auctionid,
            });
        }

        const auction = await manager.getAuction(guild, auctionid);
        //send message to log channel telling everyone someone used the command
        const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannel);
        if (logChannel) {
            await logChannel.send({ content: `<@${interaction.user.id}>` + " used `/auctiondetails` to peek under the hood :eyes:" });
        }

        let message = `Auction details: ${auction.item.name} - ${auction._id}\n`;
        message += `Number of items: ${auction.numberOfItems}\n`;
        message += `Bids:\n`;
        auction.bids.forEach(bid => {
            message += `- <@${bid.player}> - ${bid.amount} - ${bid.bidForMain ? 'MAIN' : 'ALT'}\n`;
        });
        message += `Winners:\n`;
        auction.winners.forEach(winner => {
            message += `- <@${winner.player}> - ${winner.amount} - ${winner.bidForMain ? 'MAIN' : 'ALT'}\n`;
        });
        await interaction.editReply(message, { ephemeral: true });
    },
    restricted: true,
};