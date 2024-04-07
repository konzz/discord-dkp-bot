const { Guild } = require('discord.js');
const uniqid = require('uniqid');

module.exports = class Auction {
    constructor(guild, item) {
        this.item = item;
        this.bids = [];
        this.id = `${guild}_${uniqid()}`;
        this.auctionActive = false;
        this.winner = null;
        this.guild = guild;
        this.auctionActive = true;
    }

    endAuction() {
        this.auctionActive = false;
    }

    bid(amount, playerData) {
        if (!this.auctionActive) {
            throw new Error('Auction is not active');
        }
        this.validateBidAmount(amount, playerData);

        const existingBid = this.bids.find(bid => bid.player === playerData.player);
        if (existingBid) {
            existingBid.amount = amount;
            return;
        } else {
            this.bids.push({ player: playerData.player, amount, attendance: playerData.attendance });
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
            throw new Error('Bid amount must be greater than 0');
        }

        if (!Number.isInteger(amount)) {
            throw new Error('Bid amount must be an integer');
        }

        if (amount > player.maxBid) {
            throw new Error('Bid amount is greater than max allowed bid');
        }
        const notEnoughDKP = player.current < amount;
        if (notEnoughDKP) {
            throw new Error('Not enough DKP for this bid');
        }
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

        //calculate winner, and resolve ties with the attendance
        const winners = this.bids
            .filter(bid => bid.valid)
            .sort((a, b) => b.amount - a.amount).filter(bid => bid.amount === this.bids[0].amount)
            .sort((a, b) => b.attendance - a.attendance).filter(bid => bid.attendance === this.bids[0].attendance);

        //if there is still a tie, return a random winner
        const winner = winners[Math.floor(Math.random() * winners.length)];
        this.winner = winner;
        return winner;
    }
}