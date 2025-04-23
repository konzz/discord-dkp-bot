
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const DKPManager = require('../DKPManager/DKPManager.js');
const Auctioner = require('./Auctioner.js');
const Auction = require('./Auction.js');
describe('Auctioner', () => {

    let manager;
    let auctioner;

    const guild = 'unaQue?';
    const player1 = 'player1';
    const player2 = 'player2';
    const player3 = 'player3';

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
        it('should bid on an auction', async () => {
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

            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1)).rejects.toThrowError('Auction not found');
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
            const auction = auctioner.startAuction(item, guild, callback, { minBid: 20 });
            await expect(async () => await auctioner.bid(guild, auction.id, 0, player1)).rejects.toThrowError('Bid amount must be greater than 0');
            await expect(async () => await auctioner.bid(guild, auction.id, -30, player1)).rejects.toThrowError('Bid amount must be greater than 0');
            await expect(async () => await auctioner.bid(guild, auction.id, 4.5, player1)).rejects.toThrowError('Bid amount must be an integer');
        });

        it('should not allow to bid less than min bid allowed', async () => {
            const item = 'item';
            const amount = 10;
            await manager.addDKP(guild, player1, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { minBid: 20 });
            await expect(async () => await auctioner.bid(guild, auction.id, amount, player1))
                .rejects.toThrowError('Bid amount is less than the minimum bid (20)');
        });

        it('should allow to change bids', async () => {
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
            await auctioner.bid(guild, auction.id, 30, player1);
            await auctioner.bid(guild, auction.id, 20, player2);
            await auctioner.bid(guild, auction.id, 40, player3);
            await auctioner.bid(guild, auction.id, 10, player1);
            await auctioner.bid(guild, auction.id, 40, player3, false);
            await endSetTimeout();

            expect(auction.bids).toEqual([
                { player: player1, amount: 10, attendance: 100, valid: true, bidForMain: true },
                { player: player2, amount: 20, attendance: 50, valid: true, bidForMain: true },
                { player: player3, amount: 40, attendance: 50, valid: true, bidForMain: false }
            ]);

            expect(auction.winner.player).toBe(player2);
        });
    });

    describe('calculate winner', () => {
        it('should calculate the winner', async () => {
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
                    { players: [player1, player2, player2], comment: 'Start', date, dkps: 1 },
                    { players: [player2, player3], comment: 'Tick', date, dkps: 1 }
                ],
                active: false,
                deprecated: false,
            });

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);
            await auctioner.bid(guild, auction.id, 10, player2);
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 5, player3);
            await endSetTimeout();

            expect(auction.winner.player).toBe(player1);
        });

        it('should use attendance when bids are equal', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 50, 'comment');
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

        it('main bids should have priority over ALT bids', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback);

            await auctioner.bid(guild, auction.id, 20, player2, false);
            await auctioner.bid(guild, auction.id, 20, player1);
            await endSetTimeout();

            expect(auction.winner.player).toBe(player1);
        });
    });

    describe('multiple items', () => {
        it('should calculate the winners for multiple items', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');
            await manager.addDKP(guild, player3, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2 });
            await auctioner.bid(guild, auction.id, 10, player2);
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 5, player3);
            await endSetTimeout();


            expect(auction.winners).toEqual([
                { player: player1, amount: 20, bidForMain: true, attendance: 100, valid: true },
                { player: player2, amount: 10, bidForMain: true, attendance: 100, valid: true }
            ]);
            expect(auction.numberOfItems).toBe(2);
            expect(auction.bids.length).toBe(3);
        });

        it('should calculate the winners for multiple items when there are not enough bids', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');
            await manager.addDKP(guild, player3, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2 });
            await auctioner.bid(guild, auction.id, 20, player1);
            await endSetTimeout();

            expect(auction.winners).toEqual([
                { player: player1, amount: 20, bidForMain: true, attendance: 100, valid: true }
            ]);
            expect(auction.numberOfItems).toBe(2);
            expect(auction.bids.length).toBe(1);
        });

        it('should calculate the winners for multiple items when some of them are the same bid', async () => {
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
                    { players: [player2, player3], comment: 'Tick', date, dkps: 1 },
                    { players: [player2], comment: 'Tick', date, dkps: 1 }
                ],
                active: false,
                deprecated: false,
            });

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2 });
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 10, player2);
            await auctioner.bid(guild, auction.id, 10, player3);

            await endSetTimeout();

            expect(auction.winners.map(w => w.player)).toEqual([player1, player2]);
            expect(auction.numberOfItems).toBe(2);
            expect(auction.bids.length).toBe(3);
        })

        it('should calculate the winners for multiple items when some of them are ALT bids', async () => {
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
                    { players: [player2], comment: 'Tick', date, dkps: 1 }
                ],
                active: false,
                deprecated: false,
            });

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2 });
            await auctioner.bid(guild, auction.id, 30, player2, false);
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 5, player3);
            await endSetTimeout();

            expect(auction.winners).toEqual([
                { player: player1, amount: 20, bidForMain: true, attendance: 50, valid: true },
                { player: player3, amount: 5, bidForMain: true, attendance: 50, valid: true }
            ]);
            expect(auction.numberOfItems).toBe(2);
            expect(auction.bids.length).toBe(3);
        })

        it('should allow alt wins when there is enough items', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2 });
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 5, player2, false);
            await endSetTimeout();

            expect(auction.winners).toEqual([
                { player: player1, amount: 20, bidForMain: true, attendance: 100, valid: true },
                { player: player2, amount: 5, bidForMain: false, attendance: 100, valid: true }
            ]);
            expect(auction.numberOfItems).toBe(2);
            expect(auction.bids.length).toBe(2);
        })

        it('should calculate the winner for multiple items when both bids are the same', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');

            const callback = jest.fn();
            const auction = auctioner.startAuction(item, guild, callback, { numberOfItems: 2, minBid: 15 });
            await auctioner.bid(guild, auction.id, 20, player1);
            await auctioner.bid(guild, auction.id, 20, player2);
            await endSetTimeout();

            //winers must be player1 and player2 in any order
            expect(auction.winners.map(w => w.player).sort()).toEqual([player1, player2]);
            expect(auction.numberOfItems).toBe(2);
        });
    });

    describe('minBidToLockForMain', () => {
        it('should not treat bids as main if they are less than minBidToLockForMain', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 100, 'comment');
            await manager.addDKP(guild, player2, 100, 'comment');

            const callback = jest.fn();

            const minBidToLockForMain = 20;
            const auction = auctioner.startAuction(item, guild, callback, { minBidToLockForMain });
            await auctioner.bid(guild, auction.id, 18, player1, false);
            await auctioner.bid(guild, auction.id, 15, player2, true);
            await endSetTimeout();

            expect(auction.winner).toEqual(
                { player: player1, amount: 18, bidForMain: false, attendance: 100, valid: true }
            );
        });
    });

    describe('overBidtoWinMain', () => {
        it('should treat ALT bids as main when they over bid the highest MAIN bid by the given amount', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 300, 'comment');
            await manager.addDKP(guild, player2, 300, 'comment');

            const callback = jest.fn();
            const minBidToLockForMain = 20;
            const overBidtoWinMain = 100;
            const auction = auctioner.startAuction(item, guild, callback, { minBidToLockForMain, overBidtoWinMain });
            await auctioner.bid(guild, auction.id, 200, player1, false);
            await auctioner.bid(guild, auction.id, 25, player2, true);
            await endSetTimeout();

            expect(auction.winner).toEqual(
                { player: player1, amount: 200, bidForMain: false, attendance: 100, valid: true }
            );
        });

        it('should be ok when only ALTS bid', async () => {
            const item = 'item';
            await manager.addDKP(guild, player1, 300, 'comment');
            await manager.addDKP(guild, player2, 300, 'comment');

            const callback = jest.fn();
            const minBidToLockForMain = 20;
            const overBidtoWinMain = 100;
            const auction = auctioner.startAuction(item, guild, callback, { minBidToLockForMain, overBidtoWinMain });
            await auctioner.bid(guild, auction.id, 200, player1, false);
            await auctioner.bid(guild, auction.id, 25, player2, false);
            await endSetTimeout();

            expect(auction.winner).toEqual(
                { player: player1, amount: 200, bidForMain: false, attendance: 100, valid: true }
            );
        });
    });
});