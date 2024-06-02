const { Guild } = require('discord.js');
const uniqid = require('uniqid');

module.exports = class Auction {
    constructor(guild, item, minBid = 0, numberOfItems = 1) {
        this.item = item;
        this.bids = [];
        this.id = `${guild}_${uniqid()}`;
        this.winner = null;
        this.winners = [];
        this.guild = guild;
        this.auctionActive = true;
        this.minBid = minBid;
        this.numberOfItems = numberOfItems === 0 ? 1 : numberOfItems;
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

    getTopBids(bids, amount) {
        if (bids.length === 0) {
            return [];
        }
        const bidsSorted = bids.sort((a, b) => b.amount - a.amount);
        const minBidToWin = bidsSorted.length > amount ? bidsSorted[amount - 1].amount : bidsSorted[bidsSorted.length - 1].amount;
        const filteredbids = bidsSorted.filter((bid) => bid.amount >= minBidToWin);
        const bidsByAttendance = filteredbids.sort((a, b) => b.attendance - a.attendance);
        const minAttendanceToWin = bidsByAttendance.length > amount ? bidsByAttendance[amount - 1].attendance : bidsByAttendance[bidsByAttendance.length - 1].attendance;
        const filteredBidsByAttendance = bidsByAttendance.filter((bid) => bid.attendance >= minAttendanceToWin);

        return filteredBidsByAttendance;
    }

    getWinners(bids, numberOfWinners = 1) {
        const mainBids = bids.filter(bid => bid.bidForMain);
        const altBids = bids.filter(bid => !bid.bidForMain);

        const topMainBids = this.getTopBids(mainBids, numberOfWinners);
        const topAltBids = this.getTopBids(altBids, numberOfWinners);


        const winners = topMainBids;

        if (winners.length < numberOfWinners) {
            winners.push(...topAltBids.slice(0, numberOfWinners - winners.length));
        }

        return winners;
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

        this.bids = this.bids.filter(bid => bid.valid);

        if (this.bids.length === 0) {
            return null;
        }

        const amountOfWinnersNeeded = this.numberOfItems > this.bids.length ? this.bids.length : this.numberOfItems;
        const winners = this.getWinners(this.bids, amountOfWinnersNeeded);

        if (this.numberOfItems > 1) {
            this.winners = winners.slice(0, this.numberOfItems);
            return this.winners;
        }

        const winner = winners[Math.floor(Math.random() * winners.length)];
        this.winner = winner;
        return winner;
    }
}