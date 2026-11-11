'use strict';
const request = require('supertest');
const app = require('../src/app');
const {
  User,
  Game,
  Category,
  Offer,
  Wallet,
  LedgerTransaction,
  Order,
  EscrowRecord,
  Dispute,
} = require('../src/models');
const { withTransaction } = require('../src/services/tx');
const orderService = require('../src/services/orderService');

// Helper to register, get cookies (including CSRF & Session)
async function registerUser(email, displayName, roles = ['customer']) {
  // First GET /api/auth/csrf to get csrf token and cookie
  const csrfRes = await request(app).get('/api/auth/csrf');
  const csrfCookie = csrfRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_csrf='));
  const csrfToken = csrfRes.body.csrfToken;

  const regRes = await request(app)
    .post('/api/auth/register')
    .set('Cookie', csrfCookie)
    .set('x-csrf-token', csrfToken)
    .send({
      email,
      password: 'Password123',
      displayName,
    });

  expect(regRes.status).toBe(201);
  const sessionCookie = regRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_session='));

  if (roles.length > 1 || !roles.includes('customer')) {
    await User.updateOne({ email }, { $set: { roles } });
  }

  const user = await User.findOne({ email });

  const cookiePair = [csrfCookie, sessionCookie]
    .filter(Boolean)
    .map((c) => c.split(';')[0])
    .join('; ');

  return {
    user,
    cookies: cookiePair,
    csrfToken,
  };
}

describe('Gamer2Gamer Core Business Logic & Security Tests', () => {
  let admin, seller, booster, buyer, outsider;
  let wowGame, wowAccountCat, wowGoldCat;

  beforeAll(async () => {
    admin = await registerUser('admin_t@g2g.com', 'Admin Tester', ['customer', 'admin']);
    seller = await registerUser('seller_t@g2g.com', 'Seller Tester', ['customer', 'seller']);
    booster = await registerUser('booster_t@g2g.com', 'Booster Tester', ['customer', 'booster']);
    buyer = await registerUser('buyer_t@g2g.com', 'Buyer Tester', ['customer']);
    outsider = await registerUser('outsider_t@g2g.com', 'Outsider Tester', ['customer']);

    wowGame = await Game.create({
      name: 'World of Warcraft',
      slug: 'wow-test',
      regions: ['EU', 'US'],
    });

    wowAccountCat = await Category.create({
      game: wowGame._id,
      type: 'account',
      name: 'Accounts',
      slug: 'accounts',
      unitLabel: 'account',
    });

    wowGoldCat = await Category.create({
      game: wowGame._id,
      type: 'item',
      name: 'Gold',
      slug: 'gold',
      unitLabel: '100k gold',
    });

    await Wallet.updateOne({ user: buyer.user._id }, { $set: { available: 50000, held: 0 } });
    await Wallet.updateOne({ user: outsider.user._id }, { $set: { available: 50000, held: 0 } });
  }, 60000);

  // =========================================================================
  // BỘ KỊCH BẢN KIỂM THỬ TC01 - TC08
  // =========================================================================

  test('TC01: Đăng ký bằng email đã tồn tại -> Từ chối tạo trùng', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf');
    const csrfCookie = csrfRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_csrf='));
    const csrfToken = csrfRes.body.csrfToken;

    const dupRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        email: 'buyer_t@g2g.com', // Email đã tồn tại
        password: 'Password123',
        displayName: 'Duplicate User',
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('EMAIL_TAKEN');
    const count = await User.countDocuments({ email: 'buyer_t@g2g.com' });
    expect(count).toBe(1);
  });

  test('TC02: Sai mật khẩu hoặc tài khoản khóa -> Không cấp phiên', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf');
    const csrfCookie = csrfRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_csrf='));
    const csrfToken = csrfRes.body.csrfToken;

    // 1. Sai mật khẩu
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ email: 'buyer_t@g2g.com', password: 'WrongPassword999' });

    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.headers['set-cookie']?.some((c) => c.startsWith('g2g_session='))).toBeFalsy();

    // 2. Tài khoản bị khóa (banned)
    const bannedUser = await registerUser('banned_tc02@g2g.com', 'Banned User');
    await User.updateOne({ _id: bannedUser.user._id }, { $set: { status: 'banned', banReason: 'Fraud' } });

    const bannedLoginRes = await request(app)
      .post('/api/auth/login')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ email: 'banned_tc02@g2g.com', password: 'Password123' });

    expect(bannedLoginRes.status).toBe(403);
    expect(bannedLoginRes.body.error.code).toBe('ACCOUNT_BANNED');
    expect(bannedLoginRes.headers['set-cookie']?.some((c) => c.startsWith('g2g_session='))).toBeFalsy();
  });

  test('TC03: Customer tự gửi role Admin -> Không được nâng quyền', async () => {
    const csrfRes = await request(app).get('/api/auth/csrf');
    const csrfCookie = csrfRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_csrf='));
    const csrfToken = csrfRes.body.csrfToken;

    // 1. Gửi kèm roles: ['admin'] khi đăng ký -> bị chặn bởi strict schema (400)
    const regRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        email: 'hacker_tc03@g2g.com',
        password: 'Password123',
        displayName: 'Normal Customer',
        roles: ['admin'],
      });
    expect(regRes.status).toBe(400);

    // 2. Thử tự nâng quyền qua PATCH /api/auth/me -> bị chặn (400)
    const patchRes = await request(app)
      .patch('/api/auth/me')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ displayName: 'Buyer Tester', roles: ['admin'] });
    expect(patchRes.status).toBe(400);

    // 3. Thử gọi thẳng endpoint quản trị viên để tự cấp quyền Admin -> bị chặn (403)
    const adminRoleRes = await request(app)
      .patch(`/api/admin/users/${buyer.user._id}/roles`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ roles: ['customer', 'admin'] });
    expect(adminRoleRes.status).toBe(403);

    const dbUser = await User.findById(buyer.user._id);
    expect(dbUser.roles).toEqual(['customer']);
  });

  test('TC04: Seller B sửa offer của A -> Từ chối và dữ liệu giữ nguyên', async () => {
    const offerA = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Seller A Protected Offer',
      description: 'Original description from Seller A over 20 chars',
      unitPrice: 8000,
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 2,
      durationDays: 15,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 86400000),
    });

    const sellerB = await registerUser('seller_b_tc04@g2g.com', 'Seller B', ['customer', 'seller']);
    const editRes = await request(app)
      .patch(`/api/offers/${offerA._id}`)
      .set('Cookie', sellerB.cookies)
      .set('x-csrf-token', sellerB.csrfToken)
      .send({ title: 'Tampered By Seller B', unitPrice: 100 });

    expect(editRes.status).toBe(404);
    const intactOffer = await Offer.findById(offerA._id);
    expect(intactOffer.title).toBe('Seller A Protected Offer');
    expect(intactOffer.unitPrice).toBe(8000);
  });

  test('TC05: Offer có hạn vượt 30 ngày -> Lỗi validation', async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('Cookie', seller.cookies)
      .set('x-csrf-token', seller.csrfToken)
      .send({
        gameId: String(wowGame._id),
        categoryId: String(wowGoldCat._id),
        title: 'Over 30 Days Offer Test',
        description: 'Description long enough to pass length check',
        unitPrice: 2000,
        stock: 5,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 31, // Vượt quá 30 ngày
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('TC06: Mua đúng thời điểm expiresAt -> Từ chối hết hạn', async () => {
    const exactNow = new Date();
    const expiredAtBoundaryOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Boundary Expiry Offer TC06',
      description: 'Offer expiring right at the boundary timestamp',
      unitPrice: 1000,
      stock: 5,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 7,
      status: 'active',
      publishedAt: new Date(exactNow.getTime() - 7 * 86400000),
      expiresAt: exactNow, // Đúng thời điểm expiresAt <= now
    });

    const buyRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(expiredAtBoundaryOffer._id), quantity: 1 });

    expect(buyRes.status).toBe(409);
    expect(buyRes.body.error.code).toBe('OFFER_EXPIRED');
  });

  test('TC07: Mua dưới minPerOrder -> Không tạo khoản giữ', async () => {
    const minOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Min Per Order 5 Gold TC07',
      description: 'Minimum 5 units per order required for this listing',
      unitPrice: 1000,
      stock: 20,
      minPerOrder: 5,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    const walletBefore = await Wallet.findOne({ user: buyer.user._id });
    const escrowCountBefore = await EscrowRecord.countDocuments();

    const buyRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(minOffer._id), quantity: 3 }); // 3 < minPerOrder (5)

    expect(buyRes.status).toBe(400);
    expect(buyRes.body.error.code).toBe('BELOW_MIN_QUANTITY');

    const walletAfter = await Wallet.findOne({ user: buyer.user._id });
    const escrowCountAfter = await EscrowRecord.countDocuments();
    expect(walletAfter.held).toBe(walletBefore.held);
    expect(escrowCountAfter).toBe(escrowCountBefore);
  });

  test('TC08: Số lượng âm hoặc không nguyên -> Từ chối trước cập nhật', async () => {
    const validOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Quantity Validation Offer TC08',
      description: 'Valid offer for testing negative and float quantities',
      unitPrice: 1000,
      stock: 10,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    // 1. Số lượng âm (-2)
    const negRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(validOffer._id), quantity: -2 });
    expect(negRes.status).toBe(400);
    expect(negRes.body.error.code).toBe('VALIDATION_ERROR');

    // 2. Số lượng không nguyên (1.5)
    const floatRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(validOffer._id), quantity: 1.5 });
    expect(floatRes.status).toBe(400);
    expect(floatRes.body.error.code).toBe('VALIDATION_ERROR');

    const offerAfter = await Offer.findById(validOffer._id);
    expect(offerAfter.stock).toBe(10); // Không bị cập nhật
  });

  // =========================================================================
  // BỘ KỊCH BẢN KIỂM THỬ TÀI CHÍNH & KÝ QUỸ TC09 - TC15
  // =========================================================================
  describe('Escrow Financial & Ledger Scenarios (TC09 - TC15)', () => {
    let tcBuyer, tcSeller, tcOffer, tcOrder1Id;

    beforeAll(async () => {
      tcBuyer = await registerUser('buyer_tc09@g2g.com', 'TC09 Buyer', ['customer']);
      tcSeller = await registerUser('seller_tc09@g2g.com', 'TC09 Seller', ['customer', 'seller']);

      tcOffer = await Offer.create({
        seller: tcSeller.user._id,
        game: wowGame._id,
        category: wowGoldCat._id,
        type: 'item',
        unitLabel: '100k gold',
        title: 'Gói Vàng 25 EUR Kiểm Thử TC09-TC15',
        description: 'Gói vật phẩm đơn giá 25 EUR phục vụ kiểm thử dòng tiền ký quỹ',
        unitPrice: 2500, // 25.00 EUR
        stock: 20,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 15,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 86400000),
      });
    });

    test('TC09: Nạp demo 100 EUR một lần -> Ví tăng 100; ledger cân bằng', async () => {
      const depRes = await request(app)
        .post('/api/wallet/deposits')
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken)
        .send({
          amount: 10000, // 100.00 EUR
          idempotencyKey: 'tc09-demo-deposit-100eur',
        });

      expect(depRes.status).toBe(201);
      expect(depRes.body.duplicate).toBe(false);
      expect(depRes.body.wallet.available).toBe(10000);
      expect(depRes.body.wallet.held).toBe(0);

      const ledger = await LedgerTransaction.findOne({
        idempotencyKey: `deposit:${tcBuyer.user._id}:tc09-demo-deposit-100eur`,
      });
      expect(ledger).toBeTruthy();
      expect(ledger.amount).toBe(10000);
      const sumEntries = ledger.entries.reduce((acc, e) => acc + e.amount, 0);
      expect(sumEntries).toBe(0);
    });

    test('TC10: Gửi lại cùng sự kiện nạp -> Không tăng ví lần hai', async () => {
      const dupDepRes = await request(app)
        .post('/api/wallet/deposits')
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken)
        .send({
          amount: 10000, // 100.00 EUR
          idempotencyKey: 'tc09-demo-deposit-100eur', // Trùng idempotencyKey của TC09
        });

      expect(dupDepRes.status).toBe(200);
      expect(dupDepRes.body.duplicate).toBe(true);
      expect(dupDepRes.body.wallet.available).toBe(10000); // Vẫn giữ nguyên 100 EUR

      const ledgerCount = await LedgerTransaction.countDocuments({
        idempotencyKey: `deposit:${tcBuyer.user._id}:tc09-demo-deposit-100eur`,
      });
      expect(ledgerCount).toBe(1);
    });

    test('TC11: Mua 2 đơn vị giá 25 EUR -> Khách 50; giữ 50; Seller 0', async () => {
      const createRes = await request(app)
        .post('/api/orders')
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken)
        .send({ offerId: String(tcOffer._id), quantity: 2 }); // 2 * 25 EUR = 50 EUR (5000 cents)

      expect(createRes.status).toBe(201);
      tcOrder1Id = createRes.body.order.id;

      const payRes = await request(app)
        .post(`/api/orders/${tcOrder1Id}/pay`)
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken);

      expect(payRes.status).toBe(200);
      expect(payRes.body.order.status).toBe('funded');

      const buyerWallet = await Wallet.findOne({ user: tcBuyer.user._id });
      const sellerWallet = await Wallet.findOne({ user: tcSeller.user._id });

      expect(buyerWallet.available).toBe(5000); // Khách còn 50 EUR khả dụng
      expect(buyerWallet.held).toBe(5000);      // Giữ ký quỹ 50 EUR
      expect(sellerWallet.available).toBe(0);   // Seller 0 EUR
    });

    test('TC12: Chỉ Seller xác nhận -> Giữ 50; chưa giải ngân', async () => {
      const deliverRes = await request(app)
        .post(`/api/orders/${tcOrder1Id}/deliver`)
        .set('Cookie', tcSeller.cookies)
        .set('x-csrf-token', tcSeller.csrfToken)
        .send({ deliveryNote: 'Đã giao 200k vàng qua thư trong game' });

      expect(deliverRes.status).toBe(200);
      expect(deliverRes.body.order.status).toBe('awaiting_customer_confirmation');

      const buyerWallet = await Wallet.findOne({ user: tcBuyer.user._id });
      const sellerWallet = await Wallet.findOne({ user: tcSeller.user._id });
      const escrow = await EscrowRecord.findOne({ order: tcOrder1Id });

      expect(buyerWallet.held).toBe(5000);    // Vẫn giữ 50 EUR
      expect(escrow.status).toBe('held');     // Chưa giải ngân
      expect(sellerWallet.available).toBe(0); // Seller vẫn 0 EUR
    });

    test('TC13: Customer xác nhận hợp lệ -> Giữ 0; Seller tăng 50', async () => {
      const confirmRes = await request(app)
        .post(`/api/orders/${tcOrder1Id}/confirm`)
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken);

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.order.status).toBe('completed');

      const buyerWallet = await Wallet.findOne({ user: tcBuyer.user._id });
      const sellerWallet = await Wallet.findOne({ user: tcSeller.user._id });
      const escrow = await EscrowRecord.findOne({ order: tcOrder1Id });

      expect(buyerWallet.held).toBe(0);          // Giữ = 0 EUR
      expect(buyerWallet.available).toBe(5000);  // Khả dụng của khách = 50 EUR
      expect(sellerWallet.available).toBe(5000); // Seller tăng 50 EUR
      expect(escrow.status).toBe('released');
    });

    test('TC14: Xác nhận hoàn tất lần nữa -> Số dư không đổi', async () => {
      const repeatConfirmRes = await request(app)
        .post(`/api/orders/${tcOrder1Id}/confirm`)
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken);

      expect(repeatConfirmRes.status).toBe(200);

      const buyerWallet = await Wallet.findOne({ user: tcBuyer.user._id });
      const sellerWallet = await Wallet.findOne({ user: tcSeller.user._id });
      const releaseLedgerCount = await LedgerTransaction.countDocuments({
        order: tcOrder1Id,
        type: 'escrow_release',
      });

      expect(buyerWallet.available).toBe(5000);  // Không đổi
      expect(buyerWallet.held).toBe(0);          // Không đổi
      expect(sellerWallet.available).toBe(5000); // Không đổi (vẫn 50 EUR)
      expect(releaseLedgerCount).toBe(1);        // Chỉ có đúng 1 bút toán giải ngân
    });

    test('TC15: Admin hoàn nhánh tranh chấp -> Khách nhận lại 50 từ Held', async () => {
      // Khách dùng 50 EUR còn lại mua tiếp 2 đơn vị (2 * 25 EUR = 50 EUR)
      const createRes2 = await request(app)
        .post('/api/orders')
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken)
        .send({ offerId: String(tcOffer._id), quantity: 2 });
      const order2Id = createRes2.body.order.id;

      await request(app)
        .post(`/api/orders/${order2Id}/pay`)
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken);

      // Kiểm tra tiền đang nằm ở Held = 50 EUR, Available = 0 EUR
      const walletDuringHold = await Wallet.findOne({ user: tcBuyer.user._id });
      expect(walletDuringHold.available).toBe(0);
      expect(walletDuringHold.held).toBe(5000);

      // Mở tranh chấp
      const dispRes = await request(app)
        .post(`/api/orders/${order2Id}/dispute`)
        .set('Cookie', tcBuyer.cookies)
        .set('x-csrf-token', tcBuyer.csrfToken)
        .send({ reason: 'Người bán không giao hàng đúng thời gian cam kết' });
      const disputeId = dispRes.body.order.disputeId;

      // Admin phân xử hoàn tiền cho khách (refund_buyer)
      const resolveRes = await request(app)
        .post(`/api/admin/disputes/${disputeId}/resolve`)
        .set('Cookie', admin.cookies)
        .set('x-csrf-token', admin.csrfToken)
        .send({
          decision: 'refund_buyer',
          note: 'Xác minh người bán chưa giao hàng, hoàn trả 50 EUR cho khách.',
          restock: true,
        });

      expect(resolveRes.status).toBe(200);

      const walletAfterRefund = await Wallet.findOne({ user: tcBuyer.user._id });
      const escrowAfterRefund = await EscrowRecord.findOne({ order: order2Id });

      expect(walletAfterRefund.held).toBe(0);         // Held giảm từ 50 về 0 EUR
      expect(walletAfterRefund.available).toBe(5000); // Khách nhận lại 50 EUR về Available
      expect(escrowAfterRefund.status).toBe('refunded');
    });
  });

  // =========================================================================
  // BỘ KỊCH BẢN KIỂM THỬ TƯƠNG TRANH, TOÀN VẸN & AN TOÀN TC16 - TC24
  // =========================================================================
  describe('Concurrency, Atomic Rollback & Security Scenarios (TC16 - TC24)', () => {
    const walletService = require('../src/services/walletService');

    test('TC16: Giải ngân khoản đã Refunded -> Từ chối không tạo ledger', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC16 Refunded Order Release Attempt',
        description: 'Offer for testing release attempt after refund',
        unitPrice: 3000,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });
      await orderService.payOrder({ orderId: order._id, user: buyer.user });
      // Hủy đơn khi đã funded -> trạng thái chuyển thành refunded, escrow = refunded
      const refundedOrder = await orderService.cancelOrder({ orderId: order._id, user: buyer.user, reason: 'Buyer cancel' });
      expect(refundedOrder.status).toBe('refunded');

      // 1. Thử xác nhận giải ngân qua HTTP endpoint -> bị từ chối 409
      const confirmRes = await request(app)
        .post(`/api/orders/${order._id}/confirm`)
        .set('Cookie', buyer.cookies)
        .set('x-csrf-token', buyer.csrfToken);
      expect(confirmRes.status).toBe(409);

      // 2. Thử gọi trực tiếp hàm releaseEscrow trên khoản đã refunded -> bị từ chối ESCROW_NOT_HELD
      await expect(
        withTransaction((session) =>
          walletService.releaseEscrow(session, refundedOrder, { resolution: 'normal', actorId: buyer.user._id })
        )
      ).rejects.toThrow();

      // Đảm bảo không có bút toán escrow_release nào được tạo
      const releaseLedger = await LedgerTransaction.findOne({ order: order._id, type: 'escrow_release' });
      expect(releaseLedger).toBeNull();
    });

    test('TC17: Hai khách mua stock cuối -> Chỉ một đơn được tài trợ', async () => {
      const lastStockOffer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC17 Last Stock Race Offer',
        description: 'Offer with 1 stock for two concurrent buyers',
        unitPrice: 2000,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const ord1 = await orderService.createOrder({ buyer: buyer.user, offerId: String(lastStockOffer._id), quantity: 1 });
      const ord2 = await orderService.createOrder({ buyer: outsider.user, offerId: String(lastStockOffer._id), quantity: 1 });

      const results = await Promise.allSettled([
        orderService.payOrder({ orderId: ord1.order._id, user: buyer.user }),
        orderService.payOrder({ orderId: ord2.order._id, user: outsider.user }),
      ]);

      const funded = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(funded.length).toBe(1);
      expect(rejected.length).toBe(1);

      const finalOffer = await Offer.findById(lastStockOffer._id);
      expect(finalOffer.stock).toBe(0);
      expect(finalOffer.status).toBe('sold_out');
    });

    test('TC18: Hai đơn chi cùng ví không đủ -> Không có số dư âm', async () => {
      const buyer18 = await registerUser('buyer_tc18@g2g.com', 'TC18 Buyer', ['customer']);
      // Cấp đúng 60.00 EUR (6000 cents) vào ví
      await Wallet.updateOne({ user: buyer18.user._id }, { $set: { available: 6000, held: 0 } });

      const offer40 = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowGoldCat._id,
        type: 'item',
        unitLabel: '100k gold',
        title: 'TC18 Offer 40 EUR',
        description: 'Offer priced at 40 EUR for testing double spend',
        unitPrice: 4000, // 40.00 EUR
        stock: 10,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      // Tạo 2 đơn hàng 40 EUR (tổng 80 EUR > số dư 60 EUR)
      const o1 = await orderService.createOrder({ buyer: buyer18.user, offerId: String(offer40._id), quantity: 1 });
      const o2 = await orderService.createOrder({ buyer: buyer18.user, offerId: String(offer40._id), quantity: 1 });

      // Thanh toán đồng thời 2 đơn từ cùng 1 ví
      const results = await Promise.allSettled([
        orderService.payOrder({ orderId: o1.order._id, user: buyer18.user }),
        orderService.payOrder({ orderId: o2.order._id, user: buyer18.user }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const walletAfter = await Wallet.findOne({ user: buyer18.user._id });
      expect(walletAfter.available).toBe(2000); // 60 - 40 = 20 EUR (>= 0, không âm)
      expect(walletAfter.held).toBe(4000);      // 40 EUR đang giữ
    });

    test('TC19: Mở tranh chấp cùng lúc xác nhận -> Một chuyển trạng thái hợp lệ', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC19 Race Dispute vs Confirm',
        description: 'Offer for testing concurrent dispute and confirm',
        unitPrice: 2500,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });
      await orderService.payOrder({ orderId: order._id, user: buyer.user });
      await orderService.sellerConfirm({ orderId: order._id, user: seller.user, deliveryNote: 'Delivered' });

      // Chạy song song: mở tranh chấp và xác nhận hoàn tất cùng lúc
      const results = await Promise.allSettled([
        orderService.openDispute({ orderId: order._id, user: buyer.user, reason: 'Concurrent dispute request' }),
        orderService.buyerConfirm({ orderId: order._id, user: buyer.user }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const finalOrder = await Order.findById(order._id);
      expect(['disputed', 'completed']).toContain(finalOrder.status);
    });

    test('TC20: Hai Admin xử lý một khoản giữ -> Chỉ một kết quả tài chính', async () => {
      const admin2 = await registerUser('admin2_tc20@g2g.com', 'Second Admin', ['customer', 'admin']);
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC20 Two Admins Concurrent Dispute',
        description: 'Offer for testing two admins resolving same dispute concurrently',
        unitPrice: 3500,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });
      await orderService.payOrder({ orderId: order._id, user: buyer.user });
      const { dispute } = await orderService.openDispute({ orderId: order._id, user: buyer.user, reason: 'Need admin arbitration' });

      const results = await Promise.allSettled([
        orderService.resolveDispute({
          disputeId: dispute._id,
          admin: admin.user,
          decision: 'refund_buyer',
          note: 'Admin 1 refunds buyer',
          restock: false,
        }),
        orderService.resolveDispute({
          disputeId: dispute._id,
          admin: admin2.user,
          decision: 'release_seller',
          note: 'Admin 2 releases to seller',
          restock: false,
        }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const resolutionLedgers = await LedgerTransaction.find({
        order: order._id,
        type: { $in: ['escrow_refund', 'escrow_release'] },
      });
      expect(resolutionLedgers.length).toBe(1);
    });

    test('TC21: Người ngoài thay ID tài nguyên -> Không đọc hoặc sửa được', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC21 IDOR Protected Resource',
        description: 'Offer for testing IDOR protection against outsiders',
        unitPrice: 1500,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });

      // Outsider thay ID đơn hàng để đọc thông tin nhạy cảm -> 404
      const readOrderRes = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Cookie', outsider.cookies);
      expect(readOrderRes.status).toBe(404);

      // Outsider thay ID đơn hàng để gửi tin nhắn hoặc hủy đơn -> 404
      const cancelOrderRes = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Cookie', outsider.cookies)
        .set('x-csrf-token', outsider.csrfToken)
        .send({ reason: 'Hacked cancel' });
      expect(cancelOrderRes.status).toBe(404);

      const unchangedOrder = await Order.findById(order._id);
      expect(unchangedOrder.status).toBe('pending_payment');
    });

    test('TC22: Lỗi sau bước cập nhật stock -> Rollback cả ví và tồn', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC22 Atomic Rollback Offer',
        description: 'Offer for testing transaction rollback after stock update',
        unitPrice: 3000,
        stock: 3,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });
      const walletBefore = await Wallet.findOne({ user: buyer.user._id });

      await expect(
        withTransaction(async (session) => {
          await Offer.findOneAndUpdate({ _id: offer._id }, { $inc: { stock: -1, soldCount: 1 } }, { session });
          await walletService.holdForOrder(session, order);
          throw new Error('DB_FAILURE_AFTER_STOCK_AND_WALLET_UPDATE');
        })
      ).rejects.toThrow('DB_FAILURE_AFTER_STOCK_AND_WALLET_UPDATE');

      const offerAfter = await Offer.findById(offer._id);
      const walletAfter = await Wallet.findOne({ user: buyer.user._id });
      const escrowAfter = await EscrowRecord.findOne({ order: order._id });

      expect(offerAfter.stock).toBe(3); // Tồn kho giữ nguyên = 3
      expect(walletAfter.available).toBe(walletBefore.available); // Ví giữ nguyên
      expect(walletAfter.held).toBe(walletBefore.held);
      expect(escrowAfter).toBeNull();
    });

    test('TC23: Mất phản hồi sau commit -> Đọc lại cùng mã đơn', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowGoldCat._id,
        type: 'item',
        unitLabel: '100k gold',
        title: 'TC23 Idempotent Order Creation',
        description: 'Offer for testing lost response retry with idempotencyKey',
        unitPrice: 1200,
        stock: 10,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const idemKey = 'tc23-client-retry-key-001';

      // Lần 1: Tạo đơn thành công (201)
      const firstRes = await request(app)
        .post('/api/orders')
        .set('Cookie', buyer.cookies)
        .set('x-csrf-token', buyer.csrfToken)
        .send({ offerId: String(offer._id), quantity: 2, idempotencyKey: idemKey });
      expect(firstRes.status).toBe(201);
      expect(firstRes.body.duplicate).toBe(false);

      // Lần 2: Client mất phản hồi mạng nên gửi lại đúng request đó -> nhận lại cùng mã đơn (200)
      const retryRes = await request(app)
        .post('/api/orders')
        .set('Cookie', buyer.cookies)
        .set('x-csrf-token', buyer.csrfToken)
        .send({ offerId: String(offer._id), quantity: 2, idempotencyKey: idemKey });
      expect(retryRes.status).toBe(200);
      expect(retryRes.body.duplicate).toBe(true);
      expect(retryRes.body.order.id).toBe(firstRes.body.order.id);
      expect(retryRes.body.order.orderNumber).toBe(firstRes.body.order.orderNumber);
    });

    test('TC24: Tải bằng chứng sai quyền hoặc loại -> Từ chối truy cập hoặc tải lên', async () => {
      const offer = await Offer.create({
        seller: seller.user._id,
        game: wowGame._id,
        category: wowAccountCat._id,
        type: 'account',
        unitLabel: 'account',
        title: 'TC24 Dispute Evidence Security',
        description: 'Offer for testing dispute evidence upload and access control',
        unitPrice: 2000,
        stock: 1,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
        status: 'active',
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 86400000),
      });

      const { order } = await orderService.createOrder({ buyer: buyer.user, offerId: String(offer._id), quantity: 1 });
      await orderService.payOrder({ orderId: order._id, user: buyer.user });
      const { dispute } = await orderService.openDispute({ orderId: order._id, user: buyer.user, reason: 'Testing evidence upload' });

      // 1. Người ngoài (outsider) cố tình tải bằng chứng hoặc xem tranh chấp -> Từ chối 404
      const outsiderRes = await request(app)
        .post(`/api/disputes/${dispute._id}/evidence`)
        .set('Cookie', outsider.cookies)
        .set('x-csrf-token', outsider.csrfToken)
        .field('text', 'Outsider trying to inject fake evidence');
      expect(outsiderRes.status).toBe(404);

      // 2. Đúng người mua nhưng tải lên tệp giả mạo (đuôi .png nhưng nội dung là mã độc/text không có magic bytes ảnh) -> Từ chối 400 UNSUPPORTED_FILE
      const fakePngRes = await request(app)
        .post(`/api/disputes/${dispute._id}/evidence`)
        .set('Cookie', buyer.cookies)
        .set('x-csrf-token', buyer.csrfToken)
        .field('text', 'Uploading disguised script file')
        .attach('file', Buffer.from('#!/bin/sh\necho "malicious payload"'), {
          filename: 'exploit.png',
          contentType: 'image/png',
        });
      expect(fakePngRes.status).toBe(400);
      expect(fakePngRes.body.error.code).toBe('UNSUPPORTED_FILE');
    });
  });
});
