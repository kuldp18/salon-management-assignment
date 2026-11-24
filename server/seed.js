import { closeDatabase, databaseConfigured, getDatabase } from './db.js';

const services = [
  { slug: 'haircut', name: { en: 'Haircut', gu: 'હેરકટ' }, durationMinutes: 30, price: 150 },
  { slug: 'beard-trim', name: { en: 'Beard trim', gu: 'દાઢી ટ્રિમ' }, durationMinutes: 15, price: 80 },
  { slug: 'hair-spa', name: { en: 'Hair spa', gu: 'હેર સ્પા' }, durationMinutes: 45, price: 400 },
];

const barbers = [
  { slug: 'ravi', name: 'Ravi' },
  { slug: 'amit', name: 'Amit' },
  { slug: 'imran', name: 'Imran' },
];

async function seedCollection(collection, entries, defaults) {
  await collection.createIndex({ slug: 1 }, { unique: true });
  await collection.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: { slug: entry.slug },
        update: { $setOnInsert: { ...entry, ...defaults } },
        upsert: true,
      },
    })),
  );
}

try {
  const db = getDatabase();
  await seedCollection(db.collection('services'), services, { active: true });
  await seedCollection(db.collection('barbers'), barbers, { onDuty: true, onBreak: false });
  console.log('Sample services and barbers are ready.');
} catch {
  console.error(databaseConfigured
    ? 'Seed failed. Check the Atlas connection, database permissions, and existing data.'
    : 'Set MONGODB_URI in server/.env before seeding.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
