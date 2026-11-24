import { closeDatabase, getDatabase } from './db.js';
import { createStaffAccount } from './staff.js';

try {
  const created = await createStaffAccount(getDatabase(),
    process.env.STAFF_SETUP_EMAIL, process.env.STAFF_SETUP_PASSWORD);
  console.log(created ? 'Receptionist account created.' : 'An account with that email already exists.');
} catch (error) {
  console.error(error.constructor === Error ? error.message : 'Unable to create the receptionist account.');
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
