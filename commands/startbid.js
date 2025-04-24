const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const ItemSearch = require('../search/ItemSearch');
const Auctioner = require('../Auctioner/Auctioner');
const { playSound } = require('../utils/Player.js');
const log = require('../debugger.js');

const itemSearch = new ItemSearch();

const winnerMessage = (auction) => {
    if (auction.winner) {
        return `<@${auction.winner.player}>${auction.winner.bidForMain ? '' : ' - alter'} for ${auction.winner.amount} dkp`;
    }

    if (auction.winners.length) {
        return auction.winners.map(winner => `<@${winner.player}>${winner.bidForMain ? '' : ' - alter'} for ${winner.amount} dkp`).join('\n');
    }

    return 'No winner';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startbid')
        .setDescription('start a bid for an item')
        .addStringOption(option => option.setName('search').setDescription('Item name or id').setRequired(true))
        .addIntegerOption(option => option.setName('minbid').setDescription('Minimum bid').setMinValue(0).setRequired(false))
        .addIntegerOption(option => option.setName('numitems').setDescription('Number of items').setMinValue(1).setRequired(false))
        .addStringOption(option => option.setName('database').setDescription('quarm | takp').setRequired(false)),
    async execute(interaction, manager, logger) {
        await interaction.deferReply({ ephemeral: true });
        const guild = interaction.guild;
        const guildConfig = await manager.getGuildOptions(interaction.guild.id) || {};
        const raidChannel = guildConfig.raidChannel;
        const search = interaction.options.getString('search');

        const minBid = interaction.options.getInteger('minbid') || guildConfig.minBid || 0;
        const numberOfItems = interaction.options.getInteger('numitems') || 1;
        const database = interaction.options.getString('database') || 'quarm';

        if (database !== 'quarm' && database !== 'takp') {
            interaction.editReply({ content: 'Invalid database option. Must be quarm or takp', ephemeral: true });
            return;
        }

        const items = await itemSearch.searchItem(search, database);

        if (!items) {
            interaction.editReply({ content: 'No items found', ephemeral: true });
            return;
        }

        if (items.length && items.length > 40) {
            interaction.editReply({ content: `List too long (${items.length}), refine search`, ephemeral: true });
            return;
        }

        if (items.length && items.length > 25) {
            interaction.editReply({ embeds: [logger.itemsToEmbededList(items)], ephemeral: true });
            return;
        }

        let item;
        if (!Array.isArray(items)) {
            item = items;
        } else {
            const itemId = await logger.itemsSearchToEmbed(interaction, items, true);
            if (!itemId) {
                return;
            }
            item = await itemSearch.searchItem(itemId, database);
        }

        const startAuctionMessage = await logger.sendItemEmbed(interaction, item, true);

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = startAuctionMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (i.customId.startsWith(`startbid_`)) {
                const officerRole = guildConfig.adminRole;
                await i.update({
                    content: `Bid started`,
                    embeds: [],
                    components: [],
                    ephemeral: false
                });
                collector.stop();

                let message;
                const callback = async (auction) => {
                    const embed = logger.itemToEmbed(auction.item, 5763719);
                    const row = new ActionRowBuilder();
                    const confirmButton = new ButtonBuilder().setCustomId('confirm_' + auction.id).setLabel('Confirm Winner/s').setStyle(ButtonStyle.Primary);
                    row.addComponents(confirmButton);
                    embed.fields = [
                        { name: 'Winner/s', value: winnerMessage(auction) },
                        { name: 'Bids', value: auction.bids.sort((a, b) => b.amount - a.amount).map(bid => `- ${bid.amount}${bid.bidForMain ? '' : ' - alter'}`).join('\n') }
                    ];

                    await message.edit({
                        embeds: [embed],
                        components: auction.winner || auction.winners.length ? [row] : []
                    });

                    if (auction.winner || auction.winners.length > 0) {
                        const collectorFilter = i => i.user.id === interaction.user.id; //|| i.member.roles.cache.has(officerRole);
                        const confirmWinCollector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 360_000, filter: collectorFilter });
                        confirmWinCollector.on('collect', async i => {
                            if (i.customId.startsWith('confirm_' + auction.id)) {
                                confirmWinCollector.stop();
                                confirmButton.setDisabled(true);
                                confirmButton.setLabel('Winner/s Confirmed').setStyle(ButtonStyle.Success);
                                await i.update({
                                    components: [row]
                                });

                                const raid = await manager.getActiveRaid(guild.id);
                                if (auction.winner) {
                                    await manager.removeDKP(guild.id, auction.winner.player, auction.winner.amount, auction.item.name, raid, auction.item);
                                    if (process.env.LOG_LEVEL === 'DEBUG') {
                                        log('Removing dkps from winer', {
                                            player: auction.winner.player,
                                            amount: auction.winner.amount,
                                            item: auction.item.name
                                        });
                                    }
                                }
                                else {
                                    auction.winners.forEach(async winner => {
                                        await manager.removeDKP(guild.id, winner.player, winner.amount, auction.item.name, raid, auction.item);
                                        if (process.env.LOG_LEVEL === 'DEBUG') {
                                            log('Removing dkps from winer', {
                                                player: auction.winner.player,
                                                amount: auction.winner.amount,
                                                item: auction.item.name
                                            });
                                        }
                                    });
                                }
                            }
                        });

                        confirmWinCollector.on('end', async (_collected, reason) => {
                            confirmButton.setDisabled(true);
                            if (reason === 'time') {
                                confirmButton.setLabel('Time for confirmation ended').setStyle(ButtonStyle.Success);
                                try {
                                    await message.edit({
                                        components: [row]
                                    });
                                }
                                catch (e) {
                                    console.log(e);
                                }
                            }
                        });
                    }
                };

                const bidTime = guildConfig.bidTime + 5;
                const startedAuction = await Auctioner.instance.startAuction(
                    item,
                    guild.id,
                    callback,
                    {
                        minBid,
                        duration: bidTime * 1000,
                        numberOfItems,
                        minBidToLockForMain: guildConfig.minBidToLockForMain,
                        overBidtoWinMain: guildConfig.overBidtoWinMain,
                        checkAttendance: false
                    }
                );
                message = await logger.sendAuctionStartEmbed(guildConfig, startedAuction, minBid, numberOfItems);

                playSound(guild, raidChannel, '../assets/bell.mp3');
            }
        });
    },
    restricted: true
};