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

    startAuction(item, guild, callback, duration = 60000) {
        const auction = new Auction(guild, item, duration);
        this.auctions.push(auction);
        setTimeout(async () => {
            const players = await this.dkpManager.listPlayers(guild);
            auction.endAuction();
            auction.calculateWinner(players);
            callback(auction);
        }, duration);

        return auction;
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