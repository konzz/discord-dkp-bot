const Auction = require('./Auction');

class Auctioner {

    constructor(dkpManager = null) {
        if (dkpManager) {
            this.dkpManager = dkpManager;
        }

        if (Auctioner.instance) {
            return Auctioner.instance;
        }
        Auctioner.instance = this;
        this.auctions = [];
    }

    startAuction(item, guild, callback, minBid = 0, duration = 60000, numberOfItems = 1, minBidToLockForMain = 0, overBidtoWinMain = 0) {
        const auction = new Auction(guild, item, minBid, numberOfItems, minBidToLockForMain, overBidtoWinMain);
        this.auctions.push(auction);
        setTimeout(async () => {
            if (!auction.auctionActive) {
                return;
            }
            const players = await Promise.all(auction.bids.map(async bid => await this.dkpManager.getPlayer(guild, bid.player)));
            auction.endAuction();
            auction.calculateWinner(players);
            callback(auction);
            this.removeAuction(auction.id);
        }, duration);

        return auction;
    }

    cancelAuction(auctionId) {
        const auction = this.getAuction(auctionId);
        auction.endAuction();
        this.removeAuction(auctionId);
    }

    removeAuction(auctionId) {
        this.auctions = this.auctions.filter(auction => auction.id !== auctionId);
    }

    getAuction(auctionId) {
        return this.auctions.find(auction => auction.id === auctionId);
    }

    async bid(guild, auctionId, amount, player, bidForMain = true) {
        const auction = this.auctions.find(auction => auction.id === auctionId);
        if (!auction) {
            throw new Error('Auction not found');
        }
        const playerData = await this.dkpManager.getPlayer(guild, player);
        auction.bid(amount, playerData, bidForMain);
    }
}

module.exports = Auctioner;