import { closeDatabase, getDatabase } from './db.js';
import { createStaffAccount } from './staff.js';

try {
  const demo = process.argv.includes('--demo');
  if (demo && (process.env.NODE_ENV === 'production' || process.env.RENDER)) {
    throw new Error('The demo owner account is for development.');
  }
  const email = demo ? 'owner@example.test' : process.env.STAFF_SETUP_EMAIL;
  const password = demo ? 'OwnerDemo!2026!' : process.env.STAFF_SETUP_PASSWORD;
  const created = await createStaffAccount(getDatabase(), email, password, { role: 'owner', demo });
  console.log(created ? 'Owner account created.' : 'An account with that email already exists.');
} catch (error) {
  console.error(error.constructor === Error ? error.message : 'Unable to create the owner account.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
