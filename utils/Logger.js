const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const Auctioner = require('../Auctioner/Auctioner');
const uniqid = require('uniqid');

//list of discord colors
const colors = {
    red: 15105570,
    green: 3066993,
    blue: 3447003,
    yellow: 16776960,
    purple: 10181046,
    orange: 15105570
}


module.exports = class Logger {
    constructor(client) {
        this.client = client;
    }

    playerChunks(label, players, chunkSize = 15) {

        if (!players.length) {
            return [{
                name: label,
                value: 'No players',
                inline: true
            }]
        }

        const playerChunks = [];
        while (players.length) {
            playerChunks.push(players.splice(0, chunkSize));
        }

        const playerFields = playerChunks.map((chunk, index) => {
            const name = index == 0 ? label : '\u200B';
            return {
                name,
                value: chunk.join('\n'),
                inline: true
            }
        })

        return playerFields;
    }

    async sendRaidEmebed(guildOptions, raid, playersInChannel, color, title, dkps = null) {
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
        const playerFields = this.playerChunks(`Players (${totalPlayers})`, players);

        try {
            await logChannel
                .send({
                    embeds: [{
                        color: color,
                        title,
                        fields: [
                            { name: "Time", value: `<t:${Math.floor(new Date().getTime() / 1000)}:t>`, inline: true },
                            { name: "DKPs", value: dkps || raid.dkpsPerTick, inline: true },
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

        const maxLogChunkSize = 35;
        const logChunks = [];
        while (log.length) {
            logChunks.push(log.splice(0, maxLogChunkSize));
        }

        for (const logChunk of logChunks) {
            const logIndex = logChunks.indexOf(logChunk);
            const title = `${raid.name} raid ended - *${logIndex + 1} of ${logChunks.length}*`;
            await logChannel
                .send({
                    embeds: [{
                        color: 15277667,
                        title: title,
                        description: logChunk.join('\n'),
                        fields: [
                            { name: "Date", value: `<t:${Math.floor(now / 1000)}:d> <t:${Math.floor(now / 1000)}:t>`, inline: true },
                            { name: "ID", value: raid._id, inline: true },
                        ]
                    }]
                })
        }
    }

    formatSeconds(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes > 0 ? minutes + 'm' : ''} ${remainingSeconds}s`;
    }

    itemsToButtonRows(items) {
        const buttons = items.map(item => new ButtonBuilder().setCustomId('selectitem_' + item.id).setLabel(item.name).setStyle(ButtonStyle.Secondary));
        const buttonGroups = [];
        while (buttons.length) {
            buttonGroups.push(buttons.splice(0, 5));
        }
        return buttonGroups.map(group => new ActionRowBuilder().addComponents(...group));
    }

    itemsToEmbededList(items) {
        return {
            title: 'Search Results',
            description: items.map(item => `#${item.id}${' '.repeat(10 - item.id.length)} ${item.name}${item.type ? ' - ' + item.type : ''}`).join('\n'),
        }
    }

    async sendItemEmbed(interaction, item, forAuction = true) {
        const row = new ActionRowBuilder();
        const button = new ButtonBuilder().setCustomId('startbid_' + item.id + '_' + uniqid()).setLabel('Start Auction').setStyle(ButtonStyle.Primary);
        row.addComponents(button);
        return interaction.editReply({
            embeds: [this.itemToEmbed(item)],
            components: forAuction ? [row] : [],
            ephemeral: forAuction
        });
    }

    async itemsSearchToEmbed(interaction, items, forAuction = true) {
        let resolve;
        let reject;
        const result = new Promise((_resolve, _reject) => {
            resolve = _resolve;
            reject = _reject;
        });

        const rows = this.itemsToButtonRows(items);
        await interaction.editReply({
            content: 'Search Results',
            components: [...rows],
            ephemeral: forAuction
        });

        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30_000, filter: collectorFilter });
        collector.on('collect', async i => {
            if (i.customId.startsWith('selectitem_')) {
                const itemId = i.customId.split('_')[1];
                resolve(itemId);
            }
        });

        collector.on('end', async (_collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({ content: 'Time out', components: [] });
                resolve()
            }
        });

        return result;
    };

    async sendLongAuctionEmbed(guildOptions, auction, minBid = 0, numberOfItems = 1) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const channel = discordGuild.channels.cache.get(guildOptions.auctionChannel);

        let durationInMiliseconds = auction.auctionEnd - new Date().getTime();
        if (durationInMiliseconds < 0) {
            durationInMiliseconds = 0;
        }

        const embed = this.itemToEmbed(auction.item, colors.blue);
        const hours = Math.floor(durationInMiliseconds / 1000 / 60 / 60);
        const minutes = Math.floor((durationInMiliseconds / 1000 / 60) % 60);
        const seconds = Math.floor((durationInMiliseconds / 1000) % 60);
        const duration = `${hours}h ${minutes}m ${seconds}s`;

        embed.fields = [
            {
                name: 'Auction ID',
                value: "```" + auction._id + "```",
                inline: true
            },
            {
                name: 'Time left',
                value: `${duration}`,
                inline: true
            }
        ]
        const message = await channel.send({
            content: `Bid started - **${minBid} DKP** minimum bid. ${numberOfItems > 1 ? `Top **${numberOfItems}** bids win` : ''}`,
            embeds: [embed]
        })
        //return embed identifier
        return message.id;
    }

    async updateLongAuctionEmbed(guildOptions, auction) {
        //using discordJS update the message embed fields
        const longAuctionsChannel = guildOptions.longAuctionsChannel || guildOptions.auctionChannel;
        const messageId = auction.messageId;
        if (!messageId) {
            console.log('No messageId found for auction');
            return;
        }
        const channel = await this.client.channels.cache.get(longAuctionsChannel);
        const message = await channel.messages.fetch(messageId);
        if (!message) {
            console.log('Message not found');
            return;
        }
        let durationInMiliseconds = auction.auctionEnd - new Date().getTime();
        if (durationInMiliseconds < 0) {
            durationInMiliseconds = 0;
        }
        const hours = Math.floor(durationInMiliseconds / 1000 / 60 / 60);
        const minutes = Math.floor((durationInMiliseconds / 1000 / 60) % 60);
        const seconds = Math.floor((durationInMiliseconds / 1000) % 60);
        const duration = `${hours}h ${minutes}m ${seconds}s`;
        const hasWinners = auction.winners && auction.winners.length > 0;

        const embed = this.itemToEmbed(auction.item, hasWinners ? colors.green : colors.blue);
        embed.fields = [
            {
                name: 'Auction ID',
                value: "```" + auction._id + "```",
                inline: true
            },
            {
                name: 'Time left',
                value: `${duration}`,
                inline: true
            }
        ]

        if (hasWinners) {
            embed.fields.push({
                name: 'Winner/s',
                value: auction.winners.map(winner => `<@${winner.player}> - ${winner.amount} ${winner.bidForMain ? '' : 'Alt'}`).join('\n'),
                inline: false
            })
        }
        if (hasWinners && auction.bids && auction.bids.length) {
            embed.fields.push({
                name: 'Bids',
                value: auction.bids.map(bid => `${bid.amount} ${bid.bidForMain ? '' : 'Alt'}`).join('\n'),
                inline: false
            })
        }
        await message.edit({
            embeds: [embed]
        })
    }

    async sendAuctionStartEmbed(guildOptions, auction, minBid = 0, numberOfItems = 1) {
        const discordGuild = await this.client.guilds.fetch(guildOptions.guild);
        const channel = discordGuild.channels.cache.get(guildOptions.auctionChannel);

        const bidTime = guildOptions.bidTime;
        const officerRole = guildOptions.adminRole;
        if (!channel) {
            return;
        }

        const button = new ButtonBuilder().setCustomId('bid_' + auction.id).setLabel('I want to bid').setStyle(ButtonStyle.Primary);
        const buttonAlt = new ButtonBuilder().setCustomId('bid_alt' + auction.id).setLabel('Bid for Alter').setStyle(ButtonStyle.Secondary)
        const timeButton = new ButtonBuilder().setCustomId('time_' + auction.id).setLabel(this.formatSeconds(bidTime)).setStyle(ButtonStyle.Secondary).setDisabled(true);
        const cancelButton = new ButtonBuilder().setCustomId('cancel_' + auction.id).setLabel('Cancel').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(button, buttonAlt, timeButton, cancelButton);

        const embed = this.itemToEmbed(auction.item, 15105570);
        const message = await channel.send({
            content: `Bid started - **${minBid} DKP** minimum bid. ${numberOfItems > 1 ? `Top **${numberOfItems}** bids win` : ''}`,
            embeds: [embed],
            components: [row]
        })

        let seconds = bidTime;
        let lastUpdate = Date.now();
        const updateMessage = async () => {
            while (seconds > 0) {
                const now = Date.now();
                const deltaSeconds = Math.round((now - lastUpdate) / 1000);

                seconds -= deltaSeconds;
                lastUpdate = now;

                timeButton.setLabel(this.formatSeconds(seconds));
                if (seconds < 1) {
                    button.setDisabled(true);
                    buttonAlt.setDisabled(true);
                }

                if (seconds < 11) {
                    timeButton.setStyle(ButtonStyle.Danger);
                }

                if (seconds >= 3 && auction.auctionActive) {
                    await message.edit({ components: [row] });
                }

                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        updateMessage();

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: bidTime * 1000 });
        collector.on('collect', async i => {
            if (i.customId.startsWith('bid_')) {
                i.deferUpdate();
                const forMain = !i.customId.startsWith('bid_alt');
                const user = i.user.id;
                let dmChannel;
                try {
                    dmChannel = await discordGuild.members.fetch(user).then(m => m.createDM());
                    await dmChannel.send({
                        content: `How much do you want to ${forMain ? '`MAIN`' : '`ALT`'} bid on ${auction.item.name}?, 0 to cancel`,
                    });
                } catch (e) {
                    await i.reply({ content: 'Failed to send DM', ephemeral: true });
                    return;
                }

                const dmCollector = dmChannel.createMessageCollector({ time: 60000, filter: m => m.author.id === user });
                dmCollector.on('collect', async m => {
                    const amount = parseInt(m.content);
                    if (amount === 0) {
                        await dmChannel.send('Bid cancelled');
                        dmCollector.stop();
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

            if (i.customId.startsWith('cancel_')) {
                if (!i.member.roles.cache.has(officerRole)) {
                    i.reply({ content: ':Prohibited: You dont have permissions, what do you want your tombstone to say?', ephemeral: true });
                    return;
                }
                i.deferUpdate();
                await Auctioner.instance.cancelAuction(auction.id);
                cancelButton.setDisabled(true);
                cancelButton.setLabel('Auction Cancelled');
                const row = new ActionRowBuilder().addComponents(cancelButton);
                message.edit({ embeds: [{ ...embed, color: colors.red }], components: [row] });
                collector.stop();
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