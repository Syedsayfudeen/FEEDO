import React, { useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  Sparkles,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertOctagon,
  MapPin,
  Receipt,
  Star,
  BellRing,
  Utensils,
  ShieldCheck,
  Info,
  ArrowRight,
  CalendarCheck,
  Users,
  ChefHat,
  PackageCheck,
} from 'lucide-react';
import { useEcosystem, handleFoodImageError } from '../context/EcosystemContext.tsx';
import { FoodCategory, Order } from '../../shared/types.ts';
import { CustomerAIChatWidget } from './CustomerAIChatWidget.tsx';

export const CustomerDashboard: React.FC = () => {
  const {
    snapshot,
    currentUser,
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
    setIsCheckoutModalOpen,
    setReceiptOrder,
    apiFetch,
    showToast,
    isDemoActive,
    demoStep,
    setDemoStep,
  } = useEcosystem();

  const [activeTab, setActiveTab] = useState<'MENU' | 'TABLES' | 'TRACKING_QUEUE' | 'HISTORY'>(
    'MENU'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FoodCategory>('ALL');
  const [sortBy, setSortBy] = useState<'FEATURED' | 'PRICE_ASC' | 'PREP_FAST'>('FEATURED');
  const [expandedRecipeItemId, setExpandedRecipeItemId] = useState<string | null>(null);
  const [queueGuests, setQueueGuests] = useState(4);
  const [queueZone, setQueueZone] = useState('Main Dining Hall');
  const [feedbackDraft, setFeedbackDraft] = useState<
    Record<
      string,
      {
        rating: number;
        foodQuality: number;
        prepTime: number;
        serviceQuality: number;
        overallExperience: number;
        text: string;
      }
    >
  >({});

  if (!snapshot) return null;

  const categories: ('ALL' | FoodCategory)[] = [
    'ALL',
    'Breakfast',
    'Main Course',
    'Snacks',
    'Beverages',
    'Desserts',
  ];

  const filteredMenu = snapshot.menuItems
    .filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (
        searchQuery.trim() &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.recipe.some((r) =>
          r.ingredientName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.price - b.price;
      if (sortBy === 'PREP_FAST')
        return (
          (a.dynamicPrepTimeMinutes || a.basePrepTimeMinutes) -
          (b.dynamicPrepTimeMinutes || b.basePrepTimeMinutes)
        );
      return 0;
    });

  const subtotal = Number(
    cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0).toFixed(2)
  );
  const tax = Number((subtotal * 0.05).toFixed(2));
  const totalAmount = Number((subtotal + tax).toFixed(2));

  const activeOrders = snapshot.orders.filter(
    (o) =>
      o.paymentStatus === 'CAPTURED' &&
      ['CONFIRMED_INCOMING', 'ACCEPTED', 'PREPARING', 'READY_FOR_COLLECTION'].includes(o.status)
  );
  const myOrders = snapshot.orders.filter(
    (o) =>
      o.paymentStatus !== 'CREATED' &&
      (o.customerId === currentUser?.id || o.customerEmail === 'student@feedo.demo')
  );

  const handleReserveTable = async (tableNumber: number) => {
    try {
      await apiFetch('/api/tables/reserve', {
        method: 'POST',
        body: JSON.stringify({
          tableNumber,
          customerId: currentUser?.id || 'usr-customer-1',
          customerName: currentUser?.name || 'Aarav Sharma',
          guests: 2,
          timeSlot: 'Immediate Dining (Next 60m)',
        }),
      });
      setSelectedTable(tableNumber);
      showToast(
        `Reserved Table #${tableNumber}`,
        'Linked to your active dining session & PayPal checkout.',
        'emerald'
      );
      if (isDemoActive && demoStep === 1 && tableNumber === 12) {
        setDemoStep(2);
      }
    } catch (err: any) {
      showToast('Table Reservation Failed', err.message, 'red');
    }
  };

  const handleReleaseTable = async (tableNumber: number) => {
    try {
      await apiFetch('/api/tables/release', {
        method: 'POST',
        body: JSON.stringify({ tableNumber }),
      });
      if (selectedTable === tableNumber) {
        setSelectedTable(undefined);
      }
      showToast(`Released Table #${tableNumber}`, 'Table is now available for other diners.', 'emerald');
    } catch (err: any) {
      showToast('Table Release Error', err.message, 'red');
    }
  };

  const handleCollectReadyOrder = async (order: Order) => {
    try {
      await apiFetch(`/api/orders/${order.id}/collect`, { method: 'POST' });
      showToast(
        `Collected Order ${order.tokenNumber}!`,
        'Enjoy your meal! Smart Counter display cleared.',
        'emerald'
      );
      if (isDemoActive && demoStep === 12) {
        setDemoStep(13);
      }
    } catch (err: any) {
      showToast('Collection Error', err.message, 'red');
    }
  };

  const handleJoinWaitingQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/waiting-queue/join', {
        method: 'POST',
        body: JSON.stringify({
          customerId: currentUser?.id || 'usr-customer-1',
          customerName: currentUser?.name || 'Aarav Sharma',
          guests: queueGuests,
          preferredZone: queueZone,
        }),
      });
      showToast(
        'Joined Digital Waiting Queue',
        `Reserved spot for ${queueGuests} guests in ${queueZone}.`,
        'emerald'
      );
    } catch (err: any) {
      showToast('Queue Error', err.message, 'red');
    }
  };

  const handleAllocateQueueTable = async (entryId: string) => {
    try {
      const res = await apiFetch(`/api/waiting-queue/${entryId}/allocate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res.table?.tableNumber) {
        setSelectedTable(res.table.tableNumber);
      }
      showToast(
        `Table #${res.table?.tableNumber || 5} Allocated!`,
        'Waiting queue guest has been seated and linked to Dine-In.',
        'emerald'
      );
    } catch (err: any) {
      showToast('Allocation Error', err.message, 'red');
    }
  };

  const handleSubmitFeedback = async (orderId: string) => {
    const draft = feedbackDraft[orderId] || {
      rating: 5,
      foodQuality: 5,
      prepTime: 5,
      serviceQuality: 5,
      overallExperience: 5,
      text: 'Fast PayPal checkout & delicious meal!',
    };
    try {
      await apiFetch(`/api/orders/${orderId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: draft.rating,
          foodQuality: draft.foodQuality,
          prepTime: draft.prepTime,
          serviceQuality: draft.serviceQuality,
          overallExperience: draft.overallExperience,
          feedback: draft.text,
        }),
      });
      showToast('Feedback Submitted', 'Thank you for rating your FEEDO experience!', 'emerald');
    } catch (err: any) {
      showToast('Error saving rating', err.message, 'red');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Customer Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-charcoal-900 text-ivory-50 p-6 sm:p-8 shadow-xl border border-emerald-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-xs text-emerald-200 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>
              Welcome, <strong>{currentUser?.name || 'Aarav Sharma'}</strong> • FEEDO Smart Canteen
            </span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight">
            Dine-In Table Service, Express Takeaway & Instant PayPal Checkout
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
            Choose Dine-In or Takeaway below, browse ingredient-verified dishes (5% GST), pay with
            PayPal, and track your live Digital Token & Assigned Chef.
          </p>
        </div>

        {/* Selected Mode & Active Token Quick Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            onClick={() => setActiveTab('TABLES')}
            className="cursor-pointer px-4 py-3 rounded-2xl bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-700 transition-colors"
          >
            <div className="text-[10px] font-mono uppercase text-emerald-200">
              Active Dining Mode
            </div>
            <div className="font-display font-bold text-base text-gold-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>
                {orderType === 'DINE_IN'
                  ? `Dine-In • Table #${selectedTable || 5}`
                  : 'Takeaway • Counter #2'}
              </span>
            </div>
          </div>

          {myOrders.length > 0 && myOrders[0].tokenNumber !== 'PENDING' && (
            <div
              onClick={() => setActiveTab('TRACKING_QUEUE')}
              className="cursor-pointer px-4 py-3 rounded-2xl bg-charcoal-950 border border-gold-500/60"
            >
              <div className="text-[10px] font-mono uppercase text-gold-300">
                Latest Token ({myOrders[0].assignedChefName || 'Chef not assigned'})
              </div>
              <div className="font-mono font-black text-lg text-white flex items-center gap-2">
                <span>{myOrders[0].tokenNumber}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-700 text-white">
                  {myOrders[0].status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PART 3 REQUIREMENT: PROMINENT DINE-IN vs TAKEAWAY SELECTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => {
            setOrderType('DINE_IN');
            if (!selectedTable) setSelectedTable(5);
          }}
          data-testid="select-dine-in-card"
          className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
            orderType === 'DINE_IN'
              ? 'bg-emerald-50/90 border-emerald-800 shadow-md'
              : 'bg-white border-stone-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                orderType === 'DINE_IN'
                  ? 'bg-emerald-900 text-gold-300'
                  : 'bg-ivory-100 text-stone-600'
              }`}
            >
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm text-charcoal-900">
                  OPTION A: DINE-IN
                </span>
                {orderType === 'DINE_IN' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-white">
                    SELECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Reserve an available table ({snapshot.metrics.availableTablesCount}/
                {snapshot.metrics.totalTablesCount} available) or join the Digital Waiting Queue.
              </p>
              <div className="text-[11px] font-mono font-bold text-emerald-900 mt-1">
                Active Table: #{selectedTable || 5} •{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab('TABLES');
                  }}
                  className="underline hover:text-emerald-700"
                >
                  Change / Reserve Table →
                </button>
              </div>
            </div>
          </div>
          <CheckCircle2
            className={`w-6 h-6 shrink-0 ${
              orderType === 'DINE_IN' ? 'text-emerald-800' : 'text-stone-300'
            }`}
          />
        </div>

        <div
          onClick={() => setOrderType('TAKEAWAY')}
          data-testid="select-takeaway-card"
          className={`cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
            orderType === 'TAKEAWAY'
              ? 'bg-emerald-50/90 border-emerald-800 shadow-md'
              : 'bg-white border-stone-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                orderType === 'TAKEAWAY'
                  ? 'bg-emerald-900 text-gold-300'
                  : 'bg-ivory-100 text-stone-600'
              }`}
            >
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-sm text-charcoal-900">
                  OPTION B: TAKEAWAY
                </span>
                {orderType === 'TAKEAWAY' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900 text-white">
                    SELECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Skip table reservation and order directly for fast parcel collection at Smart
                Pickup Counter #2.
              </p>
              <div className="text-[11px] font-mono font-bold text-emerald-900 mt-1">
                Assigned Pickup: Smart Counter #2 • Express Packaging
              </div>
            </div>
          </div>
          <CheckCircle2
            className={`w-6 h-6 shrink-0 ${
              orderType === 'TAKEAWAY' ? 'text-emerald-800' : 'text-stone-300'
            }`}
          />
        </div>
      </div>

      {/* Sub-Navigation Tabs with Icons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 pb-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                id: 'MENU',
                label: 'Smart Food Menu',
                count: snapshot.menuItems.length,
                icon: <Utensils className="w-3.5 h-3.5" />,
              },
              {
                id: 'TABLES',
                label: 'Table Reservations',
                count: snapshot.metrics.availableTablesCount,
                icon: <CalendarCheck className="w-3.5 h-3.5" />,
              },
              {
                id: 'TRACKING_QUEUE',
                label: 'Live Token Queue & Tracker',
                count: activeOrders.length,
                icon: <BellRing className="w-3.5 h-3.5" />,
              },
              {
                id: 'HISTORY',
                label: 'My Orders & Receipts',
                count: myOrders.length,
                icon: <Receipt className="w-3.5 h-3.5" />,
              },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-2 ${
                activeTab === t.id
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'bg-white text-charcoal-800 border border-emerald-900/10 hover:bg-emerald-50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === t.id
                    ? 'bg-gold-400 text-charcoal-950 font-bold'
                    : 'bg-ivory-200 text-charcoal-800'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {!selectedTable ? (
          <button
            onClick={() => handleReserveTable(12)}
            className="text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
            <span>Quick Reserve Table #12 (Demo Scenario)</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-900 bg-gold-300/30 border border-gold-500/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-800" />
              <span>Table #{selectedTable} Active</span>
            </span>
            <button
              onClick={() => handleReleaseTable(selectedTable)}
              className="p-2 rounded-xl bg-ivory-200 hover:bg-red-100 text-charcoal-800 hover:text-red-700 transition-colors"
              title="Release Reserved Table"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: SMART MENU + SIDEBAR CART */}
      {activeTab === 'MENU' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Columns: Search, Filters & Menu Cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* Search & Category Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-900/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-charcoal-800/50 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes or ingredients (e.g., Chicken Biryani, Basmati, Paneer, Dosa)..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-ivory-50 border border-emerald-900/15 text-xs focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-700" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-ivory-50 border border-emerald-900/15 text-xs font-medium focus:outline-none"
                  >
                    <option value="FEATURED">Sort: Chef Featured</option>
                    <option value="PRICE_ASC">Price: Low to High</option>
                    <option value="PREP_FAST">Prep Time: Fastest First</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedCategory === cat
                        ? 'bg-emerald-800 text-white'
                        : 'bg-ivory-100 text-charcoal-800 hover:bg-emerald-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredMenu.map((item) => {
                const isAvailable = item.isAvailable !== false;
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                const isRecipeOpen = expandedRecipeItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-white border transition-all overflow-hidden flex flex-col justify-between ${
                      isAvailable
                        ? 'border-emerald-900/10 shadow-premium hover:border-emerald-600/50'
                        : 'border-red-300/80 bg-ivory-100/70 opacity-85'
                    }`}
                  >
                    <div>
                      {/* Food Photography Header */}
                      <div className="relative h-48 overflow-hidden bg-charcoal-900">
                        <img
                          src={item.image}
                          alt={item.name}
                          onError={handleFoodImageError}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            isAvailable ? 'hover:scale-105' : 'grayscale'
                          }`}
                        />
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-charcoal-950/85 backdrop-blur-md text-ivory-50 text-[11px] font-semibold">
                            {item.category}
                          </span>
                          {item.dietaryTags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 rounded-lg bg-emerald-900/90 backdrop-blur-md text-emerald-200 text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-charcoal-950/90 backdrop-blur-md text-gold-400 font-mono font-bold text-sm border border-gold-400/30">
                          ${item.price.toFixed(2)}
                        </div>

                        {!isAvailable && (
                          <div className="absolute inset-0 bg-charcoal-950/75 backdrop-blur-[2px] flex items-center justify-center p-4 text-center">
                            <div className="bg-red-950/95 border border-red-500/60 text-red-100 p-3 rounded-xl space-y-1 max-w-xs">
                              <div className="flex items-center justify-center gap-1.5 font-display font-bold text-xs text-red-300 uppercase">
                                <AlertOctagon className="w-4 h-4" />
                                <span>Auto-Disabled by Dependency Engine</span>
                              </div>
                              <p className="text-[11px] leading-snug">{item.unavailableReason}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-extrabold text-lg text-charcoal-900">
                            {item.name}
                          </h3>
                          <span className="text-[11px] font-mono text-charcoal-800/60 shrink-0">
                            {item.calories} kcal
                          </span>
                        </div>

                        <p className="text-xs text-charcoal-800/80 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>

                        {/* KitchenPulse AI Dynamic Prep Time & Stock Indicator */}
                        <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200/80 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-900">
                              <Clock className="w-3.5 h-3.5 text-emerald-700" />
                              Est. Prep: {item.dynamicPrepTimeMinutes || item.basePrepTimeMinutes}{' '}
                              mins
                            </span>
                            {isAvailable && (
                              <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                                {item.maxOrderableServings} servings in stock
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-emerald-800/80 leading-tight">
                            {item.prepTimeExplanation}
                          </p>
                        </div>

                        {/* Recipe Ingredients Accordion Toggle */}
                        <div>
                          <button
                            onClick={() =>
                              setExpandedRecipeItemId(isRecipeOpen ? null : item.id)
                            }
                            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>
                              {isRecipeOpen
                                ? 'Hide Recipe Ingredient Mapping'
                                : `View Recipe Ingredients (${item.recipe.length} tracked)`}
                            </span>
                          </button>

                          {isRecipeOpen && (
                            <div className="mt-2 p-2.5 rounded-xl bg-ivory-100 border border-emerald-900/10 space-y-1 text-[11px]">
                              {item.recipe.map((r) => {
                                const ing = snapshot.ingredients.find(
                                  (i) => i.id === r.ingredientId
                                );
                                const sufficient = ing && ing.currentStock >= r.quantityRequired;
                                return (
                                  <div
                                    key={r.ingredientId}
                                    className="flex items-center justify-between font-mono"
                                  >
                                    <span className="text-charcoal-900">{r.ingredientName}</span>
                                    <span
                                      className={
                                        sufficient
                                          ? 'text-emerald-700 font-semibold'
                                          : 'text-red-600 font-bold'
                                      }
                                    >
                                      {r.quantityRequired} {r.unit} / serving
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Add to Cart / Quantity Control */}
                    <div className="px-5 pb-5 pt-2">
                      {!isAvailable ? (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl bg-gray-200 text-gray-500 font-display font-bold text-xs cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Unavailable — Insufficient Ingredients</span>
                        </button>
                      ) : inCart ? (
                        <div className="flex items-center justify-between bg-emerald-900 text-white rounded-xl p-1.5">
                          <button
                            onClick={() => updateCartQuantity(item.id, inCart.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-emerald-800 hover:bg-emerald-700 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-mono font-bold text-sm">
                            {inCart.quantity} in Order
                          </span>
                          <button
                            onClick={() => addToCart(item, 1)}
                            className="w-8 h-8 rounded-lg bg-gold-500 text-charcoal-950 hover:bg-gold-400 flex items-center justify-center font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            addToCart(item, 1);
                            if (
                              isDemoActive &&
                              demoStep === 2 &&
                              item.id === 'menu-chicken-biryani'
                            ) {
                              setDemoStep(3);
                            }
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                        >
                          <Plus className="w-4 h-4 text-gold-300" />
                          <span>Add to Order • ${item.price.toFixed(2)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 4 Columns: Sticky Smart Cart & PayPal Checkout Trigger */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-5">
            <div className="rounded-3xl bg-white border border-emerald-900/15 shadow-premium overflow-hidden">
              <div className="bg-emerald-950 text-ivory-50 p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-gold-400" />
                  <div>
                    <h3 className="font-display font-bold text-base">Your Smart Order</h3>
                    <p className="text-[11px] text-emerald-200">
                      {orderType === 'DINE_IN'
                        ? `Dine-In • Reserved Table #${selectedTable || 5}`
                        : 'Takeaway • Smart Pickup Counter #2'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-800 text-gold-300 font-mono text-xs font-bold">
                    {cart.reduce((a, b) => a + b.quantity, 0)} items
                  </span>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="p-1.5 rounded-lg bg-emerald-900 hover:bg-red-900 text-emerald-300 hover:text-white transition-colors"
                      title="Clear Cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick Order Mode Switcher in Cart */}
                <div className="grid grid-cols-2 gap-1.5 bg-ivory-100 p-1 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setOrderType('DINE_IN')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderType === 'DINE_IN'
                        ? 'bg-emerald-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Dine-In (Table #{selectedTable || 5})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('TAKEAWAY')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      orderType === 'TAKEAWAY'
                        ? 'bg-emerald-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Takeaway (Counter #2)
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-ivory-100 border border-emerald-900/10 flex items-center justify-center mx-auto text-emerald-700">
                      <Utensils className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-display font-bold text-sm text-charcoal-900">
                        Your cart is empty
                      </p>
                      <p className="text-xs text-charcoal-800/70">
                        Add Chicken Biryani, Veg Meals, or Dosa to experience verified PayPal
                        checkout.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-emerald-900/10 max-h-64 overflow-y-auto pr-1">
                      {cart.map((c) => (
                        <div
                          key={c.menuItem.id}
                          className="py-3 flex items-center justify-between gap-2"
                        >
                          <div className="flex-1">
                            <div className="font-display font-bold text-xs text-charcoal-900">
                              {c.menuItem.name}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-mono">
                              ${c.menuItem.price.toFixed(2)} each •{' '}
                              {c.menuItem.dynamicPrepTimeMinutes}m prep
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateCartQuantity(c.menuItem.id, c.quantity - 1)}
                              className="w-6 h-6 rounded bg-ivory-200 hover:bg-ivory-300 flex items-center justify-center text-charcoal-900"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-xs w-5 text-center">
                              {c.quantity}
                            </span>
                            <button
                              onClick={() => addToCart(c.menuItem, 1)}
                              className="w-6 h-6 rounded bg-emerald-800 text-white hover:bg-emerald-700 flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="font-mono font-bold text-xs text-charcoal-900 w-14 text-right">
                            ${(c.menuItem.price * c.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Special Chef Instructions */}
                    <div>
                      <label className="block text-[11px] font-semibold text-charcoal-800 mb-1">
                        Special Chef Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="e.g., Less spicy, extra mint raita..."
                        className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-emerald-900/15 text-xs"
                      />
                    </div>

                    {/* Ingredient Availability Badge */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Ingredient Check Passed:</strong> All recipe components are in stock
                        and ready for atomic reservation.
                      </span>
                    </div>

                    {/* Price Summary */}
                    <div className="border-t border-emerald-900/10 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-charcoal-800/80">
                        <span>Subtotal</span>
                        <span className="font-mono">${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-charcoal-800/80">
                        <span>GST (5% Applicable Tax)</span>
                        <span className="font-mono">${tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-display font-extrabold text-base text-charcoal-900 pt-1">
                        <span>Total Payable</span>
                        <span className="font-mono text-emerald-700">
                          ${totalAmount.toFixed(2)} {snapshot.paypalConfig.currency}
                        </span>
                      </div>
                    </div>

                    {/* PayPal Checkout CTA */}
                    <button
                      onClick={() => {
                        setIsCheckoutModalOpen(true);
                        if (isDemoActive && (demoStep === 3 || demoStep === 4)) {
                          setDemoStep(4);
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#ffc439] hover:bg-[#f4b829] text-[#003087] font-display font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Pay Securely with PayPal (${totalAmount.toFixed(2)})</span>
                    </button>
                    <div className="text-center text-[11px] text-stone-500 font-semibold">
                      Powered by <span className="font-black italic text-[#003087]">PayPal</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE TABLE RESERVATION MATRIX & DIGITAL WAITING QUEUE */}
      {activeTab === 'TABLES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-emerald-900/10 p-6 shadow-premium space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/10 pb-4">
              <div>
                <h2 className="font-display font-extrabold text-xl text-charcoal-900">
                  Interactive Dining Floorplan (Tables 1 – 16)
                </h2>
                <p className="text-xs text-charcoal-800/75">
                  Click any available table to reserve it for your Dine-In session, or join the
                  Digital Waiting Queue below if your preferred zone is full.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-gold-500 inline-block" /> Reserved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-charcoal-800 inline-block" /> Occupied
                </span>
              </div>
            </div>

            {selectedTable && (
              <div className="p-4 rounded-2xl bg-emerald-950 text-ivory-50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-gold-400" />
                  <div>
                    <div className="font-display font-bold text-sm">
                      Table #{selectedTable} is Reserved for Your Dine-In Session
                    </div>
                    <div className="text-xs text-emerald-200">
                      Your order will be linked to Table #{selectedTable} automatically at PayPal
                      checkout.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReleaseTable(selectedTable)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-red-900 text-emerald-200 hover:text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Release Table</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('MENU')}
                    className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-bold text-xs flex items-center gap-1.5 shadow"
                  >
                    <span>Proceed to Smart Menu</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {snapshot.tables.map((t) => {
                const isMine =
                  selectedTable === t.tableNumber ||
                  (t.status === 'RESERVED' && t.currentCustomerId === currentUser?.id);
                const isAvailable = t.status === 'AVAILABLE';

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (isAvailable || isMine) {
                        handleReserveTable(t.tableNumber);
                      }
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      isMine
                        ? 'bg-gold-300/20 border-gold-500 cursor-pointer shadow-md'
                        : isAvailable
                        ? 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-500/50 cursor-pointer'
                        : 'bg-ivory-200 border-charcoal-800/20 opacity-75 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display font-extrabold text-base text-charcoal-900">
                        Table #{t.tableNumber}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isMine
                            ? 'bg-gold-500 text-charcoal-950'
                            : isAvailable
                            ? 'bg-emerald-800 text-white'
                            : 'bg-charcoal-800 text-ivory-100'
                        }`}
                      >
                        {isMine ? 'YOUR TABLE' : t.status}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-800/80 font-medium">{t.zone}</div>
                    <div className="text-[11px] text-charcoal-800/60 font-mono mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>Capacity: {t.capacity} Guests</span>
                    </div>
                    {t.activeOrderToken && (
                      <div className="mt-2 text-[11px] font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block">
                        Active Order: {t.activeOrderToken}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Digital Waiting Queue Section */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-3">
              <h3 className="font-display font-bold text-base text-stone-900">
                Digital Table Waiting Queue (When Preferred Tables Are Full)
              </h3>
              <p className="text-xs text-stone-600">
                Join the digital waiting queue to get automatically allocated the next available
                table in your preferred zone.
              </p>
              <form onSubmit={handleJoinWaitingQueue} className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Party Size (Guests)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={queueGuests}
                      onChange={(e) => setQueueGuests(Number(e.target.value) || 2)}
                      className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Preferred Seating Zone
                    </label>
                    <select
                      value={queueZone}
                      onChange={(e) => setQueueZone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200 text-xs"
                    >
                      <option value="Main Dining Hall">Main Dining Hall</option>
                      <option value="Garden Terrace">Garden Terrace</option>
                      <option value="Executive Lounge">Executive Lounge</option>
                      <option value="Express Bar">Express Bar</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold"
                >
                  Join Digital Waiting Queue
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Live Waiting Queue Entries ({(snapshot.waitingQueue || []).length})
              </div>
              <div className="space-y-2">
                {(snapshot.waitingQueue || []).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-ivory-50 text-xs text-stone-500">
                    No guests currently waiting for table allocation.
                  </div>
                ) : (
                  (snapshot.waitingQueue || []).map((wq) => (
                    <div
                      key={wq.id}
                      className="p-3.5 rounded-2xl bg-ivory-50 border border-stone-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-xs text-stone-900">
                          {wq.customerName} • {wq.guests} Guests ({wq.preferredZone})
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Status: <strong>{wq.status}</strong> • Est. Wait:{' '}
                          {wq.estimatedWaitMinutes} mins
                          {wq.allocatedTableNumber
                            ? ` • Allocated Table #${wq.allocatedTableNumber}`
                            : ''}
                        </div>
                      </div>
                      {wq.status === 'WAITING' && (
                        <button
                          onClick={() => handleAllocateQueueTable(wq.id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                        >
                          Allocate Next Table
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIGITAL TOKEN SCREEN & REAL-TIME ORDER TRACKING */}
      {activeTab === 'TRACKING_QUEUE' && (
        <div className="space-y-6">
          {/* Customer Digital Token Cards with Assigned Chef Name & 4-Step Progress */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h2 className="font-display font-extrabold text-lg text-charcoal-900">
                  Customer Digital Token Screen & Live Chef Assignment
                </h2>
                <p className="text-xs text-stone-500">
                  Displays your unique token, Order Type (Dine-In vs Takeaway), Assigned Chef Name,
                  Table/Pickup Counter, and 4-stage live progress.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myOrders.slice(0, 4).map((ord) => {
                const isDineIn =
                  ord.orderType === 'DINE_IN' || (!ord.orderType && Boolean(ord.tableNumber));
                const stageIndex =
                  ord.status === 'COMPLETED'
                    ? 4
                    : ord.status === 'READY_FOR_COLLECTION'
                    ? 3
                    : ord.status === 'PREPARING' || ord.status === 'ACCEPTED'
                    ? 2
                    : 1;

                return (
                  <div
                    key={ord.id}
                    className="rounded-2xl bg-ivory-50 border border-stone-200 p-5 space-y-4 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-950 text-gold-300 font-mono font-black text-2xl">
                          {ord.tokenNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                              {isDineIn ? 'Dine-In' : 'Takeaway'}
                            </span>
                            <span className="text-xs font-bold text-stone-900">
                              {isDineIn
                                ? `Table #${ord.tableNumber || 5}`
                                : `Pickup Counter #${ord.counterNumber || 2}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-600 mt-1 flex items-center gap-1.5">
                            <ChefHat className="w-3.5 h-3.5 text-emerald-800" />
                            <span>Assigned Chef:</span>
                            <strong
                              className={
                                ord.assignedChefName ? 'text-emerald-900' : 'text-amber-700'
                              }
                            >
                              {ord.assignedChefName || 'Chef not assigned'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-emerald-900">
                          {ord.status === 'READY_FOR_COLLECTION'
                            ? 'READY NOW'
                            : ord.status === 'COMPLETED'
                            ? 'COLLECTED'
                            : `~${ord.estimatedPrepMinutes} mins`}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {isDineIn ? 'Est. Prep Time' : 'Est. Waiting Time'}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-stone-700 font-medium">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {/* 4-Step Progress Bar */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { step: 1, label: 'Confirmed' },
                        { step: 2, label: 'Preparing' },
                        { step: 3, label: 'Ready' },
                        { step: 4, label: 'Completed' },
                      ].map((s) => (
                        <div key={s.step} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              stageIndex >= s.step ? 'bg-emerald-800' : 'bg-stone-200'
                            }`}
                          />
                          <div
                            className={`text-[10px] font-bold text-center ${
                              stageIndex >= s.step ? 'text-emerald-900' : 'text-stone-400'
                            }`}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/80">
                      <button
                        onClick={() => setReceiptOrder(ord)}
                        className="text-xs font-bold text-emerald-900 hover:underline flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        View Digital Token & Printable Receipt
                      </button>
                      {ord.status === 'READY_FOR_COLLECTION' && (
                        <button
                          onClick={() => handleCollectReadyOrder(ord)}
                          className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold text-xs"
                        >
                          Collect Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-emerald-950 text-ivory-50 p-6 border border-emerald-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-gold-400 animate-bounce" />
                  <h3 className="font-display font-bold text-lg">NOW READY FOR COLLECTION</h3>
                </div>
                <span className="text-xs font-mono text-emerald-300">Smart Counter Display</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeOrders.filter((o) => o.status === 'READY_FOR_COLLECTION').length === 0 ? (
                  <p className="text-xs text-emerald-300/70 col-span-2 py-4">
                    No tokens currently waiting at collection counter.
                  </p>
                ) : (
                  activeOrders
                    .filter((o) => o.status === 'READY_FOR_COLLECTION')
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="p-4 rounded-2xl bg-emerald-900/90 border-2 border-gold-400 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-black text-3xl text-gold-400">
                            {ord.tokenNumber}
                          </div>
                          <div className="text-xs text-emerald-200 font-semibold mt-0.5">
                            Counter #{ord.counterNumber} • {ord.customerName}
                          </div>
                          <div className="text-[10px] text-emerald-300 mt-0.5">
                            Chef: {ord.assignedChefName || 'Chef not assigned'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCollectReadyOrder(ord)}
                          className="px-3 py-2 rounded-xl bg-gold-400 hover:bg-gold-300 text-charcoal-950 font-display font-bold text-xs shadow"
                        >
                          Collect Food
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 border border-emerald-900/10 shadow-premium space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/10 pb-3">
                <h3 className="font-display font-bold text-lg text-charcoal-900">
                  PREPARING IN KITCHEN
                </h3>
                <span className="text-xs font-mono text-emerald-700 font-semibold">
                  Live Kitchen Display Sync
                </span>
              </div>

              <div className="space-y-2.5">
                {activeOrders
                  .filter((o) => o.status !== 'READY_FOR_COLLECTION')
                  .map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-ivory-50 border border-emerald-900/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-xl text-emerald-800 bg-emerald-100 px-3 py-1 rounded-xl">
                          {ord.tokenNumber}
                        </span>
                        <div>
                          <div className="font-display font-bold text-xs text-charcoal-900">
                            {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-mono">
                            {ord.status.replace(/_/g, ' ')} • Chef:{' '}
                            <strong>{ord.assignedChefName || 'Chef not assigned'}</strong>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-charcoal-900">
                          ~{ord.estimatedPrepMinutes} mins
                        </div>
                        <div className="text-[10px] text-charcoal-800/60">Est. Wait</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ORDER HISTORY, RECEIPTS & MULTI-CRITERIA FEEDBACK */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-4">
          {myOrders.map((ord) => {
            const draft = feedbackDraft[ord.id] || {
              rating: 5,
              foodQuality: 5,
              prepTime: 5,
              serviceQuality: 5,
              overallExperience: 5,
              text: 'Fast PayPal checkout & delicious meal!',
            };
            const isDineIn =
              ord.orderType === 'DINE_IN' || (!ord.orderType && Boolean(ord.tableNumber));

            return (
              <div
                key={ord.id}
                className="rounded-2xl bg-white border border-emerald-900/10 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 rounded-xl bg-emerald-900 text-gold-400 font-mono font-black text-base">
                        {ord.tokenNumber}
                      </span>
                      <span className="font-display font-bold text-base text-charcoal-900">
                        {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-xs font-semibold">
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-ivory-100 text-stone-800 border border-stone-200 text-xs font-bold">
                        {isDineIn
                          ? `Dine-In • Table #${ord.tableNumber || 5}`
                          : `Takeaway • Counter #${ord.counterNumber || 2}`}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-800/70 font-mono">
                      Assigned Chef: <strong>{ord.assignedChefName || 'Chef not assigned'}</strong> •
                      PayPal Capture: {ord.paypalCaptureId || 'N/A'} • Total: $
                      {ord.totalAmount.toFixed(2)} {ord.currency} (incl. 5% GST)
                    </div>
                    {ord.feedback && (
                      <div className="text-xs text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-lg inline-flex flex-wrap items-center gap-2">
                        <div className="flex items-center">
                          {Array.from({ length: ord.rating || 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className="w-3.5 h-3.5 fill-gold-400 text-gold-500"
                            />
                          ))}
                        </div>
                        <span>&ldquo;{ord.feedback}&rdquo;</span>
                        {ord.feedbackDetails && (
                          <span className="text-[10px] font-mono text-stone-600">
                            (Food: {ord.feedbackDetails.foodQuality}★ • Prep:{' '}
                            {ord.feedbackDetails.prepTime}★ • Service:{' '}
                            {ord.feedbackDetails.serviceQuality}★ • Overall:{' '}
                            {ord.feedbackDetails.overallExperience}★)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {ord.status === 'READY_FOR_COLLECTION' && (
                      <button
                        onClick={() => handleCollectReadyOrder(ord)}
                        className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold text-xs"
                      >
                        Collect Order at Counter #{ord.counterNumber}
                      </button>
                    )}

                    <button
                      onClick={() => setReceiptOrder(ord)}
                      className="px-3.5 py-2 rounded-xl bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-emerald-900/15 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Digital Token & Receipt</span>
                    </button>
                  </div>
                </div>

                {/* Multi-Criteria Post-Order Rating & Feedback Form */}
                {!ord.rating && ord.paymentStatus === 'CAPTURED' && (
                  <div className="p-4 rounded-2xl bg-ivory-50 border border-stone-200 space-y-3">
                    <div className="text-xs font-bold text-stone-800">
                      Rate Your Experience (1–5 Stars per Category)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {(
                        [
                          { key: 'foodQuality', label: 'Food Quality' },
                          { key: 'prepTime', label: 'Preparation Time' },
                          { key: 'serviceQuality', label: 'Service Quality' },
                          { key: 'overallExperience', label: 'Overall Experience' },
                        ] as const
                      ).map((crit) => (
                        <div
                          key={crit.key}
                          className="p-2.5 rounded-xl bg-white border border-stone-200"
                        >
                          <div className="text-[11px] font-semibold text-stone-600 mb-1">
                            {crit.label}
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starVal) => (
                              <button
                                key={starVal}
                                type="button"
                                onClick={() =>
                                  setFeedbackDraft((prev) => ({
                                    ...prev,
                                    [ord.id]: {
                                      ...draft,
                                      [crit.key]: starVal,
                                      rating: starVal,
                                    },
                                  }))
                                }
                                className="p-0.5"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    starVal <= draft[crit.key]
                                      ? 'fill-gold-400 text-gold-500'
                                      : 'text-stone-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={draft.text}
                        onChange={(e) =>
                          setFeedbackDraft((prev) => ({
                            ...prev,
                            [ord.id]: {
                              ...draft,
                              text: e.target.value,
                            },
                          }))
                        }
                        placeholder="Write your feedback comment..."
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs"
                      />
                      <button
                        onClick={() => handleSubmitFeedback(ord.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold shrink-0"
                      >
                        Submit Rating & Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DEDICATED AI ASSISTANT #1: FEEDO CUSTOMER AI */}
      <CustomerAIChatWidget />
    </div>
  );
};
