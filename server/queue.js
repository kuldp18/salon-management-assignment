import { randomBytes } from 'node:crypto';
import { normalizePhone, validateJoin } from '../shared/join-validation.js';

const activeStatuses = ['waiting', 'called', 'in_chair'];
const salonTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
let indexes;

function ensureQueueIndexes(db) {
  indexes ??= db.collection('queueEntries').createIndexes([
    { key: { phone: 1 }, unique: true, partialFilterExpression: { status: { $in: activeStatuses } } },
    { key: { status: 1, token: 1 } },
  ]).catch((error) => {
    indexes = undefined;
    throw error;
  });

  return indexes;
}

function closingReason(settings, now) {
  if (settings?.onlineJoiningOpen === false) return 'joiningClosed';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings?.closingTime ?? '')) return null;

  const [hours, minutes] = salonTime.format(now).split(':').map(Number);
  const [closingHours, closingMinutes] = settings.closingTime.split(':').map(Number);
  return hours * 60 + minutes >= closingHours * 60 + closingMinutes - 30
    ? 'closingSoon'
    : null;
}

function remainingMinutes(entry, now) {
  if (!entry) return 0;
  if (entry.status === 'called' || !entry.startedAt) return entry.durationMinutes;
  return Math.max(0, entry.durationMinutes - (now - entry.startedAt) / 60_000);
}

function eligible(entry, barber) {
  return !entry.barberPreference || entry.barberPreference === barber;
}

function estimateWait(barber, barbers, entries, now, beforeToken = Infinity) {
  const working = barbers.filter((person) => !person.onBreak);
  const preferred = barbers.find((person) => person.slug === barber);
  if (preferred?.onBreak) return { minutes: null, reason: 'barberOnBreak' };
  if (!working.length || (barber && !preferred)) {
    return { minutes: null, reason: 'noWorkingBarber' };
  }

  const ahead = entries.filter((entry) => entry.status === 'waiting' && entry.token < beforeToken &&
    (!barber || eligible(entry, barber)));
  const duration = ahead.reduce((sum, entry) => sum + entry.durationMinutes, 0);
  const current = new Map(entries
    .filter((entry) => entry.status !== 'waiting')
    .map((entry) => [entry.assignedBarber, entry]));

  if (barber) return { minutes: Math.ceil(duration + remainingMinutes(current.get(barber), now)) };

  const nextAvailable = Math.min(...working.map((person) => remainingMinutes(current.get(person.slug), now)));
  return { minutes: Math.ceil(duration / working.length + nextAvailable) };
}

function readBarbers(db) {
  return db.collection('barbers').find({ onDuty: true }, {
    projection: { _id: 0, slug: 1, name: 1, onBreak: 1 },
  }).sort({ _id: 1 }).toArray();
}

function readActiveQueue(db) {
  return db.collection('queueEntries').find({ status: { $in: activeStatuses } }, {
    projection: { _id: 0, token: 1, status: 1, durationMinutes: 1, barberPreference: 1, assignedBarber: 1, startedAt: 1 },
  }).toArray();
}

function readSettings(db) {
  return db.collection('salonSettings').findOne({ _id: 'salon' });
}

export async function getJoinOptions(db) {
  const [services, barbers, queue, settings] = await Promise.all([
    db.collection('services').find({ active: true }, {
      projection: { _id: 0, slug: 1, name: 1, durationMinutes: 1, price: 1 },
    }).sort({ _id: 1 }).toArray(),
    readBarbers(db),
    readActiveQueue(db),
    readSettings(db),
  ]);
  const now = new Date();
  return {
    services,
    anyBarber: estimateWait(null, barbers, queue, now),
    barbers: barbers.map((barber) => ({
      ...barber,
      wait: estimateWait(barber.slug, barbers, queue, now),
    })),
    closedReason: closingReason(settings, now),
  };
}

export async function joinQueue(db, input) {
  const errors = validateJoin(input);
  if (Object.keys(errors).length) return { status: 400, body: { errors } };

  const [services, barber, settings] = await Promise.all([
    db.collection('services').find({ slug: { $in: input.services }, active: true }, {
      projection: { _id: 0, slug: 1, name: 1, durationMinutes: 1, price: 1 },
    }).toArray(),
    input.barber == null ? null : db.collection('barbers').findOne({
      slug: typeof input.barber === 'string' ? input.barber : null,
      onDuty: true,
    }),
    readSettings(db),
  ]);
  if (services.length !== input.services.length) errors.services = 'servicesUnavailable';
  if (input.barber != null && !barber) errors.barber = 'barberUnavailable';
  if (Object.keys(errors).length) return { status: 400, body: { errors } };

  await ensureQueueIndexes(db);
  const now = new Date();
  const closedReason = closingReason(settings, now);
  if (closedReason) return { status: 409, body: { error: closedReason } };

  const queue = db.collection('queueEntries');
  const phone = normalizePhone(input.phone);
  if (await queue.findOne({ phone, status: { $in: activeStatuses } }, { projection: { _id: 1 } })) {
    return { status: 409, body: { errors: { phone: 'phoneAlreadyQueued' } } };
  }

  const { value: token } = await db.collection('salonSettings').findOneAndUpdate(
    { _id: 'queue-counter' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' },
  );
  const statusId = randomBytes(24).toString('hex');
  try {
    await queue.insertOne({
      _id: statusId,
      token,
      name: input.name.trim(),
      phone,
      services,
      durationMinutes: services.reduce((sum, service) => sum + service.durationMinutes, 0),
      price: services.reduce((sum, service) => sum + service.price, 0),
      barberPreference: barber?.slug ?? null,
      status: 'waiting',
      createdAt: now,
    });
  } catch (error) {
    if (error.code !== 11000 || !error.keyPattern?.phone) throw error;
    return { status: 409, body: { errors: { phone: 'phoneAlreadyQueued' } } };
  }
  return { status: 201, body: { statusId } };
}

export async function getQueueStatus(db, id) {
  if (!/^[a-f0-9]{48}$/.test(id)) return null;

  const entry = await db.collection('queueEntries').findOne({ _id: id }, {
    projection: { _id: 0, token: 1, status: 1, barberPreference: 1 },
  });
  if (!entry || entry.status !== 'waiting') return entry;

  const [barbers, queue] = await Promise.all([readBarbers(db), readActiveQueue(db)]);
  const position = 1 + queue.filter((other) => other.status === 'waiting' && other.token < entry.token &&
    (!entry.barberPreference || eligible(other, entry.barberPreference))).length;
  return { ...entry, position, wait: estimateWait(entry.barberPreference, barbers, queue, new Date(), entry.token) };
}
