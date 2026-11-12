'use strict';
/**
 * Thực nghiệm so sánh TRƯỚC / SAU cải tiến cho mục 3.3 của báo cáo.
 * "Trước" = cách làm đơn giản: đọc dữ liệu rồi ghi, không transaction,
 * không khóa chống lặp, chỉ kiểm tra chữ ký JWT.
 * "Sau"   = mã nguồn hiện tại của dự án, gọi qua API thật.
 * Kết quả in ra console dạng JSON để đưa vào bảng so sánh.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { User, Game, Category, Offer, Wallet, Order } = require('../src/models');

const TRIALS = 20;
const results = {};
let seq = 0;

async function csrfPair() {
  const r = await request(app).get('/api/auth/csrf');
  const cookie = r.headers['set-cookie'].find((c) => c.startsWith('g2g_csrf=')).split(';')[0];
  return { cookie, token: r.body.csrfToken };
}
async function registerUser(email, roles = ['customer']) {
  const { cookie, token } = await csrfPair();
  const res = await request(app).post('/api/auth/register').set('Cookie', cookie).set('x-csrf-token', token)
    .send({ email, password: 'Password123', displayName: 'User ' + email.split('@')[0] });
  const session = res.headers['set-cookie'].find((c) => c.startsWith('g2g_session=')).split(';')[0];
  if (roles.length > 1) await User.updateOne({ email }, { $set: { roles } });
  const user = await User.findOne({ email });
  return { user, cookies: `${cookie}; ${session}`, csrfToken: token, session: session.split('=')[1] };
}
const as = (u, m, url) => request(app)[m](url).set('Cookie', u.cookies).set('x-csrf-token', u.csrfToken);

describe('Thực nghiệm trước/sau cải tiến (mục 3.3)', () => {
  let admin, seller, b1, b2, game, cat;

  const makeOffer = (stock) => Offer.create({
    seller: seller.user._id, game: game._id, category: cat._id, type: 'item', unitLabel: 'unit',
    title: `Offer ${++seq}`, description: 'Dữ liệu thực nghiệm.', unitPrice: 1000, stock, minPerOrder: 1,
    deliveryTimeHours: 1, durationDays: 10, status: 'active', publishedAt: new Date(),
    expiresAt: new Date(Date.now() + 864e6),
  });
  const setWallet = (u, available) => Wallet.updateOne({ user: u.user._id }, { $set: { available, held: 0 } }, { upsert: true });

  beforeAll(async () => {
    admin = await registerUser('admin@x.test', ['customer', 'admin']);
    seller = await registerUser('seller@x.test', ['customer', 'seller']);
    b1 = await registerUser('b1@x.test');
    b2 = await registerUser('b2@x.test');
    game = await Game.create({ name: 'G', slug: 'g', regions: ['EU'] });
    cat = await Category.create({ game: game._id, type: 'item', name: 'C', slug: 'c', unitLabel: 'unit' });
  }, 60000);

  afterAll(() => { console.log('KET_QUA_THUC_NGHIEM ' + JSON.stringify(results)); });

  test('3.3.1 Hai khách cùng mua món cuối (stock = 1), lặp 20 lần', async () => {
    // TRƯỚC: đọc stock và số dư, kiểm tra trong code, rồi mới ghi – không transaction
    async function naiveBuy(buyer, offerId) {
      const offer = await Offer.findById(offerId);
      const wallet = await Wallet.findOne({ user: buyer.user._id });
      if (offer.stock < 1 || wallet.available < offer.unitPrice) return false;
      await Offer.updateOne({ _id: offerId }, { $set: { stock: offer.stock - 1 } });
      await Wallet.updateOne({ user: buyer.user._id }, { $set: { available: wallet.available - offer.unitPrice } });
      return true;
    }
    let naiveOversold = 0, naiveSold = 0;
    for (let i = 0; i < TRIALS; i++) {
      await setWallet(b1, 5000); await setWallet(b2, 5000);
      const o = await makeOffer(1);
      const ok = await Promise.all([naiveBuy(b1, o._id), naiveBuy(b2, o._id)]);
      const sold = ok.filter(Boolean).length;
      naiveSold += sold;
      if (sold > 1) naiveOversold++;
    }
    // SAU: API hiện tại (transaction + cập nhật có điều kiện)
    let apiOversold = 0, apiSold = 0, negativeStock = 0;
    for (let i = 0; i < TRIALS; i++) {
      await setWallet(b1, 5000); await setWallet(b2, 5000);
      const o = await makeOffer(1);
      const o1 = await as(b1, 'post', '/api/orders').send({ offerId: String(o._id), quantity: 1 });
      const o2 = await as(b2, 'post', '/api/orders').send({ offerId: String(o._id), quantity: 1 });
      const r = await Promise.all([
        as(b1, 'post', `/api/orders/${o1.body.order.id}/pay`),
        as(b2, 'post', `/api/orders/${o2.body.order.id}/pay`),
      ]);
      const sold = r.filter((x) => x.status === 200).length;
      apiSold += sold;
      if (sold > 1) apiOversold++;
      if ((await Offer.findById(o._id)).stock < 0) negativeStock++;
    }
    results.oversell = { trials: TRIALS, naiveOversoldTrials: naiveOversold, naiveUnitsSold: naiveSold, apiOversoldTrials: apiOversold, apiUnitsSold: apiSold, apiNegativeStock: negativeStock };
    expect(apiOversold).toBe(0);
  }, 120000);

  test('3.3.2 Gửi lại yêu cầu tạo đơn khi mất phản hồi, lặp 20 lần', async () => {
    // TRƯỚC: không có khóa chống lặp – mỗi lần gửi lại là một đơn mới
    let naiveOrders = 0, apiOrders = 0;
    for (let i = 0; i < TRIALS; i++) {
      const o = await makeOffer(5);
      await as(b1, 'post', '/api/orders').send({ offerId: String(o._id), quantity: 1 });
      await as(b1, 'post', '/api/orders').send({ offerId: String(o._id), quantity: 1 });
      naiveOrders += await Order.countDocuments({ offer: o._id });
    }
    // SAU: gửi kèm cùng idempotencyKey, kể cả hai request đến đồng thời
    for (let i = 0; i < TRIALS; i++) {
      const o = await makeOffer(5);
      const body = { offerId: String(o._id), quantity: 1, idempotencyKey: `exp-${i}-${Date.now()}` };
      await Promise.all([as(b1, 'post', '/api/orders').send(body), as(b1, 'post', '/api/orders').send(body)]);
      apiOrders += await Order.countDocuments({ offer: o._id });
    }
    results.duplicate = { trials: TRIALS, requestsPerTrial: 2, naiveOrders, apiOrders };
    expect(apiOrders).toBe(TRIALS);
  }, 120000);

  test('3.3.3 Phiên cũ của tài khoản vừa bị khóa', async () => {
    const victim = await registerUser('locked@x.test');
    const before = await as(victim, 'get', '/api/wallet');
    const ban = await as(admin, 'post', `/api/admin/users/${victim.user._id}/ban`).send({ reason: 'Thực nghiệm' });
    // TRƯỚC: chỉ kiểm tra chữ ký JWT – token vẫn hợp lệ tới khi hết hạn
    let naiveValid = false, expHours = null;
    try {
      const p = jwt.verify(victim.session, require('../src/config/env').JWT_SECRET);
      naiveValid = true;
      expHours = Math.round((p.exp * 1000 - Date.now()) / 3600e3);
    } catch { naiveValid = false; }
    // SAU: backend so tokenVersion với dữ liệu hiện tại
    const after = await as(victim, 'get', '/api/wallet');
    results.session = { banStatus: ban.status, walletBeforeBan: before.status, naiveTokenStillValid: naiveValid, naiveValidForHours: expHours, apiAfterBan: after.status };
    expect(after.status).toBe(401);
  }, 60000);
});
