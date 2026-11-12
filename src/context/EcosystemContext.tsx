import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  User,
  UserRole,
  MenuItem,
  Ingredient,
  Order,
  OrderType,
  PaymentRecord,
  RefundRecord,
  RestaurantTable,
  TableReservation,
  WaitingQueueEntry,
  SupplierRequest,
  WasteRecord,
  ExpenseRecord,
  AIRecommendation,
  SmartCounterState,
  NotificationItem,
  AuditLog,
  StaffMember,
} from '../../shared/types.ts';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export type ActiveView = 'landing' | 'customer' | 'chef' | 'manager' | 'supplier' | 'iot-counter';

export interface EcosystemSnapshot {
  users: User[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  orders: Order[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  tables: RestaurantTable[];
  reservations: TableReservation[];
  waitingQueue?: WaitingQueueEntry[];
  supplierRequests: SupplierRequest[];
  wasteRecords: WasteRecord[];
  expenses?: ExpenseRecord[];
  aiRecommendations: AIRecommendation[];
  smartCounter: SmartCounterState;
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  staff: StaffMember[];
  financialAnalytics?: any;
  intelligence: {
    engineName: string;
    methodologyNote: string;
    kitchenStatus: {
      activeOrdersCount: number;
      activeChefsCount: number;
      currentLoadIndex: number;
      intelligentBatches: {
        batchKey: string;
        stationName: string;
        dishName: string;
        totalQuantity: number;
        tokens: string[];
        estimatedTimeSavedMinutes: number;
      }[];
    };
    hourlyForecast: {
      hour: string;
      historicalAvg: number;
      predictedOrders: number;
      confidenceLow: number;
      confidenceHigh: number;
      window: string;
    }[];
    dishForecasts: {
      menuItemId: string;
      name: string;
      category: string;
      todayOrders: number;
      projectedTomorrow: number;
      confidencePct: number;
      maxServingsFromCurrentStock: number;
      stockRisk: 'OUT_OF_STOCK' | 'HIGH_RISK' | 'HEALTHY';
    }[];
    recommendations: AIRecommendation[];
    wasteSummary: {
      totalRecordedLossUsd: number;
      totalWasteKgOrLiters: number;
      records: WasteRecord[];
    };
  };
  paypalConfig: {
    isSandboxConfigured: boolean;
    mode: 'PAYPAL_SANDBOX' | 'PAYPAL_DEMO_SIMULATION';
    clientId: string | null;
    baseUrl: string;
    currency: string;
    supportedCurrencies: string[];
    webhookConfigured: boolean;
    sdkVersion: string;
  };
  metrics: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    paymentSuccessRate: number;
    activeKitchenOrders: number;
    readyOrdersCount: number;
    availableTablesCount: number;
    totalTablesCount: number;
    lowStockIngredientsCount: number;
    disabledMenuItemsCount: number;
  };
}

export const FALLBACK_FOOD_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#390715"/>
          <stop offset="100%" stop-color="#74142f"/>
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#bg)"/>
      <circle cx="400" cy="230" r="110" fill="none" stroke="#eab93e" stroke-width="5" stroke-dasharray="10 6"/>
      <circle cx="400" cy="230" r="80" fill="#5e1127" stroke="#f0a2b5" stroke-width="3"/>
      <text x="400" y="238" font-family="sans-serif" font-size="26" font-weight="bold" fill="#fdfaf6" text-anchor="middle">FEEDO CULINARY</text>
      <text x="400" y="390" font-family="monospace" font-size="18" fill="#fbe4e9" text-anchor="middle">FRESHLY PREPARED • INGREDIENT VERIFIED</text>
    </svg>`
  );

export function handleFoodImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  if (target.src !== FALLBACK_FOOD_SVG) {
    target.src = FALLBACK_FOOD_SVG;
  }
}

interface EcosystemContextValue {
  snapshot: EcosystemSnapshot | null;
  loading: boolean;
  socketConnected: boolean;
  currentUser: User | null;
  sessionToken: string | null;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  loginWithEmail: (email: string, password?: string) => Promise<User>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  logout: () => void;
  cart: CartItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  selectedTable: number | undefined;
  setSelectedTable: (tableNum: number | undefined) => void;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
  addToCart: (item: MenuItem, quantity?: number) => void;
  updateCartQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  receiptOrder: Order | null;
  setReceiptOrder: (order: Order | null) => void;
  isDemoActive: boolean;
  demoStep: number;
  demoHighlightOrderId: string | null;
  setDemoHighlightOrderId: (id: string | null) => void;
  startLiveDemo: () => Promise<void>;
  setDemoStep: (step: number) => void;
  closeLiveDemo: () => void;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  refreshState: () => Promise<void>;
  updateSnapshotDirectly: (nextSnapshot: EcosystemSnapshot) => void;
  toastMessage: { title: string; subtitle?: string; tone?: 'emerald' | 'gold' | 'red' } | null;
  showToast: (title: string, subtitle?: string, tone?: 'emerald' | 'gold' | 'red') => void;
}

const EcosystemContext = createContext<EcosystemContextValue | undefined>(undefined);

const DEMO_ROLE_EMAILS: Record<UserRole, string> = {
  customer: 'student@feedo.demo',
  chef: 'chef@feedo.demo',
  manager: 'manager@feedo.demo',
  supplier: 'supplier@feedo.demo',
};

export const EcosystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<EcosystemSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [socketConnected, setSocketConnected] = useState<boolean>(true);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeView, setActiveViewState] = useState<ActiveView>('landing');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderTypeState] = useState<OrderType>('DINE_IN');
  const [selectedTable, setSelectedTableState] = useState<number | undefined>(5);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const setOrderType = useCallback((type: OrderType) => {
    setOrderTypeState(type);
    if (type === 'TAKEAWAY') {
      setSelectedTableState(undefined);
    } else {
      setSelectedTableState((prev) => prev || 5);
    }
  }, []);

  const setSelectedTable = useCallback((tableNum: number | undefined) => {
    setSelectedTableState(tableNum);
    if (tableNum !== undefined) {
      setOrderTypeState('DINE_IN');
    }
  }, []);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);
  const [demoHighlightOrderId, setDemoHighlightOrderId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle?: string;
    tone?: 'emerald' | 'gold' | 'red';
  } | null>(null);

  const showToast = useCallback(
    (title: string, subtitle?: string, tone: 'emerald' | 'gold' | 'red' = 'emerald') => {
      setToastMessage({ title, subtitle, tone });
      setTimeout(() => {
        setToastMessage((prev) => (prev?.title === title ? null : prev));
      }, 4500);
    },
    []
  );

  const updateSnapshotDirectly = useCallback((nextSnapshot: EcosystemSnapshot) => {
    if (nextSnapshot && Array.isArray(nextSnapshot.menuItems)) {
      setSnapshot(nextSnapshot);
      setSocketConnected(true);
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = (await res.json()) as EcosystemSnapshot;
        setSnapshot(data);
        setSocketConnected(true);
        setCurrentUser((prev) => prev || data.users[0] || null);
      }
    } catch (err) {
      console.error('Failed to fetch ecosystem state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshState();

    // Only open persistent Socket.IO connection on localhost/127.0.0.1 so serverless hosts (Vercel) never log websocket errors
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isLocalhost) {
      setSocketConnected(true);
      return;
    }

    const socket: Socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on(
      'ecosystem:update',
      (data: { eventType: string; payload?: any; snapshot: EcosystemSnapshot }) => {
        if (data.snapshot) {
          setSnapshot(data.snapshot);
        }
        if (
          data.eventType === 'KITCHEN_ORDER_STATUS_CHANGED' &&
          data.payload?.status === 'READY_FOR_COLLECTION'
        ) {
          showToast(
            `NOW READY: Token ${data.payload.tokenNumber}`,
            'Smart Counter Display & LED Buzzer Activated!',
            'gold'
          );
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [refreshState, showToast]);

  const setActiveView = useCallback(
    (view: ActiveView) => {
      setActiveViewState(view);
      // Automatically align currentUser role when switching to a role-specific dashboard
      if (
        snapshot &&
        (view === 'customer' || view === 'chef' || view === 'manager' || view === 'supplier')
      ) {
        if (!currentUser || currentUser.role !== view) {
          const matched = snapshot.users.find((u) => u.role === view);
          if (matched) {
            setCurrentUser(matched);
          }
        }
      }
    },
    [snapshot, currentUser]
  );

  const apiFetch = useCallback(
    async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      // Infer required role from endpoint or active dashboard so demo actions never fail with 403
      let effectiveRole: UserRole = currentUser?.role || 'customer';
      if (
        path.startsWith('/api/manager/') ||
        path.startsWith('/api/ai/manager-chat') ||
        path.startsWith('/api/paypal/refund') ||
        path.startsWith('/api/paypal/configure-runtime')
      ) {
        effectiveRole = 'manager';
      } else if (path.startsWith('/api/kitchen/')) {
        effectiveRole = currentUser?.role === 'manager' ? 'manager' : 'chef';
      } else if (path.startsWith('/api/supplier/')) {
        effectiveRole = currentUser?.role === 'manager' ? 'manager' : 'supplier';
      } else if (
        activeView === 'customer' ||
        activeView === 'chef' ||
        activeView === 'manager' ||
        activeView === 'supplier'
      ) {
        effectiveRole = activeView;
      }

      headers['x-feedo-role'] = effectiveRole;
      if (currentUser) {
        headers['x-feedo-user-id'] = currentUser.id;
      }

      const res = await fetch(path, {
        ...options,
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `Request failed with status ${res.status}`);
      }

      // Immediately apply embedded snapshot from mutation response so serverless deployments stay 100% consistent
      if (data && data.snapshot) {
        setSnapshot(data.snapshot);
      } else {
        await refreshState();
      }
      return data as T;
    },
    [sessionToken, currentUser, activeView, refreshState]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string = 'feedo2026'): Promise<User> => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Login failed');
      }
      setCurrentUser(data.user);
      setSessionToken(data.token);
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      setActiveViewState(data.user.role);
      showToast(
        `Signed in as ${data.user.name}`,
        `Role: ${data.user.role.toUpperCase()}`,
        'emerald'
      );
      return data.user;
    },
    [showToast]
  );

  const switchDemoRole = useCallback(
    async (role: UserRole) => {
      const email = DEMO_ROLE_EMAILS[role];
      await loginWithEmail(email, 'feedo2026');
    },
    [loginWithEmail]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setSessionToken(null);
    setActiveViewState('landing');
    showToast('Signed out of FEEDO PAY', 'Switched to public landing view', 'emerald');
  }, [showToast]);

  const addToCart = useCallback(
    (item: MenuItem, quantity: number = 1) => {
      if (item.isAvailable === false) {
        showToast(
          `Cannot add ${item.name}`,
          item.unavailableReason || 'Insufficient kitchen ingredients.',
          'red'
        );
        return;
      }
      setCart((prev) => {
        const existingIndex = prev.findIndex((c) => c.menuItem.id === item.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          const nextQty = updated[existingIndex].quantity + quantity;
          const maxAllowed = item.maxOrderableServings || 20;
          if (nextQty > maxAllowed) {
            showToast(
              `Stock limit reached for ${item.name}`,
              `Kitchen has ingredients for ${maxAllowed} servings.`,
              'gold'
            );
            return prev;
          }
          updated[existingIndex] = { ...updated[existingIndex], quantity: nextQty };
          return updated;
        }
        return [...prev, { menuItem: item, quantity }];
      });
      showToast(
        `Added ${item.name} to order`,
        `$${item.price.toFixed(2)} • Ingredients verified`,
        'emerald'
      );
    },
    [showToast]
  );

  const updateCartQuantity = useCallback((menuItemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((c) => c.menuItem.id !== menuItemId);
      }
      return prev.map((c) => (c.menuItem.id === menuItemId ? { ...c, quantity } : c));
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSpecialInstructions('');
  }, []);

  const startLiveDemo = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (data.snapshot) {
        setSnapshot(data.snapshot);
      }
      setCart([]);
      setSelectedTable(undefined);
      setDemoHighlightOrderId(null);
      await switchDemoRole('customer');
      setDemoStep(1);
      setIsDemoActive(true);
      showToast(
        'LIVE JUDGE DEMO INITIALIZED',
        'Follow the 14-step interactive walkthrough to experience the full ecosystem!',
        'gold'
      );
    } catch (err) {
      console.error('Failed to start live demo:', err);
    }
  }, [switchDemoRole, showToast]);

  const closeLiveDemo = useCallback(() => {
    setIsDemoActive(false);
  }, []);

  return (
    <EcosystemContext.Provider
      value={{
        snapshot,
        loading,
        socketConnected,
        currentUser,
        sessionToken,
        activeView,
        setActiveView,
        loginWithEmail,
        switchDemoRole,
        logout,
        cart,
        orderType,
        setOrderType,
        selectedTable,
        setSelectedTable,
        specialInstructions,
        setSpecialInstructions,
        addToCart,
        updateCartQuantity,
        clearCart,
        isCheckoutModalOpen,
        setIsCheckoutModalOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        receiptOrder,
        setReceiptOrder,
        isDemoActive,
        demoStep,
        demoHighlightOrderId,
        setDemoHighlightOrderId,
        startLiveDemo,
        setDemoStep,
        closeLiveDemo,
        apiFetch,
        refreshState,
        updateSnapshotDirectly,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </EcosystemContext.Provider>
  );
};

export function useEcosystem() {
  const ctx = useContext(EcosystemContext);
  if (!ctx) {
    throw new Error('useEcosystem must be used inside EcosystemProvider');
  }
  return ctx;
}
