const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const ItemSearch = require('../ItemSearch');
const Auctioner = require('../Auctioner/Auctioner');
const { playSound } = require('../utils/Player.js');
const client = require('../db');

const itemSearch = new ItemSearch();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startbid')
        .setDescription('start a bid for an item')
        .addStringOption(option => option.setName('search').setDescription('Item name or id').setRequired(true)),
    async execute(interaction, manager, logger) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild;
        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const raidChannel = guildConfig.raidChannel;
        const search = interaction.options.getString('search');
        const items = await itemSearch.searchItem(search);

        if (!items) {
            interaction.editReply({ content: 'No items found', ephemeral: true });
            return;
        }

        await logger.itemsSearchToEmbed(interaction, items, true);

        if (items.length > 25) {
            return;
        }

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (i.customId.startsWith('startbid_')) {
                const itemId = i.customId.split('_')[1];
                const item = await itemSearch.searchItem(itemId);
                //get the channel id
                const officerRole = guildConfig.adminRole;
                await i.update({
                    content: `Bid started!`,
                    embeds: [],
                    components: [],
                    ephemeral: false
                });
                collector.stop();

                let message;
                const callback = async (auction) => {
                    const embed = logger.itemToEmbed(auction.item, 5763719);
                    const alterBid = auction.winner && !auction.winner.bidForMain;
                    const row = new ActionRowBuilder();
                    const confirmButton = new ButtonBuilder().setCustomId('confirm_' + auction.id).setLabel('Confirm Winner').setStyle(ButtonStyle.Primary);
                    row.addComponents(confirmButton);
                    const winnerMessage = auction.winner ? `<@${auction.winner.player}>${alterBid ? ' - alter' : ''} for ${auction.winner.amount} dkp` : 'No winner';
                    embed.fields = [
                        { name: 'Winner', value: winnerMessage },
                        { name: 'Bids', value: auction.bids.sort((a, b) => b.amount - a.amount).map(bid => `- ${bid.amount}${bid.bidForMain ? '' : ' - alter'}`).join('\n') }
                    ];

                    await message.edit({
                        embeds: [embed],
                        components: auction.winner ? [row] : []
                    });

                    const collectorFilter = i => i.user.id === interaction.user.id || i.member.roles.cache.has(officerRole);
                    const confirmWinCollector = message.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 360_000, filter: collectorFilter });
                    confirmWinCollector.on('collect', async i => {
                        if (i.customId.startsWith('confirm_' + auction.id)) {
                            confirmButton.setDisabled(true);
                            confirmButton.setLabel('Winner Confirmed').setStyle(ButtonStyle.Success);
                            const raid = await manager.getActiveRaid(guild.id);
                            await manager.removeDKP(guild.id, auction.winner.player, auction.winner.amount, auction.item.name, raid, auction.item);
                            await i.update({
                                components: [row]
                            });
                            confirmWinCollector.stop();
                        }
                    });

                    confirmWinCollector.on('end', async (_collected, reason) => {
                        confirmButton.setDisabled(true);
                        if (reason === 'time') {
                            confirmButton.setLabel('Time for confirmation ended').setStyle(ButtonStyle.Success);
                            await message.edit({
                                components: [row]
                            });
                        }
                    });
                };

                const bidTime = guildConfig.bidTime + 5;
                const startedAuction = await Auctioner.instance.startAuction(item, guild.id, callback, bidTime * 1000);
                message = await logger.sendAuctionStartEmbed(guildConfig, startedAuction);

                playSound(guild, raidChannel, '../assets/bell.mp3');
            }
        });
    },
    restricted: true
};