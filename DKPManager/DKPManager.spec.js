const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const DKPManager = require('./DKPManager.js');

describe('DKPManager', () => {
    let playersCollection;
    let raidsCollection;
    let optionsCollection;

    const guild = 'The butchers';
    beforeAll(async () => {
        await client.connect();
        playersCollection = client.db('DKP').collection(`players`);
        raidsCollection = client.db('DKP').collection(`raids`);
        optionsCollection = client.db('DKP').collection(`options`);
    });

    afterAll(async () => {
        await client.close();
    });

    beforeEach(async () => {
        await playersCollection.deleteMany({});
        await raidsCollection.deleteMany({});
        await optionsCollection.deleteMany({});
    });

    describe('addDKP()', () => {
        it('should add the given amount of DKP to the given player', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 11;

            // Act
            await manager.addDKP(guild, player, dkp);
            // Assert
            const result = await playersCollection.findOne({ player: player });
            expect(result.current).toBe(dkp);
            expect(result.guild).toBe(guild);
        });

        it('should keep a log of the DKP changes with date and comment', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 13;
            const comment = 'Emperor kill';

            // Act
            await manager.addDKP(guild, player, dkp, comment);
            // Assert
            const result = await playersCollection.findOne({ player: player });
            expect(result.current).toBe(dkp);
            const log = result.log[0];
            expect(log.dkp).toBe(dkp);
            expect(log.comment).toBe(comment);
            const now = new Date();
            expect(log.date).toBeCloseTo(now.getTime(), -3);
        });
    });

    describe('removeDKP()', () => {
        it('should remove the given amount of DKP from the given player', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 8;
            await playersCollection.insertOne({ player, current: dkp, guild });
            // Act
            await manager.removeDKP(guild, player, dkp);
            // Assert
            const result = await playersCollection.findOne({ player, guild });
            expect(result.current).toBe(0);
        });

        it('should keep a log of the DKP changes with date and comment', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 4;
            const comment = 'Bad loot';
            await playersCollection.insertOne({ player, current: dkp, guild });
            // Act
            await manager.removeDKP(guild, player, dkp, comment);
            // Assert
            const result = await playersCollection.findOne({ player });
            expect(result.current).toBe(0);
            const log = result.log[0];
            expect(log.dkp).toBe(-dkp);
            expect(log.comment).toBe(comment);
            const now = new Date();
            expect(log.date).toBeCloseTo(now.getTime(), -3);
        });
    });

    describe('listPlayers()', () => {
        it('should list all players with their current DKP and attendance', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player1 = 'Sdcaos';
            const player2 = 'Troels';
            const player3 = 'Scryll';
            await playersCollection.insertOne({
                player: player1,
                current: 8,
                log: [],
                guild,
                creationDate: 100000, // oldest player
            });
            await playersCollection.insertOne({
                player: player2,
                current: 20,
                log: [],
                guild,
                creationDate: 500000, //not so oldest
            });

            await playersCollection.insertOne({
                player: player3,
                current: 5,
                log: [],
                guild,
                creationDate: 1100000, //new player
            });

            await raidsCollection.insertOne({
                guild,
                name: 'Nagafen',
                date: 1000000, //recent raid not deprecated
                attendance: [
                    { players: [player1, player2], comment: 'Start' },
                    { players: [player1, player2], comment: 'Tick' },
                    { players: [player1, player2], comment: 'Tick' },
                    { players: [player1], comment: 'Tick' },
                ],
                deprecated: false,
            });

            await raidsCollection.insertOne({
                guild,
                name: 'Nagafen',
                date: 400000, //deprecated raid
                attendance: [{ players: [player1], comment: 'Start' }],
                deprecated: true,
            });

            await raidsCollection.insertOne({
                guild,
                name: 'Nagafen',
                date: 1200000, //newest raid
                attendance: [{ players: [player1, player2, player3], comment: 'Start' }],
                deprecated: false,
            });
            // Act
            const { players, total } = await manager.listPlayers(guild);
            // Assert
            expect(total).toBe(3);

            expect(players[0].player).toBe(player2);
            expect(players[0].current).toBe(20);
            expect(players[0].attendance).toBe(80);

            expect(players[1].player).toBe(player1);
            expect(players[1].current).toBe(8);
            expect(players[1].attendance).toBe(100);

            expect(players[2].player).toBe(player3);
            expect(players[2].current).toBe(5);
            expect(players[2].attendance).toBe(100);
        });
    });

    describe('addByCharacter()', () => {
        it('should add the given amount of DKP to a player that owns a character', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const character1 = 'Destroyer';
            const character2 = 'Princess';
            const comment = 'Emperor kill';
            const dkp = 11;
            await playersCollection.insertOne({
                player,
                current: 0,
                log: [],
                characters: [character1, character2],
                guild,
            });
            // Act
            await manager.addByCharacter(guild, character1, dkp, comment);
            // Assert
            const result = await playersCollection.findOne({ player, guild });
            expect(result.current).toBe(dkp);
            const log = result.log[0];
            expect(log.dkp).toBe(dkp);
            expect(log.comment).toBe(comment);
            const now = new Date();
            expect(log.date).toBeCloseTo(now.getTime(), -3);
        });
    });

    describe('addCharacter()', () => {
        it('should add a character to a player', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const character = 'Destroyer';
            await playersCollection.insertOne({
                player,
                current: 0,
                log: [],
                characters: [],
                guild,
            });
            // Act
            await manager.addCharacter(guild, player, character);
            // Assert
            const result = await playersCollection.findOne({ player: player });
            expect(result.characters).toEqual([character]);
        });

        it('should not add a character to a player if another player already owns it', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player1 = 'player1';
            const player2 = 'player2';
            const character = 'Destroyer';
            await playersCollection.insertOne({
                player: player1,
                current: 0,
                log: [],
                characters: [],
                guild,
            });
            await playersCollection.insertOne({
                player: player2,
                current: 0,
                log: [],
                characters: [character],
                guild,
            });

            // Act
            try {
                await manager.addCharacter(guild, player1, character);
            } catch (error) {
                // Assert
                const result = await playersCollection.findOne({
                    player: player1,
                });
                expect(result.characters).toEqual([]);
                expect(error.message).toBe(`Character ${character} already registered`);
            }
        });
    });

    describe('different guilds', () => {
        it('should not mix players from different guilds', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild1 = 'The butchers';
            const guild2 = 'The butchers 2';
            const player1 = 'player1';
            const player2 = 'player2';
            const dkp1 = 8;
            const dkp2 = 4;
            await playersCollection.insertOne({
                player: player1,
                current: dkp1,
                log: [],
                guild: guild1,
            });
            await playersCollection.insertOne({
                player: player2,
                current: dkp2,
                log: [],
                guild: guild2,
            });
            // Act
            const { total: total1 } = await manager.listPlayers(guild1);
            const { total: total2 } = await manager.listPlayers(guild2);
            // Assert
            expect(total1).toBe(1);
            expect(total2).toBe(1);
        });
    });

    describe('saveGuildOptions()', () => {
        it('should save the guild options', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const options = { adminRoles: ['manager'] };
            // Act
            await manager.saveGuildOptions(guild, options);
            // Assert
            const result = await optionsCollection.findOne({ guild });
            expect(result.adminRoles).toEqual(['manager']);
        });

        it('should update the guild options independently', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            // Act
            await manager.saveGuildOptions(guild, { adminRole: 'officer' });
            await manager.saveGuildOptions(guild, { raidChannel: 'raid' });
            // Assert
            const result = await optionsCollection.findOne({ guild });
            expect(result).toEqual({ guild, adminRole: 'officer', raidChannel: 'raid', _id: result._id });
        });
    });

    describe('getGuildOptions()', () => {
        it('should get the guild options', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const options = { adminRoles: ['manager'] };
            await optionsCollection.insertOne({ guild, ...options });
            // Act
            const result = await manager.getGuildOptions(guild);
            // Assert
            expect(result.adminRoles).toEqual(['manager']);
        });
    });

    describe('createRaid()', () => {
        it('should create a raid with the given name', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const name = 'Nagafen';
            const players = ['player1', 'player2'];
            // Act
            await manager.createRaid(guild, name);

            // Assert
            const result = await raidsCollection.findOne({ guild });
            expect(result.name).toEqual(name);
            expect(result.guild).toEqual(guild);
            expect(result.attendance).toEqual([]);
        });

        describe('when there is already an active raid', () => {
            it('should throw an error', async () => {
                // Arrange
                const manager = new DKPManager(client);
                const guild = 'The butchers';
                const name = 'Nagafen';
                const players = ['player1', 'player2'];
                await raidsCollection.insertOne({
                    guild,
                    name,
                    date: new Date().getTime(),
                    attendance: [players],
                    active: true,
                });
                // Act
                try {
                    await manager.createRaid(guild, name);
                } catch (error) {
                    // Assert
                    expect(error.message).toBe('There is already an active raid');
                }
            });
        });
    });

    describe('addRaidAttendance()', () => {
        it('should add a tick to the raid', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const name = 'Nagafen';
            const players = ['player1', 'player2'];
            await raidsCollection.insertOne({
                guild,
                name,
                date: new Date().getTime(),
                attendance: [players],
            });

            // Act
            const raid = await raidsCollection.findOne({ guild });
            await manager.addRaidAttendance(guild, raid, ['player1'], 'Tick', 1);
            // Assert
            const result = await raidsCollection.findOne({ guild });
            expect(result.attendance[1]).toEqual({
                players: ['player1'],
                comment: 'Tick',
                date: result.attendance[1].date,
                dkps: 1,
            });
        });
    });

    describe('getRaidDKPMovements', () => {
        it('should return the DKP movements of the players in the raid', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const raidName = 'Nagafen';
            const player1 = 'player1';
            const player2 = 'player2';
            const raid = await manager.createRaid(guild, raidName);
            await manager.addRaidAttendance(guild, raid, [player1, player2], 'Start', 1);
            await manager.addDKP(guild, player1, 1, 'Start', raid);
            await manager.addDKP(guild, player2, 1, 'Start', raid);

            await manager.addRaidAttendance(guild, raid, [player1, player2], 'Tick', 1);
            await manager.addDKP(guild, player1, 1, 'Tick', raid);
            await manager.addDKP(guild, player2, 1, 'Tick', raid);

            await manager.addRaidAttendance(guild, raid, [player1, player2], 'Kill boss', 5);
            await manager.addDKP(guild, player1, 5, 'Kill boss', raid);
            await manager.addDKP(guild, player2, 5, 'Kill boss', raid);

            const swordOfTruth = { name: 'Sword of truth' };

            await manager.removeDKP(guild, player1, 5, 'Sword of truth', raid, swordOfTruth);

            // Act
            const result = await manager.getRaidDKPMovements(guild, raid._id);
            // Assert
            expect(result.length).toBe(4);
            expect(result[0]).toEqual({ comment: 'Start', date: result[0].date, dkps: 1, players: [player1, player2] });
            expect(result[1]).toEqual({ comment: 'Tick', date: result[1].date, dkps: 1, players: [player1, player2] });
            expect(result[2]).toEqual({ comment: 'Kill boss', date: result[2].date, dkps: 5, players: [player1, player2] });
            expect(result[3]).toEqual({ comment: 'Sword of truth', date: result[3].date, dkps: -5, player: player1, item: swordOfTruth });
        });
    });

    describe('searchLogs()', () => {
        it('should return the logs of all players that match the search ordered by date', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const player = 'player';
            await playersCollection.insertOne({
                player: 'player1',
                current: 0,
                log: [
                    { dkp: 1, comment: 'Start', date: 1 },
                    { dkp: 1, comment: 'Tick', date: 2 },
                    { dkp: 5, comment: 'Kill boss', date: 3 },
                    { dkp: -5, comment: 'Sword of truth', date: 4 },
                    { dkp: 1, comment: 'Tick', date: 5 },
                    { dkp: 1, comment: 'Tick', date: 6 },
                    { dkp: 5, comment: 'Kill Boss', date: 7 },
                ],
                guild,
            });
            await playersCollection.insertOne({
                player: 'player2',
                current: 0,
                log: [
                    { dkp: 1, comment: 'Start', date: 1 },
                    { dkp: 1, comment: 'Tick', date: 2 },
                    { dkp: 5, comment: 'Kill boss', date: 3 },
                ],
                guild,
            });
            // Act
            const result = await manager.searchLogs(guild, 'boss');
            // Assert
            expect(result.length).toBe(3);
            expect(result).toEqual([
                { dkp: 5, comment: 'Kill boss', date: 3, player: 'player1', _id: expect.any(Object) },
                { dkp: 5, comment: 'Kill boss', date: 3, player: 'player2', _id: expect.any(Object) },
                { dkp: 5, comment: 'Kill Boss', date: 7, player: 'player1', _id: expect.any(Object) },
            ]);
        });
    });
});
