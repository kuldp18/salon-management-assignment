import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI?.trim();
const databaseName = process.env.MONGODB_DB?.trim() || 'salon';
let client;

export const databaseConfigured = Boolean(uri);

export function getDatabase() {
  if (!databaseConfigured) {
    throw new Error('Set MONGODB_URI in server/.env.');
  }

  client ??= new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  return client.db(databaseName);
}

export async function closeDatabase() {
  await client?.close();
}
