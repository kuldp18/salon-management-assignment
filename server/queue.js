import { randomBytes } from 'node:crypto';
import { normalizePhone, validateJoin } from '../shared/join-validation.js';

const activeStatuses = ['waiting', 'called', 'in_chair'];
const occupiedStatuses = ['called', 'in_chair'];
const noShowDelayMs = 10 * 60_000;
const privateStatusId = /^[a-f0-9]{48}$/;
const queueOrder = { token: 1 };
const closingTimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const salonTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const salonDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});
let indexes;

export function ensureQueueIndexes(db) {
  indexes ??= db.collection('queueEntries').createIndexes([
    { key: { phone: 1 }, unique: true, partialFilterExpression: { status: { $in: activeStatuses } } },
    { key: { status: 1, token: 1 } },
    { key: { token: 1 }, unique: true },
    { key: { assignedBarber: 1 }, unique: true, partialFilterExpression: {
      assignedBarber: { $type: 'string' }, status: { $in: occupiedStatuses },
    } },
  ]).catch((error) => {
    indexes = undefined;
    throw error;
  });

  return indexes;
}

function closingReason(settings, now) {
  if (settings?.onlineJoiningOpen === false) return 'joiningClosed';
  if (!closingTimePattern.test(settings?.closingTime ?? '')) return null;

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
  return entry.barberPreference == null || entry.barberPreference === barber;
}

function eligibleWaiting(barber) {
  return { status: 'waiting', barberPreference: { $in: [null, barber] } };
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

function readServices(db) {
  return db.collection('services').find({ active: true }, {
    projection: { _id: 0, slug: 1, name: 1, durationMinutes: 1, price: 1 },
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

function assignedEntries(entries) {
  return new Map(entries.filter(({ status }) => status !== 'waiting')
    .map((entry) => [entry.assignedBarber, entry]));
}

export async function getHome(db) {
  const [barbers, entries, settings] = await Promise.all([readBarbers(db), readActiveQueue(db), readSettings(db)]);
  const current = assignedEntries(entries);
  const now = new Date();

  return {
    waitingCount: entries.filter(({ status }) => status === 'waiting').length,
    anyBarber: estimateWait(null, barbers, entries, now),
    closedReason: closingReason(settings, now),
    closingTime: closingTimePattern.test(settings?.closingTime ?? '') ? settings.closingTime : null,
    barbers: barbers.map(({ name, slug, onBreak }) => ({
      name, status: onBreak ? 'break' : current.get(slug)?.status ?? 'available',
    })),
  };
}

export async function getOwnerSettings(db) {
  const now = new Date();
  const start = new Date(`${salonDate.format(now)}T00:00:00+05:30`);
  const day = { $gte: start, $lt: new Date(start.getTime() + 86_400_000) };
  const [settings, barbers, stats] = await Promise.all([
    readSettings(db),
    db.collection('barbers').find({}, { projection: { _id: 0, name: 1, slug: 1 } }).sort({ _id: 1 }).toArray(),
    db.collection('queueEntries').aggregate([
      { $match: { $or: [{ status: 'done', completedAt: day }, { status: 'no_show', noShowAt: day }] } },
      { $group: { _id: '$status', count: { $sum: 1 }, averageWait: { $avg: { $subtract: ['$startedAt', '$createdAt'] } } } },
    ]).toArray(),
  ]);
  const served = stats.find(({ _id }) => _id === 'done');
  return {
    onlineJoiningOpen: settings?.onlineJoiningOpen !== false,
    closedReason: closingReason(settings, now),
    barbers,
    stats: {
      served: served?.count ?? 0,
      averageWaitMinutes: served?.averageWait == null ? null : Math.round(served.averageWait / 60_000),
      noShows: stats.find(({ _id }) => _id === 'no_show')?.count ?? 0,
    },
  };
}

export async function setOnlineJoining(db, open) {
  if (typeof open !== 'boolean') return { status: 400, body: { error: 'invalidRequest' } };

  await db.collection('salonSettings').updateOne({ _id: 'salon' }, { $set: { onlineJoiningOpen: open } }, { upsert: true });
  return { status: 200, body: { onlineJoiningOpen: open } };
}

export async function getJoinOptions(db) {
  const [services, barbers, queue, settings] = await Promise.all([
    readServices(db),
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

export async function getTvDisplay(db) {
  const [barbers, entries] = await Promise.all([readBarbers(db), readActiveQueue(db)]);
  const now = new Date();
  const current = assignedEntries(entries);
  const next = entries.filter(({ status }) => status === 'waiting')
    .sort((a, b) => a.token - b.token).slice(0, 5);

  return {
    barbers: barbers.map(({ slug, name, onBreak }) => {
      const entry = current.get(slug);
      return { name, status: entry?.status ?? (onBreak ? 'break' : 'available'), token: entry?.token ?? null };
    }),
    next: next.map(({ token, barberPreference }) => ({
      token,
      waitMinutes: estimateWait(barberPreference, barbers, entries, now, token).minutes,
    })),
  };
}

export async function allocateTokens(db, count) {
  const { value } = await db.collection('salonSettings').findOneAndUpdate(
    { _id: 'queue-counter' }, { $inc: { value: count } }, { upsert: true, returnDocument: 'after' },
  );
  return value - count + 1;
}

export async function joinQueue(db, input, source = 'online') {
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
    source === 'online' ? readSettings(db) : null,
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

  const token = await allocateTokens(db, 1);
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
      source,
      status: 'waiting',
      createdAt: now,
    });
  } catch (error) {
    if (error.code !== 11000 || !error.keyPattern?.phone) throw error;
    return { status: 409, body: { errors: { phone: 'phoneAlreadyQueued' } } };
  }
  return { status: 201, body: { statusId, token } };
}

export async function getReception(db) {
  const [services, barbers, entries] = await Promise.all([
    readServices(db),
    readBarbers(db),
    db.collection('queueEntries').find({ status: { $in: activeStatuses } }, {
      projection: { _id: 0, token: 1, status: 1, name: 1, services: 1, barberPreference: 1,
        assignedBarber: 1, createdAt: 1, calledAt: 1, startedAt: 1, durationMinutes: 1 },
    }).sort(queueOrder).toArray(),
  ]);
  const now = new Date();
  const waiting = entries.filter((entry) => entry.status === 'waiting');
  return {
    services,
    totals: {
      waiting: waiting.length,
      called: entries.filter((entry) => entry.status === 'called').length,
      inChair: entries.filter((entry) => entry.status === 'in_chair').length,
    },
    waiting: waiting.map((entry) => ({
      token: entry.token, name: entry.name, services: entry.services.map(({ name }) => name),
      barberPreference: entry.barberPreference,
      waitMinutes: Math.max(0, Math.floor((now - entry.createdAt) / 60_000)),
    })),
    barbers: barbers.map((barber) => {
      const current = entries.find((entry) => entry.assignedBarber === barber.slug && entry.status !== 'waiting');
      const elapsed = current?.calledAt ? now - current.calledAt : 0;
      return {
        ...barber,
        canCall: !barber.onBreak && !current && waiting.some((entry) => eligible(entry, barber.slug)),
        current: current ? {
          token: current.token, status: current.status, durationMinutes: current.durationMinutes,
          remainingMinutes: Math.ceil(remainingMinutes(current, now)),
          calledMinutes: Math.max(0, Math.floor(elapsed / 60_000)),
          canMarkNoShow: current.status === 'called' && elapsed >= noShowDelayMs,
        } : null,
      };
    }),
  };
}

export async function callNext(db, slug) {
  await ensureQueueIndexes(db);
  const queue = db.collection('queueEntries');
  return db.client.withSession((session) => session.withTransaction(async () => {
    // Write the barber row first so concurrent calls and break changes contend on the same document.
    const barber = await db.collection('barbers').updateOne(
      { slug, onDuty: true, onBreak: { $ne: true } }, { $inc: { queueRevision: 1 } }, { session },
    );
    if (!barber.matchedCount) return { status: 409, body: { error: 'barberUnavailable' } };
    if (await queue.findOne({ assignedBarber: slug, status: { $in: occupiedStatuses } }, {
      projection: { _id: 1 }, session,
    })) {
      return { status: 409, body: { error: 'barberOccupied' } };
    }
    const called = await queue.findOneAndUpdate(
      eligibleWaiting(slug),
      { $set: { status: 'called', assignedBarber: slug, calledAt: new Date() } },
      { sort: queueOrder, projection: { token: 1 }, session },
    );
    return called
      ? { status: 200, body: { token: called.token } }
      : { status: 409, body: { error: 'noEligibleEntry' } };
  }));
}

async function finishEntry(db, identity, action) {
  const cancelled = action === 'cancel';
  const now = new Date();
  const condition = cancelled ? { status: 'waiting' } : {
    status: 'called', calledAt: { $lte: new Date(now.getTime() - noShowDelayMs) },
  };
  const queue = db.collection('queueEntries');
  const updated = await queue.findOneAndUpdate({ ...identity, ...condition }, {
    $set: cancelled ? { status: 'cancelled', cancelledAt: now } : { status: 'no_show', noShowAt: now },
  }, { projection: { token: 1 } });
  if (updated) return { status: 200, body: { token: updated.token } };
  const entry = await queue.findOne(identity, { projection: { status: 1 } });
  return {
    status: entry ? 409 : 404,
    body: { error: !cancelled && entry?.status === 'called' ? 'noShowEarly' : 'entryChanged' },
  };
}

export function finishReceptionEntry(db, token, action) {
  return finishEntry(db, { token }, action);
}

export function cancelQueueSpot(db, id) {
  if (!privateStatusId.test(id)) return { status: 404, body: { error: 'statusMissing' } };
  return finishEntry(db, { _id: id }, 'cancel');
}

export async function getBarberView(db, slug) {
  const queue = db.collection('queueEntries');
  const [barber, current, next] = await Promise.all([
    db.collection('barbers').findOne({ slug }, { projection: { _id: 0, name: 1, onDuty: 1, onBreak: 1 } }),
    queue.findOne({ assignedBarber: slug, status: { $in: occupiedStatuses } }, {
      projection: { _id: 0, token: 1, status: 1, name: 1, 'services.name': 1, startedAt: 1 },
    }),
    queue.findOne(eligibleWaiting(slug), {
      sort: queueOrder, projection: { _id: 0, token: 1, 'services.name': 1 },
    }),
  ]);
  return barber && { ...barber, current, next: barber.onDuty ? next : null };
}

export async function updateBarberEntry(db, slug, token, action) {
  const start = action === 'start';
  const now = new Date();
  const result = await db.collection('queueEntries').updateOne(
    { assignedBarber: slug, token, status: start ? 'called' : 'in_chair' },
    { $set: start ? { status: 'in_chair', startedAt: now } : { status: 'done', completedAt: now } },
  );
  return result.modifiedCount
    ? { status: 200, body: { token } }
    : { status: 409, body: { error: 'entryChanged' } };
}

export async function setBarberBreak(db, slug, onBreak) {
  if (typeof onBreak !== 'boolean') return { status: 400, body: { error: 'invalidRequest' } };

  const result = await db.collection('barbers').updateOne({ slug, onDuty: true }, { $set: { onBreak } });
  return result.matchedCount
    ? { status: 200, body: { onBreak } }
    : { status: 409, body: { error: 'barberUnavailable' } };
}

export async function getQueueStatus(db, id) {
  if (!privateStatusId.test(id)) return null;

  const entry = await db.collection('queueEntries').findOne({ _id: id }, {
    projection: { _id: 0, token: 1, status: 1, barberPreference: 1, assignedBarber: 1 },
  });
  if (entry?.status === 'called' && entry.assignedBarber) {
    const barber = await db.collection('barbers').findOne({ slug: entry.assignedBarber }, { projection: { name: 1 } });
    return { token: entry.token, status: entry.status, barberName: barber?.name };
  }
  if (!entry || entry.status !== 'waiting') return entry;

  const [barbers, queue] = await Promise.all([readBarbers(db), readActiveQueue(db)]);
  const position = 1 + queue.filter((other) => other.status === 'waiting' && other.token < entry.token &&
    (!entry.barberPreference || eligible(other, entry.barberPreference))).length;
  return { ...entry, position, wait: estimateWait(entry.barberPreference, barbers, queue, new Date(), entry.token) };
}
