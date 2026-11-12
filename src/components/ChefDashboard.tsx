import React, { useState } from 'react';
import {
  ChefHat,
  Flame,
  Clock,
  BellRing,
  AlertTriangle,
  Layers,
  ShieldCheck,
  MapPin,
  Cpu,
  UserCheck,
  CheckCircle2,
  PackageCheck,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import { Order, OrderStatus } from '../../shared/types.ts';
import { CHEF_IMAGE } from '../theme.ts';

export const ChefDashboard: React.FC = () => {
  const {
    snapshot,
    apiFetch,
    showToast,
    setActiveView,
    isDemoActive,
    demoStep,
    setDemoStep,
  } = useEcosystem();

  const [shortageIngredientId, setShortageIngredientId] = useState<string>('');
  const [showShortageModal, setShowShortageModal] = useState<boolean>(false);

  if (!snapshot) return null;

  // Only show PayPal-verified orders in the Kitchen Staff Order Monitor
  const verifiedOrders = snapshot.orders.filter(
    (o) => o.paymentStatus === 'CAPTURED' || o.paymentStatus === 'PARTIALLY_REFUNDED'
  );

  // 4-Column Kitchen Display System (KDS): NEW ORDERS, PREPARING, READY FOR COLLECTION, COMPLETED
  const newOrders = verifiedOrders.filter(
    (o) => o.status === 'CONFIRMED_INCOMING' || o.status === 'ACCEPTED'
  );
  const preparingOrders = verifiedOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = verifiedOrders.filter((o) => o.status === 'READY_FOR_COLLECTION');
  const completedOrders = verifiedOrders.filter((o) => o.status === 'COMPLETED');

  // Preloaded Chef Roster from Manager-configured staff list
  const preloadedChefs = snapshot.staff;

  const handleAssignChef = async (order: Order, chefId: string) => {
    try {
      const selectedChef = preloadedChefs.find((c) => c.id === chefId);
      await apiFetch(`/api/kitchen/orders/${order.id}/assign-chef`, {
        method: 'POST',
        body: JSON.stringify({
          chefId: selectedChef ? selectedChef.id : '',
          chefName: selectedChef ? selectedChef.name : '',
        }),
      });
      if (selectedChef) {
        showToast(
          `Assigned ${selectedChef.name} to Token ${order.tokenNumber}`,
          'Synchronized with Customer Digital Token, Order Tracker & Receipt!',
          'emerald'
        );
      } else {
        showToast(
          `Cleared Chef Assignment on Token ${order.tokenNumber}`,
          'Displays "Chef not assigned"',
          'gold'
        );
      }
    } catch (err: any) {
      showToast('Chef Assignment Failed', err.message, 'red');
    }
  };

  const handleStatusChange = async (
    order: Order,
    nextStatus: OrderStatus,
    customPrepMinutes?: number
  ) => {
    try {
      await apiFetch(`/api/kitchen/orders/${order.id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status: nextStatus,
          customPrepMinutes,
        }),
      });

      if (nextStatus === 'ACCEPTED') {
        showToast(`Accepted Token ${order.tokenNumber}`, 'Queued for station firing', 'emerald');
      } else if (nextStatus === 'PREPARING') {
        showToast(
          `Cooking Token ${order.tokenNumber}`,
          `Assigned Chef: ${order.assignedChefName || 'Chef not assigned'} • Est: ${
            customPrepMinutes ?? order.estimatedPrepMinutes
          } mins`,
          'emerald'
        );
        if (isDemoActive && (demoStep === 6 || demoStep === 7)) {
          setDemoStep(8);
        }
      } else if (nextStatus === 'READY_FOR_COLLECTION') {
        showToast(
          `READY: Token ${order.tokenNumber} Dispatched to Smart Counter #${order.counterNumber}`,
          'ESP32 OLED Display & LED Buzzer Activated!',
          'gold'
        );
        if (isDemoActive && (demoStep === 8 || demoStep === 9)) {
          setDemoStep(10);
        }
      } else if (nextStatus === 'COMPLETED') {
        showToast(`Order ${order.tokenNumber} Completed`, 'Collected by customer', 'emerald');
      }
    } catch (err: any) {
      showToast('Kitchen Action Failed', err.message, 'red');
    }
  };

  const handleReportShortage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortageIngredientId) return;
    try {
      await apiFetch('/api/kitchen/report-shortage', {
        method: 'POST',
        body: JSON.stringify({
          ingredientId: shortageIngredientId,
          reportedStock: 0.05,
          notes: 'Reported low at kitchen prep station by Kitchen Staff Monitor.',
        }),
      });
      setShowShortageModal(false);
      showToast(
        'Ingredient Shortage Reported',
        'Dependent menu items auto-disabled & Manager notified!',
        'gold'
      );
    } catch (err: any) {
      showToast('Failed to report shortage', err.message, 'red');
    }
  };

  const renderOrderCard = (order: Order) => {
    const isDineIn =
      order.orderType === 'DINE_IN' || (!order.orderType && Boolean(order.tableNumber));

    return (
      <div
        key={order.id}
        className="rounded-2xl bg-charcoal-900 border border-emerald-800/80 p-4 text-ivory-50 shadow-xl flex flex-col justify-between space-y-3.5"
      >
        <div className="space-y-3">
          {/* Token & Order Type (Dine-In Table vs Takeaway Counter) Header */}
          <div className="flex items-start justify-between gap-2 border-b border-emerald-800/70 pb-3">
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-gold-500 text-charcoal-950 font-mono font-black text-2xl tracking-tight shadow">
                {order.tokenNumber}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gold-300">
                  {isDineIn ? (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-gold-400" />
                      <span>Dine-In • Table #{order.tableNumber || 5}</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-3.5 h-3.5 text-gold-400" />
                      <span>Takeaway • Counter #{order.counterNumber || 2}</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-emerald-200/80 font-mono mt-0.5">
                  {new Date(order.confirmedAt || order.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  • {order.customerName}
                </div>
              </div>
            </div>

            {/* Payment Verified Badge */}
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-[10px] font-mono text-gold-300">
                {order.status === 'ACCEPTED' ? 'ACCEPTED' : order.status.replace(/_/g, ' ')}
              </span>
              <div className="text-[10px] text-green-400 font-mono mt-1 flex items-center justify-end gap-1">
                <ShieldCheck className="w-3 h-3" />
                {order.paymentMethodUsed || 'PayPal Verified'}
              </div>
            </div>
          </div>

          {/* PART 7 REQUIREMENT: PRELOADED CHEF NAME SELECTION DROPDOWN */}
          <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-gold-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Assign Chef (Preloaded Roster):
              </span>
              <span
                className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded ${
                  order.assignedChefName
                    ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {order.assignedChefName || 'Chef not assigned'}
              </span>
            </div>
            <select
              aria-label={`Assign chef for order ${order.tokenNumber}`}
              value={order.assignedChefId || ''}
              onChange={(e) => handleAssignChef(order, e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-charcoal-950 border border-emerald-700 text-xs text-white font-semibold focus:outline-none focus:border-gold-400"
            >
              <option value="">Chef not assigned (Select Chef...)</option>
              {preloadedChefs.map((chef) => (
                <option key={chef.id} value={chef.id}>
                  {chef.name} — {chef.specialtyStation} {chef.active ? '(On Shift)' : '(Standby)'}
                </option>
              ))}
            </select>
          </div>

          {/* Large Readable Dish List */}
          <div className="space-y-1.5">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-charcoal-950/90 px-3 py-2 rounded-xl border border-emerald-900/70"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white font-mono font-extrabold text-xs flex items-center justify-center">
                    {item.quantity}x
                  </span>
                  <span className="font-display font-bold text-sm text-ivory-50">
                    {item.name}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300">Stock Deducted</span>
              </div>
            ))}
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <div className="p-2.5 rounded-xl bg-gold-500/15 border border-gold-400/40 text-xs text-gold-300">
              <strong>Customer Note:</strong> {order.specialInstructions}
            </div>
          )}

          {/* Prep Time & Adjuster */}
          <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gold-400" />
                Est. Prep: <strong>{order.estimatedPrepMinutes} mins</strong>
              </span>

              {order.status !== 'READY_FOR_COLLECTION' && order.status !== 'COMPLETED' && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      handleStatusChange(
                        order,
                        order.status,
                        Math.max(1, order.estimatedPrepMinutes - 2)
                      )
                    }
                    className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-[11px] font-mono text-emerald-200"
                    title="Decrease estimate by 2m"
                  >
                    -2m
                  </button>
                  <button
                    onClick={() =>
                      handleStatusChange(order, order.status, order.estimatedPrepMinutes + 2)
                    }
                    className="px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-[11px] font-mono text-emerald-200"
                    title="Increase estimate by 2m"
                  >
                    +2m
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kitchen Workflow Action Buttons */}
        <div className="pt-2 border-t border-emerald-900/80 flex flex-wrap gap-2">
          {order.status === 'CONFIRMED_INCOMING' && (
            <>
              <button
                onClick={() => handleStatusChange(order, 'ACCEPTED')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs transition-all"
              >
                Accept Order
              </button>
              <button
                onClick={() => handleStatusChange(order, 'PREPARING')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-extrabold text-xs transition-all"
              >
                Start Preparing
              </button>
            </>
          )}

          {order.status === 'ACCEPTED' && (
            <button
              onClick={() => handleStatusChange(order, 'PREPARING')}
              className="w-full py-2.5 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow"
            >
              <Flame className="w-4 h-4" />
              <span>Start Preparation (Move to Preparing)</span>
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button
              onClick={() => handleStatusChange(order, 'READY_FOR_COLLECTION')}
              className="w-full py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <BellRing className="w-4 h-4" />
              <span>MARK READY • CALL TOKEN {order.tokenNumber}</span>
            </button>
          )}

          {order.status === 'READY_FOR_COLLECTION' && (
            <div className="w-full space-y-2">
              <div className="text-center py-1.5 px-3 rounded-lg bg-emerald-950 border border-gold-400/50 text-[11px] font-mono text-gold-300">
                Displaying {order.tokenNumber} on Smart Counter #{order.counterNumber}
              </div>
              <button
                onClick={() => handleStatusChange(order, 'COMPLETED')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs"
              >
                Mark Collected & Completed
              </button>
            </div>
          )}

          {order.status === 'COMPLETED' && (
            <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-center text-xs text-green-300 font-semibold flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Completed • Chef: {order.assignedChefName || 'Chef not assigned'}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-charcoal-950 px-4 py-6 text-ivory-50 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Common Kitchen Login Header */}
        <div className="relative overflow-hidden rounded-3xl border border-gold-400/30 bg-charcoal-950 p-6 shadow-2xl sm:p-8">
          <img src={CHEF_IMAGE} alt="Chef preparing a dish" className="absolute inset-y-0 right-0 hidden h-full w-2/5 object-cover opacity-35 lg:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-charcoal-950/95 to-charcoal-950/30" />
          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/90 border border-emerald-700 text-xs font-mono text-gold-300">
              <ChefHat className="w-4 h-4" />
              <span>ONE COMMON KITCHEN LOGIN • SHARED KITCHEN DISPLAY SYSTEM (KDS)</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ivory-50">
              Kitchen Staff Order Monitor & Chef Assignment Board
            </h1>
            <p className="text-xs text-emerald-200">
              Select a chef from the preloaded dropdown on any order card to dynamically update the
              Customer Digital Token, Live Order Tracker, and Printable Receipt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView('iot-counter')}
              className="px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-xs font-semibold text-gold-300 flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              <span>Open Smart Counter Display</span>
            </button>

            <button
              onClick={() => {
                setShortageIngredientId(snapshot.ingredients[0]?.id || '');
                setShowShortageModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-950/90 hover:bg-red-900 border border-red-700/70 text-xs font-semibold text-red-200 flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Report Ingredient Shortage</span>
            </button>
          </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['New Orders', newOrders.length, 'text-gold-300'], ['Preparing', preparingOrders.length, 'text-orange-300'], ['Ready', readyOrders.length, 'text-emerald-300'], ['Completed', completedOrders.length, 'text-ivory-50']].map(([label, value, tone]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
              <div className="text-[11px] uppercase tracking-wider text-ivory-300">{label}</div>
              <div className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</div>
              <div className="mt-1 text-[10px] text-ivory-300/70">Live KDS status</div>
            </div>
          ))}
        </div>

        {/* Intelligent Order Batching Banner */}
        {snapshot.intelligence.kitchenStatus.intelligentBatches.length > 0 && (
          <div className="rounded-2xl bg-emerald-950/80 border border-gold-400/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-display font-bold text-gold-300 uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                <span>Intelligent Order Batching (Shared Preparation Station)</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-200">
                Individual token identity preserved
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {snapshot.intelligence.kitchenStatus.intelligentBatches.map((batch) => (
                <div
                  key={batch.batchKey}
                  className="p-3 rounded-xl bg-charcoal-900/90 border border-emerald-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-[10px] font-mono text-emerald-300">
                      {batch.stationName}
                    </div>
                    <div className="font-display font-bold text-sm text-white">
                      Batch {batch.totalQuantity}x {batch.dishName}
                    </div>
                    <div className="text-[11px] font-mono text-gold-300 mt-0.5">
                      Tokens: {batch.tokens.join(', ')}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-900 text-emerald-200 font-mono text-[10px] font-bold">
                    Saves ~{batch.estimatedTimeSavedMinutes}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PART 7 REQUIREMENT: 4-COLUMN KDS BOARD (NEW ORDERS | PREPARING | READY FOR COLLECTION | COMPLETED) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
          {/* Column 1: NEW ORDERS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-950 border border-emerald-800">
              <span className="font-display font-bold text-sm text-ivory-50">
                1. NEW ORDERS
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500 text-charcoal-950 font-mono font-bold text-xs">
                {newOrders.length}
              </span>
            </div>
            {newOrders.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-emerald-900 text-center text-xs text-emerald-300/60">
                No new incoming orders waiting.
              </div>
            ) : (
              newOrders.map(renderOrderCard)
            )}
          </div>

          {/* Column 2: PREPARING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-950 border border-gold-500/50">
              <span className="font-display font-bold text-sm text-gold-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-gold-400" />
                2. PREPARING
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500 text-charcoal-950 font-mono font-bold text-xs">
                {preparingOrders.length}
              </span>
            </div>
            {preparingOrders.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-emerald-900 text-center text-xs text-emerald-300/60">
                No orders currently on cooking stations.
              </div>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>

          {/* Column 3: READY FOR COLLECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-900 border border-emerald-500">
              <span className="font-display font-bold text-sm text-emerald-100 flex items-center gap-1.5">
                <BellRing className="w-4 h-4 text-gold-300" />
                3. READY FOR COLLECTION
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-400 text-charcoal-950 font-mono font-bold text-xs">
                {readyOrders.length}
              </span>
            </div>
            {readyOrders.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-emerald-900 text-center text-xs text-emerald-300/60">
                No orders waiting at Smart Counter.
              </div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>

          {/* Column 4: COMPLETED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-charcoal-900 border border-emerald-800">
              <span className="font-display font-bold text-sm text-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                4. COMPLETED
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-white font-mono font-bold text-xs">
                {completedOrders.length}
              </span>
            </div>
            {completedOrders.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-emerald-900 text-center text-xs text-emerald-300/60">
                No completed orders yet.
              </div>
            ) : (
              completedOrders.slice(0, 6).map(renderOrderCard)
            )}
          </div>
        </div>
      </div>

      {/* Report Ingredient Shortage Modal */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-charcoal-900 border border-red-700/70 p-6 space-y-4 text-ivory-50">
            <div className="flex items-center gap-2 text-red-400 font-display font-bold text-lg">
              <AlertTriangle className="w-5 h-5" />
              <span>Report Station Ingredient Shortage</span>
            </div>
            <p className="text-xs text-emerald-200/80">
              Reporting an ingredient shortage immediately updates inventory, triggers the
              Ingredient-to-Menu Dependency Engine to disable affected dishes, and alerts the
              Manager.
            </p>
            <form onSubmit={handleReportShortage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Select Ingredient</label>
                <select
                  value={shortageIngredientId}
                  onChange={(e) => setShortageIngredientId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-charcoal-950 border border-emerald-800 text-xs text-white"
                >
                  {snapshot.ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Current: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowShortageModal(false)}
                  className="px-4 py-2 rounded-xl bg-charcoal-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  Confirm Shortage & Lock Affected Dishes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
