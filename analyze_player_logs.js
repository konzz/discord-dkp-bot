const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyzePlayerLogs() {
    // MongoDB connection string - replace with your actual connection string
    const uri = process.env.MONGO_URL;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('DKP');
        const players = db.collection('players');

        // Find the specific player
        const player = await players.findOne({ player: '188003327173197824' });

        if (!player) {
            console.log('Player not found');
            return;
        }

        console.log(`Found player: ${player.player}`);
        console.log('Processing DKP values...');

        // Sort logs by date in ascending order
        const sortedLogs = player.log.sort((a, b) => a.date - b.date);

        let totalDkp = 0;

        // Process each log entry
        for (const log of sortedLogs) {
            if (log.dkp) {
                totalDkp += log.dkp;
                const date = new Date(log.date);
                const cetDate = date.toLocaleString('en-US', {
                    timeZone: 'Europe/Paris',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
                console.log(`Date: ${cetDate} - DKP: ${log.dkp} - Running Total: ${totalDkp}`);
            }
        }

        console.log('\nFinal Summary:');
        console.log(`Total DKP: ${totalDkp}`);
        console.log(`Total Log Entries: ${sortedLogs.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

analyzePlayerLogs().catch(console.error); 