const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const Auctioner = require('../Auctioner/Auctioner');
const ItemSearch = require('../ItemSearch');
const uniqid = require('uniqid');

const itemSearch = new ItemSearch();

module.exports = class Logger {
    constructor(client) {
        this.client = client;
    }

    async sendRaidEmebed(guildOptions, raid, playersInChannel, color, title, logMessage = null) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const logChannel = discordGuild.channels.cache.get(guildOptions.logChannel);

        if (!logChannel) {
            return;
        }

        let players = await Promise.all(playersInChannel.map(async p => {
            const player = await discordGuild.members.fetch(p);
            return `- ${player.nickname || player.user.globalName || player.user.username}`;
        }));

        players = players.sort();

        const totalPlayers = players.length;

        const playerChunks = [];
        while (players.length) {
            playerChunks.push(players.splice(0, 15));
        }

        const playerFields = playerChunks.map((chunk, index) => {
            const name = index == 0 ? `Players (${totalPlayers})` : '\u200B';
            return {
                name,
                value: chunk.join('\n'),
                inline: true
            }
        })

        try {
            await logChannel
                .send({
                    embeds: [{
                        color: color,
                        title,
                        fields: [
                            { name: "Time", value: `<t:${Math.floor(new Date().getTime() / 1000)}:t>`, inline: true },
                            { name: "DKPs", value: raid.dkpsPerTick, inline: true },
                            { name: '\u200B', value: '\u200B' },
                            ...playerFields,
                        ],
                    }]
                })
        } catch (e) {
            logChannel.send(':prohibited: ' + e);
        }
    }

    async sendRaidEndEmbed(guildOptions, raid, log) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const logChannel = discordGuild.channels.cache.get(guildOptions.logChannel);

        if (!logChannel) {
            return;
        }
        const now = new Date().getTime();

        await logChannel
            .send({
                embeds: [{
                    color: 15277667,
                    title: `${raid.name} raid ended`,
                    description: log.join('\n'),
                    fields: [
                        { name: "Date", value: `<t:${Math.floor(now / 1000)}:d> <t:${Math.floor(now / 1000)}:t>` },
                    ]
                }]
            })
    }

    formatSeconds(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes > 0 ? minutes + 'm' : ''} ${remainingSeconds}s`;
    }

    async itemsSearchToEmbed(interaction, items, forAuction = true) {
        if (!items) {
            interaction.reply({ content: 'No items found', ephemeral: true });
            return;
        }

        if (Array.isArray(items)) {
            const buttons = items.map(item => new ButtonBuilder().setCustomId('selectitem_' + item.id).setLabel(item.name).setStyle(ButtonStyle.Secondary));

            if (buttons.length > 25) {
                interaction.reply({
                    embeds: [{
                        title: 'Search Results',
                        description: items.map(item => `#${item.id}${' '.repeat(10 - item.id.length)}${item.name} - ${item.type}`).join('\n'),
                        ephemeral: true
                    }]
                });

                return;
            }

            const buttonGroups = [];
            while (buttons.length) {
                buttonGroups.push(buttons.splice(0, 5));
            }
            const rows = buttonGroups.map(group => new ActionRowBuilder().addComponents(...group));
            await interaction.reply({
                content: 'Search Results',
                components: [...rows],
                ephemeral: true
            });
        } else {
            const row = new ActionRowBuilder();
            const button = new ButtonBuilder().setCustomId('startbid_' + items.id + '_' + uniqid()).setLabel('Start Auction').setStyle(ButtonStyle.Primary);
            row.addComponents(button);
            await interaction.reply({
                embeds: [this.itemToEmbed(items)],
                components: forAuction ? [row] : [],
                ephemeral: true
            });
        }

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (i.customId.startsWith('selectitem_')) {
                const itemId = i.customId.split('_')[1];
                const item = await itemSearch.searchItem(itemId);
                const button = new ButtonBuilder().setCustomId('startbid_' + itemId + '_' + uniqid()).setLabel('Start Auction').setStyle(ButtonStyle.Primary);
                const row = new ActionRowBuilder();
                row.addComponents(button);
                await i.update({
                    embeds: [this.itemToEmbed(item)],
                    components: forAuction ? [row] : [],
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            await interaction.editReply({ content: 'Time out', components: [] });
        });
    };

    async sendAuctionStartEmbed(guildOptions, auction) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const logChannel = discordGuild.channels.cache.get(guildOptions.logChannel);
        const bidTime = guildOptions.bidTime;

        if (!logChannel) {
            return;
        }

        const button = new ButtonBuilder().setCustomId('bid_' + auction.id).setLabel('I want to bid').setStyle(ButtonStyle.Primary);
        const buttonAlt = new ButtonBuilder().setCustomId('bid_alt' + auction.id).setLabel('Bid for Alter').setStyle(ButtonStyle.Secondary)
        const timeButton = new ButtonBuilder().setCustomId('time_' + auction.id).setLabel(this.formatSeconds(bidTime)).setStyle(ButtonStyle.Secondary).setDisabled(true);
        const row = new ActionRowBuilder().addComponents(button, buttonAlt, timeButton);

        const message = await logChannel.send({
            content: '@everyone Bid started.',
            embeds: [this.itemToEmbed(auction.item, 15105570)],
            components: [row]
        })

        let seconds = bidTime;
        const interval = setInterval(() => {
            timeButton.setLabel(this.formatSeconds(seconds));
            if (seconds < 1) {
                button.setDisabled(true);
                buttonAlt.setDisabled(true);
            }

            if (seconds < 11) {
                timeButton.setStyle(ButtonStyle.Danger);
            }
            message.edit({ components: [row] });
            seconds--;
            if (seconds < 0) {
                clearInterval(interval);
            }
        }, 1000);

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: bidTime * 1000 });
        collector.on('collect', async i => {
            if (i.customId.startsWith('bid_')) {
                i.deferUpdate();
                const forMain = !i.customId.startsWith('bid_alt');
                const user = i.user.id;
                const dmChannel = await discordGuild.members.fetch(user).then(m => m.createDM());
                await dmChannel.send({
                    content: 'How much do you want to bid on ' + auction.item.name + '?',
                });

                const dmCollector = dmChannel.createMessageCollector({ time: 60000, filter: m => m.author.id === user });
                dmCollector.on('collect', async m => {
                    const amount = parseInt(m.content);
                    if (isNaN(amount)) {
                        await dmChannel.send('Invalid amount');
                        return;
                    }

                    try {
                        await Auctioner.instance.bid(guildOptions.guild, auction.id, amount, user, forMain);
                        await dmChannel.send('Bid placed');
                        dmCollector.stop();
                    } catch (e) {
                        await dmChannel.send(e.message);
                    }
                });
            }
        })

        return message;
    }

    playerListToEmbed(players, currentPlayer, currentPage = 0, pageSize = 10) {
        const space = ' ';
        const separatorLine = '\n-----------------------------------------\n';
        const separatorLine2 = '\n--------------------------\n';

        const playerNames = players.map((row, index) => {
            const position = (index + 1) + (currentPage * pageSize);
            return '| `' + position.toString().padStart(2, ' ') + '`: <@' + row.player + '>';
        });

        const playerData = players.map((row) => {
            const attendance = row.attendance + '%';
            return '| `' + row.current.toString().padStart(6, ' ') + ' ` |' + space.repeat(5) + '`' + attendance.padStart(4, ' ').padEnd(5, ' ').padStart(6, ' ') + '`' + space.repeat(5) + '|';
        });



        const currentPlayerName = '| `' + currentPlayer.position.toString().padStart(2, ' ') + '`: <@' + currentPlayer.player + '>';
        const currentPlayerAttendance = currentPlayer.attendance + '%';
        const currentPlayerData = '| `' + currentPlayer.current.toString().padStart(6, ' ') + ' ` |' + space.repeat(5) + '`' + currentPlayerAttendance.padStart(4, ' ').padEnd(5, ' ').padStart(6, ' ') + '`' + space.repeat(5) + '|';

        const columnOneHeader = '| # | **Player Name**' + separatorLine;
        const columnTwoHeader = '| ' + space.repeat(5) + '**DKP** ' + space.repeat(5) + '| **Attendance** |' + separatorLine2;

        return {
            color: 0x0099ff,
            fields: [
                {
                    name: '\u200B',
                    value: columnOneHeader + playerNames.join(separatorLine) + separatorLine + separatorLine + currentPlayerName + separatorLine,
                    inline: true
                },
                {
                    name: '\u200B',
                    value: columnTwoHeader + playerData.join(separatorLine2) + separatorLine2 + separatorLine2 + currentPlayerData + separatorLine2,
                    inline: true
                }
            ]

        };

    }

    itemToEmbed(item, color = 3447003) {
        let separator = '--------------------------------------------------------\n';
        return {
            color,
            title: item.name + ' #' + item.id,
            description: separator + item.data,
            url: item.url,
            thumbnail: { url: item.image },
        }
    }
}