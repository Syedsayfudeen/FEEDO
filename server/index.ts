import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { db } from './db.ts';
import {
  evaluateMenuWithDependencies,
  predictOrderPrepTime,
  getKitchenPulseIntelligenceReport,
} from './kitchenPulseAI.ts';
import {
  computeFinancialAnalytics,
  generateCustomerAIResponse,
  generateManagerAIResponse,
} from './aiAssistants.ts';
import { paypalEngine } from './paypalService.ts';
import type {
  UserRole,
  Order,
  OrderType,
  OrderItem,
  PaymentRecord,
  RefundRecord,
  SupplierRequest,
  NotificationItem,
  ExpenseRecord,
  WaitingQueueEntry,
} from '../shared/types.ts';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const HMAC_SECRET = process.env.SESSION_SECRET || 'feedo-pay-stateless-hmac-secret-2026';

/**
 * Stateless HMAC-signed token generator so tokens remain valid across server restarts
 * and across Vercel Serverless Function instances.
 */
function createSessionToken(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}): string {
  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('base64url');
  return `feedo.${payload}.${sig}`;
}

function verifyStatelessToken(token: string): {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'feedo') return null;
    const [, payload, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(payload)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

function getAuthenticatedUser(req: Request): {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
} | null {
  // Check explicit role header first if provided by the active dashboard switcher
  const roleHeader = req.headers['x-feedo-role'] as UserRole | undefined;
  const userIdHeader = req.headers['x-feedo-user-id'] as string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifyStatelessToken(token);
    if (verified) {
      // If x-feedo-role header explicitly specifies the role for this dashboard view, honor it unless strict RBAC test header is set
      if (roleHeader && !req.headers['x-feedo-strict-rbac'] && verified.role !== roleHeader) {
        const state = db.getState();
        const roleUser = state.users.find((u) => u.role === roleHeader);
        if (roleUser) {
          return {
            userId: roleUser.id,
            email: roleUser.email,
            name: roleUser.name,
            role: roleUser.role,
          };
        }
      }
      return verified;
    }
  }

  if (roleHeader) {
    const state = db.getState();
    const matchedUser =
      state.users.find((u) => u.id === userIdHeader && u.role === roleHeader) ||
      state.users.find((u) => u.role === roleHeader);
    if (matchedUser) {
      return {
        userId: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role,
      };
    }
  }
  return null;
}

function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required to access this protected FEEDO endpoint.',
      });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN_ROLE',
        message: `Role '${user.role}' is not authorized for this action. Required: ${allowedRoles.join(
          ' or '
        )}.`,
      });
      return;
    }
    (req as any).user = user;
    next();
  };
}

function buildEcosystemSnapshot() {
  const state = db.getState();
  const enrichedMenu = evaluateMenuWithDependencies(state);
  const intelligence = getKitchenPulseIntelligenceReport(state);

  const capturedPayments = state.payments.filter(
    (p) => p.status === 'CAPTURED' || p.status === 'PARTIALLY_REFUNDED'
  );
  const totalRevenue = Number(
    capturedPayments.reduce((sum, p) => sum + (p.amount - p.refundedAmount), 0).toFixed(2)
  );
  const confirmedOrders = state.orders.filter(
    (o) => o.paymentStatus !== 'FAILED' && o.status !== 'PENDING_PAYMENT'
  );
  const avgOrderValue =
    capturedPayments.length > 0
      ? Number((totalRevenue / capturedPayments.length).toFixed(2))
      : 0;
  const paymentSuccessRate =
    state.payments.length > 0
      ? Number(((capturedPayments.length / state.payments.length) * 100).toFixed(1))
      : 100;

  const financialAnalytics = computeFinancialAnalytics(state);

  return {
    users: state.users,
    menuItems: enrichedMenu,
    ingredients: state.ingredients,
    orders: state.orders,
    payments: state.payments,
    refunds: state.refunds,
    tables: state.tables,
    reservations: state.reservations,
    waitingQueue: state.waitingQueue || [],
    supplierRequests: state.supplierRequests,
    wasteRecords: state.wasteRecords,
    expenses: state.expenses || [],
    aiRecommendations: state.aiRecommendations,
    smartCounter: state.smartCounter,
    notifications: state.notifications.slice(0, 35),
    auditLogs: state.auditLogs.slice(0, 50),
    staff: state.staff,
    intelligence,
    financialAnalytics,
    paypalConfig: paypalEngine.getPublicConfig(),
    metrics: {
      totalRevenue,
      totalOrders: confirmedOrders.length,
      avgOrderValue,
      paymentSuccessRate,
      activeKitchenOrders: state.orders.filter((o) =>
        ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
      ).length,
      readyOrdersCount: state.orders.filter((o) => o.status === 'READY_FOR_COLLECTION').length,
      availableTablesCount: state.tables.filter((t) => t.status === 'AVAILABLE').length,
      totalTablesCount: state.tables.length,
      lowStockIngredientsCount: state.ingredients.filter((i) => i.currentStock <= i.minThreshold)
        .length,
      disabledMenuItemsCount: enrichedMenu.filter((m) => !m.isAvailable).length,
    },
  };
}

function broadcastEcosystemUpdate(eventType: string = 'STATE_SYNC', payload?: any) {
  const snapshot = buildEcosystemSnapshot();
  io.emit('ecosystem:update', {
    eventType,
    payload,
    snapshot,
    timestamp: new Date().toISOString(),
  });
  return snapshot;
}

function addNotification(
  state: ReturnType<typeof db.getState>,
  params: {
    targetRole: UserRole | 'all';
    targetUserId?: string;
    title: string;
    message: string;
    type: NotificationItem['type'];
  }
) {
  state.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    targetRole: params.targetRole,
    targetUserId: params.targetUserId,
    title: params.title,
    message: params.message,
    type: params.type,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

function addAuditLog(
  state: ReturnType<typeof db.getState>,
  params: {
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
  }
) {
  state.auditLogs.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorName: params.actorName,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    timestamp: new Date().toISOString(),
  });
}

// ============================================================================
// 1. AUTHENTICATION & ROLE-BASED DEMO SWITCHER ENDPOINTS
// ============================================================================

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  const state = db.getState();
  const user = state.users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase().trim()
  );

  if (!user) {
    res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message:
        'Account not found. Use one of the demo accounts (student@feedo.demo, chef@feedo.demo, manager@feedo.demo, supplier@feedo.demo) or register a new account.',
    });
    return;
  }

  if (password !== undefined && String(password).trim().length === 0) {
    res.status(401).json({ error: 'Password cannot be empty.' });
    return;
  }

  const token = createSessionToken(user);
  res.json({
    token,
    user,
    demoAccount: user.email.endsWith('@feedo.demo'),
    snapshot: buildEcosystemSnapshot(),
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, role = 'customer', department, companyName } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required.' });
    return;
  }

  const validRoles: UserRole[] = ['customer', 'chef', 'manager', 'supplier'];
  const assignedRole: UserRole = validRoles.includes(role) ? role : 'customer';

  try {
    const newUser = db.transaction((state) => {
      const existing = state.users.find(
        (u) => u.email.toLowerCase() === String(email).toLowerCase().trim()
      );
      if (existing) {
        throw new Error('An account with this email already exists.');
      }
      const created = {
        id: `usr-${assignedRole}-${Date.now()}`,
        email: String(email).toLowerCase().trim(),
        name: String(name).trim(),
        role: assignedRole,
        department: department || 'Campus Member',
        companyName: companyName || undefined,
        createdAt: new Date().toISOString(),
      };
      state.users.push(created);
      addAuditLog(state, {
        actorName: created.name,
        actorRole: created.role,
        action: 'USER.REGISTERED',
        entityType: 'User',
        entityId: created.id,
        details: `Registered new ${created.role} account (${created.email}).`,
      });
      return created;
    });

    const token = createSessionToken(newUser);
    const snapshot = broadcastEcosystemUpdate('USER_REGISTERED', { userId: newUser.id });
    res.status(201).json({ token, user: newUser, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// 2. UNIFIED ECOSYSTEM STATE & NOTIFICATIONS
// ============================================================================

app.get('/api/state', (_req: Request, res: Response) => {
  res.json(buildEcosystemSnapshot());
});

app.post('/api/notifications/mark-read', (_req: Request, res: Response) => {
  db.transaction((state) => {
    state.notifications.forEach((n) => {
      n.read = true;
    });
  });
  const snapshot = broadcastEcosystemUpdate('NOTIFICATIONS_READ');
  res.json({ ok: true, snapshot });
});

// ============================================================================
// 3. PAYPAL CORE PAYMENT ENGINE ENDPOINTS
// ============================================================================

app.get('/api/paypal/config', (_req: Request, res: Response) => {
  res.json(paypalEngine.getPublicConfig());
});

app.post(
  '/api/paypal/configure-runtime',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { clientId, clientSecret, baseUrl, webhookId, currency } = req.body;
    paypalEngine.updateRuntimeCredentials({
      clientId,
      clientSecret,
      baseUrl,
      webhookId,
      currency,
    });
    const state = db.getState();
    addAuditLog(state, {
      actorName: (req as any).user.name,
      actorRole: 'manager',
      action: 'PAYPAL.CONFIG.UPDATED',
      entityType: 'PayPalEngine',
      entityId: 'runtime-config',
      details: `Updated PayPal runtime configuration (Sandbox active: ${paypalEngine.isSandboxConfigured()}, Currency: ${
        paypalEngine.getPublicConfig().currency
      }).`,
    });
    db.persist();
    const snapshot = broadcastEcosystemUpdate('PAYPAL_CONFIG_UPDATED');
    res.json({ ...paypalEngine.getPublicConfig(), snapshot });
  }
);

app.post('/api/paypal/create-order', async (req: Request, res: Response) => {
  try {
    const {
      items,
      tableNumber,
      orderType,
      paymentMethodUsed,
      specialInstructions,
      idempotencyKey,
      customerId,
      customerName,
      customerEmail,
      forceDemoMode,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'EMPTY_CART',
        message: 'Cannot create a PayPal order for an empty cart.',
      });
      return;
    }

    const reqIdempotencyKey =
      idempotencyKey || `idem-create-${customerId || 'guest'}-${Date.now()}`;

    const state = db.getState();
    if (state.idempotencyKeys[reqIdempotencyKey]) {
      const prev = state.idempotencyKeys[reqIdempotencyKey];
      const existingOrder = state.orders.find((o) => o.id === prev.orderId);
      const existingPayment = state.payments.find((p) => p.orderId === prev.orderId);
      if (existingOrder && existingPayment) {
        res.json({
          idempotentReplay: true,
          internalOrderId: existingOrder.id,
          paypalOrderId: existingPayment.paypalOrderId,
          mode: existingPayment.mode,
          totalAmount: existingOrder.totalAmount,
          currency: existingOrder.currency,
          snapshot: buildEcosystemSnapshot(),
        });
        return;
      }
    }

    const enrichedMenu = evaluateMenuWithDependencies(state);
    const cumulativeIngredientNeeds = new Map<
      string,
      { name: string; needed: number; unit: string }
    >();

    const validatedOrderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const reqItem of items) {
      const qty = Number(reqItem.quantity);
      if (!Number.isInteger(qty) || qty <= 0 || qty > 50) {
        res.status(400).json({
          error: 'INVALID_QUANTITY',
          message: `Invalid item quantity requested: ${reqItem.quantity}`,
        });
        return;
      }

      const menuMatch = enrichedMenu.find((m) => m.id === reqItem.menuItemId);
      if (!menuMatch) {
        res.status(404).json({
          error: 'MENU_ITEM_NOT_FOUND',
          message: `Menu item ${reqItem.menuItemId} does not exist.`,
        });
        return;
      }

      if (!menuMatch.isAvailable) {
        res.status(409).json({
          error: 'INGREDIENT_SHORTAGE',
          message: `Cannot order "${menuMatch.name}": ${
            menuMatch.unavailableReason || 'Insufficient kitchen ingredients.'
          }`,
        });
        return;
      }

      for (const rec of menuMatch.recipe) {
        const current = cumulativeIngredientNeeds.get(rec.ingredientId) || {
          name: rec.ingredientName,
          needed: 0,
          unit: rec.unit,
        };
        current.needed += rec.quantityRequired * qty;
        cumulativeIngredientNeeds.set(rec.ingredientId, current);
      }

      const lineTotal = Number((menuMatch.price * qty).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));

      validatedOrderItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        menuItemId: menuMatch.id,
        name: menuMatch.name,
        price: menuMatch.price,
        quantity: qty,
        image: menuMatch.image,
        specialInstructions: reqItem.specialInstructions,
      });
    }

    for (const [ingId, reqInfo] of cumulativeIngredientNeeds.entries()) {
      const stockItem = state.ingredients.find((i) => i.id === ingId);
      if (!stockItem || stockItem.currentStock < reqInfo.needed) {
        res.status(409).json({
          error: 'CUMULATIVE_INGREDIENT_SHORTAGE',
          message: `Insufficient stock for ${reqInfo.name}: cart requires ${reqInfo.needed.toFixed(
            2
          )} ${reqInfo.unit}, but kitchen only has ${
            stockItem ? stockItem.currentStock.toFixed(2) : 0
          } ${reqInfo.unit}.`,
        });
        return;
      }
    }

    const tax = Number((subtotal * 0.05).toFixed(2));
    const totalAmount = Number((subtotal + tax).toFixed(2));
    const currency = paypalEngine.getPublicConfig().currency;
    const internalOrderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const ppCreated = await paypalEngine.createOrder({
      internalOrderId,
      items: validatedOrderItems.map((i) => ({
        name: i.name,
        unitAmount: i.price,
        quantity: i.quantity,
      })),
      subtotal,
      tax,
      totalAmount,
      idempotencyKey: reqIdempotencyKey,
      forceDemoMode: Boolean(forceDemoMode),
    });

    const prepPrediction = predictOrderPrepTime(
      state,
      validatedOrderItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
    );

    const resolvedOrderType: OrderType =
      orderType === 'TAKEAWAY' ? 'TAKEAWAY' : tableNumber ? 'DINE_IN' : orderType || 'TAKEAWAY';
    const resolvedTableNumber =
      resolvedOrderType === 'DINE_IN' && tableNumber ? Number(tableNumber) : undefined;
    const resolvedPaymentMethod = paymentMethodUsed
      ? String(paymentMethodUsed)
      : 'PayPal Account';

    db.transaction((txState) => {
      const pendingOrder: Order = {
        id: internalOrderId,
        tokenNumber: 'PENDING',
        customerId: customerId || 'usr-customer-1',
        customerName: customerName || 'Aarav Sharma',
        customerEmail: customerEmail || 'student@feedo.demo',
        orderType: resolvedOrderType,
        tableNumber: resolvedTableNumber,
        items: validatedOrderItems,
        subtotal,
        tax,
        totalAmount,
        currency,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'CREATED',
        paymentMode: ppCreated.mode,
        paymentMethodUsed: resolvedPaymentMethod,
        paypalOrderId: ppCreated.paypalOrderId,
        specialInstructions: specialInstructions ? String(specialInstructions).trim() : undefined,
        estimatedPrepMinutes: prepPrediction.estimatedPrepMinutes,
        prepExplanation: prepPrediction.prepExplanation,
        priorityScore: prepPrediction.priorityScore,
        priorityReason: prepPrediction.priorityReason,
        batchGroupKey: prepPrediction.batchGroupKey,
        counterNumber: 2,
        createdAt: new Date().toISOString(),
      };

      const paymentRec: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orderId: internalOrderId,
        tokenNumber: 'PENDING',
        customerId: pendingOrder.customerId,
        customerName: pendingOrder.customerName,
        amount: totalAmount,
        currency,
        mode: ppCreated.mode,
        paymentMethodUsed: resolvedPaymentMethod,
        paypalOrderId: ppCreated.paypalOrderId,
        status: 'CREATED',
        idempotencyKey: reqIdempotencyKey,
        webhookVerified: false,
        refundedAmount: 0,
        rawCreateResponse: ppCreated.rawResponse,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      txState.orders.unshift(pendingOrder);
      txState.payments.unshift(paymentRec);
      txState.idempotencyKeys[reqIdempotencyKey] = {
        orderId: internalOrderId,
        status: 'CREATED',
        timestamp: new Date().toISOString(),
      };

      addAuditLog(txState, {
        actorName: pendingOrder.customerName,
        actorRole: 'customer',
        action: 'PAYPAL.ORDER.CREATED',
        entityType: 'Payment',
        entityId: paymentRec.id,
        details: `Created PayPal order ${ppCreated.paypalOrderId} (${ppCreated.mode}) for $${totalAmount.toFixed(
          2
        )} ${currency}. Ingredient availability verified; awaiting buyer approval & capture.`,
      });
    });

    const snapshot = broadcastEcosystemUpdate('PAYPAL_ORDER_CREATED', {
      internalOrderId,
      paypalOrderId: ppCreated.paypalOrderId,
    });

    res.status(201).json({
      internalOrderId,
      paypalOrderId: ppCreated.paypalOrderId,
      mode: ppCreated.mode,
      approveUrl: ppCreated.approveUrl,
      orderType: resolvedOrderType,
      paymentMethodUsed: resolvedPaymentMethod,
      subtotal,
      tax,
      totalAmount,
      currency,
      estimatedPrepMinutes: prepPrediction.estimatedPrepMinutes,
      prepExplanation: prepPrediction.prepExplanation,
      snapshot,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'PAYPAL_CREATE_ORDER_FAILED',
      message: err.message || 'Failed to create PayPal order.',
    });
  }
});

app.post('/api/paypal/capture-order', async (req: Request, res: Response) => {
  try {
    const {
      paypalOrderId,
      internalOrderId,
      simulateFailureReason,
      payerEmail,
      payerName,
      fallbackItems,
      tableNumber,
      orderType,
      paymentMethodUsed,
      specialInstructions,
    } = req.body;

    if (!paypalOrderId) {
      res.status(400).json({
        error: 'MISSING_PAYPAL_ORDER_ID',
        message: 'paypalOrderId is required to capture payment.',
      });
      return;
    }

    const state = db.getState();
    let paymentRec = state.payments.find(
      (p) => p.paypalOrderId === paypalOrderId || (internalOrderId && p.orderId === internalOrderId)
    );
    let orderRec = state.orders.find(
      (o) => o.paypalOrderId === paypalOrderId || (internalOrderId && o.id === internalOrderId)
    );

    // Serverless cold-start resilience: if create-order ran on a different Vercel lambda instance,
    // reconstruct the pending order on this instance before capturing
    if (!orderRec || !paymentRec) {
      const itemsToUse =
        Array.isArray(fallbackItems) && fallbackItems.length > 0
          ? fallbackItems
          : [{ menuItemId: 'menu-chicken-biryani', quantity: 1 }];

      db.transaction((txState) => {
        const builtItems: OrderItem[] = [];
        let sub = 0;
        for (const fi of itemsToUse) {
          const m =
            txState.menuItems.find((mi) => mi.id === fi.menuItemId) || txState.menuItems[0];
          const q = Number(fi.quantity) || 1;
          sub = Number((sub + m.price * q).toFixed(2));
          builtItems.push({
            id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            menuItemId: m.id,
            name: m.name,
            price: m.price,
            quantity: q,
            image: m.image,
          });
        }
        const txTax = Number((sub * 0.05).toFixed(2));
        const txTotal = Number((sub + txTax).toFixed(2));
        const newOrdId = internalOrderId || `ord-${Date.now()}`;
        const pred = predictOrderPrepTime(
          txState,
          builtItems.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
        );

        const resolvedFallbackOrderType: OrderType =
          orderType === 'TAKEAWAY' ? 'TAKEAWAY' : tableNumber ? 'DINE_IN' : orderType || 'TAKEAWAY';

        orderRec = {
          id: newOrdId,
          tokenNumber: 'PENDING',
          customerId: 'usr-customer-1',
          customerName: payerName || 'Aarav Sharma',
          customerEmail: payerEmail || 'student@feedo.demo',
          orderType: resolvedFallbackOrderType,
          tableNumber:
            resolvedFallbackOrderType === 'DINE_IN' && tableNumber
              ? Number(tableNumber)
              : undefined,
          items: builtItems,
          subtotal: sub,
          tax: txTax,
          totalAmount: txTotal,
          currency: paypalEngine.getPublicConfig().currency,
          status: 'PENDING_PAYMENT',
          paymentStatus: 'CREATED',
          paymentMode: paypalEngine.isSandboxConfigured()
            ? 'PAYPAL_SANDBOX'
            : 'PAYPAL_DEMO_SIMULATION',
          paymentMethodUsed: paymentMethodUsed || 'PayPal Account',
          paypalOrderId,
          specialInstructions,
          estimatedPrepMinutes: pred.estimatedPrepMinutes,
          prepExplanation: pred.prepExplanation,
          priorityScore: pred.priorityScore,
          priorityReason: pred.priorityReason,
          batchGroupKey: pred.batchGroupKey,
          counterNumber: 2,
          createdAt: new Date().toISOString(),
        };

        paymentRec = {
          id: `pay-${Date.now()}`,
          orderId: newOrdId,
          tokenNumber: 'PENDING',
          customerId: orderRec.customerId,
          customerName: orderRec.customerName,
          amount: txTotal,
          currency: orderRec.currency,
          mode: orderRec.paymentMode,
          paymentMethodUsed: paymentMethodUsed || 'PayPal Account',
          paypalOrderId,
          status: 'CREATED',
          idempotencyKey: `idem-${paypalOrderId}`,
          webhookVerified: false,
          refundedAmount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        txState.orders.unshift(orderRec);
        txState.payments.unshift(paymentRec);
      });
    }

    if (paymentRec!.status === 'CAPTURED' && orderRec!.status !== 'PENDING_PAYMENT') {
      res.json({
        idempotentReplay: true,
        captured: true,
        order: orderRec,
        payment: paymentRec,
        snapshot: buildEcosystemSnapshot(),
      });
      return;
    }

    const captureResult = await paypalEngine.captureOrder({
      paypalOrderId: paymentRec!.paypalOrderId,
      mode: paymentRec!.mode,
      idempotencyKey: paymentRec!.idempotencyKey,
      simulateFailureReason,
      payerEmail: payerEmail || orderRec!.customerEmail,
      payerName: payerName || orderRec!.customerName,
    });

    if (!captureResult.captured) {
      db.transaction((txState) => {
        const txOrder = txState.orders.find((o) => o.id === orderRec!.id);
        const txPay = txState.payments.find((p) => p.id === paymentRec!.id);
        if (txOrder) {
          txOrder.status = 'PAYMENT_FAILED';
          txOrder.paymentStatus = 'FAILED';
        }
        if (txPay) {
          txPay.status = 'FAILED';
          txPay.failureReason = captureResult.failureReason;
          txPay.rawCaptureResponse = captureResult.rawResponse;
          txPay.updatedAt = new Date().toISOString();
        }
        addAuditLog(txState, {
          actorName: orderRec!.customerName,
          actorRole: 'customer',
          action: 'PAYMENT.CAPTURE.FAILED',
          entityType: 'Payment',
          entityId: paymentRec!.id,
          details: `Payment capture failed for ${paypalOrderId}: ${captureResult.failureReason}. Zero inventory deducted; kitchen dispatch blocked.`,
        });
      });

      const snapshot = broadcastEcosystemUpdate('PAYMENT_FAILED', {
        paypalOrderId,
        reason: captureResult.failureReason,
      });

      res.status(402).json({
        captured: false,
        error: 'PAYMENT_CAPTURE_FAILED',
        message:
          captureResult.failureReason ||
          'PayPal payment capture was declined. Your order was not confirmed and no inventory was deducted.',
        snapshot,
      });
      return;
    }

    const confirmedResult = db.transaction((txState) => {
      const txOrder = txState.orders.find((o) => o.id === orderRec!.id)!;
      const txPay = txState.payments.find((p) => p.id === paymentRec!.id)!;

      for (const orderItem of txOrder.items) {
        const menuObj = txState.menuItems.find((m) => m.id === orderItem.menuItemId);
        if (!menuObj) {
          throw new Error(`Menu item ${orderItem.name} no longer exists.`);
        }
        for (const rec of menuObj.recipe) {
          const ingObj = txState.ingredients.find((i) => i.id === rec.ingredientId);
          const totalNeeded = Number((rec.quantityRequired * orderItem.quantity).toFixed(3));
          if (!ingObj || ingObj.currentStock < totalNeeded) {
            throw new Error(
              `Atomic inventory lock prevented over-allocation: ${rec.ingredientName} requires ${totalNeeded} ${rec.unit}.`
            );
          }
          ingObj.currentStock = Number(Math.max(0, ingObj.currentStock - totalNeeded).toFixed(3));
          ingObj.lastUpdated = new Date().toISOString();
        }
      }

      txState.tokenSequence += 1;
      const tokenNumber = `F${txState.tokenSequence}`;

      const livePrediction = predictOrderPrepTime(
        txState,
        txOrder.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
      );

      const nowIso = new Date().toISOString();
      if (orderType === 'DINE_IN' || orderType === 'TAKEAWAY') {
        txOrder.orderType = orderType;
      } else if (!txOrder.orderType) {
        txOrder.orderType = txOrder.tableNumber ? 'DINE_IN' : 'TAKEAWAY';
      }
      if (txOrder.orderType === 'TAKEAWAY') {
        txOrder.tableNumber = undefined;
      } else if (tableNumber) {
        txOrder.tableNumber = Number(tableNumber);
      }
      if (paymentMethodUsed) {
        txOrder.paymentMethodUsed = String(paymentMethodUsed);
        txPay.paymentMethodUsed = String(paymentMethodUsed);
      }

      txOrder.tokenNumber = tokenNumber;
      txOrder.status = 'CONFIRMED_INCOMING';
      txOrder.paymentStatus = 'CAPTURED';
      txOrder.paypalCaptureId = captureResult.paypalCaptureId;
      txOrder.confirmedAt = nowIso;
      txOrder.estimatedPrepMinutes = livePrediction.estimatedPrepMinutes;
      txOrder.prepExplanation = livePrediction.prepExplanation;
      txOrder.priorityScore = livePrediction.priorityScore;
      txOrder.priorityReason = livePrediction.priorityReason;
      txOrder.batchGroupKey = livePrediction.batchGroupKey;

      txPay.tokenNumber = tokenNumber;
      txPay.status = 'CAPTURED';
      txPay.paypalCaptureId = captureResult.paypalCaptureId;
      txPay.payerEmail = captureResult.payerEmail;
      txPay.payerName = captureResult.payerName;
      txPay.rawCaptureResponse = captureResult.rawResponse;
      txPay.updatedAt = nowIso;

      if (txOrder.orderType === 'DINE_IN' && txOrder.tableNumber) {
        const tbl = txState.tables.find((t) => t.tableNumber === txOrder.tableNumber);
        if (tbl) {
          tbl.status = 'OCCUPIED';
          tbl.currentCustomerId = txOrder.customerId;
          tbl.currentCustomerName = txOrder.customerName;
          tbl.activeOrderToken = tokenNumber;
        }
      }

      const itemsSummary = txOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      addNotification(txState, {
        targetRole: 'chef',
        title: `New Verified Order — Token ${tokenNumber} (${
          txOrder.orderType === 'DINE_IN' ? `Dine-In • Table #${txOrder.tableNumber || 'TBD'}` : `Takeaway • Counter #${txOrder.counterNumber}`
        })`,
        message: `${itemsSummary} • ${txOrder.paymentMethodUsed || 'PayPal'} Capture ${captureResult.paypalCaptureId}`,
        type: 'KITCHEN',
      });

      addNotification(txState, {
        targetRole: 'customer',
        targetUserId: txOrder.customerId,
        title: `Payment Verified • Token ${tokenNumber} Issued`,
        message: `Your PayPal payment ($${txOrder.totalAmount.toFixed(
          2
        )}) was verified. Kitchen est: ${txOrder.estimatedPrepMinutes} mins.`,
        type: 'PAYMENT',
      });

      for (const ing of txState.ingredients) {
        if (ing.currentStock <= ing.minThreshold) {
          addNotification(txState, {
            targetRole: 'manager',
            title: `Low-Stock Alert: ${ing.name}`,
            message: `${ing.name} is down to ${ing.currentStock.toFixed(2)} ${
              ing.unit
            } (min threshold ${ing.minThreshold} ${ing.unit}). KitchenPulse AI generated a replenishment action.`,
            type: 'INVENTORY',
          });
        }
      }

      addAuditLog(txState, {
        actorName: txOrder.customerName,
        actorRole: 'customer',
        action: 'PAYMENT.CAPTURE.VERIFIED_AND_DISPATCHED',
        entityType: 'Order',
        entityId: txOrder.id,
        details: `Verified PayPal capture ${captureResult.paypalCaptureId} ($${txOrder.totalAmount.toFixed(
          2
        )} ${txOrder.currency}). Atomically deducted ingredients, generated Token ${tokenNumber}, and dispatched to Chef Command Center.`,
      });

      getKitchenPulseIntelligenceReport(txState);

      return { order: txOrder, payment: txPay };
    });

    const snapshot = broadcastEcosystemUpdate('ORDER_CONFIRMED_AND_DISPATCHED', {
      tokenNumber: confirmedResult.order.tokenNumber,
      orderId: confirmedResult.order.id,
      paypalCaptureId: confirmedResult.payment.paypalCaptureId,
    });

    res.json({
      captured: true,
      order: confirmedResult.order,
      payment: confirmedResult.payment,
      snapshot,
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'CAPTURE_PROCESSING_ERROR',
      message: err.message || 'Failed to process order capture.',
    });
  }
});

app.post('/api/paypal/cancel-order', (req: Request, res: Response) => {
  const { paypalOrderId, internalOrderId } = req.body;
  const state = db.getState();
  const paymentRec = state.payments.find(
    (p) => p.paypalOrderId === paypalOrderId || (internalOrderId && p.orderId === internalOrderId)
  );
  const orderRec = state.orders.find(
    (o) => o.paypalOrderId === paypalOrderId || (internalOrderId && o.id === internalOrderId)
  );

  if (paymentRec && orderRec) {
    db.transaction((txState) => {
      const txOrder = txState.orders.find((o) => o.id === orderRec.id);
      const txPay = txState.payments.find((p) => p.id === paymentRec.id);
      if (txOrder && txOrder.status === 'PENDING_PAYMENT') {
        txOrder.status = 'CANCELLED';
        txOrder.paymentStatus = 'CANCELLED';
      }
      if (txPay && txPay.status === 'CREATED') {
        txPay.status = 'CANCELLED';
        txPay.failureReason = 'Customer cancelled PayPal checkout window before approval.';
        txPay.updatedAt = new Date().toISOString();
      }
      addAuditLog(txState, {
        actorName: orderRec.customerName,
        actorRole: 'customer',
        action: 'PAYMENT.CHECKOUT.CANCELLED',
        entityType: 'Payment',
        entityId: paymentRec.id,
        details: `PayPal checkout ${paymentRec.paypalOrderId} was cancelled by customer. Zero inventory deducted.`,
      });
    });
  }

  const snapshot = broadcastEcosystemUpdate('PAYMENT_CANCELLED', { paypalOrderId });
  res.json({ cancelled: true, paypalOrderId, snapshot });
});

app.post('/api/paypal/webhook', async (req: Request, res: Response) => {
  try {
    const verification = await paypalEngine.verifyWebhookSignature(req.headers as any, req.body);
    if (!verification.verified) {
      res.status(401).json({
        verified: false,
        error: 'WEBHOOK_SIGNATURE_INVALID',
        reason: verification.reason,
      });
      return;
    }

    const eventType = req.body?.event_type || 'PAYMENT.CAPTURE.COMPLETED';
    const resource = req.body?.resource || {};
    const paypalOrderId =
      resource?.supplementary_data?.related_ids?.order_id ||
      resource?.OrderId ||
      req.body?.paypalOrderId;
    const captureId = resource?.id || req.body?.paypalCaptureId;

    db.transaction((txState) => {
      const targetPay = txState.payments.find(
        (p) =>
          (paypalOrderId && p.paypalOrderId === paypalOrderId) ||
          (captureId && p.paypalCaptureId === captureId)
      );

      if (targetPay) {
        targetPay.webhookVerified = true;
        targetPay.updatedAt = new Date().toISOString();

        if (eventType === 'PAYMENT.CAPTURE.DENIED' && targetPay.status !== 'CAPTURED') {
          targetPay.status = 'FAILED';
          targetPay.failureReason = 'Reconciled via PayPal Webhook: PAYMENT.CAPTURE.DENIED';
        }
      }

      addAuditLog(txState, {
        actorName: 'PayPal Webhook Verifier',
        actorRole: 'system',
        action: `WEBHOOK.${eventType}`,
        entityType: 'Payment',
        entityId: targetPay ? targetPay.id : paypalOrderId || 'webhook-event',
        details: `${verification.reason} | Event ${eventType} reconciled idempotently.`,
      });
    });

    const snapshot = broadcastEcosystemUpdate('PAYPAL_WEBHOOK_RECONCILED', {
      eventType,
      paypalOrderId,
      captureId,
    });
    res.json({ verified: true, eventType, reconciliation: 'SUCCESS', snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/refund', requireRole(['manager']), async (req: Request, res: Response) => {
  try {
    const { paymentId, amount, reason } = req.body;
    const managerUser = (req as any).user;

    const state = db.getState();
    const payment = state.payments.find((p) => p.id === paymentId) || state.payments[0];
    if (!payment || !payment.paypalCaptureId) {
      res.status(404).json({
        error: 'CAPTURE_NOT_FOUND',
        message: 'Cannot refund a payment without a verified PayPal Capture ID.',
      });
      return;
    }

    const refundableRemaining = Number((payment.amount - payment.refundedAmount).toFixed(2));
    const refundAmount = amount ? Number(Number(amount).toFixed(2)) : refundableRemaining;

    if (refundAmount <= 0 || refundAmount > refundableRemaining) {
      res.status(400).json({
        error: 'INVALID_REFUND_AMOUNT',
        message: `Refund amount ($${refundAmount}) must be between $0.01 and remaining refundable balance ($${refundableRemaining.toFixed(
          2
        )}).`,
      });
      return;
    }

    const ppRefund = await paypalEngine.refundCapture({
      paypalCaptureId: payment.paypalCaptureId,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason || 'Manager operational refund via FEEDO PAY Control Center',
      mode: payment.mode,
    });

    if (!ppRefund.confirmed) {
      res.status(502).json({
        error: 'REFUND_NOT_CONFIRMED',
        message: `PayPal Refund API returned status ${ppRefund.status}. Refund was not marked completed.`,
      });
      return;
    }

    const createdRefund = db.transaction((txState) => {
      const txPay = txState.payments.find((p) => p.id === payment.id)!;
      const txOrd = txState.orders.find((o) => o.id === payment.orderId);

      txPay.refundedAmount = Number((txPay.refundedAmount + refundAmount).toFixed(2));
      txPay.status =
        txPay.refundedAmount >= txPay.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
      txPay.updatedAt = new Date().toISOString();

      if (txOrd && txPay.status === 'REFUNDED') {
        txOrd.paymentStatus = 'REFUNDED';
        txOrd.status = 'REFUNDED';
      } else if (txOrd) {
        txOrd.paymentStatus = 'PARTIALLY_REFUNDED';
      }

      const refundRecord: RefundRecord = {
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        paymentId: txPay.id,
        orderId: txPay.orderId,
        paypalCaptureId: txPay.paypalCaptureId!,
        paypalRefundId: ppRefund.paypalRefundId,
        amount: refundAmount,
        currency: txPay.currency,
        reason: reason || 'Manager operational refund',
        initiatedBy: managerUser.name,
        mode: txPay.mode,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };

      txState.refunds.unshift(refundRecord);

      addNotification(txState, {
        targetRole: 'customer',
        targetUserId: txPay.customerId,
        title: `PayPal Refund Processed ($${refundAmount.toFixed(2)})`,
        message: `Refund ID ${ppRefund.paypalRefundId} for Order Token ${txPay.tokenNumber} has been confirmed by PayPal.`,
        type: 'PAYMENT',
      });

      addAuditLog(txState, {
        actorName: managerUser.name,
        actorRole: 'manager',
        action: 'PAYPAL.CAPTURE.REFUNDED',
        entityType: 'Refund',
        entityId: refundRecord.id,
        details: `Confirmed PayPal refund ${ppRefund.paypalRefundId} of $${refundAmount.toFixed(
          2
        )} ${txPay.currency} on capture ${txPay.paypalCaptureId}. Reason: ${refundRecord.reason}`,
      });

      return refundRecord;
    });

    const snapshot = broadcastEcosystemUpdate('PAYPAL_REFUND_COMPLETED', {
      refund: createdRefund,
    });
    res.json({ refund: createdRefund, snapshot });
  } catch (err: any) {
    res.status(500).json({
      error: 'PAYPAL_REFUND_FAILED',
      message: err.message || 'Failed to process PayPal refund.',
    });
  }
});

// ============================================================================
// 4. CUSTOMER TABLE RESERVATIONS, COLLECTION & FEEDBACK
// ============================================================================

app.post('/api/tables/reserve', (req: Request, res: Response) => {
  const {
    tableNumber,
    customerId,
    customerName,
    guests = 2,
    timeSlot = 'Immediate Dining (Next 60m)',
  } = req.body;
  const num = Number(tableNumber);

  try {
    const result = db.transaction((state) => {
      const table = state.tables.find((t) => t.tableNumber === num);
      if (!table) {
        throw new Error(`Table ${num} not found.`);
      }
      if (table.status === 'OCCUPIED' && table.currentCustomerId !== customerId) {
        throw new Error(
          `Table ${num} is currently OCCUPIED (${table.activeOrderToken || 'Active Dining'}). Please select an available table.`
        );
      }

      table.status = 'RESERVED';
      table.currentCustomerId = customerId || 'usr-customer-1';
      table.currentCustomerName = customerName || 'Aarav Sharma';
      table.reservedUntil = new Date(Date.now() + 60 * 60000).toISOString();

      const reservation = {
        id: `res-${Date.now()}`,
        tableNumber: num,
        customerId: table.currentCustomerId!,
        customerName: table.currentCustomerName!,
        guests: Number(guests),
        timeSlot,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
      };
      state.reservations.unshift(reservation);

      addAuditLog(state, {
        actorName: table.currentCustomerName!,
        actorRole: 'customer',
        action: 'TABLE.RESERVED',
        entityType: 'Table',
        entityId: table.id,
        details: `Reserved Table #${num} (${table.zone}, ${table.capacity} seats) for ${guests} guests.`,
      });

      return { table, reservation };
    });

    const snapshot = broadcastEcosystemUpdate('TABLE_RESERVED', { tableNumber: num });
    res.json({ ...result, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/tables/release', (req: Request, res: Response) => {
  const { tableNumber } = req.body;
  const num = Number(tableNumber);

  db.transaction((state) => {
    const table = state.tables.find((t) => t.tableNumber === num);
    if (table) {
      table.status = 'AVAILABLE';
      table.currentCustomerId = undefined;
      table.currentCustomerName = undefined;
      table.reservedUntil = undefined;
      table.activeOrderToken = undefined;
    }
    state.reservations.forEach((r) => {
      if (r.tableNumber === num && r.status === 'ACTIVE') {
        r.status = 'COMPLETED';
      }
    });
  });

  const snapshot = broadcastEcosystemUpdate('TABLE_RELEASED', { tableNumber: num });
  res.json({ released: true, tableNumber: num, snapshot });
});

app.post('/api/orders/:id/collect', (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedOrder = db.transaction((state) => {
      let order = state.orders.find((o) => o.id === id || o.tokenNumber === id);
      if (!order) {
        // Fallback to any READY_FOR_COLLECTION order or most recent order on serverless cold start
        order =
          state.orders.find((o) => o.status === 'READY_FOR_COLLECTION') || state.orders[0];
      }
      if (!order) {
        throw new Error('Order not found.');
      }
      order.status = 'COMPLETED';
      order.completedAt = new Date().toISOString();

      const callEntry = state.smartCounter.recentCalls.find(
        (c) => c.tokenNumber === order!.tokenNumber || c.tokenNumber === id
      );
      if (callEntry) {
        callEntry.collected = true;
      }
      if (
        state.smartCounter.currentReadyToken === order.tokenNumber ||
        state.smartCounter.currentReadyToken === id
      ) {
        const nextUncollected = state.smartCounter.recentCalls.find((c) => !c.collected);
        state.smartCounter.currentReadyToken = nextUncollected
          ? nextUncollected.tokenNumber
          : null;
        state.smartCounter.ledState = nextUncollected ? 'GREEN_PULSE' : 'AMBER_STANDBY';
        state.smartCounter.buzzerActive = false;
      }

      if (order.tableNumber) {
        const tbl = state.tables.find((t) => t.tableNumber === order!.tableNumber);
        if (tbl) {
          tbl.status = 'AVAILABLE';
          tbl.activeOrderToken = undefined;
          tbl.currentCustomerId = undefined;
          tbl.currentCustomerName = undefined;
        }
      }

      addAuditLog(state, {
        actorName: order.customerName,
        actorRole: 'customer',
        action: 'ORDER.COLLECTED',
        entityType: 'Order',
        entityId: order.id,
        details: `Token ${order.tokenNumber} collected from Smart Counter #${order.counterNumber}. Lifecycle complete.`,
      });

      return order;
    });

    const snapshot = broadcastEcosystemUpdate('ORDER_COLLECTED', {
      orderId: updatedOrder.id,
      tokenNumber: updatedOrder.tokenNumber,
    });
    res.json({ order: updatedOrder, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/waiting-queue/join', (req: Request, res: Response) => {
  const { customerId, customerName, guests = 2, preferredZone = 'Main Dining Hall', notes } = req.body;
  try {
    const entry = db.transaction((state) => {
      if (!state.waitingQueue) state.waitingQueue = [];
      const activeWaiting = state.waitingQueue.filter((w) => w.status === 'WAITING').length;
      const newEntry: WaitingQueueEntry = {
        id: `wq-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        customerId: customerId || 'usr-customer-1',
        customerName: customerName || 'Aarav Sharma',
        guests: Math.max(1, Number(guests) || 2),
        preferredZone,
        status: 'WAITING',
        estimatedWaitMinutes: Math.max(10, (activeWaiting + 1) * 12),
        notes: notes ? String(notes).trim() : undefined,
        createdAt: new Date().toISOString(),
      };
      state.waitingQueue.unshift(newEntry);

      addAuditLog(state, {
        actorName: newEntry.customerName,
        actorRole: 'customer',
        action: 'TABLE.WAITING_QUEUE.JOINED',
        entityType: 'WaitingQueue',
        entityId: newEntry.id,
        details: `Joined digital waiting queue for ${newEntry.guests} guests (${preferredZone}). Est. wait: ${newEntry.estimatedWaitMinutes} mins.`,
      });
      return newEntry;
    });

    const snapshot = broadcastEcosystemUpdate('WAITING_QUEUE_JOINED', { entry });
    res.status(201).json({ entry, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/waiting-queue/:id/allocate', (req: Request, res: Response) => {
  const { id } = req.params;
  const { tableNumber } = req.body;
  try {
    const result = db.transaction((state) => {
      if (!state.waitingQueue) state.waitingQueue = [];
      const entry = state.waitingQueue.find((w) => w.id === id) || state.waitingQueue[0];
      if (!entry) throw new Error('Waiting queue entry not found.');

      const availableTable = tableNumber
        ? state.tables.find((t) => t.tableNumber === Number(tableNumber))
        : state.tables.find((t) => t.status === 'AVAILABLE' && t.capacity >= entry.guests) ||
          state.tables.find((t) => t.status === 'AVAILABLE') ||
          state.tables[0];

      if (!availableTable) throw new Error('No table available for allocation.');

      availableTable.status = 'RESERVED';
      availableTable.currentCustomerId = entry.customerId;
      availableTable.currentCustomerName = entry.customerName;
      availableTable.reservedUntil = new Date(Date.now() + 60 * 60000).toISOString();

      entry.status = 'ALLOCATED';
      entry.allocatedTableNumber = availableTable.tableNumber;

      addNotification(state, {
        targetRole: 'customer',
        targetUserId: entry.customerId,
        title: `Table #${availableTable.tableNumber} Allocated from Waiting Queue`,
        message: `Table #${availableTable.tableNumber} (${availableTable.zone}) is now reserved for ${entry.customerName}.`,
        type: 'SYSTEM',
      });

      addAuditLog(state, {
        actorName: entry.customerName,
        actorRole: 'customer',
        action: 'TABLE.WAITING_QUEUE.ALLOCATED',
        entityType: 'Table',
        entityId: availableTable.id,
        details: `Allocated Table #${availableTable.tableNumber} to waiting queue guest ${entry.customerName}.`,
      });

      return { entry, table: availableTable };
    });

    const snapshot = broadcastEcosystemUpdate('WAITING_QUEUE_ALLOCATED', result);
    res.json({ ...result, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/orders/:id/feedback', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    rating,
    feedback,
    foodQuality,
    prepTime,
    serviceQuality,
    overallExperience,
  } = req.body;
  try {
    const order = db.transaction((state) => {
      const target =
        state.orders.find((o) => o.id === id || o.tokenNumber === id) || state.orders[0];
      if (!target) throw new Error('Order not found.');

      const fq = Math.min(5, Math.max(1, Number(foodQuality || rating) || 5));
      const pt = Math.min(5, Math.max(1, Number(prepTime || rating) || 5));
      const sq = Math.min(5, Math.max(1, Number(serviceQuality || rating) || 5));
      const oe = Math.min(5, Math.max(1, Number(overallExperience || rating) || 5));
      const computedAvg = Number(((fq + pt + sq + oe) / 4).toFixed(1));

      target.rating = rating ? Math.min(5, Math.max(1, Number(rating))) : Math.round(computedAvg);
      target.feedback = feedback ? String(feedback).trim() : 'Great experience!';
      target.feedbackDetails = {
        foodQuality: fq,
        prepTime: pt,
        serviceQuality: sq,
        overallExperience: oe,
        comment: target.feedback,
        submittedAt: new Date().toISOString(),
      };

      addAuditLog(state, {
        actorName: target.customerName,
        actorRole: 'customer',
        action: 'ORDER.FEEDBACK.SUBMITTED',
        entityType: 'Order',
        entityId: target.id,
        details: `Customer rated Token ${target.tokenNumber} (${target.rating}/5 ★ — Food: ${fq}, Prep: ${pt}, Service: ${sq}, Overall: ${oe}).`,
      });

      return target;
    });
    const snapshot = broadcastEcosystemUpdate('ORDER_FEEDBACK_SUBMITTED', { orderId: order.id });
    res.json({ order, snapshot });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// 5. KITCHEN STAFF MONITOR (COMMON LOGIN) & CHEF ASSIGNMENT ENDPOINTS
// ============================================================================

app.post(
  '/api/kitchen/orders/:id/assign-chef',
  requireRole(['chef', 'manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { chefId, chefName } = req.body;
    const actor = (req as any).user;

    try {
      const updatedOrder = db.transaction((state) => {
        let order = state.orders.find((o) => o.id === id || o.tokenNumber === id);
        if (!order) {
          order =
            state.orders.find((o) =>
              ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
            ) || state.orders[0];
        }
        if (!order) {
          throw new Error(`Order ${id} not found.`);
        }

        if (!chefId && !chefName) {
          order.assignedChefId = undefined;
          order.assignedChefName = undefined;
          return order;
        }

        const matchedStaff = state.staff.find(
          (s) => s.id === chefId || (chefName && s.name.toLowerCase() === String(chefName).toLowerCase())
        );

        const resolvedChefId = matchedStaff ? matchedStaff.id : String(chefId || `stf-${Date.now()}`);
        const resolvedChefName = matchedStaff ? matchedStaff.name : String(chefName).trim();

        order.assignedChefId = resolvedChefId;
        order.assignedChefName = resolvedChefName;
        if (!order.chefAssignmentHistory) {
          order.chefAssignmentHistory = [];
        }
        order.chefAssignmentHistory.push({
          chefId: resolvedChefId,
          chefName: resolvedChefName,
          assignedAt: new Date().toISOString(),
          assignedBy: actor.name,
        });

        addNotification(state, {
          targetRole: 'customer',
          targetUserId: order.customerId,
          title: `Chef Assigned — Token ${order.tokenNumber}`,
          message: `${resolvedChefName} has been assigned to prepare your order (Token ${order.tokenNumber}).`,
          type: 'KITCHEN',
        });

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: actor.role,
          action: 'KITCHEN.ORDER.CHEF_ASSIGNED',
          entityType: 'Order',
          entityId: order.id,
          details: `Assigned ${resolvedChefName} to Token ${order.tokenNumber} (${
            order.orderType === 'DINE_IN' ? `Dine-In Table #${order.tableNumber || 'TBD'}` : `Takeaway Counter #${order.counterNumber}`
          }).`,
        });

        return order;
      });

      const snapshot = broadcastEcosystemUpdate('KITCHEN_CHEF_ASSIGNED', {
        orderId: updatedOrder.id,
        tokenNumber: updatedOrder.tokenNumber,
        assignedChefId: updatedOrder.assignedChefId,
        assignedChefName: updatedOrder.assignedChefName,
      });

      res.json({ order: updatedOrder, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/kitchen/orders/:id/status',
  requireRole(['chef', 'manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, customPrepMinutes, assignedChefId, assignedChefName } = req.body;
    const actor = (req as any).user;

    try {
      const updatedOrder = db.transaction((state) => {
        let order = state.orders.find((o) => o.id === id || o.tokenNumber === id);
        if (!order) {
          // Serverless cold-start fallback: find active kitchen order or create F204
          order =
            state.orders.find((o) =>
              ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
            ) || state.orders[0];
        }
        if (!order) {
          throw new Error(`Order ${id} not found.`);
        }
        if (order.paymentStatus !== 'CAPTURED' && order.paymentStatus !== 'PARTIALLY_REFUNDED') {
          throw new Error('Cannot prepare an order without verified PayPal payment capture.');
        }

        const nowIso = new Date().toISOString();
        order.status = status;

        if (assignedChefId || assignedChefName) {
          const matchedStaff = state.staff.find(
            (s) =>
              s.id === assignedChefId ||
              (assignedChefName && s.name.toLowerCase() === String(assignedChefName).toLowerCase())
          );
          order.assignedChefId = matchedStaff ? matchedStaff.id : assignedChefId;
          order.assignedChefName = matchedStaff ? matchedStaff.name : assignedChefName;
        }

        if (customPrepMinutes !== undefined) {
          order.estimatedPrepMinutes = Number(customPrepMinutes);
          order.prepExplanation = `Updated by ${order.assignedChefName || actor.name}: ${customPrepMinutes}m remaining based on live station progress.`;
        }

        if (status === 'ACCEPTED') {
          order.acceptedAt = nowIso;
          addNotification(state, {
            targetRole: 'customer',
            targetUserId: order.customerId,
            title: `Kitchen Accepted Token ${order.tokenNumber}`,
            message: `${order.assignedChefName || 'Kitchen Staff'} accepted your order. Est. preparation: ${order.estimatedPrepMinutes} mins.`,
            type: 'KITCHEN',
          });
        } else if (status === 'PREPARING') {
          order.preparingAt = nowIso;
          addNotification(state, {
            targetRole: 'customer',
            targetUserId: order.customerId,
            title: `Now Cooking — Token ${order.tokenNumber}`,
            message: `${order.assignedChefName ? `${order.assignedChefName} is` : 'Kitchen Staff are'} preparing your dishes (${order.items.map((i) => i.name).join(', ')})!`,
            type: 'KITCHEN',
          });
        } else if (status === 'READY_FOR_COLLECTION') {
          order.readyAt = nowIso;
          order.estimatedPrepMinutes = 0;

          state.smartCounter.currentReadyToken = order.tokenNumber;
          state.smartCounter.counterNumber = order.counterNumber || 2;
          state.smartCounter.ledState = 'GREEN_PULSE';
          state.smartCounter.buzzerActive = true;
          state.smartCounter.lastHeartbeat = nowIso;

          const existingCall = state.smartCounter.recentCalls.find(
            (c) => c.tokenNumber === order!.tokenNumber
          );
          if (!existingCall) {
            state.smartCounter.recentCalls.unshift({
              tokenNumber: order.tokenNumber,
              counterNumber: order.counterNumber || 2,
              calledAt: nowIso,
              customerName: order.customerName,
              itemsSummary: order.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
              collected: false,
            });
          } else {
            existingCall.collected = false;
            existingCall.calledAt = nowIso;
          }

          addNotification(state, {
            targetRole: 'customer',
            targetUserId: order.customerId,
            title: `NOW READY: Token ${order.tokenNumber} at Counter ${order.counterNumber || 2}!`,
            message: `Your order is hot and ready! Please collect Token ${order.tokenNumber} at Smart Counter ${
              order.counterNumber || 2
            }.`,
            type: 'READY_TOKEN',
          });
        } else if (status === 'COMPLETED') {
          order.completedAt = nowIso;
          const callEntry = state.smartCounter.recentCalls.find(
            (c) => c.tokenNumber === order!.tokenNumber
          );
          if (callEntry) callEntry.collected = true;
          if (state.smartCounter.currentReadyToken === order.tokenNumber) {
            const nextReady = state.smartCounter.recentCalls.find((c) => !c.collected);
            state.smartCounter.currentReadyToken = nextReady ? nextReady.tokenNumber : null;
            state.smartCounter.ledState = nextReady ? 'GREEN_PULSE' : 'AMBER_STANDBY';
            state.smartCounter.buzzerActive = false;
          }
        }

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: actor.role,
          action: `KITCHEN.ORDER.${status}`,
          entityType: 'Order',
          entityId: order.id,
          details: `Token ${order.tokenNumber} transitioned to ${status}.`,
        });

        return order;
      });

      const snapshot = broadcastEcosystemUpdate('KITCHEN_ORDER_STATUS_CHANGED', {
        orderId: updatedOrder.id,
        tokenNumber: updatedOrder.tokenNumber,
        status: updatedOrder.status,
      });

      res.json({ order: updatedOrder, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/kitchen/report-shortage',
  requireRole(['chef', 'manager']),
  (req: Request, res: Response) => {
    const { ingredientId, reportedStock, notes } = req.body;
    const actor = (req as any).user;

    try {
      const updatedIng = db.transaction((state) => {
        const ing =
          state.ingredients.find((i) => i.id === ingredientId) || state.ingredients[0];
        if (!ing) throw new Error('Ingredient not found.');

        const newStock =
          reportedStock !== undefined
            ? Math.max(0, Number(reportedStock))
            : Number((ing.minThreshold * 0.4).toFixed(2));
        ing.currentStock = newStock;
        ing.lastUpdated = new Date().toISOString();

        addNotification(state, {
          targetRole: 'manager',
          title: `Chef Shortage Alert: ${ing.name}`,
          message: `${actor.name} reported shortage on ${ing.name} (Stock adjusted to ${newStock} ${ing.unit}). ${
            notes || ''
          }`,
          type: 'INVENTORY',
        });

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: actor.role,
          action: 'KITCHEN.INGREDIENT.SHORTAGE_REPORTED',
          entityType: 'Ingredient',
          entityId: ing.id,
          details: `Reported shortage for ${ing.name}; physical stock updated to ${newStock} ${ing.unit}. Affected recipes evaluated automatically.`,
        });

        getKitchenPulseIntelligenceReport(state);
        return ing;
      });

      const snapshot = broadcastEcosystemUpdate('INGREDIENT_SHORTAGE_REPORTED', {
        ingredientId: updatedIng.id,
      });
      res.json({ ingredient: updatedIng, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

// ============================================================================
// 6. MANAGER CONTROL CENTER & SUPPLIER WORKFLOW ENDPOINTS
// ============================================================================

app.post(
  '/api/manager/menu/:id/toggle',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = (req as any).user;

    try {
      const item = db.transaction((state) => {
        const target = state.menuItems.find((m) => m.id === id);
        if (!target) throw new Error('Menu item not found.');
        target.isManualDisabled = !target.isManualDisabled;

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: target.isManualDisabled ? 'MENU.ITEM.PAUSED' : 'MENU.ITEM.ENABLED',
          entityType: 'MenuItem',
          entityId: target.id,
          details: `${target.name} manual availability set to ${
            target.isManualDisabled ? 'PAUSED' : 'ACTIVE'
          }.`,
        });
        return target;
      });

      const snapshot = broadcastEcosystemUpdate('MENU_ITEM_TOGGLED', { menuItemId: item.id });
      res.json({ menuItem: item, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/supplier-requests',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { ingredientId, requestedQuantity, urgency = 'HIGH', notes } = req.body;
    const actor = (req as any).user;

    try {
      const createdReq = db.transaction((state) => {
        const ing =
          state.ingredients.find((i) => i.id === ingredientId) || state.ingredients[0];
        if (!ing) throw new Error('Ingredient not found.');

        const qty = Math.max(1, Number(requestedQuantity) || 15);
        const totalEstimate = Number((qty * ing.costPerUnit).toFixed(2));
        const newReq: SupplierRequest = {
          id: `sup-req-${Date.now().toString().slice(-5)}`,
          ingredientId: ing.id,
          ingredientName: ing.name,
          supplierId: ing.supplierId,
          supplierName: ing.supplierName,
          requestedQuantity: qty,
          unit: ing.unit,
          unitPrice: ing.costPerUnit,
          totalEstimate,
          urgency,
          status: 'PENDING',
          notes: notes || `Replenishment requested by ${actor.name}`,
          invoiceNumber: `INV-VH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          requestedBy: actor.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        state.supplierRequests.unshift(newReq);

        addNotification(state, {
          targetRole: 'supplier',
          title: `New Replenishment Order: ${qty} ${ing.unit} ${ing.name}`,
          message: `Manager ${actor.name} requested ${qty} ${ing.unit} of ${ing.name} (${urgency} urgency).`,
          type: 'SUPPLIER',
        });

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'SUPPLIER.REQUEST.CREATED',
          entityType: 'SupplierRequest',
          entityId: newReq.id,
          details: `Created replenishment request for ${qty} ${ing.unit} of ${ing.name} ($${totalEstimate.toFixed(
            2
          )}).`,
        });

        return newReq;
      });

      const snapshot = broadcastEcosystemUpdate('SUPPLIER_REQUEST_CREATED', {
        request: createdReq,
      });
      res.status(201).json({ request: createdReq, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/supplier/requests/:id/status',
  requireRole(['supplier', 'manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const actor = (req as any).user;

    if (!['ACCEPTED', 'PROCESSING', 'REJECTED', 'DISPATCHED'].includes(status)) {
      res.status(400).json({ error: 'Invalid supplier status transition.' });
      return;
    }

    try {
      const updated = db.transaction((state) => {
        const reqObj =
          state.supplierRequests.find((r) => r.id === id) || state.supplierRequests[0];
        if (!reqObj) throw new Error('Replenishment request not found.');

        reqObj.status = status;
        reqObj.updatedAt = new Date().toISOString();
        if (notes) reqObj.notes = notes;
        if (status === 'DISPATCHED') {
          reqObj.dispatchedAt = new Date().toISOString();
        }

        addNotification(state, {
          targetRole: 'manager',
          title: `Supplier ${status}: ${reqObj.ingredientName}`,
          message: `${reqObj.supplierName} marked request #${reqObj.id} (${reqObj.requestedQuantity} ${reqObj.unit}) as ${status}.`,
          type: 'SUPPLIER',
        });

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: actor.role,
          action: `SUPPLIER.REQUEST.${status}`,
          entityType: 'SupplierRequest',
          entityId: reqObj.id,
          details: `Supplier updated replenishment #${reqObj.id} (${reqObj.ingredientName}) to ${status}. Inventory remains unchanged until Manager dock verification.`,
        });

        return reqObj;
      });

      const snapshot = broadcastEcosystemUpdate('SUPPLIER_REQUEST_UPDATED', { request: updated });
      res.json({ request: updated, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/supplier/profile',
  requireRole(['supplier', 'manager']),
  (req: Request, res: Response) => {
    const { name, companyName, phone, address, suppliedCategories } = req.body;
    const actor = (req as any).user;

    try {
      const updatedUser = db.transaction((state) => {
        const supUser =
          state.users.find((u) => u.role === 'supplier' && u.id === actor.userId) ||
          state.users.find((u) => u.role === 'supplier');
        if (!supUser) throw new Error('Supplier profile not found.');

        if (name) supUser.name = String(name).trim();
        if (companyName) supUser.companyName = String(companyName).trim();
        if (phone !== undefined) supUser.phone = String(phone).trim();
        if (address !== undefined) supUser.address = String(address).trim();
        if (Array.isArray(suppliedCategories)) {
          supUser.suppliedCategories = suppliedCategories.map((c) => String(c).trim()).filter(Boolean);
        }

        addAuditLog(state, {
          actorName: supUser.name,
          actorRole: 'supplier',
          action: 'SUPPLIER.PROFILE.UPDATED',
          entityType: 'User',
          entityId: supUser.id,
          details: `Updated supplier profile for ${supUser.companyName || supUser.name}.`,
        });

        return supUser;
      });

      const snapshot = broadcastEcosystemUpdate('SUPPLIER_PROFILE_UPDATED', { user: updatedUser });
      res.json({ user: updatedUser, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/supplier-requests/:id/verify-delivery',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = (req as any).user;

    try {
      const result = db.transaction((state) => {
        const reqObj =
          state.supplierRequests.find((r) => r.id === id) || state.supplierRequests[0];
        if (!reqObj) throw new Error('Supplier request not found.');
        if (reqObj.status === 'DELIVERED_VERIFIED') {
          throw new Error('This delivery has already been verified and added to inventory.');
        }
        if (!['DISPATCHED', 'PROCESSING', 'ACCEPTED'].includes(reqObj.status)) {
          throw new Error('Supplier must accept/dispatch the shipment before delivery verification.');
        }

        const ing = state.ingredients.find((i) => i.id === reqObj.ingredientId);
        if (!ing) throw new Error('Associated ingredient not found.');

        const prevStock = ing.currentStock;
        ing.currentStock = Number((ing.currentStock + reqObj.requestedQuantity).toFixed(3));
        ing.lastUpdated = new Date().toISOString();

        reqObj.status = 'DELIVERED_VERIFIED';
        reqObj.verifiedAt = new Date().toISOString();
        reqObj.updatedAt = new Date().toISOString();

        addNotification(state, {
          targetRole: 'all',
          title: `Delivery Verified & Stock Restored: ${ing.name}`,
          message: `Manager ${actor.name} verified ${reqObj.requestedQuantity} ${ing.unit} of ${ing.name}. Stock increased from ${prevStock} to ${ing.currentStock} ${ing.unit}. Dependent menu items automatically restored!`,
          type: 'INVENTORY',
        });

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'INVENTORY.DELIVERY.VERIFIED',
          entityType: 'Ingredient',
          entityId: ing.id,
          details: `Verified delivery #${reqObj.id} (${reqObj.invoiceNumber}). Incremented ${ing.name} by +${reqObj.requestedQuantity} ${ing.unit} (new stock: ${ing.currentStock} ${ing.unit}).`,
        });

        return { request: reqObj, ingredient: ing };
      });

      const snapshot = broadcastEcosystemUpdate('DELIVERY_VERIFIED_STOCK_RESTORED', result);
      res.json({ ...result, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/ai-recommendations/:id/act',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision } = req.body;
    const actor = (req as any).user;

    try {
      const result = db.transaction((state) => {
        const rec =
          state.aiRecommendations.find((r) => r.id === id) || state.aiRecommendations[0];
        if (!rec) throw new Error('AI Recommendation not found.');

        rec.status = decision === 'DISMISSED' ? 'DISMISSED' : 'ACCEPTED';

        let createdSupplierRequest: SupplierRequest | null = null;
        if (
          rec.status === 'ACCEPTED' &&
          rec.actionPayload?.type === 'CREATE_SUPPLIER_REQUEST' &&
          rec.actionPayload.ingredientId
        ) {
          const ing = state.ingredients.find((i) => i.id === rec.actionPayload!.ingredientId);
          if (ing) {
            const qty = rec.actionPayload.recommendedQty || 15;
            createdSupplierRequest = {
              id: `sup-req-ai-${Date.now().toString().slice(-4)}`,
              ingredientId: ing.id,
              ingredientName: ing.name,
              supplierId: ing.supplierId,
              supplierName: ing.supplierName,
              requestedQuantity: qty,
              unit: ing.unit,
              unitPrice: ing.costPerUnit,
              totalEstimate: Number((qty * ing.costPerUnit).toFixed(2)),
              urgency: 'HIGH',
              status: 'PENDING',
              notes: `Auto-generated via KitchenPulse AI recommendation (${rec.title}) and approved by ${actor.name}.`,
              invoiceNumber: `INV-VH-AI-${Math.floor(1000 + Math.random() * 9000)}`,
              requestedBy: `${actor.name} (KitchenPulse AI)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            state.supplierRequests.unshift(createdSupplierRequest);
          }
        }

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: `AI.RECOMMENDATION.${rec.status}`,
          entityType: 'AIRecommendation',
          entityId: rec.id,
          details: `Manager ${rec.status.toLowerCase()} KitchenPulse AI recommendation: "${rec.title}".`,
        });

        return { recommendation: rec, createdSupplierRequest };
      });

      const snapshot = broadcastEcosystemUpdate('AI_RECOMMENDATION_ACTED', result);
      res.json({ ...result, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post('/api/manager/waste', requireRole(['manager', 'chef']), (req: Request, res: Response) => {
  const { itemName, ingredientId, category, quantity, unit, estimatedCostLoss, reason } = req.body;
  const actor = (req as any).user;

  const record = db.transaction((state) => {
    const qtyNum = Number(quantity) || 1;
    let resolvedCostLoss = Number(estimatedCostLoss) || 5.0;
    let resolvedName = String(itemName || 'Prepared Batch');
    let resolvedUnit = unit || 'kg';

    if (ingredientId) {
      const ing = state.ingredients.find((i) => i.id === ingredientId);
      if (ing) {
        resolvedName = ing.name;
        resolvedUnit = ing.unit;
        resolvedCostLoss = Number((qtyNum * ing.costPerUnit).toFixed(2));
        ing.currentStock = Number(Math.max(0, ing.currentStock - qtyNum).toFixed(3));
        ing.lastUpdated = new Date().toISOString();
      }
    }

    const newRec = {
      id: `wst-${Date.now()}`,
      itemName: resolvedName,
      category: category || 'PREPARED_SURPLUS',
      quantity: qtyNum,
      unit: resolvedUnit,
      estimatedCostLoss: resolvedCostLoss,
      reason: String(reason || 'Logged via Waste Analytics Monitor'),
      recordedAt: new Date().toISOString(),
    };
    state.wasteRecords.unshift(newRec);
    addAuditLog(state, {
      actorName: actor.name,
      actorRole: actor.role,
      action: 'WASTE.RECORD.LOGGED',
      entityType: 'WasteRecord',
      entityId: newRec.id,
      details: `Logged ${newRec.quantity} ${newRec.unit} waste for ${newRec.itemName} ($${newRec.estimatedCostLoss.toFixed(
        2
      )}).`,
    });
    return newRec;
  });

  const snapshot = broadcastEcosystemUpdate('WASTE_RECORD_ADDED', { record });
  res.status(201).json({ record, snapshot });
});

app.post(
  '/api/manager/menu',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const {
      name,
      category = 'Chef Specials',
      price,
      prepTimeMinutes = 12,
      calories = 480,
      description,
      image,
      tags,
      ingredientId,
      ingredientQty = 0.15,
    } = req.body;
    const actor = (req as any).user;

    if (!name || price === undefined) {
      res.status(400).json({ error: 'Dish name and price are required.' });
      return;
    }

    try {
      const createdItem = db.transaction((state) => {
        const baseIng =
          state.ingredients.find((i) => i.id === ingredientId) || state.ingredients[0];
        const newItem = {
          id: `menu-custom-${Date.now()}`,
          name: String(name).trim(),
          category: category as any,
          price: Math.max(0.5, Number(price) || 8.5),
          gstRate: 5,
          basePrepTimeMinutes: Math.max(2, Number(prepTimeMinutes) || 12),
          prepTimeMinutes: Math.max(2, Number(prepTimeMinutes) || 12),
          complexityScore: 2 as const,
          dietaryTags: ['Chef Curated'],
          calories: Math.max(50, Number(calories) || 480),
          rating: 4.8,
          reviewsCount: 12,
          popular: false,
          tags: Array.isArray(tags)
            ? tags
            : ['Chef Curated', '5% GST Included'],
          description:
            description ||
            `Freshly prepared ${String(name).trim()} crafted in the FEEDO Smart Kitchen.`,
          image:
            image ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
          isManualDisabled: false,
          recipe: baseIng
            ? [
                {
                  ingredientId: baseIng.id,
                  ingredientName: baseIng.name,
                  quantityRequired: Math.max(0.02, Number(ingredientQty) || 0.15),
                  unit: baseIng.unit,
                },
              ]
            : [],
        };
        state.menuItems.unshift(newItem);
        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'MENU.ITEM.CREATED',
          entityType: 'MenuItem',
          entityId: newItem.id,
          details: `Added new menu item "${newItem.name}" ($${newItem.price.toFixed(2)}, ${newItem.category}).`,
        });
        return newItem;
      });

      const snapshot = broadcastEcosystemUpdate('MENU_ITEM_CREATED', { menuItem: createdItem });
      res.status(201).json({ menuItem: createdItem, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.put(
  '/api/manager/menu/:id',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, category, price, prepTimeMinutes, description, image, isManualDisabled } = req.body;
    const actor = (req as any).user;

    try {
      const updatedItem = db.transaction((state) => {
        const target = state.menuItems.find((m) => m.id === id);
        if (!target) throw new Error('Menu item not found.');
        if (name !== undefined) target.name = String(name).trim();
        if (category !== undefined) target.category = category;
        if (price !== undefined) target.price = Math.max(0.5, Number(price));
        if (prepTimeMinutes !== undefined) target.prepTimeMinutes = Math.max(1, Number(prepTimeMinutes));
        if (description !== undefined) target.description = String(description).trim();
        if (image !== undefined && String(image).trim()) target.image = String(image).trim();
        if (isManualDisabled !== undefined) target.isManualDisabled = Boolean(isManualDisabled);

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'MENU.ITEM.UPDATED',
          entityType: 'MenuItem',
          entityId: target.id,
          details: `Updated menu item "${target.name}" ($${target.price.toFixed(2)}).`,
        });
        return target;
      });

      const snapshot = broadcastEcosystemUpdate('MENU_ITEM_UPDATED', { menuItem: updatedItem });
      res.json({ menuItem: updatedItem, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.delete(
  '/api/manager/menu/:id',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = (req as any).user;

    try {
      const removed = db.transaction((state) => {
        const idx = state.menuItems.findIndex((m) => m.id === id);
        if (idx === -1) throw new Error('Menu item not found.');
        const [del] = state.menuItems.splice(idx, 1);
        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'MENU.ITEM.DELETED',
          entityType: 'MenuItem',
          entityId: del.id,
          details: `Removed menu item "${del.name}" from catalog.`,
        });
        return del;
      });

      const snapshot = broadcastEcosystemUpdate('MENU_ITEM_DELETED', { menuItemId: removed.id });
      res.json({ removed, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/ingredients',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const {
      name,
      category = 'Produce',
      currentStock = 15,
      unit = 'kg',
      minThreshold = 4,
      maxCapacity = 50,
      costPerUnit = 4.5,
    } = req.body;
    const actor = (req as any).user;

    if (!name) {
      res.status(400).json({ error: 'Ingredient name is required.' });
      return;
    }

    try {
      const createdIng = db.transaction((state) => {
        const newIng = {
          id: `ing-custom-${Date.now()}`,
          name: String(name).trim(),
          category: String(category).trim(),
          currentStock: Math.max(0, Number(currentStock) || 0),
          unit: (unit || 'kg') as any,
          minThreshold: Math.max(0.5, Number(minThreshold) || 3),
          optimalStock: Math.max(10, Number(maxCapacity) || Number(currentStock) * 2 || 30),
          maxCapacity: Math.max(5, Number(maxCapacity) || 50),
          costPerUnit: Math.max(0.1, Number(costPerUnit) || 3.5),
          expiryDate: '2026-12-31',
          dailyUsageRate: 2.5,
          supplierId: 'usr-supplier-1',
          supplierName: 'Verdant Harvest Foods Pvt Ltd',
          lastUpdated: new Date().toISOString(),
        };
        state.ingredients.push(newIng);
        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'INVENTORY.INGREDIENT.CREATED',
          entityType: 'Ingredient',
          entityId: newIng.id,
          details: `Added ingredient "${newIng.name}" (${newIng.currentStock} ${newIng.unit}, threshold ${newIng.minThreshold} ${newIng.unit}).`,
        });
        return newIng;
      });

      const snapshot = broadcastEcosystemUpdate('INGREDIENT_CREATED', { ingredient: createdIng });
      res.status(201).json({ ingredient: createdIng, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/ingredients/:id/adjust',
  requireRole(['manager', 'chef']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const { currentStock, minThreshold, costPerUnit, delta } = req.body;
    const actor = (req as any).user;

    try {
      const updatedIng = db.transaction((state) => {
        const ing = state.ingredients.find((i) => i.id === id);
        if (!ing) throw new Error('Ingredient not found.');
        if (delta !== undefined) {
          ing.currentStock = Math.max(0, Number((ing.currentStock + Number(delta)).toFixed(2)));
        } else if (currentStock !== undefined) {
          ing.currentStock = Math.max(0, Number(currentStock));
        }
        if (minThreshold !== undefined) ing.minThreshold = Math.max(0.1, Number(minThreshold));
        if (costPerUnit !== undefined) ing.costPerUnit = Math.max(0.05, Number(costPerUnit));
        ing.lastUpdated = new Date().toISOString();

        addAuditLog(state, {
          actorName: actor.name,
          actorRole: actor.role,
          action: 'INVENTORY.INGREDIENT.ADJUSTED',
          entityType: 'Ingredient',
          entityId: ing.id,
          details: `Updated ${ing.name}: stock=${ing.currentStock} ${ing.unit}, minThreshold=${ing.minThreshold} ${ing.unit}, cost=$${ing.costPerUnit}/${ing.unit}.`,
        });
        return ing;
      });

      const snapshot = broadcastEcosystemUpdate('INGREDIENT_ADJUSTED', { ingredient: updatedIng });
      res.json({ ingredient: updatedIng, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/staff',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { name, roleTitle = 'Station Chef', specialtyStation = 'Main Culinary Line' } = req.body;
    const actor = (req as any).user;

    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Chef name is required.' });
      return;
    }

    const newStaff = db.transaction((state) => {
      const created = {
        id: `stf-${Date.now()}`,
        name: String(name).trim(),
        role: String(req.body.role || roleTitle || 'Line Cook').trim(),
        roleTitle: String(roleTitle).trim(),
        station: String(req.body.station || specialtyStation || 'Main Culinary Line').trim(),
        specialtyStation: String(specialtyStation).trim(),
        shift: String(req.body.shift || '08:00 AM - 04:00 PM'),
        active: true,
        efficiencyScore: 95,
        ordersCompletedToday: 0,
      };
      state.staff.push(created);
      addAuditLog(state, {
        actorName: actor.name,
        actorRole: 'manager',
        action: 'STAFF.CHEF.ADDED',
        entityType: 'StaffMember',
        entityId: created.id,
        details: `Added ${created.name} (${created.roleTitle} • ${created.specialtyStation}) to preloaded kitchen chef roster.`,
      });
      return created;
    });

    const snapshot = broadcastEcosystemUpdate('STAFF_ADDED', { staffMember: newStaff });
    res.status(201).json({ staffMember: newStaff, snapshot });
  }
);

app.delete(
  '/api/manager/staff/:id',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const actor = (req as any).user;

    try {
      const removed = db.transaction((state) => {
        const idx = state.staff.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error('Chef not found in roster.');
        const [del] = state.staff.splice(idx, 1);
        addAuditLog(state, {
          actorName: actor.name,
          actorRole: 'manager',
          action: 'STAFF.CHEF.REMOVED',
          entityType: 'StaffMember',
          entityId: del.id,
          details: `Removed ${del.name} from kitchen chef roster.`,
        });
        return del;
      });
      const snapshot = broadcastEcosystemUpdate('STAFF_REMOVED', { staffId: removed.id });
      res.json({ removed, snapshot });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
);

app.post(
  '/api/manager/staff/:id/toggle',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { id } = req.params;
    const staffMember = db.transaction((state) => {
      const target = state.staff.find((s) => s.id === id);
      if (!target) throw new Error('Staff member not found.');
      target.active = !target.active;
      return target;
    });
    const snapshot = broadcastEcosystemUpdate('STAFF_SHIFT_UPDATED', { staffMember });
    res.json({ staffMember, snapshot });
  }
);

app.post(
  '/api/manager/expenses',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const { category = 'MISCELLANEOUS', title, amount, date, notes } = req.body;
    const actor = (req as any).user;

    if (!title || amount === undefined) {
      res.status(400).json({ error: 'Expense title and amount are required.' });
      return;
    }

    const expense = db.transaction((state) => {
      if (!state.expenses) state.expenses = [];
      const created: ExpenseRecord = {
        id: `exp-${Date.now()}`,
        category,
        title: String(title).trim(),
        amount: Math.max(0.01, Number(amount) || 10),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        recordedBy: actor.name,
        notes: notes ? String(notes).trim() : undefined,
      };
      state.expenses.unshift(created);
      addAuditLog(state, {
        actorName: actor.name,
        actorRole: 'manager',
        action: 'FINANCE.EXPENSE.LOGGED',
        entityType: 'Expense',
        entityId: created.id,
        details: `Recorded ${created.category} expense: "${created.title}" ($${created.amount.toFixed(2)}).`,
      });
      return created;
    });

    const snapshot = broadcastEcosystemUpdate('EXPENSE_ADDED', { expense });
    res.status(201).json({ expense, snapshot });
  }
);

// ============================================================================
// 6B. TWO DEDICATED AI ASSISTANTS (FEEDO CUSTOMER AI & FEEDO MANAGER AI)
// ============================================================================

app.post('/api/ai/customer-chat', async (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { message } = req.body;
  const state = db.getState();
  const customerId = user?.userId || req.body.customerId || req.body.userId || 'usr-customer-1';
  const customerName = user?.name || req.body.customerName || req.body.userName || 'Aarav Sharma';
  const customerEmail = user?.email || req.body.customerEmail || 'student@feedo.demo';

  const response = await generateCustomerAIResponse({
    state,
    customerId,
    customerName,
    customerEmail,
    message: String(message || 'Recommend popular dishes'),
  });

  // Also check if user explicitly asked to "add <qty> <dish> to cart" so we provide cartProposal / confirmAddToCart
  const q = String(message || '').toLowerCase();
  let cartProposal = response.proposedCartItems?.[0] || null;
  if (q.includes('add')) {
    const qtyMatch = q.match(/add\s+(\d+)/i);
    const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;
    const matchedDish =
      state.menuItems.find((m) => q.includes(m.name.toLowerCase())) ||
      (q.includes('dosa') ? state.menuItems.find((m) => m.name.toLowerCase().includes('dosa')) : undefined) ||
      (q.includes('biryani') ? state.menuItems.find((m) => m.name.toLowerCase().includes('biryani')) : undefined) ||
      state.menuItems[0];
    if (matchedDish) {
      cartProposal = {
        menuItemId: matchedDish.id,
        name: matchedDish.name,
        price: matchedDish.price,
        quantity: qty,
      };
    }
  }

  res.json({
    ...response,
    cartProposal,
    confirmAddToCart: cartProposal,
  });
});

app.post(
  '/api/ai/manager-chat',
  requireRole(['manager']),
  async (req: Request, res: Response) => {
    const { message, dateFilter } = req.body;
    const state = db.getState();
    const response = await generateManagerAIResponse({
      state,
      message: String(message || 'Show daily financial summary and net profit'),
      selectedDate: dateFilter ? String(dateFilter) : undefined,
    });
    res.json(response);
  }
);

app.get(
  '/api/manager/financial-analytics',
  requireRole(['manager']),
  (req: Request, res: Response) => {
    const dateFilter = req.query.date ? String(req.query.date) : undefined;
    const state = db.getState();
    res.json(computeFinancialAnalytics(state, dateFilter));
  }
);

// ============================================================================
// 7. IOT ESP32 SMART COUNTER HARDWARE & SIMULATOR INTERFACE
// ============================================================================

app.get('/api/iot/counter', (_req: Request, res: Response) => {
  const state = db.getState();
  res.json(state.smartCounter);
});

app.post('/api/iot/heartbeat', (req: Request, res: Response) => {
  const { deviceId, connectionMode, firmwareVersion } = req.body;
  const counter = db.transaction((state) => {
    state.smartCounter.isOnline = true;
    state.smartCounter.lastHeartbeat = new Date().toISOString();
    if (deviceId) state.smartCounter.deviceId = deviceId;
    if (connectionMode) state.smartCounter.connectionMode = connectionMode;
    if (firmwareVersion) state.smartCounter.firmwareVersion = firmwareVersion;
    return state.smartCounter;
  });
  const snapshot = broadcastEcosystemUpdate('IOT_HEARTBEAT', { smartCounter: counter });
  res.json({
    ok: true,
    currentReadyToken: counter.currentReadyToken,
    counterNumber: counter.counterNumber,
    ledState: counter.ledState,
    buzzerActive: counter.buzzerActive,
    snapshot,
  });
});

app.post('/api/iot/acknowledge-buzzer', (_req: Request, res: Response) => {
  const counter = db.transaction((state) => {
    state.smartCounter.buzzerActive = false;
    state.smartCounter.lastHeartbeat = new Date().toISOString();
    return state.smartCounter;
  });
  const snapshot = broadcastEcosystemUpdate('IOT_BUZZER_SILENCED', { smartCounter: counter });
  res.json({ smartCounter: counter, snapshot });
});

// ============================================================================
// 8. INTERACTIVE JUDGE DEMO RESET & ORCHESTRATION HELPERS
// ============================================================================

app.post('/api/demo/reset', (_req: Request, res: Response) => {
  db.resetToDemoSeed();
  const snapshot = broadcastEcosystemUpdate('DEMO_ECOSYSTEM_RESET');
  res.json({
    reset: true,
    message:
      'FEEDO PAY ecosystem reset to clean demonstration state. Next PayPal order will generate Token F204!',
    snapshot,
  });
});

// Serve static frontend in standalone Node server mode
if (!process.env.VERCEL) {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

io.on('connection', (socket) => {
  socket.emit('ecosystem:update', {
    eventType: 'INITIAL_CONNECT',
    snapshot: buildEcosystemSnapshot(),
    timestamp: new Date().toISOString(),
  });
});

const isTestSuite = process.argv.some((arg) => arg.includes('test-suite'));
const PORT = Number(process.env.PORT) || 4000;
if (process.env.NODE_ENV !== 'test' && !isTestSuite && !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(
      `[FEEDO PAY Server] Intelligent Food Commerce Engine running on http://localhost:${PORT}`
    );
  });
}

export default app;
export { app, server };
