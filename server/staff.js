import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Router } from 'express';
import { getDatabase } from './db.js';

const deriveKey = promisify(scrypt);
const sessionDuration = 8 * 60 * 60_000;
const loginWindow = 15 * 60_000;
const cookie = 'salon_staff';
const attempts = new Map();
let attemptSweep = 0;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

async function passwordKey(password, salt) {
  return deriveKey(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 ** 2 });
}

export async function createReceptionist(db, email, password, { demo = false } = {}) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254 ||
      typeof password !== 'string' || password.length < 15 || password.length > 128) {
    throw new Error('Provide an email and a password with 15–128 characters.');
  }
  const salt = randomBytes(16).toString('hex');
  const hash = (await passwordKey(password, salt)).toString('hex');
  const result = await db.collection('staffAccounts').updateOne(
    { _id: normalized }, { $setOnInsert: { role: 'receptionist', salt, hash, demo, enabled: true } },
    { upsert: true },
  );
  return Boolean(result.upsertedCount);
}

function accountEnabled(account) {
  return account?.enabled && !(account.demo && (process.env.NODE_ENV === 'production' || process.env.RENDER));
}

function loginAllowed(ip) {
  const now = Date.now();
  if (now >= attemptSweep) {
    for (const [key, value] of attempts) {
      if (value.until <= now) attempts.delete(key);
    }
    attemptSweep = now + loginWindow;
  }
  let attempt = attempts.get(ip);
  if (!attempt || attempt.until <= now) {
    if (attempts.size >= 10_000 && !attempt) return false;
    attempt = { count: 0, until: now + loginWindow };
    attempts.set(ip, attempt);
  }
  attempt.count += 1;
  return attempt.count <= 10;
}

function cookieOptions(request) {
  return { httpOnly: true, secure: request.secure || process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/api' };
}

function sessionKey(secret) {
  return createHash('sha256').update(secret).digest('hex');
}

function sessionFrom(request) {
  const match = /(?:^|;\s*)salon_staff=([a-f0-9]{64})(?:;|$)/.exec(request.get('cookie') ?? '');
  return match ? sessionKey(match[1]) : null;
}

export function sameOriginWrite(request, response, next) {
  const site = request.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return response.status(403).json({ error: 'accessDenied' });
  }
  return next();
}

export async function requireReception(request, response, next) {
  const key = sessionFrom(request);
  if (!key) return response.status(401).json({ error: 'signInRequired' });

  const db = getDatabase();
  const session = await db.collection('staffSessions').findOne({ _id: key, expiresAt: { $gt: new Date() } });
  const staff = session && await db.collection('staffAccounts').findOne({ _id: session.email }, {
    projection: { role: 1, demo: 1, enabled: 1 },
  });
  if (!accountEnabled(staff)) return response.status(401).json({ error: 'signInRequired' });
  if (staff.role !== 'receptionist') return response.status(403).json({ error: 'accessDenied' });
  return next();
}

export const staffRouter = Router();

staffRouter.post('/login', sameOriginWrite, async (request, response) => {
  if (!loginAllowed(request.ip)) return response.status(429).json({ error: 'loginThrottled' });
  const email = normalizeEmail(request.body?.email);
  const password = request.body?.password;
  const denied = () => response.status(401).json({ error: 'invalidCredentials' });
  if (!email || email.length > 254 || typeof password !== 'string' || password.length > 128) return denied();

  const db = getDatabase();
  const staff = await db.collection('staffAccounts').findOne({ _id: email });
  const actual = await passwordKey(password, staff?.salt ?? '0'.repeat(32));
  const expected = Buffer.from(staff?.hash ?? '0'.repeat(128), 'hex');
  if (!timingSafeEqual(actual, expected) || !accountEnabled(staff)) return denied();

  const secret = randomBytes(32).toString('hex');
  const sessions = db.collection('staffSessions');
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const prior = sessionFrom(request);
  if (prior) await sessions.deleteOne({ _id: prior });
  await sessions.insertOne({ _id: sessionKey(secret), email, expiresAt: new Date(Date.now() + sessionDuration) });
  response.cookie(cookie, secret, { ...cookieOptions(request), maxAge: sessionDuration }).json({ role: staff.role });
});

staffRouter.post('/logout', sameOriginWrite, async (request, response) => {
  const key = sessionFrom(request);
  if (key) await getDatabase().collection('staffSessions').deleteOne({ _id: key });
  response.clearCookie(cookie, cookieOptions(request)).status(204).end();
});
