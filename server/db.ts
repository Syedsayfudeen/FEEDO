import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  User,
  MenuItem,
  Ingredient,
  Order,
  PaymentRecord,
  RefundRecord,
  RestaurantTable,
  TableReservation,
  SupplierRequest,
  WasteRecord,
  AIRecommendation,
  SmartCounterState,
  NotificationItem,
  AuditLog,
  StaffMember,
  ExpenseRecord,
  WaitingQueueEntry,
} from '../shared/types.ts';

export interface DatabaseSchema {
  users: User[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  orders: Order[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  tables: RestaurantTable[];
  reservations: TableReservation[];
  waitingQueue: WaitingQueueEntry[];
  supplierRequests: SupplierRequest[];
  wasteRecords: WasteRecord[];
  expenses: ExpenseRecord[];
  aiRecommendations: AIRecommendation[];
  smartCounter: SmartCounterState;
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  staff: StaffMember[];
  tokenSequence: number;
  idempotencyKeys: Record<string, { orderId: string; status: string; timestamp: string }>;
}

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'feedo-pay-data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'feedo-db.json');

export function getInitialSeedData(): DatabaseSchema {
  const now = new Date();
  const iso = (minutesOffset: number) => new Date(now.getTime() + minutesOffset * 60000).toISOString();

  const users: User[] = [
    {
      id: 'usr-customer-1',
      email: 'student@feedo.demo',
      name: 'Aarav Sharma',
      role: 'customer',
      department: 'Computer Science & Engineering • Year 3',
      createdAt: iso(-10080),
    },
    {
      id: 'usr-chef-1',
      email: 'chef@feedo.demo',
      name: 'Kitchen Staff Monitor (Common Login)',
      role: 'chef',
      department: 'Central Kitchen Display System (KDS)',
      createdAt: iso(-20160),
    },
    {
      id: 'usr-manager-1',
      email: 'manager@feedo.demo',
      name: 'Meera Krishnan',
      role: 'manager',
      department: 'Campus Dining & Operations Director',
      createdAt: iso(-40320),
    },
    {
      id: 'usr-supplier-1',
      email: 'supplier@feedo.demo',
      name: 'Rohan Deshmukh',
      role: 'supplier',
      companyName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      phone: '+1 (555) 234-8910',
      address: 'Plot 42, Green Valley Cold-Chain Park, Sector 9',
      productsSupplied: [
        'Aged Royal Basmati Rice',
        'Free-Range Farm Chicken Cuts',
        'Artisanal Malai Paneer',
        'Stone-Ground Fermented Dosa Batter',
        'Hass Ripe Avocados',
      ],
      createdAt: iso(-30240),
    },
  ];

  const ingredients: Ingredient[] = [
    {
      id: 'ing-basmati',
      name: 'Aged Royal Basmati Rice',
      category: 'Grains & Staples',
      currentStock: 18.5,
      minThreshold: 8.0,
      optimalStock: 35.0,
      unit: 'kg',
      costPerUnit: 2.8,
      expiryDate: iso(43200),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 9.2,
      lastUpdated: iso(-60),
    },
    {
      id: 'ing-chicken',
      name: 'Free-Range Farm Chicken Cuts',
      category: 'Proteins',
      currentStock: 6.4, // Close to threshold so demo orders can trigger low stock alert!
      minThreshold: 6.0,
      optimalStock: 25.0,
      unit: 'kg',
      costPerUnit: 6.5,
      expiryDate: iso(2880),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 8.5,
      lastUpdated: iso(-45),
    },
    {
      id: 'ing-paneer',
      name: 'Artisanal Malai Paneer',
      category: 'Dairy & Proteins',
      currentStock: 4.2,
      minThreshold: 5.0, // Already low stock for demonstration!
      optimalStock: 18.0,
      unit: 'kg',
      costPerUnit: 7.2,
      expiryDate: iso(4320),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 5.4,
      lastUpdated: iso(-120),
    },
    {
      id: 'ing-dosa-batter',
      name: 'Stone-Ground Fermented Dosa Batter',
      category: 'Fresh Batters',
      currentStock: 14.0,
      minThreshold: 5.0,
      optimalStock: 24.0,
      unit: 'L',
      costPerUnit: 1.9,
      expiryDate: iso(1440),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 7.8,
      lastUpdated: iso(-180),
    },
    {
      id: 'ing-sourdough',
      name: 'Multigrain Artisan Sourdough Loaf',
      category: 'Bakery',
      currentStock: 22.0,
      minThreshold: 8.0,
      optimalStock: 30.0,
      unit: 'loaves',
      costPerUnit: 2.1,
      expiryDate: iso(2160),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 6.0,
      lastUpdated: iso(-90),
    },
    {
      id: 'ing-valencia-orange',
      name: 'Cold-Pressed Valencia Oranges',
      category: 'Fresh Produce',
      currentStock: 16.0,
      minThreshold: 6.0,
      optimalStock: 30.0,
      unit: 'kg',
      costPerUnit: 2.4,
      expiryDate: iso(5760),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 6.5,
      lastUpdated: iso(-150),
    },
    {
      id: 'ing-saffron-spice',
      name: 'Kashmiri Saffron & Whole Garam Masala',
      category: 'Spices & Aromatics',
      currentStock: 3.5,
      minThreshold: 1.0,
      optimalStock: 5.0,
      unit: 'kg',
      costPerUnit: 18.0,
      expiryDate: iso(86400),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 0.4,
      lastUpdated: iso(-300),
    },
    {
      id: 'ing-avocado',
      name: 'Hass Ripe Avocados',
      category: 'Fresh Produce',
      currentStock: 0.1, // Insufficient stock so one specialty item demonstrates automatic Ingredient-to-Menu disabling!
      minThreshold: 3.0,
      optimalStock: 12.0,
      unit: 'kg',
      costPerUnit: 8.5,
      expiryDate: iso(2880),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 2.5,
      lastUpdated: iso(-200),
    },
    {
      id: 'ing-dark-chocolate',
      name: 'Single-Origin 70% Dark Couverture',
      category: 'Confectionery',
      currentStock: 7.5,
      minThreshold: 2.5,
      optimalStock: 12.0,
      unit: 'kg',
      costPerUnit: 11.0,
      expiryDate: iso(43200),
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      dailyUsageRate: 1.8,
      lastUpdated: iso(-400),
    },
  ];

  const menuItems: MenuItem[] = [
    {
      id: 'menu-chicken-biryani',
      name: 'Chicken Biryani',
      category: 'Main Course',
      description: 'Slow-cooked Dum Pukht long-grain basmati layered with saffron-marinated farm chicken, caramelized shallots, mint raita, and heirloom salan.',
      price: 8.50,
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 10,
      complexityScore: 4,
      dietaryTags: ['High Protein', 'Chef Signature', 'Halal'],
      calories: 680,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-basmati', ingredientName: 'Aged Royal Basmati Rice', quantityRequired: 0.25, unit: 'kg' },
        { ingredientId: 'ing-chicken', ingredientName: 'Free-Range Farm Chicken Cuts', quantityRequired: 0.30, unit: 'kg' },
        { ingredientId: 'ing-saffron-spice', ingredientName: 'Kashmiri Saffron & Whole Garam Masala', quantityRequired: 0.02, unit: 'kg' },
      ],
    },
    {
      id: 'menu-veg-meals',
      name: 'Veg Meals',
      category: 'Main Course',
      description: 'Complete royal South Indian thali with steamed basmati rice, aromatic sambar, garlic rasam, seasonal poriyal, kootu, papadum, and payasam.',
      price: 6.50,
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 7,
      complexityScore: 2,
      dietaryTags: ['Vegetarian', 'Balanced Thali', 'Fiber Rich'],
      calories: 590,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-basmati', ingredientName: 'Aged Royal Basmati Rice', quantityRequired: 0.25, unit: 'kg' },
        { ingredientId: 'ing-saffron-spice', ingredientName: 'Kashmiri Saffron & Whole Garam Masala', quantityRequired: 0.015, unit: 'kg' },
      ],
    },
    {
      id: 'menu-paneer-rice',
      name: 'Paneer Rice',
      category: 'Main Course',
      description: 'Char-grilled malai paneer tikka cubes tossed with fragrant herb-infused basmati pulao, roasted cashews, and smoky bell peppers.',
      price: 7.75,
      image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 9,
      complexityScore: 3,
      dietaryTags: ['Vegetarian', 'High Protein', 'Gluten-Free'],
      calories: 640,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-basmati', ingredientName: 'Aged Royal Basmati Rice', quantityRequired: 0.22, unit: 'kg' },
        { ingredientId: 'ing-paneer', ingredientName: 'Artisanal Malai Paneer', quantityRequired: 0.20, unit: 'kg' },
        { ingredientId: 'ing-saffron-spice', ingredientName: 'Kashmiri Saffron & Whole Garam Masala', quantityRequired: 0.015, unit: 'kg' },
      ],
    },
    {
      id: 'menu-dosa',
      name: 'Dosa',
      category: 'Breakfast',
      description: 'Golden crispy ghee-roasted Mysore masala crepe crafted from 18-hour stone-ground batter, served with coconut chutney and tiffin sambar.',
      price: 5.25,
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 6,
      complexityScore: 2,
      dietaryTags: ['Vegetarian', 'Probiotic Fermented', 'Quick Serve'],
      calories: 420,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-dosa-batter', ingredientName: 'Stone-Ground Fermented Dosa Batter', quantityRequired: 0.25, unit: 'L' },
        { ingredientId: 'ing-saffron-spice', ingredientName: 'Kashmiri Saffron & Whole Garam Masala', quantityRequired: 0.01, unit: 'kg' },
      ],
    },
    {
      id: 'menu-sandwich',
      name: 'Sandwich',
      category: 'Snacks',
      description: 'Toasted multigrain artisan sourdough club layered with herb-marinated paneer, heirloom tomatoes, English cheddar, and basil pesto aioli.',
      price: 5.75,
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 5,
      complexityScore: 1,
      dietaryTags: ['Vegetarian', 'Artisan Bakery'],
      calories: 460,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-sourdough', ingredientName: 'Multigrain Artisan Sourdough Loaf', quantityRequired: 0.25, unit: 'loaves' },
        { ingredientId: 'ing-paneer', ingredientName: 'Artisanal Malai Paneer', quantityRequired: 0.10, unit: 'kg' },
      ],
    },
    {
      id: 'menu-fresh-juice',
      name: 'Fresh Juice',
      category: 'Beverages',
      description: '100% raw cold-pressed Valencia orange elixir infused with Himalayan pink salt, fresh mint leaves, and zero added refined sugar.',
      price: 4.00,
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 3,
      complexityScore: 1,
      dietaryTags: ['Vegan', 'Cold-Pressed', 'Zero Added Sugar'],
      calories: 140,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-valencia-orange', ingredientName: 'Cold-Pressed Valencia Oranges', quantityRequired: 0.40, unit: 'kg' },
      ],
    },
    {
      id: 'menu-choc-torte',
      name: 'Warm Hazelnut Chocolate Fondant',
      category: 'Desserts',
      description: '70% single-origin dark chocolate molten lava cake with roasted Piedmont hazelnut praline and Madagascar vanilla bean cream.',
      price: 6.25,
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 8,
      complexityScore: 3,
      dietaryTags: ['Vegetarian', 'Chef Dessert'],
      calories: 510,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-dark-chocolate', ingredientName: 'Single-Origin 70% Dark Couverture', quantityRequired: 0.12, unit: 'kg' },
      ],
    },
    {
      id: 'menu-avocado-toast',
      name: 'Smashed Hass Avocado Tartine',
      category: 'Breakfast',
      description: 'Poached organic farm egg & smashed Hass avocado on toasted sourdough with Aleppo chili flakes and micro-greens.',
      price: 7.25,
      image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&w=900&q=80',
      basePrepTimeMinutes: 6,
      complexityScore: 2,
      dietaryTags: ['Vegetarian', 'Omega-3 Rich'],
      calories: 380,
      isManualDisabled: false,
      recipe: [
        { ingredientId: 'ing-sourdough', ingredientName: 'Multigrain Artisan Sourdough Loaf', quantityRequired: 0.2, unit: 'loaves' },
        { ingredientId: 'ing-avocado', ingredientName: 'Hass Ripe Avocados', quantityRequired: 0.25, unit: 'kg' },
      ],
    },
  ];

  const tables: RestaurantTable[] = Array.from({ length: 16 }, (_, idx) => {
    const num = idx + 1;
    const zones: RestaurantTable['zone'][] = ['Main Dining', 'Window Lounge', 'Express Counter', 'Garden Patio'];
    const zone = zones[idx % zones.length];
    const capacity = num % 4 === 0 ? 6 : num % 2 === 0 ? 4 : 2;

    if (num === 4) {
      return {
        id: `tbl-${num}`,
        tableNumber: num,
        capacity,
        zone,
        status: 'OCCUPIED',
        currentCustomerName: 'Priya Menon',
        activeOrderToken: 'F201',
      };
    }
    if (num === 7) {
      return {
        id: `tbl-${num}`,
        tableNumber: num,
        capacity,
        zone,
        status: 'OCCUPIED',
        currentCustomerName: 'Karthik Rajan',
        activeOrderToken: 'F202',
      };
    }
    if (num === 9) {
      return {
        id: `tbl-${num}`,
        tableNumber: num,
        capacity,
        zone,
        status: 'OCCUPIED',
        currentCustomerName: 'Diya Chatterjee',
        activeOrderToken: 'F203',
      };
    }
    // Note: Table 12 is guaranteed AVAILABLE for the Live Demo!
    return {
      id: `tbl-${num}`,
      tableNumber: num,
      capacity,
      zone,
      status: 'AVAILABLE',
    };
  });

  const orders: Order[] = [
    {
      id: 'ord-seed-200',
      tokenNumber: 'F200',
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
      customerEmail: 'student@feedo.demo',
      orderType: 'DINE_IN',
      tableNumber: 2,
      assignedChefId: 'stf-2',
      assignedChefName: 'Chef Ananya Rao',
      paymentMethodUsed: 'PayPal Account',
      items: [
        {
          id: 'oi-200-1',
          menuItemId: 'menu-dosa',
          name: 'Dosa',
          price: 5.25,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'oi-200-2',
          menuItemId: 'menu-fresh-juice',
          name: 'Fresh Juice',
          price: 4.00,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80',
        },
      ],
      subtotal: 9.25,
      tax: 0.46,
      totalAmount: 9.71,
      currency: 'USD',
      status: 'COMPLETED',
      paymentStatus: 'CAPTURED',
      paymentMode: 'PAYPAL_SANDBOX',
      paypalOrderId: '8XY19283746500200',
      paypalCaptureId: '3AB99887766554200',
      estimatedPrepMinutes: 8,
      prepExplanation: 'Base prep 6m + 2m low morning queue factor (3 active chefs).',
      priorityScore: 74,
      priorityReason: 'Standard morning breakfast cadence',
      batchGroupKey: 'BATCH-GRIDDLE',
      counterNumber: 1,
      createdAt: iso(-95),
      confirmedAt: iso(-94),
      acceptedAt: iso(-93),
      preparingAt: iso(-91),
      readyAt: iso(-84),
      completedAt: iso(-80),
      rating: 5,
      feedback: 'Instant PayPal checkout and the Smart Counter called my token right on time!',
      feedbackDetails: {
        foodQuality: 5,
        prepTime: 5,
        serviceQuality: 5,
        overallExperience: 5,
        comment: 'Instant PayPal checkout and the Smart Counter called my token right on time!',
        submittedAt: iso(-75),
      },
    },
    {
      id: 'ord-seed-201',
      tokenNumber: 'F201',
      customerId: 'usr-customer-ext-1',
      customerName: 'Priya Menon',
      customerEmail: 'priya.m@campus.edu',
      orderType: 'TAKEAWAY',
      assignedChefId: 'stf-3',
      assignedChefName: 'Chef Kabir Siddiqui',
      paymentMethodUsed: 'Debit / Credit Card (PayPal)',
      items: [
        {
          id: 'oi-201-1',
          menuItemId: 'menu-paneer-rice',
          name: 'Paneer Rice',
          price: 7.75,
          quantity: 2,
          image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80',
        },
      ],
      subtotal: 15.50,
      tax: 0.78,
      totalAmount: 16.28,
      currency: 'USD',
      status: 'READY_FOR_COLLECTION',
      paymentStatus: 'CAPTURED',
      paymentMode: 'PAYPAL_SANDBOX',
      paypalOrderId: '9KL44556677880201',
      paypalCaptureId: '7CP11223344550201',
      estimatedPrepMinutes: 11,
      prepExplanation: 'Base prep 9m + 2m batching adjustment (2x Paneer Rice combined on Wok Station 1).',
      priorityScore: 92,
      priorityReason: 'High priority: Ready for counter collection at Counter 1',
      batchGroupKey: 'BATCH-RICE-BOWL',
      counterNumber: 1,
      createdAt: iso(-18),
      confirmedAt: iso(-17),
      acceptedAt: iso(-15),
      preparingAt: iso(-12),
      readyAt: iso(-2),
    },
    {
      id: 'ord-seed-202',
      tokenNumber: 'F202',
      customerId: 'usr-customer-ext-2',
      customerName: 'Karthik Rajan',
      customerEmail: 'karthik.r@campus.edu',
      orderType: 'DINE_IN',
      tableNumber: 7,
      assignedChefId: 'stf-1',
      assignedChefName: 'Chef Vikramaditya Nair',
      paymentMethodUsed: 'PayPal Account',
      items: [
        {
          id: 'oi-202-1',
          menuItemId: 'menu-chicken-biryani',
          name: 'Chicken Biryani',
          price: 8.50,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'oi-202-2',
          menuItemId: 'menu-fresh-juice',
          name: 'Fresh Juice',
          price: 4.00,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=900&q=80',
        },
      ],
      subtotal: 12.50,
      tax: 0.63,
      totalAmount: 13.13,
      currency: 'USD',
      status: 'PREPARING',
      paymentStatus: 'CAPTURED',
      paymentMode: 'PAYPAL_SANDBOX',
      paypalOrderId: '4MN88990011220202',
      paypalCaptureId: '2CAP5566778890202',
      specialInstructions: 'Extra mint raita on the side please',
      estimatedPrepMinutes: 12,
      prepExplanation: 'Base prep 10m + 2m active kitchen load factor (2 concurrent main courses).',
      priorityScore: 86,
      priorityReason: 'Elevated priority: Main course in active Dum assembly + 9 mins elapsed wait',
      batchGroupKey: 'BATCH-DUM-BIRYANI',
      counterNumber: 2,
      createdAt: iso(-9),
      confirmedAt: iso(-8),
      acceptedAt: iso(-7),
      preparingAt: iso(-5),
    },
    {
      id: 'ord-seed-203',
      tokenNumber: 'F203',
      customerId: 'usr-customer-ext-3',
      customerName: 'Diya Chatterjee',
      customerEmail: 'diya.c@campus.edu',
      orderType: 'TAKEAWAY',
      paymentMethodUsed: 'PayPal Pay Later',
      items: [
        {
          id: 'oi-203-1',
          menuItemId: 'menu-veg-meals',
          name: 'Veg Meals',
          price: 6.50,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'oi-203-2',
          menuItemId: 'menu-sandwich',
          name: 'Sandwich',
          price: 5.75,
          quantity: 1,
          image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
        },
      ],
      subtotal: 12.25,
      tax: 0.61,
      totalAmount: 12.86,
      currency: 'USD',
      status: 'CONFIRMED_INCOMING',
      paymentStatus: 'CAPTURED',
      paymentMode: 'PAYPAL_SANDBOX',
      paypalOrderId: '6PQ33445566770203',
      paypalCaptureId: '9CAP9900112230203',
      estimatedPrepMinutes: 10,
      prepExplanation: 'Base prep 7m + 3m queue load factor (1 preparing + 1 incoming order across 3 active chefs).',
      priorityScore: 79,
      priorityReason: 'Newly verified PayPal order queued for immediate station dispatch',
      batchGroupKey: 'BATCH-THALI-STATION',
      counterNumber: 2,
      createdAt: iso(-3),
      confirmedAt: iso(-2),
    },
  ];

  const payments: PaymentRecord[] = [
    {
      id: 'pay-seed-200',
      orderId: 'ord-seed-200',
      tokenNumber: 'F200',
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
      amount: 9.71,
      currency: 'USD',
      mode: 'PAYPAL_SANDBOX',
      paypalOrderId: '8XY19283746500200',
      paypalCaptureId: '3AB99887766554200',
      payerEmail: 'student@feedo.demo',
      payerName: 'Aarav Sharma',
      status: 'CAPTURED',
      idempotencyKey: 'idem-seed-200',
      webhookVerified: true,
      refundedAmount: 0,
      createdAt: iso(-94),
      updatedAt: iso(-94),
    },
    {
      id: 'pay-seed-201',
      orderId: 'ord-seed-201',
      tokenNumber: 'F201',
      customerId: 'usr-customer-ext-1',
      customerName: 'Priya Menon',
      amount: 16.28,
      currency: 'USD',
      mode: 'PAYPAL_SANDBOX',
      paypalOrderId: '9KL44556677880201',
      paypalCaptureId: '7CP11223344550201',
      payerEmail: 'priya.m@campus.edu',
      payerName: 'Priya Menon',
      status: 'CAPTURED',
      idempotencyKey: 'idem-seed-201',
      webhookVerified: true,
      refundedAmount: 0,
      createdAt: iso(-17),
      updatedAt: iso(-17),
    },
    {
      id: 'pay-seed-202',
      orderId: 'ord-seed-202',
      tokenNumber: 'F202',
      customerId: 'usr-customer-ext-2',
      customerName: 'Karthik Rajan',
      amount: 13.13,
      currency: 'USD',
      mode: 'PAYPAL_SANDBOX',
      paypalOrderId: '4MN88990011220202',
      paypalCaptureId: '2CAP5566778890202',
      payerEmail: 'karthik.r@campus.edu',
      payerName: 'Karthik Rajan',
      status: 'CAPTURED',
      idempotencyKey: 'idem-seed-202',
      webhookVerified: true,
      refundedAmount: 0,
      createdAt: iso(-8),
      updatedAt: iso(-8),
    },
    {
      id: 'pay-seed-203',
      orderId: 'ord-seed-203',
      tokenNumber: 'F203',
      customerId: 'usr-customer-ext-3',
      customerName: 'Diya Chatterjee',
      amount: 12.86,
      currency: 'USD',
      mode: 'PAYPAL_SANDBOX',
      paypalOrderId: '6PQ33445566770203',
      paypalCaptureId: '9CAP9900112230203',
      payerEmail: 'diya.c@campus.edu',
      payerName: 'Diya Chatterjee',
      status: 'CAPTURED',
      idempotencyKey: 'idem-seed-203',
      webhookVerified: true,
      refundedAmount: 0,
      createdAt: iso(-2),
      updatedAt: iso(-2),
    },
    {
      id: 'pay-seed-failed-1',
      orderId: 'ord-abandoned-199',
      tokenNumber: 'NONE',
      customerId: 'usr-customer-ext-4',
      customerName: 'Rohan Varma',
      amount: 17.00,
      currency: 'USD',
      mode: 'PAYPAL_SANDBOX',
      paypalOrderId: '1ERR9988221100199',
      payerEmail: 'rohan.v@campus.edu',
      payerName: 'Rohan Varma',
      status: 'FAILED',
      idempotencyKey: 'idem-seed-199',
      webhookVerified: true,
      refundedAmount: 0,
      failureReason: 'INSTRUMENT_DECLINED — PayPal buyer funding source declined; atomic inventory rollback preserved stock.',
      createdAt: iso(-45),
      updatedAt: iso(-44),
    },
  ];

  const supplierRequests: SupplierRequest[] = [
    {
      id: 'sup-req-101',
      ingredientId: 'ing-paneer',
      ingredientName: 'Artisanal Malai Paneer',
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      requestedQuantity: 12,
      unit: 'kg',
      unitPrice: 7.20,
      totalEstimate: 86.40,
      urgency: 'HIGH',
      status: 'DISPATCHED',
      notes: 'Refrigerated van #VH-09 en route; awaiting manager dock verification before stock increment.',
      invoiceNumber: 'INV-VH-2026-0891',
      requestedBy: 'Meera Krishnan',
      createdAt: iso(-180),
      updatedAt: iso(-25),
      dispatchedAt: iso(-25),
    },
    {
      id: 'sup-req-102',
      ingredientId: 'ing-avocado',
      ingredientName: 'Hass Ripe Avocados',
      supplierId: 'usr-supplier-1',
      supplierName: 'Verdant Harvest Agro & Cold-Chain Ltd.',
      requestedQuantity: 10,
      unit: 'kg',
      unitPrice: 8.50,
      totalEstimate: 85.00,
      urgency: 'CRITICAL',
      status: 'PENDING',
      notes: 'Auto-flagged by Ingredient-to-Menu Dependency Engine after Smashed Hass Avocado Tartine was disabled.',
      invoiceNumber: 'INV-VH-2026-0894',
      requestedBy: 'KitchenPulse AI / Meera Krishnan',
      createdAt: iso(-50),
      updatedAt: iso(-50),
    },
  ];

  const wasteRecords: WasteRecord[] = [
    {
      id: 'wst-1',
      itemName: 'Aged Royal Basmati Rice (Late Evening Batch)',
      category: 'PREPARED_SURPLUS',
      quantity: 2.4,
      unit: 'kg',
      estimatedCostLoss: 11.40,
      reason: 'Post-8PM dining footfall dropped 18% due to mid-semester lab schedule.',
      recordedAt: iso(-1100),
    },
    {
      id: 'wst-2',
      itemName: 'Stone-Ground Fermented Dosa Batter',
      category: 'EXPIRED_INGREDIENT',
      quantity: 1.8,
      unit: 'L',
      estimatedCostLoss: 5.90,
      reason: 'Fermentation window exceeded 24h optimum temperature threshold.',
      recordedAt: iso(-2400),
    },
    {
      id: 'wst-3',
      itemName: 'Multigrain Artisan Sourdough Loaf',
      category: 'PREPARED_SURPLUS',
      quantity: 1.5,
      unit: 'loaves',
      estimatedCostLoss: 4.50,
      reason: 'Unclaimed pre-prepared evening snack batch.',
      recordedAt: iso(-3600),
    },
  ];

  const aiRecommendations: AIRecommendation[] = [
    {
      id: 'ai-rec-1',
      category: 'WASTE_PREVENTION',
      title: 'Basmati Rice Batch Reduction for Tomorrow',
      detectedIssue: 'Evening rice surplus detected across the last 3 consecutive service windows (avg 2.1 kg/night unconsumed).',
      whyDetected: 'Historical order telemetry shows a 14.5% dip in post-7:00 PM rice bowl orders on mid-week academic days.',
      supportingData: 'Seeded 7-day order dataset: Evening demand averaged 34 portions vs 40 portions pre-steamed (15% surplus buffer).',
      suggestedAction: 'Rice consumption is expected to decrease tomorrow. Reduce the next purchase or evening steam batch quantity by 12% based on the available demonstration data.',
      estimatedImpact: 'Prevents ~2.2 kg daily grain waste (~$8.50–$11.40/day raw & prep cost mitigation in demo projection).',
      confidenceScore: 89,
      status: 'ACTIVE',
      actionPayload: {
        type: 'ADJUST_PREP_BATCH',
        ingredientId: 'ing-basmati',
        recommendedQty: 15,
      },
      createdAt: iso(-40),
    },
    {
      id: 'ai-rec-2',
      category: 'INVENTORY_OPTIMIZATION',
      title: 'Proactive Chicken Stock Replenishment Alert',
      detectedIssue: 'Free-Range Farm Chicken Cuts approaching minimum threshold (6.4 kg remaining vs 6.0 kg minimum).',
      whyDetected: 'Chicken Biryani accounts for 38% of lunch peak revenue (12:00 PM – 2:00 PM) and consumes 0.30 kg per order.',
      supportingData: 'At current velocity (8.5 kg/day), existing stock covers ~21 portions of Chicken Biryani before automatic menu lockout.',
      suggestedAction: 'Trigger an immediate 15 kg cold-chain replenishment request to Verdant Harvest Agro before the 1:00 PM peak surge.',
      estimatedImpact: 'Prevents automatic Ingredient-to-Menu stockout of Chicken Biryani during peak lunch window.',
      confidenceScore: 94,
      status: 'ACTIVE',
      actionPayload: {
        type: 'CREATE_SUPPLIER_REQUEST',
        ingredientId: 'ing-chicken',
        recommendedQty: 15,
      },
      createdAt: iso(-20),
    },
    {
      id: 'ai-rec-3',
      category: 'FOOD_RESCUE',
      title: 'Fermented Dosa Batter Safe-Window Utilization',
      detectedIssue: '14.0 L of Stone-Ground Fermented Dosa Batter in cold storage with 24 hours remaining until peak fermentation limit.',
      whyDetected: 'Expiry tracking engine flagged batch #DB-1109 expiring within the next 24-hour operational window.',
      supportingData: 'Current stock: 14.0 L (56 Dosa servings). Projected baseline evening demand: 38 servings.',
      suggestedAction: 'Highlight Ghee Roast Dosa as Chef Featured Tiffin Special during 4:30 PM – 6:30 PM snack window and reduce tomorrow morning batter grind by 4.0 L.',
      estimatedImpact: 'Utilizes 100% of safe-window batter while remaining strictly within food-safety storage limits.',
      confidenceScore: 86,
      status: 'ACTIVE',
      actionPayload: {
        type: 'SURPLUS_PORTION_CONTROL',
        ingredientId: 'ing-dosa-batter',
        recommendedQty: 10,
      },
      createdAt: iso(-15),
    },
  ];

  const smartCounter: SmartCounterState = {
    deviceId: 'ESP32-COUNTER-NODE-02',
    deviceName: 'FEEDO Smart Counter Display #2 (Main Dining Hall)',
    firmwareVersion: 'v2.4.1-esp32-oled',
    connectionMode: 'SIMULATED_BROWSER_DEVICE',
    isOnline: true,
    lastHeartbeat: iso(0),
    currentReadyToken: 'F201',
    counterNumber: 1,
    ledState: 'GREEN_PULSE',
    buzzerActive: false,
    recentCalls: [
      {
        tokenNumber: 'F201',
        counterNumber: 1,
        calledAt: iso(-2),
        customerName: 'Priya Menon',
        itemsSummary: '2x Paneer Rice',
        collected: false,
      },
      {
        tokenNumber: 'F200',
        counterNumber: 1,
        calledAt: iso(-84),
        customerName: 'Aarav Sharma',
        itemsSummary: '1x Dosa, 1x Fresh Juice',
        collected: true,
      },
    ],
  };

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      targetRole: 'chef',
      title: 'Verified PayPal Order #F203',
      message: 'Token F203 (1x Veg Meals, 1x Sandwich) payment captured via PayPal Sandbox. Ingredients reserved.',
      type: 'KITCHEN',
      read: false,
      createdAt: iso(-2),
    },
    {
      id: 'notif-2',
      targetRole: 'manager',
      title: 'Menu Item Auto-Disabled (Ingredient Shortage)',
      message: 'Smashed Hass Avocado Tartine was automatically disabled because Hass Ripe Avocados dropped to 0.1 kg (requires 0.25 kg).',
      type: 'INVENTORY',
      read: false,
      createdAt: iso(-50),
    },
    {
      id: 'notif-3',
      targetRole: 'supplier',
      title: 'Urgent Replenishment Request #sup-req-102',
      message: 'FEEDO Manager requested 10 kg of Hass Ripe Avocados (CRITICAL urgency).',
      type: 'SUPPLIER',
      read: false,
      createdAt: iso(-50),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      actorName: 'PayPal Webhook Engine',
      actorRole: 'system',
      action: 'PAYMENT.CAPTURE.COMPLETED',
      entityType: 'Payment',
      entityId: 'pay-seed-203',
      details: 'Verified PayPal capture 9CAP9900112230203 ($12.86 USD). Unlocked Token F203 and deducted recipe ingredients atomically.',
      timestamp: iso(-2),
    },
    {
      id: 'aud-2',
      actorName: 'PayPal Orders Engine',
      actorRole: 'system',
      action: 'PAYMENT.CAPTURE.DENIED',
      entityType: 'Payment',
      entityId: 'pay-seed-failed-1',
      details: 'Order 1ERR9988221100199 failed capture (INSTRUMENT_DECLINED). Zero inventory deducted; kitchen dispatch blocked.',
      timestamp: iso(-44),
    },
    {
      id: 'aud-3',
      actorName: 'Ingredient Dependency Engine',
      actorRole: 'system',
      action: 'MENU.ITEM.AUTO_DISABLED',
      entityType: 'MenuItem',
      entityId: 'menu-avocado-toast',
      details: 'Disabled Smashed Hass Avocado Tartine due to insufficient Hass Ripe Avocados (0.1 kg < 0.25 kg recipe requirement).',
      timestamp: iso(-50),
    },
  ];

  const staff: StaffMember[] = [
    {
      id: 'stf-1',
      name: 'Chef Vikramaditya Nair',
      role: 'Head Chef',
      shift: '08:00 AM – 04:00 PM',
      active: true,
      station: 'Dum & Main Course Command',
      ordersCompletedToday: 42,
    },
    {
      id: 'stf-2',
      name: 'Chef Ananya Rao',
      role: 'Sous Chef',
      shift: '09:00 AM – 05:00 PM',
      active: true,
      station: 'South Indian Griddle & Thali',
      ordersCompletedToday: 38,
    },
    {
      id: 'stf-3',
      name: 'Chef Kabir Siddiqui',
      role: 'Line Cook',
      shift: '10:00 AM – 06:00 PM',
      active: true,
      station: 'Artisan Bakery & Cold Press',
      ordersCompletedToday: 31,
    },
    {
      id: 'stf-4',
      name: 'Suresh Menon',
      role: 'Counter Specialist',
      shift: '08:00 AM – 04:00 PM',
      active: false,
      station: 'Smart Token Dispatch Counter 2',
      ordersCompletedToday: 19,
    },
  ];

  const expenses: ExpenseRecord[] = [
    {
      id: 'exp-1',
      title: 'Daily Fresh Produce & Dairy Procurement (Demonstration Data)',
      category: 'INGREDIENT_PROCUREMENT',
      amount: 14.50,
      date: iso(-180),
      recordedBy: 'Meera Krishnan',
      notes: 'Morning cold-chain batch from Verdant Harvest Agro',
    },
    {
      id: 'exp-2',
      title: 'Biodegradable Takeaway Containers & Cutlery',
      category: 'PACKAGING',
      amount: 4.20,
      date: iso(-240),
      recordedBy: 'Meera Krishnan',
      notes: 'Takeaway packaging allocation for today',
    },
    {
      id: 'exp-3',
      title: 'Kitchen Commercial Gas, Electricity & Water Allocation',
      category: 'UTILITIES_OPERATIONS',
      amount: 6.80,
      date: iso(-300),
      recordedBy: 'Meera Krishnan',
      notes: 'Daily prorated canteen utility expense',
    },
    {
      id: 'exp-4',
      title: 'Weekly Bulk Basmati & Spice Restock',
      category: 'INGREDIENT_PROCUREMENT',
      amount: 95.00,
      date: iso(-4320),
      recordedBy: 'Meera Krishnan',
      notes: 'Weekly staple inventory purchase',
    },
    {
      id: 'exp-5',
      title: 'Weekly Kitchen Staff & Line Cook Stipends',
      category: 'STAFF_WAGES',
      amount: 180.00,
      date: iso(-5760),
      recordedBy: 'Meera Krishnan',
      notes: 'Weekly culinary team shift allocation',
    },
    {
      id: 'exp-6',
      title: 'Monthly Espresso & Steam Boiler Maintenance',
      category: 'EQUIPMENT_MAINTENANCE',
      amount: 65.00,
      date: iso(-14400),
      recordedBy: 'Meera Krishnan',
      notes: 'Preventive kitchen station servicing',
    },
  ];

  const waitingQueue: WaitingQueueEntry[] = [
    {
      id: 'wq-1',
      customerId: 'usr-customer-ext-9',
      customerName: 'Siddharth Nair',
      guests: 4,
      preferredZone: 'Window Lounge',
      position: 1,
      estimatedWaitMinutes: 8,
      status: 'WAITING',
      joinedAt: iso(-6),
    },
  ];

  return {
    users,
    menuItems,
    ingredients,
    orders,
    payments,
    refunds: [],
    tables,
    reservations: [],
    waitingQueue,
    supplierRequests,
    wasteRecords,
    expenses,
    aiRecommendations,
    smartCounter,
    notifications,
    auditLogs,
    staff,
    // Set to 203 so the VERY NEXT order generated (e.g. in the Judge Live Demo!) gets token F204!
    tokenSequence: 203,
    idempotencyKeys: {},
  };
}

class DatabaseManager {
  private state: DatabaseSchema;
  private txLock: boolean = false;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const seed = getInitialSeedData();
        this.state = {
          ...seed,
          ...parsed,
          expenses: Array.isArray(parsed.expenses) && parsed.expenses.length > 0 ? parsed.expenses : seed.expenses,
          waitingQueue: Array.isArray(parsed.waitingQueue) ? parsed.waitingQueue : seed.waitingQueue,
        };
      } catch {
        this.state = getInitialSeedData();
        this.persist();
      }
    } else {
      this.state = getInitialSeedData();
      this.persist();
    }
  }

  public getState(): DatabaseSchema {
    return this.state;
  }

  public persist(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist DB state:', err);
    }
  }

  /**
   * Executes a synchronous atomic transaction with automatic rollback if an error is thrown.
   */
  public transaction<T>(fn: (db: DatabaseSchema) => T): T {
    if (this.txLock) {
      throw new Error('Concurrent transaction conflict detected. Please retry.');
    }
    this.txLock = true;
    const snapshot = JSON.stringify(this.state);
    try {
      const result = fn(this.state);
      this.persist();
      this.txLock = false;
      return result;
    } catch (err) {
      this.state = JSON.parse(snapshot);
      this.txLock = false;
      throw err;
    }
  }

  public resetToDemoSeed(): DatabaseSchema {
    this.state = getInitialSeedData();
    this.persist();
    return this.state;
  }
}

export const db = new DatabaseManager();
