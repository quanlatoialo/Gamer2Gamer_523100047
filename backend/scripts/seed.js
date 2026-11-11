'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const {
  User,
  Game,
  Category,
  Offer,
  Wallet,
  LedgerTransaction,
  Order,
  OrderMessage,
  Dispute,
  Review,
  Notification,
  AuditLog,
  SellerApplication,
} = require('../src/models');
const { withTransaction } = require('../src/services/tx');

const PASSWORD_HASH = bcrypt.hashSync('Password@123', 10);

async function seed() {
  console.log('[seed] Connecting to MongoDB...');
  let mongoServer = null;
  let uri = env.MONGODB_URI;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000, runtimeAdapters: { os: require('os') } });
  } catch {
    console.log('[seed] Connecting to embedded Mongo Replica Set...');
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    uri = mongoServer.getUri();
    await mongoose.connect(uri, {
      runtimeAdapters: { os: require('os') },
    });
  }

  await populateData();

  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  } else {
    await mongoose.disconnect();
  }
}

async function populateData() {
  console.log('[seed] Starting idempotent seed process...');

  // 1. Users
  const usersDef = [
    {
      email: 'admin@gamer2gamer.com',
      displayName: 'Admin Overlord',
      roles: ['customer', 'admin'],
      country: 'DE',
      bio: 'Platform Administrator & Dispute Arbiter',
      isDemo: true,
    },
    {
      email: 'seller@gamer2gamer.com',
      displayName: 'Apex Merchant',
      roles: ['customer', 'seller'],
      country: 'FR',
      bio: 'Trusted high-tier gaming account and rare items provider.',
      isDemo: true,
    },
    {
      email: 'booster@gamer2gamer.com',
      displayName: 'Grandmaster Boost',
      roles: ['customer', 'booster'],
      country: 'SE',
      bio: 'Multi-season Challenger and Radiant competitive booster.',
      isDemo: true,
    },
    {
      email: 'customer@gamer2gamer.com',
      displayName: 'CasualGamer99',
      roles: ['customer'],
      country: 'NL',
      bio: 'Looking for fast delivery accounts and boosting.',
      isDemo: true,
    },
    {
      email: 'applicant@gamer2gamer.com',
      displayName: 'New Hopeful',
      roles: ['customer'],
      country: 'ES',
      bio: 'Applicant waiting for seller verification.',
      isDemo: true,
    },
  ];

  const userMap = {};
  for (const u of usersDef) {
    let doc = await User.findOne({ email: u.email });
    if (!doc) {
      doc = await User.create({
        ...u,
        passwordHash: PASSWORD_HASH,
      });
      console.log(`[seed] Created user: ${u.email}`);
    }
    userMap[u.email] = doc;
  }

  // 2. Wallets for all users
  for (const doc of Object.values(userMap)) {
    await Wallet.findOneAndUpdate(
      { user: doc._id, currency: 'EUR' },
      { $setOnInsert: { user: doc._id, currency: 'EUR', available: 50000, held: 0 } }, // 500.00 EUR demo available
      { upsert: true, new: true }
    );
  }

  // 3. Pending Application
  const pendingApp = await SellerApplication.findOne({ user: userMap['applicant@gamer2gamer.com']._id, requestedRole: 'seller' });
  if (!pendingApp) {
    await SellerApplication.create({
      user: userMap['applicant@gamer2gamer.com']._id,
      requestedRole: 'seller',
      message: 'I have operated an EU gaming marketplace shop for 4 years with consistent positive feedback.',
      status: 'pending',
    });
    console.log('[seed] Created pending seller application');
  }

  // 4. Games
  const gamesDef = [
    {
      name: 'World of Warcraft',
      slug: 'world-of-warcraft',
      description: 'Massively multiplayer online role-playing game set in the high fantasy world of Azeroth.',
      imageUrl: '/images/games/wow.webp',
      regions: ['EU', 'US'],
      featured: true,
    },
    {
      name: 'Valorant',
      slug: 'valorant',
      description: '5v5 character-based tactical shooter where precise gunplay meets unique agent abilities.',
      imageUrl: '/images/games/valorant.webp',
      regions: ['Europe', 'North America', 'Asia-Pacific'],
      featured: true,
    },
    {
      name: 'League of Legends',
      slug: 'league-of-legends',
      description: 'Team-based strategy game where two teams of five powerful champions face off.',
      imageUrl: '/images/games/lol.webp',
      regions: ['EU West', 'EU Nordic & East', 'North America'],
      featured: true,
    },
    {
      name: 'Counter-Strike 2',
      slug: 'counter-strike-2',
      description: 'The premier competitive first-person shooter featuring tactical grenade lineups and sub-tick precision.',
      imageUrl: '/images/games/cs2.webp',
      regions: ['Global / EU', 'North America'],
      featured: true,
    },
    {
      name: 'Final Fantasy XIV',
      slug: 'final-fantasy-xiv',
      description: 'Critically acclaimed MMORPG featuring an unforgettable storyline and epic raid encounters.',
      imageUrl: '/images/games/ffxiv.webp',
      regions: ['Chaos (EU)', 'Light (EU)', 'Aether (NA)'],
      featured: false,
    },
  ];

  const gameMap = {};
  for (const g of gamesDef) {
    let doc = await Game.findOne({ slug: g.slug });
    if (!doc) {
      doc = await Game.create(g);
      console.log(`[seed] Created game: ${g.name}`);
    }
    gameMap[g.slug] = doc;
  }

  // 5. Categories
  const categoriesDef = [
    { gameSlug: 'world-of-warcraft', type: 'account', name: 'High-end Accounts', slug: 'high-end-accounts', unitLabel: 'account' },
    { gameSlug: 'world-of-warcraft', type: 'item', name: 'Gold & Rare Mounts', slug: 'gold-mounts', unitLabel: '100,000 Gold' },
    { gameSlug: 'world-of-warcraft', type: 'boosting', name: 'Mythic+ & Raid Carries', slug: 'mythic-dungeons', unitLabel: 'Dungeon Run' },

    { gameSlug: 'valorant', type: 'account', name: 'Smurf & Ranked Accounts', slug: 'ranked-accounts', unitLabel: 'account' },
    { gameSlug: 'valorant', type: 'item', name: 'Skin Inventory Accounts', slug: 'skin-bundles', unitLabel: 'account' },
    { gameSlug: 'valorant', type: 'boosting', name: 'Rank Boosting (Iron - Radiant)', slug: 'rank-boost', unitLabel: 'Rank Division' },

    { gameSlug: 'league-of-legends', type: 'account', name: 'Unranked Lv 30 & Ranked', slug: 'unranked-lv30', unitLabel: 'account' },
    { gameSlug: 'league-of-legends', type: 'boosting', name: 'Solo/Duo Rank Boost', slug: 'solo-duo-boost', unitLabel: '1 Division' },

    { gameSlug: 'counter-strike-2', type: 'item', name: 'Knives & Gloves', slug: 'knives-gloves', unitLabel: 'item' },
    { gameSlug: 'counter-strike-2', type: 'boosting', name: 'Premier Rating Calibration', slug: 'premier-boost', unitLabel: '1,000 Rating' },
  ];

  const catMap = {};
  for (const c of categoriesDef) {
    const game = gameMap[c.gameSlug];
    let doc = await Category.findOne({ game: game._id, slug: c.slug });
    if (!doc) {
      doc = await Category.create({
        game: game._id,
        type: c.type,
        name: c.name,
        slug: c.slug,
        unitLabel: c.unitLabel,
      });
      console.log(`[seed] Created category: ${c.name} (${c.gameSlug})`);
    }
    catMap[`${c.gameSlug}:${c.slug}`] = doc;
  }

  // 6. Offers
  const now = new Date();
  const expiresAfter = (days) => new Date(now.getTime() + days * 24 * 3600 * 1000);

  const offersDef = [
    {
      seller: userMap['seller@gamer2gamer.com']._id,
      game: gameMap['world-of-warcraft']._id,
      category: catMap['world-of-warcraft:high-end-accounts']._id,
      type: 'account',
      title: 'Level 80 Paladin | Full Mythic BiS Gear | Invincible & Rare Mounts',
      description: 'Account comes with full original email ownership transfer. Completely safe and played by hand without any third-party tools.',
      region: 'EU',
      unitLabel: 'account',
      unitPrice: 18900, // 189.00 EUR
      currency: 'EUR',
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 28,
      status: 'active',
      publishedAt: now,
      expiresAt: expiresAfter(28),
      images: ['/images/offers/wow-paladin.webp'],
    },
    {
      seller: userMap['seller@gamer2gamer.com']._id,
      game: gameMap['world-of-warcraft']._id,
      category: catMap['world-of-warcraft:gold-mounts']._id,
      type: 'item',
      title: 'WoW Gold - Fast Face to Face Trade / Guild Bank Delivery',
      description: 'Safe hand-farmed gold. Fast delivery within 15 minutes. Select amount in 100k increments.',
      region: 'EU',
      unitLabel: '100,000 Gold',
      unitPrice: 1250, // 12.50 EUR per 100k
      currency: 'EUR',
      stock: 45,
      minPerOrder: 2,
      deliveryTimeHours: 1,
      durationDays: 30,
      status: 'active',
      publishedAt: now,
      expiresAt: expiresAfter(30),
      images: ['/images/offers/wow-gold.webp'],
    },
    {
      seller: userMap['seller@gamer2gamer.com']._id,
      game: gameMap['valorant']._id,
      category: catMap['valorant:ranked-accounts']._id,
      type: 'account',
      title: 'Immortal 1 Valorant Account | Prime Vandal + Kuronami Bundle',
      description: 'Full access account with clean competitive match history. European server. Instant credentials handover upon order.',
      region: 'Europe',
      unitLabel: 'account',
      unitPrice: 9500, // 95.00 EUR
      currency: 'EUR',
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 2,
      durationDays: 25,
      status: 'active',
      publishedAt: now,
      expiresAt: expiresAfter(25),
      images: ['/images/offers/valorant-immortal.webp'],
    },
    {
      seller: userMap['booster@gamer2gamer.com']._id,
      game: gameMap['valorant']._id,
      category: catMap['valorant:rank-boost']._id,
      type: 'boosting',
      title: 'Pro Radiant Duo / Solo Rank Boost - Flexible Schedule',
      description: 'Duo or solo queue rank progression with experienced Radiant players. Flexible play hours and role selection on European servers.',
      region: 'Europe',
      unitLabel: 'Rank Division',
      unitPrice: 2200, // 22.00 EUR per division
      currency: 'EUR',
      stock: 10,
      minPerOrder: 1,
      deliveryTimeHours: 24,
      durationDays: 20,
      status: 'active',
      publishedAt: now,
      expiresAt: expiresAfter(20),
      images: ['/images/offers/valorant-boost.webp'],
    },
    {
      seller: userMap['booster@gamer2gamer.com']._id,
      game: gameMap['league-of-legends']._id,
      category: catMap['league-of-legends:solo-duo-boost']._id,
      type: 'boosting',
      title: 'LoL Challenger Duo / Solo Queue Division Boost (Emerald to Master)',
      description: 'Professional high ELO players. Flash on your preferred key, high KDA and secret play.',
      region: 'EU West',
      unitLabel: '1 Division',
      unitPrice: 1950, // 19.50 EUR
      currency: 'EUR',
      stock: 8,
      minPerOrder: 1,
      deliveryTimeHours: 12,
      durationDays: 30,
      status: 'active',
      publishedAt: now,
      expiresAt: expiresAfter(30),
      images: ['/images/offers/lol-boost.webp'],
    },
  ];

  // Clean up any legacy seed offer containing VPN / Offline mode text
  await Offer.updateMany(
    { description: /VPN|Offline mode/i },
    {
      $set: {
        title: 'Pro Radiant Duo / Solo Rank Boost - Flexible Schedule',
        description: 'Duo or solo queue rank progression with experienced Radiant players. Flexible play hours and role selection on European servers.',
      },
    }
  );

  const offerList = [];
  for (const o of offersDef) {
    let doc = await Offer.findOne({ title: o.title, seller: o.seller });
    if (!doc) {
      doc = await Offer.create(o);
      console.log(`[seed] Created offer: ${o.title.slice(0, 40)}...`);
    }
    offerList.push(doc);
  }

  // 7. Seed completed reviews & demo orders
  const existingOrder = await Order.findOne({ orderNumber: 'G2G-DEMO-001' });
  if (!existingOrder && offerList[0]) {
    const o0 = offerList[0];
    const customer = userMap['customer@gamer2gamer.com'];
    const seller = userMap['seller@gamer2gamer.com'];

    const compOrder = await Order.create({
      orderNumber: 'G2G-DEMO-001',
      buyer: customer._id,
      seller: seller._id,
      offer: o0._id,
      offerSnapshot: {
        title: o0.title,
        type: o0.type,
        gameName: 'World of Warcraft',
        gameSlug: 'world-of-warcraft',
        categoryName: 'High-end Accounts',
        region: o0.region,
        unitLabel: o0.unitLabel,
        unitPrice: o0.unitPrice,
        currency: 'EUR',
        deliveryTimeHours: 1,
        image: o0.images[0] || '',
        minPerOrder: 1,
      },
      quantity: 1,
      subtotal: o0.unitPrice,
      fee: 0,
      total: o0.unitPrice,
      currency: 'EUR',
      status: 'completed',
      paidAt: new Date(Date.now() - 3600000 * 48),
      startedAt: new Date(Date.now() - 3600000 * 47),
      sellerConfirmedAt: new Date(Date.now() - 3600000 * 46),
      buyerConfirmedAt: new Date(Date.now() - 3600000 * 45),
      completedAt: new Date(Date.now() - 3600000 * 45),
      delivery: {
        note: 'Username: paladin_demo@proton.me / TempPassword: Transfer@Pass2026',
        deliveredAt: new Date(Date.now() - 3600000 * 46),
      },
      reviewed: true,
      history: [
        { from: null, to: 'pending_payment', by: customer._id, role: 'buyer', note: 'Order created' },
        { from: 'pending_payment', to: 'funded', by: customer._id, role: 'buyer', note: 'Paid from wallet' },
        { from: 'funded', to: 'in_progress', by: seller._id, role: 'seller', note: 'Started' },
        { from: 'in_progress', to: 'awaiting_customer_confirmation', by: seller._id, role: 'seller', note: 'Delivered' },
        { from: 'awaiting_customer_confirmation', to: 'completed', by: customer._id, role: 'buyer', note: 'Confirmed receipt' },
      ],
    });

    await Review.create({
      order: compOrder._id,
      offer: o0._id,
      seller: seller._id,
      buyer: customer._id,
      rating: 5,
      comment: 'Super fast delivery, received full email access within 10 minutes. Extremely satisfied!',
    });

    await OrderMessage.create({
      order: compOrder._id,
      sender: seller._id,
      senderRole: 'seller',
      body: 'Hello! I have initiated the Battlenet email change to your requested address.',
      readBy: [customer._id, seller._id],
    });

    console.log('[seed] Created completed demo order & 5-star review');
  }

  console.log('[seed] Seeding completed successfully!');
  console.log('\n================ DEMO CREDENTIALS ================');
  console.log('Password for all accounts: Password@123');
  console.log('• Admin:    admin@gamer2gamer.com');
  console.log('• Seller:   seller@gamer2gamer.com');
  console.log('• Booster:  booster@gamer2gamer.com');
  console.log('• Customer: customer@gamer2gamer.com');
  console.log('• Applicant:applicant@gamer2gamer.com');
  console.log('==================================================\n');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}

module.exports = { seed, populateData };
