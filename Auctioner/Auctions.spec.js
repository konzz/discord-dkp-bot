
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const DKPManager = require('../DKPManager/DKPManager.js');
const Auctioner = require('./Auctioner.js');
const Auction = require('./Auction.js');
describe('Auctioner', () => {

    let manager;
    let auctioner;

    const guild = 'unaQue?';
    const player1 = 'Galandracano';
    const player2 = 'Soacds';
    const player3 = 'Scrylex';

    let endSetTimeout;
    jest.spyOn(global, 'setTimeout').mockImplementation((cb) => {
        endSetTimeout = cb;
    });

    beforeAll(async () => {
        await client.connect();
        manager = new DKPManager(client);
        auctioner = new Auctioner(manager);
    });

    afterAll(async () => {
        await client.close();
    });

    beforeEach(async () => {
        await manager.players.deleteMany({});
        await manager.raids.deleteMany({});
    });

    it('should be a singleton', () => {
        const secondAuctioner = new Auctioner(manager);
        expect(auctioner).toBe(secondAuctioner);
    });

    it('should start and end an auction', async () => {
        const item = 'item';

        const callback = jest.fn();
        auctioner.startAuction(item, guild, callback);
        expect(auctioner.auctions.length).toBe(1);
        await endSetTimeout();
        expect(callback).toHaveBeenCalledWith(expect.any(Auction));
    });

    describe('bidding', () => {
        fit('should bid on an auction', async () => {
            const item = 'item';
            const amount = 20;
            await manager.addDKP(guild, player1, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await auctioner.bid(guild, auction.id, amount, player1);
            await endSetTimeout();

            expect(auction.bids).toEqual([{ player: player1, amount, attendance: 100, valid: true, bidForMain: true }]);
        });

        it('should not allow to bid after auction ends', async () => {
            const item = 'item';
            const amount = 20;
            await manager.addDKP(guild, player1, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await endSetTimeout();

            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1)).rejects.toThrowError('Auction is not active');
        });

        it('should not allow to bid if player not found', async () => {
            const item = 'item';
            const amount = 20;

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1)).rejects.toThrowError('Player not found');
        });

        it('should only allow to bid positive integers greater than 0', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, 20);
            await expect(async () => await auctioner.bid(guild, auction.id, 0, player1)).rejects.toThrowError('Bid amount must be greater than 0');
            await expect(async () => await auctioner.bid(guild, auction.id, -30, player1)).rejects.toThrowError('Bid amount must be greater than 0');
            await expect(async () => await auctioner.bid(guild, auction.id, 4.5, player1)).rejects.toThrowError('Bid amount must be an integer');
        });

        it('should not allow to bid more than max bid allowed', async () => {
            const item = 'item';
            const amount = 100;
            await manager.addDKP(guild, player1, 100, 'comment');
            const raid = await manager.createRaid(guild, 'raid');
            await manager.addRaidAttendance(guild, raid, [player1, player2], 'Start', 100);
            await manager.addRaidAttendance(guild, raid, [player2], 'Ticks', 100);

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1))
                .rejects.toThrowError('Bid amount is greater than player max allowed bid. (50 max bid)');
        });

        it('should not allow to bid less than min bid allowed', async () => {
            const item = 'item';
            const amount = 10;
            await manager.addDKP(guild, player1, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, 20);
            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1))
                .rejects.toThrowError('Bid amount is less than the minimum bid (20)');
        });
    });

    describe('calculate winner', () => {
        it('should calculate the winner', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');
            await manager.addDKP(guild, player3, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 10, player2);
            await auctioner.bid(guild, auction.id, 5, player3);
            await endSetTimeout();

            expect(auction.winner.player).toBe(player1);
        });

        it('should use attendance when bids are equal', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');
            await manager.addDKP(guild, player3, 100, 'comment');

            const date = new Date().getTime();

            await manager.raids.insertOne({
                guild,
                name: 'raid',
                date: date + 500000,
                attendance: [
                    { players: [player1, player2, player3], comment: 'Start', date, dkps: 1 },
                    { players: [player1], comment: 'Tick', date, dkps: 1 }
                ],
                active: false,
                deprecated: false,
            });

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);

            await auctioner.bid(guild, auction.id, 20, player3);
            await auctioner.bid(guild, auction.id, 20, player2);
            await auctioner.bid(guild, auction.id, 20, player1);
            await endSetTimeout();

            expect(auction.winner.player).toBe(player1);
        });
    });
});