module.exports = class DKPManager {
    constructor(dbClient) {
        this.dbClient = dbClient;
        const db = this.dbClient.db('DKP');

        this.raids = db.collection(`raids`);
        this.players = db.collection(`players`);
        this.guildOptions = db.collection(`options`);
    }

    async createRaid(guild, name, players, tickDuration = 60000 * 60, dkpsPerTick = 1) {
        const alreadyActiveRaid = await this.raids.findOne({ guild, active: true });
        if (alreadyActiveRaid) {
            throw new Error('There is already an active raid');
        }

        const result = await this.raids.insertOne({
            guild,
            name,
            date: new Date().getTime(),
            attendance: [{ players, comment: 'Start' }],
            tickDuration,
            dkpsPerTick,
            active: true,
            deprecated: false,
        });

        return this.raids.findOne({ _id: result.insertedId });
    }

    async updateRaidAttendance(guild, raid, players, comment = 'Tick') {
        return this.raids.updateOne({ _id: raid._id, guild }, { $push: { attendance: { players, comment } } });
    }

    async getActiveRaid(guild) {
        return this.raids.findOne({ guild, active: true });
    }

    async endRaid(guild) {
        return this.raids.updateOne({ active: true, guild }, { $set: { active: false } });
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
                        raid,
                    },
                },
                $setOnInsert: { creationDate: new Date().getTime() },
            },
            { upsert: true },
        );
    }

    async removeDKP(guild, player, dkp, comment, loot = false) {
        return this.players.findOneAndUpdate(
            { player, guild },
            {
                $inc: { current: -dkp },
                $push: {
                    log: {
                        dkp: -dkp,
                        comment,
                        date: new Date().getTime(),
                        loot,
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
                        raid,
                    },
                },
                $setOnInsert: { creationDate: new Date().getTime() },
            },
            { upsert: false },
        );
    }

    async getPlayer(guild, player) {
        return this.players.findOne({ player, guild });
    }

    async listPlayers(guild) {
        const players = await this.players.find({ guild }).project({ player: 1, current: 1, _id: 0, creationDate: 1 }).toArray();
        const raids = await this.raids.find({ guild, deprecated: false }).toArray();

        return players.map((player) => {
            const totalAttendancePossibleSincePlayerJoined = raids.reduce((total, raid) => {
                if (raid.date < (player.creationDate - 60000)) return total;
                return total + raid.attendance.length;
            }, 0);

            const playerAttendedRaids = raids.reduce((total, raid) => {
                const playerAttendance = raid.attendance.filter((attendance) => attendance.players.includes(player.player));
                return total + playerAttendance.length;
            }, 0);
            return { ...player, attendance: ((playerAttendedRaids / totalAttendancePossibleSincePlayerJoined) * 100).toFixed(2) };
        });
    }

    async getAll(guild) {
        return this.players.find({ guild }).project({ _id: 0 }).toArray();
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
};
