require('dotenv').config()
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGO_URL);

module.exports = client;