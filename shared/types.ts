export type UserRole = 'customer' | 'chef' | 'manager' | 'supplier';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  companyName?: string;
  phone?: string;
  address?: string;
  productsSupplied?: string[];
  suppliedCategories?: string[];
  createdAt: string;
}

export type FoodCategory = 'Breakfast' | 'Main Course' | 'Snacks' | 'Beverages' | 'Desserts' | string;

export interface RecipeIngredient {
  ingredientId: string;
  ingredientName: string;
  quantityRequired: number;
  unit: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: FoodCategory;
  description: string;
  price: number;
  gstRate?: number; // e.g., 5 (%)
  image: string;
  basePrepTimeMinutes: number;
  prepTimeMinutes?: number;
  complexityScore: 1 | 2 | 3 | 4 | 5;
  dietaryTags: string[];
  tags?: string[];
  rating?: number;
  reviewsCount?: number;
  popular?: boolean;
  calories: number;
  isManualDisabled: boolean;
  recipe: RecipeIngredient[];
  // Computed dynamically on server by Ingredient-to-Menu Dependency Engine:
  isAvailable?: boolean;
  unavailableReason?: string;
  maxOrderableServings?: number;
  dynamicPrepTimeMinutes?: number;
  prepTimeExplanation?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  optimalStock: number;
  maxCapacity?: number;
  unit: string;
  costPerUnit: number;
  expiryDate: string;
  supplierId: string;
  supplierName: string;
  dailyUsageRate: number;
  lastUpdated: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  specialInstructions?: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'CONFIRMED_INCOMING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_COLLECTION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'CREATED'
  | 'APPROVED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export type OrderType = 'DINE_IN' | 'TAKEAWAY';

export interface ChefAssignmentRecord {
  chefId: string;
  chefName: string;
  assignedAt: string;
  assignedBy: string;
}

export interface OrderFeedbackDetails {
  foodQuality: number;
  prepTime: number;
  preparationTime?: number;
  serviceQuality: number;
  overallExperience: number;
  comment: string;
  submittedAt: string;
}

export interface Order {
  id: string;
  tokenNumber: string; // e.g., F204
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderType?: OrderType; // 'DINE_IN' or 'TAKEAWAY'
  tableNumber?: number; // Strictly for DINE_IN
  reservationId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number; // Applicable GST (5%)
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMode: 'PAYPAL_SANDBOX' | 'PAYPAL_DEMO_SIMULATION';
  paymentMethodUsed?: string; // e.g., 'PayPal Account', 'Debit / Credit Card', 'PayPal Pay Later', 'Venmo'
  paypalOrderId?: string;
  paypalCaptureId?: string;
  specialInstructions?: string;
  assignedChefId?: string;
  assignedChefName?: string; // Dynamically updated when Kitchen Staff selects a chef from preloaded list
  chefAssignmentHistory?: ChefAssignmentRecord[];
  estimatedPrepMinutes: number;
  prepExplanation: string;
  priorityScore: number;
  priorityReason: string;
  batchGroupKey?: string;
  counterNumber: number; // Strictly for Pickup Counter
  createdAt: string;
  confirmedAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  completedAt?: string;
  rating?: number;
  feedback?: string;
  feedbackComment?: string;
  feedbackDetails?: OrderFeedbackDetails;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  tokenNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  mode: 'PAYPAL_SANDBOX' | 'PAYPAL_DEMO_SIMULATION';
  paymentMethodUsed?: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  payerEmail?: string;
  payerName?: string;
  status: PaymentStatus;
  idempotencyKey: string;
  webhookVerified: boolean;
  refundedAmount: number;
  rawCreateResponse?: string;
  rawCaptureResponse?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  orderId: string;
  paypalCaptureId: string;
  paypalRefundId: string;
  amount: number;
  currency: string;
  reason: string;
  initiatedBy: string;
  mode: 'PAYPAL_SANDBOX' | 'PAYPAL_DEMO_SIMULATION';
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

export interface RestaurantTable {
  id: string;
  tableNumber: number;
  capacity: number;
  zone: 'Main Dining' | 'Window Lounge' | 'Express Counter' | 'Garden Patio';
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'AWAITING_ALLOCATION';
  currentCustomerId?: string;
  currentCustomerName?: string;
  reservedUntil?: string;
  activeOrderToken?: string;
}

export interface WaitingQueueEntry {
  id: string;
  customerId: string;
  customerName: string;
  guests: number;
  preferredZone: string;
  position?: number;
  estimatedWaitMinutes: number;
  status: 'WAITING' | 'ALLOCATED' | 'CANCELLED';
  notes?: string;
  joinedAt?: string;
  createdAt?: string;
  allocatedTableNumber?: number;
}

export interface TableReservation {
  id: string;
  tableNumber: number;
  customerId: string;
  customerName: string;
  guests: number;
  timeSlot: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface SupplierRequest {
  id: string;
  ingredientId: string;
  ingredientName: string;
  supplierId: string;
  supplierName: string;
  requestedQuantity: number;
  unit: string;
  unitPrice: number;
  totalEstimate: number;
  urgency: 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'REJECTED' | 'DISPATCHED' | 'DELIVERED_VERIFIED';
  notes?: string;
  invoiceNumber?: string;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  verifiedAt?: string;
}

export interface WasteRecord {
  id: string;
  itemName: string;
  ingredientId?: string;
  category:
    | 'PREPARED_SURPLUS'
    | 'EXPIRED_INGREDIENT'
    | 'PLATE_WASTE'
    | 'PREPARATION_WASTE'
    | 'DAMAGED_STOCK';
  quantity: number;
  unit: string;
  estimatedCostLoss: number;
  reason: string;
  recordedBy?: string;
  recordedAt: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category:
    | 'INGREDIENT_PROCUREMENT'
    | 'PACKAGING'
    | 'UTILITIES_OPERATIONS'
    | 'STAFF_WAGES'
    | 'EQUIPMENT_MAINTENANCE'
    | 'OTHER';
  amount: number;
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface AIRecommendation {
  id: string;
  category: 'WASTE_PREVENTION' | 'DEMAND_SURGE' | 'INVENTORY_OPTIMIZATION' | 'FOOD_RESCUE' | 'QUEUE_OPTIMIZATION';
  title: string;
  detectedIssue: string;
  whyDetected: string;
  supportingData: string;
  suggestedAction: string;
  estimatedImpact: string;
  confidenceScore: number; // 0-100
  status: 'ACTIVE' | 'ACCEPTED' | 'DISMISSED';
  actionPayload?: {
    type: 'CREATE_SUPPLIER_REQUEST' | 'ADJUST_PREP_BATCH' | 'SURPLUS_PORTION_CONTROL';
    ingredientId?: string;
    recommendedQty?: number;
  };
  createdAt: string;
}

export interface SmartCounterState {
  deviceId: string;
  deviceName: string;
  firmwareVersion: string;
  connectionMode: 'SIMULATED_BROWSER_DEVICE' | 'ESP32_HARDWARE_CONNECTED';
  isOnline: boolean;
  lastHeartbeat: string;
  currentReadyToken: string | null;
  counterNumber: number;
  ledState: 'OFF' | 'GREEN_PULSE' | 'AMBER_STANDBY';
  buzzerActive: boolean;
  recentCalls: {
    tokenNumber: string;
    counterNumber: number;
    calledAt: string;
    customerName: string;
    itemsSummary: string;
    collected: boolean;
  }[];
}

export interface NotificationItem {
  id: string;
  targetRole: UserRole | 'all';
  targetUserId?: string;
  title: string;
  message: string;
  type: 'PAYMENT' | 'KITCHEN' | 'READY_TOKEN' | 'INVENTORY' | 'SUPPLIER' | 'AI_INSIGHT' | 'SYSTEM';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Head Chef' | 'Sous Chef' | 'Line Cook' | 'Counter Specialist' | string;
  roleTitle?: string;
  shift: string;
  active: boolean;
  station: string;
  specialtyStation?: string;
  efficiencyScore?: number;
  ordersCompletedToday: number;
}
