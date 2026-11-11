'use strict';
const mongoose = require('mongoose');
const env = require('./config/env');
const app = require('./app');

let mongoServer = null;

async function connectDatabase() {
  let uri = env.MONGODB_URI;

  // If local URI is requested or defaults are used without an external Mongo running,
  // we can spin up an in-memory Mongo Replica Set so transactions work seamlessly out-of-the-box!
  const isDefaultLocal = uri.includes('127.0.0.1') || uri.includes('localhost');

  if (isDefaultLocal && process.env.AUTO_SPIN_MONGO !== 'false') {
    try {
      // Test if local MongoDB is already running and reachable
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
      console.log(`[database] Connected to existing MongoDB at: ${uri}`);
      return;
    } catch {
      console.log('[database] Local MongoDB not reachable. Initializing embedded Replica Set for full Transaction support...');
      try {
        const { MongoMemoryReplSet } = require('mongodb-memory-server');
        const embeddedPort = Number(process.env.MONGO_EMBEDDED_PORT || 27018);
        try {
          mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
            instanceOpts: [{ port: embeddedPort }],
          });
        } catch {
          mongoServer = await MongoMemoryReplSet.create({
            replSet: { count: 1, storageEngine: 'wiredTiger' },
          });
        }
        uri = mongoServer.getUri();
        console.log(`[database] Embedded Replica Set started at: ${uri}`);
      } catch (err) {
        console.error('[database] Failed to launch embedded MongoMemoryReplSet:', err.message);
        throw err;
      }
    }
  }

  await mongoose.connect(uri, {
    dbName: 'gamer2gamer',
    runtimeAdapters: { os: require('os') },
  });
  console.log(`[database] Connected to MongoDB at: ${uri}`);
}

async function start() {
  try {
    await connectDatabase();

    const { User, Offer } = require('./models');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[server] Database empty, auto-populating demo seed data...');
      const { populateData } = require('../scripts/seed');
      await populateData();
    } else {
      await Offer.updateMany(
        { description: /VPN|Offline mode/i },
        {
          $set: {
            title: 'Pro Radiant Duo / Solo Rank Boost - Flexible Schedule',
            description: 'Duo or solo queue rank progression with experienced Radiant players. Flexible play hours and role selection on European servers.',
          },
        }
      );
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[server] Gamer2Gamer Backend running on http://localhost:${env.PORT}`);
      console.log(`[server] Environment: ${env.NODE_ENV} | Demo Payments: ${env.ENABLE_DEMO_PAYMENTS}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await mongoose.disconnect();
        if (mongoServer) await mongoServer.stop();
        console.log('[server] Closed gracefully.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[server] Fatal error during startup:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start, connectDatabase };
