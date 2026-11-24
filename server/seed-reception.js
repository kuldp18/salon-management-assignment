import { randomBytes } from 'node:crypto';
import { closeDatabase, getDatabase } from './db.js';
import { allocateTokens, ensureQueueIndexes } from './queue.js';
import { createReceptionist } from './staff.js';

const samples = [
  { name: 'Aarav Mehta', service: 'haircut', barber: 'ravi', minutes: 80, status: 'called' },
  { name: 'Dev Patel', service: 'hair-spa', barber: 'imran', minutes: 74, status: 'in_chair' },
  { name: 'Rohan Shah', service: 'haircut', barber: 'ravi', minutes: 68 },
  { name: 'Neel Desai', service: 'beard-trim', barber: 'amit', minutes: 52 },
  { name: 'Jay Trivedi', service: 'haircut', minutes: 38 },
  { name: 'Karan Joshi', service: 'hair-spa', barber: 'imran', minutes: 26 },
  { name: 'Yash Parmar', service: 'beard-trim', minutes: 17 },
  { name: 'Dhruv Vyas', service: 'haircut', barber: 'ravi', minutes: 8 },
];

async function seedReception(db) {
  const catalog = await db.collection('services').find({ active: true }).toArray();
  const barbers = await db.collection('barbers').countDocuments({
    slug: { $in: ['ravi', 'amit', 'imran'] }, onDuty: true,
  });
  if (barbers !== 3 || samples.some(({ service }) => !catalog.some(({ slug }) => slug === service))) {
    throw new Error('Run the catalog seed and make Ravi, Amit, and Imran available first.');
  }

  await ensureQueueIndexes(db);
  const queue = db.collection('queueEntries');
  await queue.createIndex({ demoKey: 1 }, { unique: true, sparse: true });
  const keys = samples.map((_, index) => `reception-v1-${index + 1}`);
  const existing = new Set(await queue.distinct('demoKey', { demoKey: { $in: keys } }));
  const missing = keys.filter((key) => !existing.has(key));
  if (!missing.length) return;

  const startToken = await allocateTokens(db, missing.length);
  const now = Date.now();
  await queue.bulkWrite(missing.map((key, index) => {
    const sampleIndex = keys.indexOf(key);
    const sample = samples[sampleIndex];
    const { slug, name, durationMinutes, price } = catalog.find(({ slug }) => slug === sample.service);
    const entry = {
      _id: randomBytes(24).toString('hex'),
      demoKey: key,
      token: startToken + index,
      name: sample.name,
      phone: String(sampleIndex + 1).padStart(10, '0'),
      services: [{ slug, name, durationMinutes, price }],
      durationMinutes,
      price,
      barberPreference: sample.barber ?? null,
      status: sample.status ?? 'waiting',
      createdAt: new Date(now - sample.minutes * 60_000),
      source: 'demo',
    };
    if (sample.status) {
      entry.assignedBarber = sample.barber;
      entry.calledAt = new Date(now - 14 * 60_000);
    }
    if (sample.status === 'in_chair') entry.startedAt = new Date(now - 7 * 60_000);
    return { updateOne: { filter: { demoKey: key }, update: { $setOnInsert: entry }, upsert: true } };
  }), { ordered: false });
}

try {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    throw new Error('The reception seed runs only in development.');
  }
  const db = getDatabase();
  await seedReception(db);
  await createReceptionist(db, 'reception@example.test', 'ReceptionDemo!2026', { demo: true });
  console.log('Eight development queue entries and the reception demo account are ready.');
} catch (error) {
  console.error(error.constructor === Error ? error.message : 'Reception seed failed. Check Atlas and existing queue assignments.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
