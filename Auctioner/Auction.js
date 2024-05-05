const { Guild } = require('discord.js');
const uniqid = require('uniqid');

module.exports = class Auction {
    constructor(guild, item, minBid = 0) {
        this.item = item;
        this.bids = [];
        this.id = `${guild}_${uniqid()}`;
        this.winner = null;
        this.guild = guild;
        this.auctionActive = true;
        this.minBid = minBid;
    }

    endAuction() {
        this.auctionActive = false;
    }

    bid(amount, playerData, bidForMain = true) {
        if (!this.auctionActive) {
            throw new Error('Auction is not active');
        }
        this.validateBidAmount(amount, playerData);

        const existingBid = this.bids.find(bid => bid.player === playerData.player);
        if (existingBid) {
            existingBid.amount = amount;
            existingBid.bidForMain = bidForMain;
            return;
        } else {
            this.bids.push({ player: playerData.player, amount, attendance: playerData.attendance, bidForMain });
        }
    }

    toObject() {
        return {
            id: this.id,
            item: this.item,
            bids: this.bids,
            winner: this.winner,
            guid: this.guild
        };
    }

    validateBidAmount(amount, player) {
        if (amount <= 0) {
            throw new Error('DKP - Bot scowls at you. Bid amount must be greater than 0');
        }

        if (!Number.isInteger(amount)) {
            throw new Error('DKP - Bot scowls at you. Bid amount must be an integer');
        }

        if (amount > player.current) {
            throw new Error(`DKP - Bot scowls at you. Bid amount is greater than player current DKP (${player.current})`);
        }

        if (amount < this.minBid) {
            throw new Error(`DKP - Bot scowls at you. Bid amount is less than the minimum bid (${this.minBid})`);
        }
    }

    getWinner(bids) {
        let validBids = bids.filter(bid => bid.valid);
        if (validBids.some(bid => bid.bidForMain)) {
            validBids = validBids.filter(bid => bid.bidForMain);
        }

        const bidsSortByAmount = validBids.sort((a, b) => b.amount - a.amount);
        const topAmmountBidders = bidsSortByAmount.filter(bid => bid.amount === bidsSortByAmount[0].amount);
        const topBiddersSortByAttendance = topAmmountBidders.sort((a, b) => b.attendance - a.attendance);
        return topBiddersSortByAttendance.filter(bid => bid.attendance === topBiddersSortByAttendance[0].attendance);
    }

    calculateWinner(playersList) {
        if (this.bids.length === 0) {
            return null;
        }

        this.bids = this.bids.map(bid => {
            try {
                this.validateBidAmount(bid.amount, playersList.find(player => player.player === bid.player));
                return { ...bid, valid: true };
            }
            catch (e) {
                return { ...bid, valid: false, reason: e.message };
            }
        });

        const winners = this.getWinner(this.bids);

        const winner = winners[Math.floor(Math.random() * winners.length)];
        this.winner = winner;
        return winner;
    }
}