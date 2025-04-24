const { title } = require('as-table');
const dbClient = require('./db.js');
const db = dbClient.db('DKP');
const debuglog = db.collection(`debuglog`);
module.exports = async function log(debugTitle, debugInfo) {
    const debugData = {
        title: debugTitle,
        info: debugInfo,
        createdAt: new Date(),
    };

    return debuglog.insertOne(debugData);
}
