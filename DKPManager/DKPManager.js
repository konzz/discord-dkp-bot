module.exports = class DKPManager {
    constructor(dbClient) {
        this.dbClient = dbClient;
    }

    async addDKP(guild, player, dkp, comment, raid = false) {
        return this.dbClient.db("DKP").collection(`DKP`).findOneAndUpdate(
            { player: player, guild: guild },
            {
                $inc: { current: dkp, assistance: raid ? 1 : 0 },
                $push: {
                    log: {
                        dkp: dkp,
                        comment: comment,
                        date: new Date().getTime(),
                        raid,
                    }
                },
            },
            { upsert: true }
        );
    }

    async removeDKP(guild, player, dkp, comment, loot = false) {
        return this.dbClient.db("DKP").collection(`DKP`).findOneAndUpdate(
            { player: player, guild: guild },
            {
                $inc: { current: -dkp },
                $push: {
                    log: {
                        dkp: -dkp,
                        comment: comment,
                        date: new Date().getTime(),
                        loot,
                    }
                }
            },
            { upsert: true }
        );
    }

    async addByCharacter(guild, character, dkp, comment, raid = false) {
        const characterRegistered = await this.dbClient.db("DKP").collection(`DKP`).findOne({ characters: character });

        if (!characterRegistered) {
            throw new Error(`Character ${character} not registered`);
        }
        
        return this.dbClient.db("DKP").collection(`DKP`).findOneAndUpdate(
            { characters: character, guild: guild },
            {
                $inc: { current: dkp, assistance: raid ? 1 : 0 },
                $push: {
                    log: {
                        dkp: dkp,
                        comment: comment,
                        date: new Date().getTime(),
                        raid,
                    }
                },
            },
            { upsert: false }
        );
    }

    async getPlayer(guild, player) {
        return this.dbClient.db("DKP").collection(`DKP`).findOne({ player, guild });
    }

    async listPlayers(guild) {
        return this.dbClient.db("DKP").collection(`DKP`).find({guild}).project({ player: 1, current: 1, assistance: 1, _id: 0 }).toArray();
    }

    async addCharacter(guild, player, character) {
        const alreadyRegistered = await this.dbClient.db("DKP").collection(`DKP`).findOne({characters: character, guild});
        if (alreadyRegistered) {
            throw new Error(`Character ${character} already registered`);
        }

        return this.dbClient.db("DKP").collection(`DKP`).findOneAndUpdate(
            { player: player, guild, characters: { $nin: [character] } },
            { $push: { characters: character } }
        );
        
    }

    async saveGuildOptions(guild, options) {
        return this.dbClient.db("DKP").collection(`GuildOptions`).findOneAndUpdate(
            { guild },
            { $set: options },
            { upsert: true }
        );
    }

    async getGuildOptions(guild) {
        return this.dbClient.db("DKP").collection(`GuildOptions`).findOne({ guild });
    }
}
