const { ObjectId } = require("mongodb");

module.exports = class DKPManager {
    constructor(dbClient) {
        this.dbClient = dbClient;
        const db = this.dbClient.db('DKP');

        this.raids = db.collection(`raids`);
        this.players = db.collection(`players`);
        this.guildOptions = db.collection(`options`);
        this.auctions = db.collection(`auctions`);
    }

    async createRaid(guild, name, tickDuration = 60000 * 60, dkpsPerTick = 1, eventId = null) {
        const alreadyActiveRaid = await this.raids.findOne({ guild, active: true });
        if (alreadyActiveRaid) {
            throw new Error('There is already an active raid');
        }

        const date = new Date().getTime();
        const result = await this.raids.insertOne({
            guild,
            name,
            date,
            attendance: [],
            tickDuration,
            dkpsPerTick,
            active: true,
            deprecated: false,
            eventId,
        });

        return this.raids.findOne({ _id: result.insertedId });
    }

    async addRaidAttendance(guild, raid, players, comment, dkps) {
        const date = new Date().getTime();
        return this.raids.updateOne({ _id: raid._id, guild }, { $push: { attendance: { players, comment, date, dkps } } });
    }

    async getActiveRaid(guild) {
        return this.raids.findOne({ guild, active: true });
    }

    async getRaidById(guild, raidId) {
        return await this.raids.findOne({ _id: raidId, guild });
    }

    async endRaid(guild) {
        return this.raids.updateOne({ active: true, guild }, { $set: { active: false } });
    }

    async getRaidDKPMovements(guild, raidId) {
        const raid = await this.raids.findOne({ _id: raidId, guild }, { projection: { attendance: 1 } });
        //group attendance entries by comment untill different comment is found
        const attendance = raid.attendance.reduce((acc, entry, index) => {
            if (index === 0) {
                acc.push({ comment: entry.comment, dkps: entry.dkps, date: entry.date });
            }
            else if (entry.comment !== raid.attendance[index - 1].comment) {
                acc.push({ comment: entry.comment, dkps: entry.dkps, date: entry.date });
            }
            else if (entry.comment === raid.attendance[index - 1].comment) {
                acc[acc.length - 1].dkps += entry.dkps;
            }
            return acc;
        }, []);

        if (!raid) {
            throw new Error('Raid not found');
        }

        const loots = await this.players.aggregate([
            { $match: { guild } },
            { $unwind: '$log' },
            { $match: { 'log.raid._id': raidId, 'log.dkp': { $lt: 0 } } },
            { $project: { player: 1, dkps: '$log.dkp', comment: '$log.comment', date: '$log.date', _id: 0, item: '$log.item' } },
        ]).toArray();

        return [...loots, ...raid.attendance].sort((a, b) => a.date - b.date);
    }

    async deprecateOldRaids(guild, time) {
        return this.raids.updateMany({ guild, date: { $lt: time } }, { $set: { deprecated: true } });
    }

    async addDKP(guild, player, dkp, comment, raid = null) {
        return this.players.findOneAndUpdate(
            { player, guild },
            {
                $inc: { current: dkp },
                $push: {
                    log: {
                        dkp: dkp,
                        comment,
                        date: new Date().getTime(),
                        raid: raid ? { _id: raid._id, name: raid.name } : null,
                    },
                },
                $setOnInsert: { creationDate: new Date().getTime() },
            },
            { upsert: true },
        );
    }

    async removeDKP(guild, player, dkp, comment, raid = null, item = null) {
        return this.players.findOneAndUpdate(
            { player, guild },
            {
                $inc: { current: -dkp },
                $push: {
                    log: {
                        dkp: -dkp,
                        comment,
                        date: new Date().getTime(),
                        raid: raid ? { _id: raid._id, name: raid.name } : null,
                        item,
                    },
                },
                $setOnInsert: { creationDate: new Date().getTime() },
            },
            { upsert: true },
        );
    }

    async addByCharacter(guild, character, dkp, comment, raid = null) {
        const characterRegistered = await this.players.findOne({ characters: character });

        if (!characterRegistered) {
            throw new Error(`Character ${character} not registered`);
        }

        return this.players.findOneAndUpdate(
            { characters: character, guild },
            {
                $inc: { current: dkp },
                $push: {
                    log: {
                        dkp: dkp,
                        comment,
                        date: new Date().getTime(),
                        raid: raid ? { _id: raid._id, name: raid.name } : null,
                    },
                },
                $setOnInsert: { creationDate: new Date().getTime() },
            },
            { upsert: false },
        );
    }

    calculatePlayerAttendance(player, raids) {
        const totalAttendancePossibleSincePlayerJoined = raids.reduce((total, raid) => {
            if (raid.date < player.creationDate) {
                return raid.attendance.filter((attendance) => attendance.date >= player.creationDate).length + total;
            };
            return total + raid.attendance.length;
        }, 0);


        if (totalAttendancePossibleSincePlayerJoined === 0) {
            return { ...player, attendance: 100 };
        }

        const playerAttendedRaids = raids.reduce((total, raid) => {
            const playerAttendance = raid.attendance.filter((attendance) => attendance.players.includes(player.player));
            return total + playerAttendance.length;
        }, 0);

        const attendance = parseFloat(((playerAttendedRaids / totalAttendancePossibleSincePlayerJoined) * 100).toFixed(2));

        return { ...player, attendance };
    }

    async getPlayerDKP(guild, player) {
        const playerData = await this.players.findOne({ player, guild });
        if (!playerData) {
            throw new Error('Player not found');
        }
        return playerData.current;
    }

    async getPlayer(guild, playerId, withAttendance = true) {

        const player = await this.players.findOne({ player: playerId, guild });
        if (!player) {
            throw new Error('Player not found');
        }
        //get player position based on current dkp
        //const players = await this.players.find({ guild }).sort({ current: -1 }).toArray();
        //const position = players.findIndex(p => p.player === playerId) + 1;
        const position = 0;
        if (!withAttendance) {
            return { ...player, position };
        }

        const raids = await this.raids.find({ guild, deprecated: false }).toArray();
        return this.calculatePlayerAttendance({ ...player, position }, raids);
    }

    async listPlayers(guild, page = 0, pageSize = 10, lastPlayerActivity = null) {
        try {
            const query = { guild };
            if (lastPlayerActivity) {
                const cutoffTime = new Date().getTime() - lastPlayerActivity;
                query['log.date'] = { $gte: cutoffTime };
            }

            const players = await this.players.find(query)
                .sort({ current: -1 })
                .skip(page * pageSize)
                .limit(pageSize)
                .toArray();

            const raids = await this.raids.find({ guild, deprecated: false }).toArray();

            return {
                players: players.map(player => this.calculatePlayerAttendance(player, raids)),
                total: await this.players.countDocuments(query)
            };
        }
        catch (e) {
            console.log('Error listing players', e);
            return [];
        }
    }

    async getAll(guild, collection) {
        if (!this[collection]) {
            throw new Error(`Collection ${collection} not found`);
        }
        return this[collection].find({ guild }).toArray();
    }

    async searchLogs(guild, searchterm) {
        //search in all Logs for an specific term and return the logs order by date with the player
        const logs = await this.players.aggregate([
            { $match: { guild } },
            { $unwind: '$log' },
            { $match: { 'log.comment': { $regex: searchterm, $options: 'i' } } },
            { $project: { player: 1, dkp: '$log.dkp', comment: '$log.comment', date: '$log.date', item: '$log.item' } },
        ]).toArray();
        return logs.sort((a, b) => a.date - b.date);
    }

    async addCharacter(guild, player, character) {
        const alreadyRegistered = await this.players.findOne({ characters: character, guild });

        if (alreadyRegistered) {
            throw new Error(`Character ${character} already registered`);
        }

        return this.players.findOneAndUpdate({ player, guild, characters: { $nin: [character] } }, { $push: { characters: character } });
    }

    async saveGuildOptions(guild, options) {
        return this.guildOptions.findOneAndUpdate({ guild }, { $set: options }, { upsert: true });
    }

    async getGuildOptions(guild) {
        return this.guildOptions.findOne({ guild });
    }

    async createAution(guild, item, minBid, numberOfItems, minBidToLockForMain, overBidtoWinMain, duration) {
        const auction = {
            guild,
            item,
            minBid,
            numberOfItems,
            minBidToLockForMain,
            overBidtoWinMain,
            bids: [],
            auctionActive: true,
            createdAt: new Date().getTime(),
            auctionEnd: new Date().getTime() + duration,
        };

        const result = await this.auctions.insertOne(auction);
        return this.auctions.findOne({ _id: result.insertedId });
    }

    async getAuction(guild, auctionId) {
        const auction = await this.auctions.findOne({ _id: new ObjectId(auctionId), guild });
        if (!auction) {
            throw new Error('Auction not found');
        }
        return auction;
    }

    async getActiveAuctions(guild) {
        return this.auctions.find({ guild, auctionActive: true }).toArray();
    }

    async getFinishedActiveAuctions(guild) {
        const currentTime = new Date().getTime();
        return this.auctions.find({ guild, auctionActive: true, auctionEnd: { $lt: currentTime } }).toArray();
    }

    async updateAuctionMessageId(guild, auctionId, messageId) {
        const auction = await this.auctions.findOne({ _id: auctionId, guild });
        if (!auction) {
            throw new Error('Auction not found');
        }
        return this.auctions.updateOne({ _id: auction._id, guild }, { $set: { messageId } });
    }

    async endAuction(guild, auctionId, winners) {
        //check if auction is active
        const auction = await this.auctions.findOne({ _id: new ObjectId(auctionId), guild });
        if (!auction) {
            throw new Error('Auction not found');
        }
        if (auction.auctionActive === false) {
            throw new Error('Auction not active');
        }

        return this.auctions.updateOne({ _id: auction._id, guild }, { $set: { auctionActive: false, winners } });
    }

    async removeBid(guild, auctionId, player) {
        //check if auction is active
        const auction = await this.auctions.findOne({ _id: new ObjectId(auctionId), guild });
        if (!auction) {
            throw new Error('Auction not found');
        }
        if (auction.auctionActive === false) {
            throw new Error('Auction not active');
        }

        return this.auctions.updateOne({ _id: auction._id, guild }, { $pull: { bids: { player: player.player } } });
    }

    async bid(guild, auctionId, amount, player, bidForMain = true) {
        if (amount <= 0) {
            throw new Error('DKP - Bot scowls at you. Bid amount must be greater than 0');
        }

        if (!Number.isInteger(amount)) {
            throw new Error('DKP - Bot scowls at you. Bid amount must be an integer');
        }
        //check if auction is active
        const auction = await this.auctions.findOne({ _id: new ObjectId(auctionId), guild });
        if (!auction) {
            throw new Error('Auction not found');
        }
        if (auction.auctionEnd < new Date().getTime()) {
            throw new Error('Auction has ended');
        }

        if (amount > player.current) {
            throw new Error(`DKP - Bot scowls at you. Bid amount is greater than player current DKP (${player.current})`);
        }

        if (amount < auction.minBid) {
            throw new Error(`DKP - Bot scowls at you. Bid amount is less than the minimum bid (${this.minBid})`);
        }

        //auction contains player bid
        if (auction.bids.find(bid => bid.player === player.player)) {
            //update that player bid
            return this.auctions.updateOne(
                { _id: auction._id, guild, 'bids.player': player.player },
                { $set: { 'bids.$.amount': amount, 'bids.$.bidForMain': bidForMain } },
            );
        } else {
            //add bid
            return this.auctions.updateOne({ _id: auction._id, guild }, { $push: { bids: { player: player.player, amount, bidForMain } } });
        }
    }
};
