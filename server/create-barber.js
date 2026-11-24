import { closeDatabase, getDatabase } from './db.js';
import { createStaffAccount } from './staff.js';

try {
  const demo = process.argv.includes('--demo');
  if (demo && (process.env.NODE_ENV === 'production' || process.env.RENDER)) {
    throw new Error('Barber demo accounts are for development.');
  }
  const db = getDatabase();
  if (demo) {
    for (const barberSlug of ['ravi', 'amit', 'imran']) {
      await createStaffAccount(db, `${barberSlug}@example.test`, 'BarberDemo!2026', {
        role: 'barber', barberSlug, demo: true,
      });
    }
    console.log('Development barber accounts are ready.');
  } else {
    const created = await createStaffAccount(db, process.env.STAFF_SETUP_EMAIL, process.env.STAFF_SETUP_PASSWORD, {
      role: 'barber', barberSlug: process.env.STAFF_SETUP_BARBER?.trim(),
    });
    console.log(created ? 'Barber account created.' : 'An account with that email already exists.');
  }
} catch (error) {
  console.error(error.constructor === Error ? error.message : 'Unable to create barber accounts.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
