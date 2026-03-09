const { MongoClient } = require("mongodb");

const connectionString = process.env.MONGODB_URI;
const databaseName = process.env.DB_NAME || "restaurant_management";

if (!connectionString) {
  throw new Error("MONGODB_URI is required. Add it to your .env file.");
}

const client = new MongoClient(connectionString);

let db;

async function connectToDatabase() {
  if (!db) {
    await client.connect();
    db = client.db(databaseName);
    console.log(`Connected to MongoDB database: ${databaseName}`);
  }
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectToDatabase first.");
  }
  return db;
}

function getCollection(name) {
  return getDb().collection(name);
}

function startSession() {
  return client.startSession();
}

async function closeDatabase() {
  await client.close();
}

module.exports = {
  closeDatabase,
  connectToDatabase,
  getCollection,
  getDb,
  startSession
};
