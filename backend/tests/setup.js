'use strict';
process.noDeprecation = true;
process.emitWarning = () => {};
process.env.DOTENV_CONFIG_QUIET = 'true';
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet = null;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'super-secret-test-key-32-chars-long-12345';
  process.env.ENABLE_DEMO_PAYMENTS = 'true';
  process.env.RATE_LIMIT_DISABLED = 'true';

  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
  });
  const uri = replSet.getUri();
  await mongoose.connect(uri, {
    runtimeAdapters: { os },
  });
}, 90000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (replSet) {
    await replSet.stop();
  }
}, 30000);
