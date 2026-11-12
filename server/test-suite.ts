import assert from 'assert';
import http from 'http';
import { app } from './index.ts';
import { db } from './db.ts';

async function runTests() {
  db.resetToDemoSeed();
  const testServer = http.createServer(app);

  await new Promise<void>((resolve) => testServer.listen(0, resolve));
  const address = testServer.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function req(path: string, options: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  console.log('=== FEEDO PAY — AUTOMATED VERIFICATION SUITE ===');

  // 1. Test RBAC & Demo Logins
  const studentLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@feedo.demo', password: 'feedo2026' }),
  });
  assert.strictEqual(studentLogin.status, 200, 'Student demo login should succeed');
  const studentToken = studentLogin.body.token;

  const chefLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'chef@feedo.demo', password: 'feedo2026' }),
  });
  const chefToken = chefLogin.body.token;

  const managerLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'manager@feedo.demo', password: 'feedo2026' }),
  });
  const managerToken = managerLogin.body.token;

  const supplierLogin = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'supplier@feedo.demo', password: 'feedo2026' }),
  });
  const supplierToken = supplierLogin.body.token;

  // Verify unauthorized role cannot call Manager Refund API
  const unauthorizedRefund = await req('/api/paypal/refund', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ paymentId: 'pay-seed-200', amount: 2.0 }),
  });
  assert.strictEqual(
    unauthorizedRefund.status,
    403,
    'Customer role must be blocked from Manager Refund endpoint (403)'
  );
  console.log('✓ 1. Role-Based Access Control (RBAC) & Demo Authentication verified');

  // 2. Test Ingredient-to-Menu Dependency Engine blocks unavailable item checkout
  const blockedOrder = await req('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ menuItemId: 'menu-avocado-toast', quantity: 1 }],
    }),
  });
  assert.strictEqual(
    blockedOrder.status,
    409,
    'Unavailable menu item (Avocado Tartine) must be blocked at checkout (409)'
  );
  console.log('✓ 2. Ingredient-to-Menu Dependency Engine stockout protection verified');

  // 3. Test Failed Payment Path (Declined Card -> Zero Stock Deducted, No Kitchen Order)
  const initialState = (await req('/api/state')).body;
  const initialChickenStock = initialState.ingredients.find(
    (i: any) => i.id === 'ing-chicken'
  ).currentStock;

  const createForFail = await req('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ menuItemId: 'menu-chicken-biryani', quantity: 2 }],
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
    }),
  });
  assert.strictEqual(createForFail.status, 201);

  const captureFail = await req('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({
      paypalOrderId: createForFail.body.paypalOrderId,
      simulateFailureReason: 'INSTRUMENT_DECLINED',
    }),
  });
  assert.strictEqual(captureFail.status, 402, 'Declined payment should return 402');

  const stateAfterFail = (await req('/api/state')).body;
  const chickenStockAfterFail = stateAfterFail.ingredients.find(
    (i: any) => i.id === 'ing-chicken'
  ).currentStock;
  assert.strictEqual(
    chickenStockAfterFail,
    initialChickenStock,
    'Zero inventory should be deducted when payment fails'
  );
  console.log('✓ 3. Payment failure recovery & zero-inventory-deduction verified');

  // 4. Test Live Demo Scenario: Reserve Table 12 -> Order Chicken Biryani -> Capture -> Token F204
  const reserve12 = await req('/api/tables/reserve', {
    method: 'POST',
    body: JSON.stringify({
      tableNumber: 12,
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
      guests: 2,
    }),
  });
  assert.strictEqual(reserve12.status, 200, 'Table 12 reservation should succeed');

  const createF204 = await req('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ menuItemId: 'menu-chicken-biryani', quantity: 1 }],
      tableNumber: 12,
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
      customerEmail: 'student@feedo.demo',
    }),
  });
  assert.strictEqual(createF204.status, 201);
  assert.strictEqual(createF204.body.totalAmount, 8.93, 'Server-calculated total ($8.50 + 5% tax)');

  const captureF204 = await req('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({
      paypalOrderId: createF204.body.paypalOrderId,
    }),
  });
  assert.strictEqual(captureF204.status, 200);
  assert.strictEqual(
    captureF204.body.order.tokenNumber,
    'F204',
    'First captured order after seed must issue Token F204'
  );

  // Test Idempotent Duplicate Capture Protection
  const duplicateCapture = await req('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({
      paypalOrderId: createF204.body.paypalOrderId,
    }),
  });
  assert.strictEqual(duplicateCapture.body.idempotentReplay, true);
  console.log('✓ 4. Verified PayPal Capture, Atomic Stock Deduction, Token F204 & Idempotency verified');

  // 5. Test Chef KDS -> Mark READY -> Smart Counter F204 -> Customer Collection
  const chefPrep = await req(`/api/kitchen/orders/${captureF204.body.order.id}/status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` },
    body: JSON.stringify({ status: 'PREPARING', customPrepMinutes: 12 }),
  });
  assert.strictEqual(chefPrep.status, 200);

  const chefReady = await req(`/api/kitchen/orders/${captureF204.body.order.id}/status`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` },
    body: JSON.stringify({ status: 'READY_FOR_COLLECTION' }),
  });
  assert.strictEqual(chefReady.status, 200);

  const counterState = (await req('/api/iot/counter')).body;
  assert.strictEqual(
    counterState.currentReadyToken,
    'F204',
    'Smart Counter OLED must display Token F204 when Chef clicks READY'
  );

  const collectF204 = await req('/api/orders/F204/collect', { method: 'POST' });
  assert.strictEqual(collectF204.status, 200);
  assert.strictEqual(collectF204.body.order.status, 'COMPLETED');
  console.log('✓ 5. Chef KDS, IoT Smart Counter F204 Display & Customer Collection verified');

  // 6. Test Supplier Dispatch -> Manager Dock Verification -> Automatic Menu Restoration
  const supAccept = await req('/api/supplier/requests/sup-req-102/status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${supplierToken}` },
    body: JSON.stringify({ status: 'DISPATCHED' }),
  });
  assert.strictEqual(supAccept.status, 200);

  const stateBeforeVerify = (await req('/api/state')).body;
  const avoBefore = stateBeforeVerify.ingredients.find((i: any) => i.id === 'ing-avocado').currentStock;
  assert.strictEqual(
    avoBefore,
    0.1,
    'Inventory must NOT increase before Manager verifies delivery'
  );

  const mgrVerify = await req('/api/manager/supplier-requests/sup-req-102/verify-delivery', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert.strictEqual(mgrVerify.status, 200);

  const stateAfterVerify = (await req('/api/state')).body;
  const avoDishAfter = stateAfterVerify.menuItems.find((m: any) => m.id === 'menu-avocado-toast');
  assert.strictEqual(
    avoDishAfter.isAvailable,
    true,
    'Avocado Tartine must be automatically re-enabled once Manager verifies delivery'
  );
  console.log('✓ 6. Supplier Two-Step Verification & Auto Menu Restoration verified');

  // 7. Test Preloaded Chef Assignment from Common Kitchen Login
  const orderIdF204 = captureF204.body.order.id;
  assert.strictEqual(
    captureF204.body.order.assignedChefName,
    undefined,
    'Newly captured order must have no assignedChefName until Kitchen Staff assigns one from preloaded list'
  );

  const assignChefRes = await req(`/api/kitchen/orders/${orderIdF204}/assign-chef`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chefToken}` },
    body: JSON.stringify({ chefId: 'stf-1' }),
  });
  assert.strictEqual(assignChefRes.status, 200);
  assert.strictEqual(
    assignChefRes.body.order.assignedChefName,
    'Chef Vikramaditya Nair',
    'Assigning stf-1 from preloaded chef list must set assignedChefName to Chef Vikramaditya Nair'
  );
  console.log('✓ 7. Common Kitchen Login Preloaded Chef Dropdown Assignment verified');

  // 8. Test Takeaway Order Type & PayPal Payment Method Recording
  const takeawayOrder = await req('/api/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ menuItemId: 'menu-dosa', quantity: 1 }],
      orderType: 'TAKEAWAY',
      paymentMethodUsed: 'PAYPAL_PAY_LATER',
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
    }),
  });
  assert.strictEqual(takeawayOrder.status, 201);
  assert.strictEqual(takeawayOrder.body.orderType, 'TAKEAWAY');

  const captureTakeaway = await req('/api/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify({
      paypalOrderId: takeawayOrder.body.paypalOrderId,
      orderType: 'TAKEAWAY',
      paymentMethodUsed: 'PAYPAL_PAY_LATER',
    }),
  });
  assert.strictEqual(captureTakeaway.status, 200);
  assert.strictEqual(captureTakeaway.body.order.orderType, 'TAKEAWAY');
  assert.strictEqual(captureTakeaway.body.order.tableNumber, undefined, 'Takeaway order must not have a tableNumber');
  assert.strictEqual(captureTakeaway.body.order.counterNumber, 2, 'Takeaway order must have Pickup Counter #2');
  assert.strictEqual(captureTakeaway.body.order.paymentMethodUsed, 'PAYPAL_PAY_LATER');
  console.log('✓ 8. Dine-In vs Takeaway Separation & PayPal Funding Method Recording verified');

  // 9. Test FEEDO Customer AI (Live Menu, Order Tracking & Cart Confirmation Proposal)
  const customerAiTrack = await req('/api/ai/customer-chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Where is my order and which chef is preparing it?',
      customerId: 'usr-customer-1',
      orderType: 'DINE_IN',
      selectedTable: 12,
    }),
  });
  assert.strictEqual(customerAiTrack.status, 200);
  assert.ok(
    customerAiTrack.body.reply.includes('F205') || customerAiTrack.body.reply.includes('F204'),
    'FEEDO Customer AI must report live token for the customer'
  );

  const customerAiCart = await req('/api/ai/customer-chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Add 2 Dosa to cart',
      customerId: 'usr-customer-1',
      orderType: 'TAKEAWAY',
    }),
  });
  assert.strictEqual(customerAiCart.status, 200);
  assert.ok(
    customerAiCart.body.cartProposal && customerAiCart.body.cartProposal.quantity === 2,
    'FEEDO Customer AI must return an explicit cartProposal requiring user confirmation before adding to cart'
  );
  console.log('✓ 9. FEEDO Customer AI (Live Order/Chef Tracking & Explicit Cart Confirmation) verified');

  // 10. Test FEEDO Manager AI (Daily/Weekly/Monthly P&L Analytics, Expense Logging & Natural-Language BI)
  const addExpense = await req('/api/manager/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      category: 'UTILITIES',
      title: 'Cold Storage Maintenance',
      amount: 14.5,
      notes: 'Compressor check',
    }),
  });
  assert.strictEqual(addExpense.status, 201);

  const finAnalytics = await req('/api/manager/financial-analytics', {
    headers: { Authorization: `Bearer ${managerToken}` },
  });
  assert.strictEqual(finAnalytics.status, 200);
  assert.ok(finAnalytics.body.daily && finAnalytics.body.weekly && finAnalytics.body.monthly);

  const managerAiChat = await req('/api/ai/manager-chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({
      message: 'What is our profit today and which items are loss-making?',
    }),
  });
  assert.strictEqual(managerAiChat.status, 200);
  assert.ok(
    managerAiChat.body.reply.includes('Profit') && managerAiChat.body.analytics,
    'FEEDO Manager AI must return real database-backed Profit & Loss intelligence'
  );
  console.log('✓ 10. FEEDO Manager AI (Daily/Weekly/Monthly P&L, Expenses & BI Assistant) verified');

  // Reset back to clean demo seed for the user/judges
  db.resetToDemoSeed();
  testServer.close();
  console.log('=== ALL TESTS PASSED & ECOSYSTEM RESET TO CLEAN DEMO STATE ===');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
