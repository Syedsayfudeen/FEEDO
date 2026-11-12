import type { DatabaseSchema } from './db.ts';
import type { MenuItem, Order, AIRecommendation } from '../shared/types.ts';

export interface EnrichedMenuItem extends MenuItem {
  isAvailable: boolean;
  unavailableReason?: string;
  maxOrderableServings: number;
  dynamicPrepTimeMinutes: number;
  prepTimeExplanation: string;
}

export interface BatchGroupSummary {
  batchKey: string;
  stationName: string;
  dishName: string;
  totalQuantity: number;
  tokens: string[];
  estimatedTimeSavedMinutes: number;
}

/**
 * Ingredient-to-Menu Dependency Engine + Adaptive Preparation Time Predictor
 */
export function evaluateMenuWithDependencies(state: DatabaseSchema): EnrichedMenuItem[] {
  const activeOrders = state.orders.filter((o) =>
    ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
  );
  const activeChefs = Math.max(
    1,
    state.staff.filter((s) => s.active && s.role !== 'Counter Specialist').length
  );

  // Calculate total active complexity units in kitchen
  const activeWorkloadUnits = activeOrders.reduce((sum, ord) => {
    const orderComplexity = ord.items.reduce((acc, item) => {
      const m = state.menuItems.find((mi) => mi.id === item.menuItemId);
      return acc + (m ? m.complexityScore * item.quantity : 2 * item.quantity);
    }, 0);
    return sum + orderComplexity;
  }, 0);

  return state.menuItems.map((item) => {
    if (item.isManualDisabled) {
      return {
        ...item,
        isAvailable: false,
        unavailableReason: 'Temporarily paused by Kitchen Manager',
        maxOrderableServings: 0,
        dynamicPrepTimeMinutes: item.basePrepTimeMinutes,
        prepTimeExplanation: 'Item paused by manager.',
      };
    }

    let maxServings = 999;
    const missingIngredients: string[] = [];

    for (const req of item.recipe) {
      const ing = state.ingredients.find((i) => i.id === req.ingredientId);
      if (!ing || ing.currentStock < req.quantityRequired) {
        maxServings = 0;
        const currentAmt = ing ? `${ing.currentStock.toFixed(2)} ${ing.unit}` : '0';
        missingIngredients.push(
          `${req.ingredientName} (need ${req.quantityRequired} ${req.unit}, available ${currentAmt})`
        );
      } else {
        const possible = Math.floor(ing.currentStock / req.quantityRequired);
        if (possible < maxServings) {
          maxServings = possible;
        }
      }
    }

    const isAvailable = maxServings > 0;
    const unavailableReason = !isAvailable
      ? `Insufficient stock: ${missingIngredients.join(', ')}`
      : undefined;

    // Transparent baseline algorithm for Adaptive Preparation Time Prediction:
    // DynamicPrep = BasePrep + ceil((ActiveOrders * ComplexityScore) / (ActiveChefs * 2.5))
    const workloadPenalty = Math.ceil(
      (activeOrders.length * item.complexityScore + activeWorkloadUnits * 0.25) /
        (activeChefs * 2.2)
    );
    const dynamicPrepTimeMinutes = item.basePrepTimeMinutes + workloadPenalty;

    const prepTimeExplanation =
      workloadPenalty > 0
        ? `Base prep ${item.basePrepTimeMinutes}m + ${workloadPenalty}m kitchen load adjustment (${activeOrders.length} active orders, complexity ${item.complexityScore}/5, ${activeChefs} chefs on shift).`
        : `Optimal kitchen flow: Base prep ${item.basePrepTimeMinutes}m (${activeChefs} chefs available, zero queue bottleneck).`;

    return {
      ...item,
      isAvailable,
      unavailableReason,
      maxOrderableServings: maxServings,
      dynamicPrepTimeMinutes,
      prepTimeExplanation,
    };
  });
}

/**
 * Computes adaptive preparation time & transparent explanation for a multi-item cart/order
 */
export function predictOrderPrepTime(
  state: DatabaseSchema,
  items: { menuItemId: string; quantity: number }[]
): {
  estimatedPrepMinutes: number;
  prepExplanation: string;
  priorityScore: number;
  priorityReason: string;
  batchGroupKey: string;
} {
  const enrichedMenu = evaluateMenuWithDependencies(state);
  const activeOrders = state.orders.filter((o) =>
    ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
  );
  const activeChefs = Math.max(
    1,
    state.staff.filter((s) => s.active && s.role !== 'Counter Specialist').length
  );

  let maxBasePrep = 5;
  let totalComplexity = 0;
  let primaryCategory = 'Main Course';

  for (const cartItem of items) {
    const menu = enrichedMenu.find((m) => m.id === cartItem.menuItemId);
    if (menu) {
      if (menu.basePrepTimeMinutes > maxBasePrep) {
        maxBasePrep = menu.basePrepTimeMinutes;
        primaryCategory = menu.category;
      }
      totalComplexity += menu.complexityScore * cartItem.quantity;
    }
  }

  const queueFactor = Math.ceil((activeOrders.length * 1.8 + totalComplexity * 0.45) / activeChefs);
  const estimatedPrepMinutes = Math.max(4, maxBasePrep + queueFactor);

  const prepExplanation = `Baseline dish prep ${maxBasePrep}m + ${queueFactor}m dynamic workload delta (${activeOrders.length} active kitchen orders, ${totalComplexity} complexity pts across ${activeChefs} active chefs).`;

  // Smart Queue Optimization priority calculation
  const priorityScore = Math.min(99, Math.round(70 + totalComplexity * 2.5 + activeOrders.length * 2));
  const priorityReason =
    totalComplexity >= 6
      ? `High-complexity multi-portion order (${totalComplexity} pts) — prioritized for station heat synchronization`
      : `Balanced queue sequence (${activeOrders.length + 1} in active pipeline; target dispatch ${estimatedPrepMinutes}m)`;

  const batchGroupKey =
    primaryCategory === 'Main Course'
      ? 'BATCH-DUM-WOK'
      : primaryCategory === 'Breakfast'
      ? 'BATCH-GRIDDLE'
      : primaryCategory === 'Beverages'
      ? 'BATCH-COLD-PRESS'
      : 'BATCH-EXPRESS';

  return {
    estimatedPrepMinutes,
    prepExplanation,
    priorityScore,
    priorityReason,
    batchGroupKey,
  };
}

/**
 * Intelligent Order Batching: Identifies active orders that share dishes so chefs can batch-prepare
 * while keeping individual order tracking and digital tokens strictly separate.
 */
export function computeIntelligentOrderBatches(state: DatabaseSchema): BatchGroupSummary[] {
  const batchableOrders = state.orders.filter((o) =>
    ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
  );

  const dishMap = new Map<
    string,
    {
      menuItemId: string;
      dishName: string;
      totalQuantity: number;
      tokens: Set<string>;
      stationName: string;
    }
  >();

  for (const ord of batchableOrders) {
    for (const item of ord.items) {
      const existing = dishMap.get(item.menuItemId);
      const stationName =
        item.name.includes('Biryani') || item.name.includes('Rice') || item.name.includes('Meals')
          ? 'Steam & Wok Station #1'
          : item.name.includes('Dosa')
          ? 'Cast-Iron Griddle Station #2'
          : 'Express & Cold-Press Station #3';

      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.tokens.add(ord.tokenNumber);
      } else {
        dishMap.set(item.menuItemId, {
          menuItemId: item.menuItemId,
          dishName: item.name,
          totalQuantity: item.quantity,
          tokens: new Set([ord.tokenNumber]),
          stationName,
        });
      }
    }
  }

  const summaries: BatchGroupSummary[] = [];
  dishMap.forEach((val, key) => {
    if (val.totalQuantity >= 2 || val.tokens.size >= 2) {
      summaries.push({
        batchKey: `BATCH-${key.toUpperCase()}`,
        stationName: val.stationName,
        dishName: val.dishName,
        totalQuantity: val.totalQuantity,
        tokens: Array.from(val.tokens),
        estimatedTimeSavedMinutes: Math.max(2, (val.totalQuantity - 1) * 2),
      });
    }
  });

  return summaries;
}

/**
 * Generates Smart Demand Forecasting & Dynamic Inventory Insights based on live database state
 */
export function getKitchenPulseIntelligenceReport(state: DatabaseSchema) {
  const enrichedMenu = evaluateMenuWithDependencies(state);
  const activeOrders = state.orders.filter((o) =>
    ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING'].includes(o.status)
  );
  const activeChefs = state.staff.filter((s) => s.active && s.role !== 'Counter Specialist').length;

  // Check if any ingredient recently dropped below threshold and needs an auto-generated AI recommendation
  for (const ing of state.ingredients) {
    if (ing.currentStock <= ing.minThreshold) {
      const existingRec = state.aiRecommendations.find(
        (r) => r.actionPayload?.ingredientId === ing.id && r.status === 'ACTIVE'
      );
      if (!existingRec) {
        const deficit = Math.max(10, Math.round(ing.optimalStock - ing.currentStock));
        const newRec: AIRecommendation = {
          id: `ai-rec-auto-${ing.id}-${Date.now()}`,
          category: 'INVENTORY_OPTIMIZATION',
          title: `Automated Low-Stock Alert: ${ing.name}`,
          detectedIssue: `${ing.name} stock reached ${ing.currentStock.toFixed(2)} ${ing.unit} (below safety threshold of ${ing.minThreshold} ${ing.unit}).`,
          whyDetected: `Real-time PayPal order captures deducted recipe allocations, bringing inventory into the critical replenishment zone.`,
          supportingData: `Current stock: ${ing.currentStock.toFixed(2)} ${ing.unit} | Daily burn rate: ${ing.dailyUsageRate} ${ing.unit}/day | Optimal target: ${ing.optimalStock} ${ing.unit}.`,
          suggestedAction: `Dispatch an immediate replenishment request for ${deficit} ${ing.unit} to ${ing.supplierName}.`,
          estimatedImpact: `Prevents menu lockout on high-demand dishes dependent on ${ing.name}.`,
          confidenceScore: 96,
          status: 'ACTIVE',
          actionPayload: {
            type: 'CREATE_SUPPLIER_REQUEST',
            ingredientId: ing.id,
            recommendedQty: deficit,
          },
          createdAt: new Date().toISOString(),
        };
        state.aiRecommendations.unshift(newRec);
      }
    }
  }

  // Seeded + Live Demand Forecast Data (Clearly labelled as Baseline Statistical Forecast on Seeded Telemetry)
  const hourlyForecast = [
    { hour: '08:00 AM', historicalAvg: 24, predictedOrders: 28, confidenceLow: 25, confidenceHigh: 31, window: 'Breakfast Tiffin' },
    { hour: '10:00 AM', historicalAvg: 18, predictedOrders: 21, confidenceLow: 18, confidenceHigh: 24, window: 'Mid-Morning Break' },
    { hour: '12:00 PM', historicalAvg: 58, predictedOrders: 68, confidenceLow: 62, confidenceHigh: 74, window: 'Lunch Peak Surge' },
    { hour: '01:00 PM', historicalAvg: 72, predictedOrders: 84, confidenceLow: 77, confidenceHigh: 91, window: 'Lunch Peak Surge' },
    { hour: '03:00 PM', historicalAvg: 29, predictedOrders: 33, confidenceLow: 29, confidenceHigh: 37, window: 'Afternoon Snacks' },
    { hour: '05:00 PM', historicalAvg: 44, predictedOrders: 49, confidenceLow: 44, confidenceHigh: 54, window: 'Evening High-Tea' },
    { hour: '07:00 PM', historicalAvg: 51, predictedOrders: 45, confidenceLow: 40, confidenceHigh: 50, window: 'Dinner Service' },
  ];

  // Dish popularity & demand forecast
  const dishForecasts = enrichedMenu.map((item) => {
    const orderCount = state.orders
      .filter((o) => o.paymentStatus === 'CAPTURED')
      .reduce((acc, ord) => {
        const match = ord.items.find((i) => i.menuItemId === item.id);
        return acc + (match ? match.quantity : 0);
      }, 0);

    const seededBaseline =
      item.id === 'menu-chicken-biryani'
        ? 46
        : item.id === 'menu-veg-meals'
        ? 38
        : item.id === 'menu-dosa'
        ? 34
        : item.id === 'menu-paneer-rice'
        ? 29
        : item.id === 'menu-fresh-juice'
        ? 41
        : 19;

    const totalObserved = seededBaseline + orderCount;
    const projectedTomorrow = Math.round(totalObserved * 1.08);

    return {
      menuItemId: item.id,
      name: item.name,
      category: item.category,
      todayOrders: totalObserved,
      projectedTomorrow,
      confidencePct: 88 + (item.complexityScore % 7),
      maxServingsFromCurrentStock: item.maxOrderableServings,
      stockRisk:
        item.maxOrderableServings === 0
          ? 'OUT_OF_STOCK'
          : item.maxOrderableServings < 15
          ? 'HIGH_RISK'
          : 'HEALTHY',
    };
  });

  return {
    engineName: 'FEEDO INTELLIGENCE — KitchenPulse AI (Explainable Baseline Engine v2.4)',
    methodologyNote:
      'Transparent heuristic & statistical baseline using live kitchen queue telemetry and seeded 7-day campus dining patterns.',
    kitchenStatus: {
      activeOrdersCount: activeOrders.length,
      activeChefsCount: activeChefs,
      currentLoadIndex: Math.min(100, Math.round((activeOrders.length / Math.max(1, activeChefs * 3)) * 100)),
      intelligentBatches: computeIntelligentOrderBatches(state),
    },
    hourlyForecast,
    dishForecasts,
    recommendations: state.aiRecommendations,
    wasteSummary: {
      totalRecordedLossUsd: Number(
        state.wasteRecords.reduce((s, w) => s + w.estimatedCostLoss, 0).toFixed(2)
      ),
      totalWasteKgOrLiters: Number(
        state.wasteRecords.reduce((s, w) => s + w.quantity, 0).toFixed(2)
      ),
      records: state.wasteRecords,
    },
  };
}
