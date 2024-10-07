require('dotenv').config()
const uniqid = require('uniqid');

module.exports = class Auction {
    constructor(guild, item, minBid = 0, numberOfItems = 1, minBidToLockForMain = 0, overBidtoWinMain = 0) {
        this.item = item;
        this.bids = [];
        this.id = `${guild}_${uniqid()}`;
        this.winner = null;
        this.winners = [];
        this.guild = guild;
        this.auctionActive = true;
        this.minBid = minBid;
        this.numberOfItems = numberOfItems === 0 ? 1 : numberOfItems;
        this.minBidToLockForMain = minBidToLockForMain;
        this.overBidtoWinMain = overBidtoWinMain;
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

        const topBids = [];
        while (topBids.length < amount && filteredbids.length > 0) {
            if (filteredbids.length === 1) {
                topBids.push(filteredbids[0]);
                break;
            }
            if (filteredbids[0].amount > filteredbids[1].amount) {
                topBids.push(filteredbids[0]);
                filteredbids.splice(0, 1);
                continue;
            }
            if (filteredbids[0].amount === filteredbids[1].amount) {
                //attendance tie breaker
                const topBidders = filteredbids.filter(bid => bid.amount === filteredbids[0].amount);
                const sortedByAttendance = topBidders.sort((a, b) => b.attendance - a.attendance);
                const topAttendance = sortedByAttendance.filter(bid => bid.attendance === sortedByAttendance[0].attendance);

                if (topAttendance.length === 1) {
                    topBids.push(topAttendance[0]);
                    const index = filteredbids.findIndex(bid => bid.player === topAttendance[0].player);
                    filteredbids.splice(index, 1);
                    continue;
                }


                if (topAttendance[0].attendance > topAttendance[1].attendance) {
                    topBids.push(topAttendance[0]);
                    const index = filteredbids.findIndex(bid => bid.player === topAttendance[0].player);
                    filteredbids.splice(index, 1);
                    continue;
                }

                if (topAttendance[0].attendance < topAttendance[1].attendance) {
                    topBids.push(filteredbids[1]);
                    const index = filteredbids.findIndex(bid => bid.player === topAttendance[0].player);
                    filteredbids.splice(index, 1);
                    continue;
                }

                const winnerIndex = Math.floor(Math.random() * topAttendance.length);
                topBids.push(filteredbids[winnerIndex]);
                const index = filteredbids.findIndex(bid => bid.player === topAttendance[0].player);
                filteredbids.splice(index, 1);

            }
        }

        return topBids;
    }

    getWinners(bids, numberOfWinners = 1) {
        const [highestMainBid] = bids.filter(bid => bid.bidForMain).sort((a, b) => b.amount - a.amount);
        const mainBids = bids.filter(bid => (bid.bidForMain && bid.amount >= this.minBidToLockForMain) || (this.overBidtoWinMain && highestMainBid && bid.amount >= highestMainBid.amount + this.overBidtoWinMain));
        const altBids = bids.filter(bid => mainBids.findIndex(mainBid => mainBid.player === bid.player) === -1);

        const topMainBids = this.getTopBids(mainBids, numberOfWinners);
        const topAltBids = this.getTopBids(altBids, numberOfWinners);


        const winners = topMainBids;

        if (winners.length < numberOfWinners) {
            winners.push(...topAltBids.slice(0, numberOfWinners - winners.length));
        }

        return winners;
    }

    calculateWinner(playersList) {
        if (process.env.LOG_LEVEL === 'DEBUG') {
            console.log('--- Calculating winner ---');
            console.log(this.bids);
            console.log('--------------------------')
        }
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