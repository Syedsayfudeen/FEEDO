import React, { useState } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Trash2,
  Users,
  FileText,
  Settings,
  Eye,
  ArrowUpRight,
  Lock,
  Utensils,
  Plus,
  Star,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useEcosystem, handleFoodImageError } from '../context/EcosystemContext.tsx';
import { PaymentRecord } from '../../shared/types.ts';
import { ManagerAIChatPanel } from './ManagerAIChatPanel.tsx';

export const ManagerDashboard: React.FC = () => {
  const {
    snapshot,
    apiFetch,
    showToast,
    isDemoActive,
    demoStep,
    setDemoStep,
  } = useEcosystem();

  const [activeTab, setActiveTab] = useState<
    | 'OVERVIEW_AI'
    | 'PAYPAL_INTELLIGENCE'
    | 'INVENTORY_SUPPLIERS'
    | 'MENU_TABLES'
    | 'WASTE_STAFF_AUDIT'
  >('OVERVIEW_AI');

  // PayPal Intelligence Filters & Modals
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentRecord | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentRecord | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>(
    'Customer requested partial item adjustment'
  );

  // Runtime PayPal Sandbox Credential Configurator
  const [showSandboxConfig, setShowSandboxConfig] = useState<boolean>(false);
  const [sandboxClientId, setSandboxClientId] = useState<string>('');
  const [sandboxClientSecret, setSandboxClientSecret] = useState<string>('');
  const [sandboxCurrency, setSandboxCurrency] = useState<string>('USD');

  // Waste Logging Form State
  const [wasteItemName, setWasteItemName] = useState<string>('Veg Meals (South Indian Thali)');
  const [wasteQty, setWasteQty] = useState<string>('1.2');
  const [wasteReason, setWasteReason] = useState<
    'OVERPRODUCTION' | 'EXPIRED_INGREDIENT' | 'UNSOLD_BATCH' | 'PREPARATION_ERROR'
  >('UNSOLD_BATCH');
  const [wasteLossUsd, setWasteLossUsd] = useState<string>('5.40');

  // Add Ingredient State
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngUnit, setNewIngUnit] = useState<'kg' | 'liters' | 'units'>('kg');
  const [newIngStock, setNewIngStock] = useState<string>('15');
  const [newIngMin, setNewIngMin] = useState<string>('5');
  const [newIngCost, setNewIngCost] = useState<string>('2.50');

  // Add Menu Dish State
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<'SOUTH_INDIAN' | 'MAIN_COURSE' | 'BEVERAGES' | 'DESSERTS'>('SOUTH_INDIAN');
  const [newDishPrice, setNewDishPrice] = useState<string>('3.50');
  const [newDishPrepTime, setNewDishPrepTime] = useState<string>('10');
  const [newDishDesc, setNewDishDesc] = useState<string>('');

  // Add Preloaded Chef State
  const [newChefName, setNewChefName] = useState<string>('');
  const [newChefRole, setNewChefRole] = useState<'HEAD_CHEF' | 'SOUS_CHEF' | 'LINE_COOK' | 'BARISTA'>('LINE_COOK');
  const [newChefStation, setNewChefStation] = useState<string>('South Indian Tawa & Dosa Grill');
  const [newChefShift, setNewChefShift] = useState<'MORNING' | 'PEAK_LUNCH' | 'EVENING'>('PEAK_LUNCH');

  if (!snapshot) return null;

  const { metrics, intelligence, payments, refunds, ingredients, supplierRequests } = snapshot;

  const filteredPayments = payments.filter((p) => {
    if (paymentStatusFilter === 'ALL') return true;
    return p.status === paymentStatusFilter;
  });

  const handleActOnRecommendation = async (recId: string, decision: 'ACCEPTED' | 'DISMISSED') => {
    try {
      await apiFetch(`/api/manager/ai-recommendations/${recId}/act`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      showToast(
        `AI Recommendation ${decision}`,
        decision === 'ACCEPTED'
          ? 'Operational action executed & logged in audit trail.'
          : 'Recommendation dismissed.',
        'emerald'
      );
      if (isDemoActive && demoStep >= 13) {
        setDemoStep(14);
      }
    } catch (err: any) {
      showToast('Action Failed', err.message, 'red');
    }
  };

  const handleInitiateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;
    try {
      const res = await apiFetch('/api/paypal/refund', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: refundTarget.id,
          amount: Number(refundAmount),
          reason: refundReason,
        }),
      });
      setRefundTarget(null);
      showToast(
        `PayPal Refund Confirmed (${res.refund.paypalRefundId})`,
        `Refunded $${res.refund.amount.toFixed(2)} ${res.refund.currency}`,
        'emerald'
      );
    } catch (err: any) {
      showToast('PayPal Refund Error', err.message, 'red');
    }
  };

  const handleSimulateWebhook = async (payment: PaymentRecord) => {
    try {
      await fetch('/api/paypal/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-feedo-webhook-demo-sig': 'feedo-verified-sandbox-webhook-simulation',
        },
        body: JSON.stringify({
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          paypalOrderId: payment.paypalOrderId,
          paypalCaptureId: payment.paypalCaptureId,
          resource: {
            id: payment.paypalCaptureId,
            status: 'COMPLETED',
          },
        }),
      });
      showToast(
        'PayPal Webhook Verified & Reconciled',
        `Event PAYMENT.CAPTURE.COMPLETED verified for ${payment.paypalOrderId}`,
        'emerald'
      );
    } catch (err: any) {
      showToast('Webhook Error', err.message, 'red');
    }
  };

  const handleUpdateSandboxConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/paypal/configure-runtime', {
        method: 'POST',
        body: JSON.stringify({
          clientId: sandboxClientId,
          clientSecret: sandboxClientSecret,
          currency: sandboxCurrency,
        }),
      });
      setShowSandboxConfig(false);
      showToast(
        'PayPal Sandbox Configuration Updated',
        'Backend OAuth 2.0 & JS SDK updated with new credentials.',
        'emerald'
      );
    } catch (err: any) {
      showToast('Config Update Error', err.message, 'red');
    }
  };

  const handleCreateSupplierRequest = async (ingredientId: string, qty: number) => {
    try {
      await apiFetch('/api/manager/supplier-requests', {
        method: 'POST',
        body: JSON.stringify({
          ingredientId,
          requestedQuantity: qty,
          urgency: 'HIGH',
        }),
      });
      showToast(
        'Replenishment Order Sent to Supplier',
        'Verdant Harvest Agro notified in real time.',
        'emerald'
      );
      if (isDemoActive && demoStep >= 13) {
        setDemoStep(14);
      }
    } catch (err: any) {
      showToast('Request Error', err.message, 'red');
    }
  };

  const handleVerifyDelivery = async (reqId: string) => {
    try {
      await apiFetch(`/api/manager/supplier-requests/${reqId}/verify-delivery`, {
        method: 'POST',
      });
      showToast(
        'Delivery Verified & Inventory Restored!',
        'Affected menu items have been automatically re-enabled by the Dependency Engine!',
        'emerald'
      );
    } catch (err: any) {
      showToast('Verification Failed', err.message, 'red');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Executive Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-charcoal-950 text-ivory-50 p-6 sm:p-8 shadow-xl border border-emerald-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-xs text-gold-300 font-mono">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>MANAGER CONTROL CENTER • FINTECH & OPERATIONS TELEMETRY</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl">
            PayPal Payment Intelligence & KitchenPulse AI Command
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
            All metrics are computed live from verified PayPal captures, atomic recipe deductions,
            and seeded 7-day campus dining telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSandboxConfig((prev) => !prev)}
            className="px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 text-xs font-semibold text-gold-300 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configure PayPal Sandbox Keys</span>
          </button>
        </div>
      </div>

      {/* Optional Runtime PayPal Sandbox Credential Panel */}
      {showSandboxConfig && (
        <form
          onSubmit={handleUpdateSandboxConfig}
          className="rounded-2xl bg-white border-2 border-emerald-700 p-6 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-charcoal-900">
                Runtime PayPal Developer Sandbox Configuration
              </h3>
              <p className="text-xs text-charcoal-800/75">
                Enter your PayPal Developer Sandbox <code>CLIENT_ID</code> and{' '}
                <code>CLIENT_SECRET</code> to switch immediately from Explicit Demo Simulation Mode
                to live PayPal Sandbox OAuth 2.0 API calls.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold">
              Current: {snapshot.paypalConfig.mode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">PAYPAL_CLIENT_ID</label>
              <input
                type="text"
                value={sandboxClientId}
                onChange={(e) => setSandboxClientId(e.target.value)}
                placeholder="AeA1QIZXiflr1..."
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-emerald-900/20 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                PAYPAL_CLIENT_SECRET (Server-Only)
              </label>
              <input
                type="password"
                value={sandboxClientSecret}
                onChange={(e) => setSandboxClientSecret(e.target.value)}
                placeholder="ECYYrr..."
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-emerald-900/20 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">PAYPAL_CURRENCY</label>
              <select
                value={sandboxCurrency}
                onChange={(e) => setSandboxCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-emerald-900/20 text-xs font-mono"
              >
                {snapshot.paypalConfig.supportedCurrencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSandboxConfig(false)}
              className="px-4 py-2 rounded-xl bg-ivory-200 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              Save & Activate PayPal Configuration
            </button>
          </div>
        </form>
      )}

      {/* 8 EXECUTIVE KPI CARDS (Section 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Total Revenue</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="font-display font-extrabold text-lg text-emerald-800 mt-1">
            ${metrics.totalRevenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-700 font-mono">Net Captured</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Total Orders</span>
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="font-display font-extrabold text-lg text-charcoal-900 mt-1">
            {metrics.totalOrders}
          </div>
          <div className="text-[10px] text-emerald-700 font-mono">Verified</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Avg Order Value</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="font-display font-extrabold text-lg text-charcoal-900 mt-1">
            ${metrics.avgOrderValue.toFixed(2)}
          </div>
          <div className="text-[10px] text-charcoal-800/60 font-mono">Per Capture</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>PayPal Success</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#003087]" />
          </div>
          <div className="font-display font-extrabold text-lg text-[#003087] mt-1">
            {metrics.paymentSuccessRate}%
          </div>
          <div className="text-[10px] text-emerald-700 font-mono">1 Declined Blocked</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Active Kitchen</span>
            <Utensils className="w-3.5 h-3.5 text-gold-600" />
          </div>
          <div className="font-display font-extrabold text-lg text-gold-600 mt-1">
            {metrics.activeKitchenOrders}
          </div>
          <div className="text-[10px] text-charcoal-800/60 font-mono">In KDS Queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Available Tables</span>
            <Users className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="font-display font-extrabold text-lg text-emerald-700 mt-1">
            {metrics.availableTablesCount}/{metrics.totalTablesCount}
          </div>
          <div className="text-[10px] text-charcoal-800/60 font-mono">Floorplan Live</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Low-Stock Items</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          <div className="font-display font-extrabold text-lg text-red-600 mt-1">
            {metrics.lowStockIngredientsCount}
          </div>
          <div className="text-[10px] text-red-700 font-mono">
            {metrics.disabledMenuItemsCount} Dish Locked
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-900/10 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-charcoal-800/70 font-medium">
            <span>Recorded Waste</span>
            <Trash2 className="w-3.5 h-3.5 text-charcoal-700" />
          </div>
          <div className="font-display font-extrabold text-lg text-charcoal-900 mt-1">
            ${intelligence.wasteSummary.totalRecordedLossUsd.toFixed(2)}
          </div>
          <div className="text-[10px] text-emerald-700 font-mono">
            {intelligence.wasteSummary.totalWasteKgOrLiters} kg/L
          </div>
        </div>
      </div>

      {/* Manager Module Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-emerald-900/10 pb-3">
        {(
          [
            {
              id: 'OVERVIEW_AI',
              label: 'FEEDO Manager AI (P&L & BI Assistant)',
              icon: Sparkles,
            },
            {
              id: 'PAYPAL_INTELLIGENCE',
              label: `PayPal Payment Intelligence & Refunds (${payments.length})`,
              icon: ShieldCheck,
            },
            {
              id: 'INVENTORY_SUPPLIERS',
              label: `Inventory & Supplier Dock (${supplierRequests.length})`,
              icon: Truck,
            },
            {
              id: 'MENU_TABLES',
              label: 'Menu Dependency & Tables',
              icon: Utensils,
            },
            {
              id: 'WASTE_STAFF_AUDIT',
              label: 'Food Waste, Staff & Security Audit',
              icon: FileText,
            },
          ] as const
        ).map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'bg-white text-charcoal-800 border border-emerald-900/10 hover:bg-emerald-50'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: FEEDO MANAGER AI (PROFIT & LOSS + BI ASSISTANT), EXPLAINABLE RECOMMENDATIONS & CHARTS */}
      {activeTab === 'OVERVIEW_AI' && (
        <div className="space-y-8">
          {/* Dedicated FEEDO Manager AI — Business Intelligence & Profit/Loss Assistant */}
          <ManagerAIChatPanel />

          {/* Explainable AI Recommendations Section (Section 6C & 6D) */}
          <div className="rounded-3xl bg-white border border-emerald-900/15 p-6 shadow-premium space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-700" />
                  <h2 className="font-display font-extrabold text-xl text-charcoal-900">
                    {intelligence.engineName}
                  </h2>
                </div>
                <p className="text-xs text-charcoal-800/70 mt-0.5">
                  {intelligence.methodologyNote}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-semibold">
                {intelligence.recommendations.filter((r) => r.status === 'ACTIVE').length} Active
                Actionable Insights
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {intelligence.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${
                    rec.status === 'ACTIVE'
                      ? 'bg-ivory-50/80 border-emerald-700/40 shadow-sm'
                      : 'bg-ivory-100/50 border-emerald-900/10 opacity-75'
                  }`}
                >
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-900 text-gold-300 font-mono text-[10px] font-bold uppercase">
                        {rec.category.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-800">
                        Confidence: {rec.confidenceScore}% (Simulated Baseline)
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-base text-charcoal-900">
                      {rec.title}
                    </h3>

                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-emerald-900/10">
                      <div>
                        <strong className="text-charcoal-900">What System Detected:</strong>{' '}
                        <span className="text-charcoal-800/85">{rec.detectedIssue}</span>
                      </div>
                      <div>
                        <strong className="text-charcoal-900">Why Detected:</strong>{' '}
                        <span className="text-charcoal-800/85">{rec.whyDetected}</span>
                      </div>
                      <div>
                        <strong className="text-charcoal-900">Supporting Data:</strong>{' '}
                        <span className="font-mono text-[11px] text-emerald-800">
                          {rec.supportingData}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-950">
                        Suggested Action: {rec.suggestedAction}
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        <strong>Estimated Impact:</strong> {rec.estimatedImpact}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-2">
                    {rec.status === 'ACTIVE' ? (
                      <>
                        <button
                          onClick={() => handleActOnRecommendation(rec.id, 'ACCEPTED')}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold-300" />
                          <span>Accept & Execute</span>
                        </button>
                        <button
                          onClick={() => handleActOnRecommendation(rec.id, 'DISMISSED')}
                          className="py-2 px-3 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-800 font-semibold text-xs"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <span className="w-full text-center py-1.5 rounded-lg bg-emerald-100 text-emerald-900 font-mono font-bold text-xs">
                        Status: {rec.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Recharts Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Hourly Demand Forecast */}
            <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-charcoal-900">
                  Smart Demand Forecast vs Historical Baseline (Orders / Hour)
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Simulated prediction based on seeded 7-day campus meal telemetry with confidence
                  band.
                </p>
              </div>
              <div className="h-72 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={250} minHeight={240}>
                  <AreaChart data={intelligence.hourlyForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="predictedOrders"
                      name="KitchenPulse Predicted Orders"
                      stroke="#0f694d"
                      fill="#d5f5e5"
                      strokeWidth={2.5}
                    />
                    <Area
                      type="monotone"
                      dataKey="historicalAvg"
                      name="7-Day Historical Avg"
                      stroke="#d49b1f"
                      fill="#fef3c7"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Dish Demand & Stock Capacity */}
            <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-charcoal-900">
                  Popular Dishes — Today vs Tomorrow Projected Demand
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Tracks dish velocity alongside real-time ingredient serving capacity.
                </p>
              </div>
              <div className="h-72 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={250} minHeight={240}>
                  <BarChart data={intelligence.dishForecasts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="todayOrders"
                      name="Today Orders"
                      fill="#0d4535"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="projectedTomorrow"
                      name="Tomorrow Forecast"
                      fill="#eab93e"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: PAYPAL PAYMENT INTELLIGENCE DASHBOARD & REFUND MANAGEMENT (Section 5D & 5E) */}
      {activeTab === 'PAYPAL_INTELLIGENCE' && (
        <div className="space-y-6">
          {/* Payment Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-emerald-900/10">
              <div className="text-xs text-charcoal-800/70">Total Transactions</div>
              <div className="font-display font-extrabold text-2xl text-charcoal-900 mt-1">
                {payments.length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="text-xs text-emerald-800">Captured / Verified</div>
              <div className="font-display font-extrabold text-2xl text-emerald-800 mt-1">
                {
                  payments.filter(
                    (p) => p.status === 'CAPTURED' || p.status === 'PARTIALLY_REFUNDED'
                  ).length
                }
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
              <div className="text-xs text-red-800">Failed / Declined</div>
              <div className="font-display font-extrabold text-2xl text-red-700 mt-1">
                {payments.filter((p) => p.status === 'FAILED').length}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="text-xs text-amber-900">Pending / Cancelled</div>
              <div className="font-display font-extrabold text-2xl text-amber-800 mt-1">
                {
                  payments.filter((p) => p.status === 'CREATED' || p.status === 'CANCELLED')
                    .length
                }
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-900/10">
              <div className="text-xs text-charcoal-800/70">Processed Refunds</div>
              <div className="font-display font-extrabold text-2xl text-[#003087] mt-1">
                {refunds.length}
              </div>
            </div>
          </div>

          {/* Filter & Ledger Table */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  PayPal Orders & Captures Ledger
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Click any transaction to inspect raw PayPal Order/Capture IDs, verify webhooks, or
                  issue full/partial refunds.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      paymentStatusFilter === st
                        ? 'bg-emerald-800 text-white'
                        : 'bg-ivory-100 text-charcoal-800 hover:bg-emerald-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-emerald-900/10 text-charcoal-800/70 font-mono uppercase text-[11px]">
                    <th className="py-3 px-3">Token</th>
                    <th className="py-3 px-3">PayPal Order ID</th>
                    <th className="py-3 px-3">PayPal Capture ID</th>
                    <th className="py-3 px-3">Payer</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/10">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-ivory-50/90">
                      <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                        {p.tokenNumber}
                      </td>
                      <td className="py-3 px-3 font-mono text-charcoal-900">{p.paypalOrderId}</td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                        {p.paypalCaptureId || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-charcoal-900">{p.customerName}</div>
                        <div className="text-[10px] text-charcoal-800/60 font-mono">
                          {p.payerEmail || 'student@feedo.demo'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        ${p.amount.toFixed(2)} {p.currency}
                        {p.refundedAmount > 0 && (
                          <span className="block text-[10px] text-amber-700">
                            Refunded: ${p.refundedAmount.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-ivory-200 text-charcoal-800 font-mono text-[10px]">
                          {p.mode === 'PAYPAL_SANDBOX' ? 'SANDBOX' : 'DEMO SIM'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                            p.status === 'CAPTURED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedTransaction(p)}
                          className="px-2.5 py-1 rounded-lg bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 font-semibold"
                        >
                          Details
                        </button>
                        {(p.status === 'CAPTURED' || p.status === 'PARTIALLY_REFUNDED') &&
                          p.paypalCaptureId && (
                            <button
                              onClick={() => {
                                setRefundTarget(p);
                                setRefundAmount((p.amount - p.refundedAmount).toFixed(2));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-semibold"
                            >
                              Refund
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: INVENTORY MANAGEMENT, SUPPLIER REQUESTS & DOCK VERIFICATION */}
      {activeTab === 'INVENTORY_SUPPLIERS' && (
        <div className="space-y-8">
          {/* Active Supplier Replenishment Orders & Dock Verification */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  Supplier Replenishment Pipeline & Receiving Dock Verification
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Inventory is NEVER incremented automatically when requested or dispatched — the
                  Manager must verify physical delivery below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplierRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-ivory-50 border border-emerald-900/15 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-900">
                        #{req.id} • {req.invoiceNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          req.status === 'DELIVERED_VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'DISPATCHED'
                            ? 'bg-gold-300/40 text-charcoal-950'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <div className="font-display font-bold text-base text-charcoal-900">
                      {req.requestedQuantity} {req.unit} — {req.ingredientName}
                    </div>
                    <div className="text-charcoal-800/75">
                      Supplier: <strong>{req.supplierName}</strong> • Est: $
                      {req.totalEstimate.toFixed(2)}
                    </div>
                    {req.notes && <p className="text-[11px] text-emerald-800">{req.notes}</p>}
                  </div>

                  {(req.status === 'DISPATCHED' || req.status === 'ACCEPTED') && (
                    <button
                      onClick={() => handleVerifyDelivery(req.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 shadow"
                    >
                      <CheckCircle2 className="w-4 h-4 text-gold-300" />
                      <span>Verify Delivery & Increment Stock (+{req.requestedQuantity} {req.unit})</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Raw Ingredient Stock Table & Add Ingredient Form */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Live Kitchen Ingredient Inventory & Stock Threshold Control
              </h3>
              <span className="text-xs font-mono text-emerald-800">
                Low-Stock Alerts: {metrics.lowStockIngredientsCount} active
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newIngName.trim()) return;
                try {
                  await apiFetch('/api/manager/ingredients', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: newIngName,
                      category: 'PANTRY',
                      unit: newIngUnit,
                      currentStock: Number(newIngStock),
                      minThreshold: Number(newIngMin),
                      optimalStock: Number(newIngStock) * 2,
                      costPerUnit: Number(newIngCost),
                    }),
                  });
                  setNewIngName('');
                  showToast('Ingredient Added', `${newIngName} added to live inventory.`, 'emerald');
                } catch (err: any) {
                  showToast('Error Adding Ingredient', err.message, 'red');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 bg-ivory-50 p-3.5 rounded-2xl border border-emerald-900/10"
            >
              <input
                type="text"
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                placeholder="New Ingredient Name..."
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                required
              />
              <select
                value={newIngUnit}
                onChange={(e) => setNewIngUnit(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
              >
                <option value="kg">kg</option>
                <option value="liters">liters</option>
                <option value="units">units</option>
              </select>
              <input
                type="number"
                step="0.5"
                value={newIngStock}
                onChange={(e) => setNewIngStock(e.target.value)}
                placeholder="Initial Stock"
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
                required
              />
              <input
                type="number"
                step="0.5"
                value={newIngMin}
                onChange={(e) => setNewIngMin(e.target.value)}
                placeholder="Min Alert"
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-gold-300" />
                <span>Add Stock</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ingredients.map((ing) => {
                const isLow = ing.currentStock <= ing.minThreshold;
                const pct = Math.min(100, Math.round((ing.currentStock / ing.optimalStock) * 100));
                return (
                  <div
                    key={ing.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isLow ? 'bg-red-50/60 border-red-300' : 'bg-ivory-50 border-emerald-900/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-emerald-700 font-semibold">
                          {ing.category}
                        </span>
                        <h4 className="font-display font-bold text-sm text-charcoal-900">
                          {ing.name}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          isLow ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {ing.currentStock.toFixed(2)} {ing.unit}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-ivory-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isLow ? 'bg-red-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-charcoal-800/70">
                      <span>Min Threshold: {ing.minThreshold} {ing.unit}</span>
                      <span>Optimal: {ing.optimalStock} {ing.unit}</span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={async () => {
                          await apiFetch(`/api/manager/ingredients/${ing.id}/adjust`, {
                            method: 'POST',
                            body: JSON.stringify({ delta: 5 }),
                          });
                          showToast('Stock Adjusted', `+5 ${ing.unit} added to ${ing.name}`, 'emerald');
                        }}
                        className="px-2.5 py-2 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-900 text-[11px] font-mono font-bold"
                        title="Manual Stock +5"
                      >
                        +5 {ing.unit}
                      </button>
                      <button
                        onClick={() =>
                          handleCreateSupplierRequest(
                            ing.id,
                            Math.max(10, Math.round(ing.optimalStock - ing.currentStock))
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5 text-gold-300" />
                        <span>
                          Order (+
                          {Math.max(10, Math.round(ing.optimalStock - ing.currentStock))} {ing.unit})
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: MENU DEPENDENCY ENGINE & TABLES */}
      {activeTab === 'MENU_TABLES' && (
        <div className="space-y-8">
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Menu Items Management (Add, Pause/Resume, Delete) & Dependency Status
              </h3>
              <span className="text-xs font-mono text-emerald-800">
                {snapshot.menuItems.length} Total Menu Dishes
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newDishName.trim()) return;
                try {
                  await apiFetch('/api/manager/menu', {
                    method: 'POST',
                    body: JSON.stringify({
                      name: newDishName,
                      category: newDishCategory,
                      price: Number(newDishPrice),
                      prepTimeMinutes: Number(newDishPrepTime),
                      description: newDishDesc || 'Freshly prepared signature canteen dish.',
                    }),
                  });
                  setNewDishName('');
                  setNewDishDesc('');
                  showToast('Menu Dish Added', `${newDishName} is now live on the Customer Menu.`, 'emerald');
                } catch (err: any) {
                  showToast('Failed to Add Dish', err.message, 'red');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 bg-ivory-50 p-3.5 rounded-2xl border border-emerald-900/10"
            >
              <input
                type="text"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                placeholder="New Food Item Name..."
                className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                required
              />
              <select
                value={newDishCategory}
                onChange={(e) => setNewDishCategory(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
              >
                <option value="SOUTH_INDIAN">South Indian</option>
                <option value="MAIN_COURSE">Meals & Curries</option>
                <option value="BEVERAGES">Beverages</option>
                <option value="DESSERTS">Snacks & Sweets</option>
              </select>
              <input
                type="number"
                step="0.10"
                value={newDishPrice}
                onChange={(e) => setNewDishPrice(e.target.value)}
                placeholder="Price ($)"
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
                required
              />
              <input
                type="number"
                value={newDishPrepTime}
                onChange={(e) => setNewDishPrepTime(e.target.value)}
                placeholder="Prep (mins)"
                className="px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
                required
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5 text-gold-300" />
                <span>Add Dish</span>
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snapshot.menuItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-ivory-50 border border-emerald-900/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={handleFoodImageError}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                    <div>
                      <div className="font-display font-bold text-sm text-charcoal-900">
                        {item.name} (${item.price.toFixed(2)})
                      </div>
                      <div className="text-xs text-emerald-800 font-mono">
                        {item.isAvailable
                          ? `Available (${item.maxOrderableServings} servings supported by stock)`
                          : item.unavailableReason}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/manager/menu/${item.id}/toggle`, { method: 'POST' });
                        showToast(
                          item.isManualDisabled ? 'Dish Re-Enabled' : 'Dish Paused by Manager',
                          `${item.name} status updated across all terminals.`,
                          'emerald'
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                        item.isManualDisabled
                          ? 'bg-emerald-800 text-white'
                          : 'bg-ivory-200 text-charcoal-800'
                      }`}
                    >
                      {item.isManualDisabled ? 'Resume Dish' : 'Pause Dish'}
                    </button>
                    <button
                      onClick={async () => {
                        await apiFetch(`/api/manager/menu/${item.id}`, { method: 'DELETE' });
                        showToast('Dish Deleted', `${item.name} removed from menu.`, 'gold');
                      }}
                      className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700"
                      title="Delete Menu Dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Dining Tables & Reservations Control Grid */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  Live Dining Floorplan & Table Release Control ({metrics.availableTablesCount}/{metrics.totalTablesCount} Available)
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Managers can inspect active table reservations and manually release any table after guests depart.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {snapshot.tables.map((t) => (
                <div
                  key={t.tableNumber}
                  className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-2 ${
                    t.status === 'AVAILABLE'
                      ? 'bg-ivory-50 border-emerald-900/10'
                      : 'bg-emerald-50 border-emerald-500/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-charcoal-900">
                        Table #{t.tableNumber}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          t.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gold-300/60 text-charcoal-950'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-charcoal-800/70 mt-1">
                      {t.zone} • {t.capacity} Seats
                    </div>
                    {t.currentCustomerName && (
                      <div className="text-[10px] font-semibold text-emerald-900 mt-1 truncate">
                        Guest: {t.currentCustomerName}
                      </div>
                    )}
                  </div>
                  {t.status !== 'AVAILABLE' && (
                    <button
                      onClick={async () => {
                        await apiFetch('/api/tables/release', {
                          method: 'POST',
                          body: JSON.stringify({ tableNumber: t.tableNumber }),
                        });
                        showToast(
                          `Table #${t.tableNumber} Released`,
                          'Table is now marked AVAILABLE on the live floorplan.',
                          'emerald'
                        );
                      }}
                      className="w-full py-1 px-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-[10px] flex items-center justify-center gap-1"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                      <span>Release</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: WASTE ANALYTICS, STAFF SHIFTS & AUDIT LOGS */}
      {activeTab === 'WASTE_STAFF_AUDIT' && (
        <div className="space-y-6">
          {/* Interactive Food Waste Logger & Waste Records */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-emerald-700" />
                  <span>Intelligent Food Waste Telemetry & Batch Loss Logger</span>
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Log unsold batches or expiring ingredients to train KitchenPulse AI waste reduction recommendations.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-mono text-xs font-bold">
                Recorded Loss: ${intelligence.wasteSummary.totalRecordedLossUsd.toFixed(2)} ({intelligence.wasteSummary.totalWasteKgOrLiters} kg/L)
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiFetch('/api/manager/waste', {
                    method: 'POST',
                    body: JSON.stringify({
                      itemName: wasteItemName,
                      category: 'PREPARED_SURPLUS',
                      quantity: Number(wasteQty),
                      unit: 'kg',
                      reason: wasteReason,
                      estimatedCostLoss: Number(wasteLossUsd),
                    }),
                  });
                  showToast(
                    'Food Waste Batch Logged',
                    `${wasteQty} kg of ${wasteItemName} recorded in KitchenPulse AI telemetry.`,
                    'emerald'
                  );
                } catch (err: any) {
                  showToast('Error Logging Waste', err.message, 'red');
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-ivory-50 p-4 rounded-2xl border border-emerald-900/10"
            >
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold mb-1">Dish or Ingredient</label>
                <input
                  type="text"
                  value={wasteItemName}
                  onChange={(e) => setWasteItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Quantity (kg/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold mb-1">Reason</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                >
                  <option value="UNSOLD_BATCH">Unsold Batch</option>
                  <option value="OVERPRODUCTION">Overproduction</option>
                  <option value="EXPIRED_INGREDIENT">Expired Ingredient</option>
                  <option value="PREPARATION_ERROR">Preparation Error</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gold-300" />
                  <span>Log Waste (${wasteLossUsd})</span>
                </button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {snapshot.wasteRecords.map((w) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-ivory-50 border border-emerald-900/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                      {w.reason}
                    </span>
                    <span className="font-mono font-bold text-red-700">
                      -${w.estimatedCostLoss.toFixed(2)}
                    </span>
                  </div>
                  <div className="font-display font-bold text-sm text-charcoal-900">
                    {w.itemName}
                  </div>
                  <div className="text-[11px] text-charcoal-800/70 font-mono">
                    {w.quantity} {w.unit} • {new Date(w.recordedAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preloaded Kitchen Chef Roster & Shift Management */}
            <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  Preloaded Kitchen Chef Roster & Station Shifts
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Manage the preloaded chef list selectable in the Common Kitchen Staff Login dropdown.
                  Toggling chefs on/off shift dynamically updates waiting time predictions.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newChefName.trim()) return;
                  try {
                    await apiFetch('/api/manager/staff', {
                      method: 'POST',
                      body: JSON.stringify({
                        name: newChefName,
                        role: newChefRole,
                        station: newChefStation,
                        shift: newChefShift,
                      }),
                    });
                    setNewChefName('');
                    showToast('Chef Added to Roster', `${newChefName} added to preloaded Kitchen dropdown.`, 'emerald');
                  } catch (err: any) {
                    showToast('Error Adding Chef', err.message, 'red');
                  }
                }}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-ivory-50 p-3 rounded-2xl border border-emerald-900/10"
              >
                <input
                  type="text"
                  value={newChefName}
                  onChange={(e) => setNewChefName(e.target.value)}
                  placeholder="Chef Name (e.g. Chef Karthik)"
                  className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                  required
                />
                <select
                  value={newChefRole}
                  onChange={(e) => setNewChefRole(e.target.value as any)}
                  className="px-2.5 py-2 rounded-xl bg-white border border-emerald-900/15 text-xs"
                >
                  <option value="HEAD_CHEF">Head Chef</option>
                  <option value="SOUS_CHEF">Sous Chef</option>
                  <option value="LINE_COOK">Line Cook</option>
                  <option value="BARISTA">Barista</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-gold-300" />
                  <span>Add Chef</span>
                </button>
              </form>

              <div className="space-y-2.5">
                {snapshot.staff.map((st) => (
                  <div
                    key={st.id}
                    className="p-3.5 rounded-2xl bg-ivory-50 border border-emerald-900/10 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-display font-bold text-sm text-charcoal-900">
                        {st.name}{' '}
                        <span className="text-xs font-mono text-emerald-700">({st.role})</span>
                      </div>
                      <div className="text-xs text-charcoal-800/70">
                        {st.station} • {st.shift}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => apiFetch(`/api/manager/staff/${st.id}/toggle`, { method: 'POST' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                          st.active
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-ivory-200 text-charcoal-800'
                        }`}
                      >
                        {st.active ? 'On Shift (Active)' : 'Off Shift'}
                      </button>
                      <button
                        onClick={async () => {
                          await apiFetch(`/api/manager/staff/${st.id}`, { method: 'DELETE' });
                          showToast('Chef Removed', `${st.name} removed from preloaded roster.`, 'gold');
                        }}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700"
                        title="Remove Chef from Roster"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Immutable Security & Payment Audit Logs */}
            <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Immutable Security, Payment & Inventory Audit Trail
              </h3>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {snapshot.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-ivory-50 border border-emerald-900/10 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-emerald-900">{log.action}</span>
                      <span className="text-charcoal-800/60">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-charcoal-800/85">{log.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Multi-Criteria Ratings & Feedback Summary (Part 16) */}
          <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-charcoal-900 flex items-center gap-2">
                  <Star className="w-4 h-4 text-emerald-800 fill-emerald-800" />
                  <span>Customer Multi-Criteria Ratings & Post-Order Feedback</span>
                </h3>
                <p className="text-xs text-charcoal-800/70">
                  Evaluates Food Quality, Preparation Time, Service Quality, and Overall Experience across verified orders.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {snapshot.orders
                .filter((o) => o.rating || o.feedbackDetails)
                .map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl bg-ivory-50 border border-emerald-900/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-900">
                        Token {o.tokenNumber} • {o.customerName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono font-bold">
                        {o.rating || o.feedbackDetails?.overallExperience || 5}★
                      </span>
                    </div>
                    {o.feedbackDetails && (
                      <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-charcoal-800/75 bg-white p-2 rounded-xl border border-emerald-900/10">
                        <span>Food Quality: {o.feedbackDetails.foodQuality}★</span>
                        <span>Prep Time: {o.feedbackDetails.preparationTime}★</span>
                        <span>Service: {o.feedbackDetails.serviceQuality}★</span>
                        <span>Overall: {o.feedbackDetails.overallExperience}★</span>
                      </div>
                    )}
                    {o.feedbackComment && (
                      <p className="text-charcoal-800 italic">"{o.feedbackComment}"</p>
                    )}
                    <div className="text-[10px] font-mono text-charcoal-800/60">
                      Chef: {o.assignedChefName || 'Chef not assigned'} • {o.orderType || 'DINE_IN'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-ivory-50 border border-emerald-900/20 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
              <h3 className="font-display font-bold text-base text-charcoal-900">
                PayPal Transaction Intelligence Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-xs font-bold text-charcoal-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono bg-white p-4 rounded-2xl border border-emerald-900/10">
              <div>
                <strong>PayPal Order ID:</strong> {selectedTransaction.paypalOrderId}
              </div>
              <div>
                <strong>PayPal Capture ID:</strong> {selectedTransaction.paypalCaptureId || 'N/A'}
              </div>
              <div>
                <strong>Idempotency Key:</strong> {selectedTransaction.idempotencyKey}
              </div>
              <div>
                <strong>Order Token:</strong> {selectedTransaction.tokenNumber}
              </div>
              <div>
                <strong>Status:</strong> {selectedTransaction.status}
              </div>
              <div>
                <strong>Webhook Verified:</strong>{' '}
                {selectedTransaction.webhookVerified ? 'YES (Verified)' : 'Pending Webhook'}
              </div>
              {selectedTransaction.failureReason && (
                <div className="text-red-700">
                  <strong>Failure Reason:</strong> {selectedTransaction.failureReason}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => handleSimulateWebhook(selectedTransaction)}
                className="px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
              >
                Trigger Webhook Verification Test
              </button>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 rounded-xl bg-ivory-200 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND INITIATION MODAL */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-3xl bg-ivory-50 border border-emerald-900/20 p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-charcoal-900">
              Initiate PayPal Capture Refund
            </h3>
            <p className="text-xs text-charcoal-800/75">
              Refunding Capture ID <code>{refundTarget.paypalCaptureId}</code> (Order Token{' '}
              <strong>{refundTarget.tokenNumber}</strong>). Refund is only recorded after PayPal API
              confirmation.
            </p>
            <form onSubmit={handleInitiateRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Refund Amount ({refundTarget.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={refundTarget.amount - refundTarget.refundedAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-900/20 text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Reason / Note to Payer</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-900/20 text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-4 py-2 rounded-xl bg-ivory-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Confirm PayPal Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
