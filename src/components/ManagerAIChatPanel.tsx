import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Printer,
  Send,
  PieChart,
  BarChart3,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Utensils,
  CreditCard,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import type { ManagerFinancialAnalytics } from '../../server/aiAssistants.ts';

interface ManagerChatTurn {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedPrompts?: string[];
}

const MANAGER_PROMPTS = [
  "What is today's net profit?",
  'Show weekly profit and loss report',
  'Show monthly revenue & payment breakdown',
  'Which food item generated the highest revenue?',
  'Which items are causing losses?',
  'Compare this week with last week',
  'Show food waste and inventory cost impact',
  'Compare Dine-In and Takeaway sales',
];

export const ManagerAIChatPanel: React.FC = () => {
  const { snapshot, apiFetch, showToast } = useEcosystem();

  const [selectedPeriodTab, setSelectedPeriodTab] = useState<
    'daily' | 'weekly' | 'monthly' | 'pnl' | 'products'
  >('daily');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [customAnalytics, setCustomAnalytics] = useState<ManagerFinancialAnalytics | null>(null);
  const [loadingDate, setLoadingDate] = useState(false);

  // Expense form state
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<
    | 'INGREDIENT_PROCUREMENT'
    | 'PACKAGING'
    | 'UTILITIES_OPERATIONS'
    | 'STAFF_WAGES'
    | 'EQUIPMENT_MAINTENANCE'
    | 'OTHER'
  >('UTILITIES_OPERATIONS');
  const [expenseAmount, setExpenseAmount] = useState('45.00');
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Conversational BI state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ManagerChatTurn[]>([
    {
      id: 'mgr-ai-welcome',
      sender: 'ai',
      text: `Welcome to **FEEDO Manager AI** — your dedicated Business Intelligence, Profit & Loss, and Operational Strategy Assistant.\n\nSelect a timeframe tab (**Daily**, **Weekly**, **Monthly**, **Profit & Loss**, or **Product Profitability**) or ask any natural-language financial question below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedPrompts: MANAGER_PROMPTS,
    },
  ]);

  const analytics: ManagerFinancialAnalytics | undefined =
    customAnalytics || (snapshot?.financialAnalytics as ManagerFinancialAnalytics | undefined);

  const handleDateChange = async (nextDate: string) => {
    setSelectedDate(nextDate);
    setLoadingDate(true);
    try {
      const data = await apiFetch(
        `/api/manager/financial-analytics?date=${encodeURIComponent(nextDate)}`
      );
      setCustomAnalytics(data);
    } catch (err: any) {
      showToast('Failed to load date analytics', err.message, 'red');
    } finally {
      setLoadingDate(false);
    }
  };

  const askManagerAI = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || chatLoading) return;

    setChatHistory((prev) => [
      ...prev,
      {
        id: `mgr-usr-${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiFetch('/api/ai/manager-chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          dateFilter: selectedDate,
        }),
      });

      if (res.analytics) {
        setCustomAnalytics(res.analytics);
      }

      setChatHistory((prev) => [
        ...prev,
        {
          id: `mgr-ai-${Date.now()}`,
          sender: 'ai',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: res.suggestedPrompts || MANAGER_PROMPTS.slice(0, 5),
        },
      ]);
    } catch (err: any) {
      showToast('Manager AI Query Error', err.message, 'red');
    } finally {
      setChatLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || submittingExpense) return;
    setSubmittingExpense(true);
    try {
      await apiFetch('/api/manager/expenses', {
        method: 'POST',
        body: JSON.stringify({
          title: expenseTitle.trim(),
          category: expenseCategory,
          amount: Number(expenseAmount) || 25,
          date: selectedDate,
        }),
      });
      setExpenseTitle('');
      setCustomAnalytics(null);
      showToast('Operational Expense Recorded', 'Profit & Loss statement updated immediately');
    } catch (err: any) {
      showToast('Failed to record expense', err.message, 'red');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const rows: (string | number)[][] = [
      ['FEEDO MANAGER AI - FINANCIAL & PROFITABILITY REPORT'],
      ['Generated At', analytics.generatedAt],
      ['Selected Date', analytics.selectedDate],
      [],
      ['SUMMARY METRIC', 'DAILY', 'WEEKLY', 'MONTHLY'],
      [
        'Net Revenue ($)',
        analytics.daily.netRevenue,
        analytics.weekly.netRevenue,
        analytics.monthly.netRevenue,
      ],
      [
        'Recipe COGS ($)',
        analytics.daily.cogs,
        analytics.weekly.cogs,
        analytics.monthly.cogs,
      ],
      [
        'Operating Expenses ($)',
        analytics.daily.operatingExpenses,
        analytics.weekly.operatingExpenses,
        analytics.monthly.operatingExpenses,
      ],
      [
        'Wastage Losses ($)',
        analytics.daily.wastageCost,
        analytics.weekly.wastageCost,
        analytics.monthly.wastageCost,
      ],
      [
        'Net Profit / Loss ($)',
        analytics.daily.netProfit,
        analytics.weekly.netProfit,
        analytics.monthly.netProfit,
      ],
      [
        'Net Profit Margin (%)',
        analytics.daily.netMarginPct,
        analytics.weekly.netMarginPct,
        analytics.monthly.netMarginPct,
      ],
      [],
      ['PRODUCT PROFITABILITY'],
      [
        'Dish Name',
        'Category',
        'Units Sold Today',
        'Menu Price ($)',
        'Unit Recipe + Packaging Cost ($)',
        'Gross Margin (%)',
        'Revenue Today ($)',
        'Profit Today ($)',
      ],
      ...analytics.productProfitability.map((p) => [
        p.name,
        p.category,
        p.unitsSoldToday,
        p.sellingPrice,
        p.totalUnitCost,
        p.grossMarginPct,
        p.totalRevenueToday,
        p.totalProfitToday,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((r) => r.map((cell) => `"${String(cell ?? '')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FEEDO-Manager-AI-Financial-Report-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Financial Report Exported', 'Downloaded CSV report for accounting & review');
  };

  if (!analytics) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-stone-200 text-center text-stone-500">
        Loading FEEDO Manager AI Financial Engine...
      </div>
    );
  }

  const lossOrRiskItems = analytics.productProfitability.filter(
    (p) => !p.isAvailable || p.grossMarginPct < 60
  );

  return (
    <div className="space-y-6" data-testid="manager-ai-panel">
      {/* Top Banner: FEEDO Manager AI Header + Date Selector + Export Actions */}
      <div className="bg-emerald-950 text-ivory-50 rounded-3xl p-6 border border-emerald-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800/90 border border-emerald-600/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-gold-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-xl text-white">
                FEEDO Manager AI — Business Intelligence & Profit/Loss Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-800 text-gold-300 border border-emerald-700">
                Real-Time Financial Analyst
              </span>
            </div>
            <p className="text-xs text-emerald-200/85 mt-1 max-w-2xl">
              Automated Daily, Weekly & Monthly P&L accounting, recipe-level COGS deduction,
              operational expense tracking, wastage impact, and product profitability intelligence.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-emerald-900/90 border border-emerald-700 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-gold-300" />
            <span className="text-[11px] text-emerald-200 font-medium">Analysis Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-xs font-bold text-white border border-emerald-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Period & Analysis Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-stone-200 shadow-2xs">
        {[
          { id: 'daily', label: 'Daily Analysis (DoD)', icon: Calendar },
          { id: 'weekly', label: 'Weekly Analysis (WoW)', icon: BarChart3 },
          { id: 'monthly', label: 'Monthly Analysis (MoM)', icon: PieChart },
          { id: 'pnl', label: 'Profit & Loss Statement', icon: DollarSign },
          { id: 'products', label: 'Product Profitability & Losses', icon: Utensils },
        ].map((t) => {
          const Icon = t.icon;
          const active = selectedPeriodTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedPeriodTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                active
                  ? 'bg-emerald-900 text-white shadow-sm'
                  : 'text-stone-600 hover:bg-ivory-100 hover:text-stone-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
        {loadingDate && (
          <span className="text-xs text-emerald-800 font-semibold ml-auto pr-3 animate-pulse">
            Recalculating for {selectedDate}...
          </span>
        )}
      </div>

      {/* Main Grid: Left Financial & Operational Views | Right Natural-Language AI Analyst */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left 7 Columns: Structured Financial & BI Dashboards */}
        <div className="xl:col-span-7 space-y-6">
          {/* TAB 1: DAILY ANALYSIS */}
          {selectedPeriodTab === 'daily' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900">
                    {analytics.daily.periodLabel} ({analytics.selectedDate})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Day-over-Day comparison vs previous day ($
                    {analytics.daily.previousPeriodRevenue.toFixed(2)} revenue)
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                    analytics.daily.revenueGrowthPct >= 0
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {analytics.daily.revenueGrowthPct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {analytics.daily.revenueGrowthPct >= 0 ? '+' : ''}
                  {analytics.daily.revenueGrowthPct}% vs Yesterday
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500">Net Sales Revenue</div>
                  <div className="text-xl font-display font-bold text-stone-900 mt-1">
                    ${analytics.daily.netRevenue.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    AOV: ${analytics.daily.avgOrderValue.toFixed(2)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500">
                    COGS + Expenses + Waste
                  </div>
                  <div className="text-xl font-display font-bold text-stone-900 mt-1">
                    ${analytics.daily.totalExpenses.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    COGS ${analytics.daily.cogs.toFixed(2)} • OpEx $
                    {analytics.daily.operatingExpenses.toFixed(2)}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    analytics.daily.netProfit >= 0
                      ? 'bg-green-50/70 border-green-200'
                      : 'bg-red-50/70 border-red-200'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-stone-600">
                    {analytics.daily.netProfit >= 0 ? 'Daily Net Profit' : 'Daily Net Loss'}
                  </div>
                  <div
                    className={`text-xl font-display font-bold mt-1 ${
                      analytics.daily.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    ${analytics.daily.netProfit.toFixed(2)}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-600 mt-1">
                    Margin: {analytics.daily.netMarginPct}%
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500">Order Volume</div>
                  <div className="text-xl font-display font-bold text-stone-900 mt-1">
                    {analytics.daily.totalOrders} Orders
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {analytics.daily.dineInOrders} Dine-In • {analytics.daily.takeawayOrders}{' '}
                    Takeaway
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Best-Selling Dish
                  </div>
                  <div className="text-sm font-bold text-stone-900 mt-1">
                    {analytics.daily.bestSellingItem}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Peak Ordering Window
                  </div>
                  <div className="text-sm font-bold text-stone-900 mt-1">
                    {analytics.daily.peakHoursWindow}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                    Wastage Impact Today
                  </div>
                  <div className="text-sm font-bold text-stone-900 mt-1">
                    ${analytics.daily.wastageCost.toFixed(2)} Recorded
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEEKLY ANALYSIS */}
          {selectedPeriodTab === 'weekly' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900">
                    {analytics.weekly.periodLabel}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Best Day: <strong>{analytics.weekly.bestPerformingDay}</strong> • Lowest Day:{' '}
                    <strong>{analytics.weekly.lowestPerformingDay}</strong>
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                  <TrendingUp className="w-3.5 h-3.5" />+{analytics.weekly.revenueGrowthPct}% WoW
                  Growth
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500">Weekly Net Revenue</div>
                  <div className="text-xl font-display font-bold text-stone-900 mt-1">
                    ${analytics.weekly.netRevenue.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    Avg ${analytics.weekly.avgDailyRevenue.toFixed(2)}/day
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] font-semibold text-stone-500">
                    Weekly COGS + Expenses
                  </div>
                  <div className="text-xl font-display font-bold text-stone-900 mt-1">
                    ${analytics.weekly.totalExpenses.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    {analytics.weekly.totalOrders} orders ({analytics.weekly.avgDailyOrders}/day)
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-green-50/70 border border-green-200">
                  <div className="text-[11px] font-semibold text-stone-600">Weekly Net Profit</div>
                  <div className="text-xl font-display font-bold text-green-700 mt-1">
                    ${analytics.weekly.netProfit.toFixed(2)} ({analytics.weekly.netMarginPct}%)
                  </div>
                  <div className="text-[10px] text-green-700 font-semibold mt-1">
                    +{analytics.weekly.profitGrowthPct}% vs Last Week
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="font-bold text-stone-800">Weekly Dine-In Revenue</div>
                  <div className="text-lg font-display font-bold text-emerald-900 mt-1">
                    ${analytics.weekly.dineInRevenue.toFixed(2)} ({analytics.weekly.dineInOrders}{' '}
                    orders)
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="font-bold text-stone-800">Weekly Takeaway Revenue</div>
                  <div className="text-lg font-display font-bold text-emerald-900 mt-1">
                    ${analytics.weekly.takeawayRevenue.toFixed(2)} (
                    {analytics.weekly.takeawayOrders} orders)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY ANALYSIS */}
          {selectedPeriodTab === 'monthly' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900">
                    {analytics.monthly.periodLabel}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Includes Category-wise Performance, PayPal Payment Method Share & Expense Breakdown
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                  <TrendingUp className="w-3.5 h-3.5" />+{analytics.monthly.revenueGrowthPct}% MoM
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] text-stone-500 font-semibold">Monthly Net Revenue</div>
                  <div className="text-lg font-display font-bold text-stone-900 mt-1">
                    ${analytics.monthly.netRevenue.toFixed(2)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] text-stone-500 font-semibold">Recipe COGS</div>
                  <div className="text-lg font-display font-bold text-stone-900 mt-1">
                    ${analytics.monthly.cogs.toFixed(2)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-ivory-50 border border-stone-200">
                  <div className="text-[11px] text-stone-500 font-semibold">Operating Expenses</div>
                  <div className="text-lg font-display font-bold text-stone-900 mt-1">
                    ${analytics.monthly.operatingExpenses.toFixed(2)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-green-50/70 border border-green-200">
                  <div className="text-[11px] text-stone-600 font-semibold">Monthly Net Profit</div>
                  <div className="text-lg font-display font-bold text-green-700 mt-1">
                    ${analytics.monthly.netProfit.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200 space-y-2.5">
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-800" />
                    Category-Wise Profit & Margin
                  </div>
                  {analytics.categoryPerformance.map((c) => (
                    <div key={c.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-stone-700">{c.category}</span>
                        <span className="font-mono font-bold text-stone-900">
                          ${c.revenue.toFixed(2)} ({c.marginPct}% margin)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(10, c.marginPct)}%` }}
                          className="h-full bg-emerald-800 rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200 space-y-2.5">
                  <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-800" />
                    PayPal Payment Method Breakdown
                  </div>
                  {analytics.paymentMethodDistribution.map((pm) => (
                    <div
                      key={pm.method}
                      className="flex items-center justify-between p-2 rounded-xl bg-white border border-stone-200/80 text-xs"
                    >
                      <div>
                        <div className="font-bold text-stone-800">{pm.method}</div>
                        <div className="text-[10px] text-stone-500">
                          {pm.transactions} verified txns ({pm.sharePct}%)
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-900">
                        ${pm.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFIT & LOSS STATEMENT + EXPENSE LOGGER */}
          {selectedPeriodTab === 'pnl' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-stone-900">
                    Comprehensive Profit & Loss Statement ({analytics.daily.periodLabel})
                  </h3>
                  <p className="text-xs text-stone-500">
                    Gross Sales − Refunds − Recipe COGS − Operating Expenses − Wastage = Net Profit
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    analytics.daily.netProfit >= 0
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {analytics.daily.netProfit >= 0 ? 'PROFITABLE' : 'NET LOSS'} •{' '}
                  {analytics.daily.netMarginPct}% Net Margin
                </span>
              </div>

              <div className="divide-y divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden text-xs">
                <div className="flex justify-between p-3.5 bg-ivory-50 font-bold text-stone-900">
                  <span>Gross Captured Sales Revenue (incl. 5% GST)</span>
                  <span className="font-mono text-green-700">
                    +${analytics.daily.grossSales.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-white text-stone-700">
                  <span>Less: PayPal Refunds Processed</span>
                  <span className="font-mono text-red-600">
                    -${analytics.daily.refundsTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-ivory-50 font-bold text-stone-900">
                  <span>Net Sales Revenue</span>
                  <span className="font-mono">${analytics.daily.netRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-white text-stone-700">
                  <span>Less: Recipe Ingredient & Packaging COGS</span>
                  <span className="font-mono text-red-600">
                    -${analytics.daily.cogs.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-ivory-50 font-bold text-stone-900">
                  <span>Gross Culinary Profit ({analytics.daily.grossMarginPct}%)</span>
                  <span className="font-mono">${analytics.daily.grossProfit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-3.5 bg-white text-stone-700">
                  <span>Less: Recorded Operating Expenses (Utilities, Packaging, Staff)</span>
                  <span className="font-mono text-red-600">
                    -${analytics.daily.operatingExpenses.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-3.5 bg-white text-stone-700">
                  <span>Less: Recorded Kitchen Wastage & Spoilage Loss</span>
                  <span className="font-mono text-red-600">
                    -${analytics.daily.wastageCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-4 bg-emerald-950 text-white font-bold text-sm">
                  <span>Net Operating Profit / (Loss)</span>
                  <span className="font-mono text-gold-300">
                    ${analytics.daily.netProfit.toFixed(2)} ({analytics.daily.netMarginPct}%)
                  </span>
                </div>
              </div>

              {/* Record New Operational Expense Form */}
              <form
                onSubmit={handleAddExpense}
                className="p-4 rounded-2xl bg-ivory-50 border border-stone-200 space-y-3"
              >
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-800" />
                  Record Canteen Operational Expense
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="Expense description (e.g. Packaging)"
                    className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                  />
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                  >
                    <option value="UTILITIES_OPERATIONS">Utilities & Operations</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="STAFF_WAGES">Staff Wages</option>
                    <option value="INGREDIENT_PROCUREMENT">Ingredient Procurement</option>
                    <option value="EQUIPMENT_MAINTENANCE">Equipment Maintenance</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      disabled={submittingExpense || !expenseTitle.trim()}
                      className="px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: PRODUCT PROFITABILITY & LOSS-MAKING DISHES */}
          {selectedPeriodTab === 'products' && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
              <div>
                <h3 className="font-display font-bold text-base text-stone-900">
                  Dish-Level Profitability, Margin & Stockout Loss Analysis
                </h3>
                <p className="text-xs text-stone-500">
                  Calculated from live selling price vs recipe ingredient + packaging cost per serving
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 text-[11px] uppercase">
                      <th className="py-2.5 pr-3">Dish</th>
                      <th className="py-2.5 px-2">Sold Today</th>
                      <th className="py-2.5 px-2">Price</th>
                      <th className="py-2.5 px-2">Unit Cost</th>
                      <th className="py-2.5 px-2">Margin %</th>
                      <th className="py-2.5 pl-2 text-right">Profit Today</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {analytics.productProfitability.map((item) => (
                      <tr key={item.menuItemId} className="hover:bg-ivory-50">
                        <td className="py-2.5 pr-3 font-bold text-stone-900">
                          {item.name}
                          {!item.isAvailable && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded bg-red-50 text-red-700 border border-red-200">
                              Stockout Locked
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono">{item.unitsSoldToday}</td>
                        <td className="py-2.5 px-2 font-mono">${item.sellingPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-2 font-mono text-stone-600">
                          ${item.totalUnitCost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.grossMarginPct >= 60
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.grossMarginPct}%
                          </span>
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono font-bold text-green-700">
                          +${item.totalProfitToday.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {lossOrRiskItems.length > 0 && (
                <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2">
                  <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Items Causing Revenue Loss or Margin Risk
                  </div>
                  {lossOrRiskItems.map((riskItem) => (
                    <div
                      key={riskItem.menuItemId}
                      className="text-xs text-red-800 flex items-center justify-between bg-white/80 px-3 py-2 rounded-xl border border-red-200/70"
                    >
                      <span className="font-bold">{riskItem.name}</span>
                      <span className="text-[11px]">{riskItem.statusNote}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Data Completeness & Audit Note */}
          <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs flex items-center gap-3 text-xs text-stone-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>{analytics.dataCompletenessNote}</span>
          </div>
        </div>

        {/* Right 5 Columns: Natural-Language Conversational BI Assistant */}
        <div className="xl:col-span-5 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col h-[640px] overflow-hidden">
          <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-gold-300" />
              <div>
                <h3 className="text-xs font-bold">Ask FEEDO Manager AI</h3>
                <p className="text-[10px] text-emerald-200">
                  Natural-Language Financial & Profit/Loss Analyst
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-800 text-emerald-100">
              Manager Role Only
            </span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-ivory-50">
            {chatHistory.map((turn) => (
              <div
                key={turn.id}
                className={`flex flex-col ${
                  turn.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    turn.sender === 'user'
                      ? 'bg-emerald-900 text-white rounded-br-xs'
                      : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {turn.text.split('**').map((part, i) =>
                      i % 2 === 1 ? (
                        <strong key={i} className="font-bold">
                          {part}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 px-1">{turn.timestamp}</span>

                {turn.sender === 'ai' &&
                  turn.suggestedPrompts &&
                  turn.suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {turn.suggestedPrompts.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => askManagerAI(p)}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

            {chatLoading && (
              <div className="text-xs text-stone-500 bg-white px-4 py-2.5 rounded-2xl border border-stone-200 w-fit flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800 animate-spin" />
                Computing financial metrics from live database...
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              askManagerAI(chatInput);
            }}
            className="p-3 bg-white border-t border-stone-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask e.g. 'What is today's net profit?' or 'Which items cause losses?'"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-ivory-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-emerald-700"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="p-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
