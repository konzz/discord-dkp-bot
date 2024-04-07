const Auction = require('./Auction');

class Auctioner {

    constructor(dkpManager) {
        this.dkpManager = dkpManager;
        if (Auctioner.instance) {
            return Auctioner.instance;
        }
        Auctioner.instance = this;
        this.auctions = [];
    }

    startAuction(item, guild, duration = 60000, callback) {
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

    async bid(guild, auctionId, amount, player) {
        const auction = this.auctions.find(auction => auction.id === auctionId);
        if (!auction) {
            throw new Error('Auction not found');
        }
        const playerData = await this.dkpManager.getPlayer(guild, player);
        auction.bid(amount, playerData);
    }
}

module.exports = Auctioner;