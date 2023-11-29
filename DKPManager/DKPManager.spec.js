const client = require('../db.js');
const DKPManager = require('./DKPManager.js');
describe('DKPManager', () => {

    let collection;
    const guild = 'The butchers';
    beforeAll(async () => {
        process.env.MONGO_URL = 'mongodb://localhost:27017';
        await client.connect();
        collection = client.db("DKP").collection(`DKP`);

    });

    beforeEach(async () => {
        await collection.deleteMany({});
        await client.db("DKP").collection(`GuildOptions`).deleteMany({});
    });

    afterAll(async () => {
        await client.close();
    });

    describe('addDKP()', () => {
        it('should add the given amount of DKP to the given player', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 11;
            
            
            // Act
           await  manager.addDKP(guild, player, dkp);
            // Assert
           const result = await collection.findOne({player: player});
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
            const result = await collection.findOne({player: player});
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
            await collection.insertOne({player, current: dkp, guild});
            // Act
            await manager.removeDKP(guild, player, dkp);
            // Assert
            const result = await collection.findOne({player, guild});
            expect(result.current).toBe(0);
        });

        it('should keep a log of the DKP changes with date and comment', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const dkp = 4;
            const comment = 'Bad loot';
            await collection.insertOne({player, current: dkp, guild});
            // Act
            await manager.removeDKP(guild, player, dkp, comment);
            // Assert
            const result = await collection.findOne({player});
            expect(result.current).toBe(0);
            const log = result.log[0];
            expect(log.dkp).toBe(-dkp);
            expect(log.comment).toBe(comment);
            const now = new Date();
            expect(log.date).toBeCloseTo(now.getTime(), -3);
        });
    });

    describe('listPlayers()', () => {
        it('should list all players with their current DKP', async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player1 = 'player1';
            const dkp1 = 8;
            const player2 = 'player2';
            const dkp2 = 4;
            await collection.insertOne({player: player1, current: dkp1, assistance: 2, log: [], guild});
            await collection.insertOne({player: player2, current: dkp2, assistance: 1, log: [], guild});
            // Act
            const result = await manager.listPlayers(guild);
            // Assert
            expect(result.length).toBe(2);
            expect(Object.keys(result[0])).toEqual(['player', 'current', 'assistance']);
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
            await collection.insertOne({player, current: 0, log: [], characters: [character1, character2], guild});
            // Act
            await manager.addByCharacter(guild, character1, dkp, comment);
            // Assert
            const result = await collection.findOne({player, guild});
            expect(result.current).toBe(dkp);
            const log = result.log[0];
            expect(log.dkp).toBe(dkp);
            expect(log.comment).toBe(comment);
            const now = new Date();
            expect(log.date).toBeCloseTo(now.getTime(), -3);
        });
    });

    describe("addCharacter()", () => {
        it("should add a character to a player", async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player = 'player';
            const character = 'Destroyer';
            await collection.insertOne({player, current: 0, log: [], characters: [], guild});
            // Act
            await manager.addCharacter(guild, player, character);
            // Assert
            const result = await collection.findOne({player: player});
            expect(result.characters).toEqual([character]);
        });

        it("should not add a character to a player if another player already owns it", async () => {
            // Arrange
            const manager = new DKPManager(client);
            const player1 = 'player1';
            const player2 = 'player2';
            const character = 'Destroyer';
            await collection.insertOne({player: player1, current: 0, log: [], characters: [], guild});
            await collection.insertOne({player: player2, current: 0, log: [], characters: [character], guild});
            // Act
            try {
                await manager.addCharacter(guild, player1, character);
            } catch (error) {
                // Assert
                const result = await collection.findOne({player: player1});
                expect(result.characters).toEqual([]);
                expect(error.message).toBe(`Character ${character} already registered`);
            }
        });
    });

    describe("different guilds", () => {
        it("should not mix players from different guilds", async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild1 = 'The butchers';
            const guild2 = 'The butchers 2';
            const player1 = 'player1';
            const player2 = 'player2';
            const dkp1 = 8;
            const dkp2 = 4;
            await collection.insertOne({player: player1, current: dkp1, assistance: 2, log: [], guild: guild1});
            await collection.insertOne({player: player2, current: dkp2, assistance: 1, log: [], guild: guild2});
            // Act
            const result1 = await manager.listPlayers(guild1);
            const result2 = await manager.listPlayers(guild2);
            // Assert
            expect(result1.length).toBe(1);
            expect(result2.length).toBe(1);
        });
    });

    describe("saveGuildOptions()", () => {
        it("should save the guild options", async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const options = {adminRoles: ['manager']};
            // Act
            await manager.saveGuildOptions(guild, options);
            // Assert
            const result = await client.db("DKP").collection(`GuildOptions`).findOne({guild});
            expect(result.adminRoles).toEqual(['manager']);
        });
    });

    describe("getGuildOptions()", () => {
        it("should get the guild options", async () => {
            // Arrange
            const manager = new DKPManager(client);
            const guild = 'The butchers';
            const options = {adminRoles: ['manager']};
            await client.db("DKP").collection(`GuildOptions`).insertOne({guild, ...options});
            // Act
            const result = await manager.getGuildOptions(guild);
            // Assert
            expect(result.adminRoles).toEqual(['manager']);
        });
    });
});