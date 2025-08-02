const { drizzle } = require('drizzle-orm/node-postgres');
const { Client } = require('pg');
require('dotenv/config');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();
const db = drizzle(client);

module.exports = { db };