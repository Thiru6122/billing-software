require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const mongoose = require('mongoose');

async function reset() {
  const dbUrl = (process.env.DATABASE || '').replace(/\s/g, '');
  if (!dbUrl) {
    console.error('DATABASE not set in .env');
    process.exit(1);
  }

  await mongoose.connect(dbUrl);
  await mongoose.connection.db.collection('licensestates').updateOne(
    { key: 'global' },
    { $unset: { lockBypassUntil: 1, pendingOtpHash: 1, pendingOtpExpires: 1 } },
    { upsert: true }
  );

  console.log('Lock reset — bypass cleared. Refresh http://localhost:3000 and log in to see lock screen.');
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
