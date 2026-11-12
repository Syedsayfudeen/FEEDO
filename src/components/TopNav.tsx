import React, { useState } from 'react';
import {
  Home,
  UtensilsCrossed,
  ChefHat,
  LayoutDashboard,
  Truck,
  Cpu,
  Play,
  Bell,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  LogIn,
  Radio,
  CheckCheck,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import { UserRole } from '../../shared/types.ts';

export const TopNav: React.FC = () => {
  const {
    snapshot,
    socketConnected,
    currentUser,
    activeView,
    setActiveView,
    switchDemoRole,
    cart,
    setIsCheckoutModalOpen,
    setIsAuthModalOpen,
    startLiveDemo,
    isDemoActive,
    apiFetch,
    showToast,
  } = useEcosystem();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const totalCartItems = cart.reduce((acc, c) => acc + c.quantity, 0);
  const visibleNotifications =
    snapshot?.notifications.filter(
      (n) => n.targetRole === 'all' || !currentUser || n.targetRole === currentUser.role
    ) || [];
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  const handleRoleNav = async (role: UserRole) => {
    setActiveView(role);
    if (!currentUser || currentUser.role !== role) {
      await switchDemoRole(role);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await apiFetch('/api/notifications/mark-read', { method: 'POST' });
      showToast('Notifications Marked Read', 'Live ecosystem feed cleared', 'emerald');
    } catch (err: any) {
      showToast('Notification Update Note', err.message, 'red');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-emerald-950/95 backdrop-blur-md text-ivory-50 border-b border-emerald-800/70 shadow-lg">
      {/* Top Judge Quick-Bar */}
      <div className="bg-charcoal-950 border-b border-emerald-900/60 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected || snapshot ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              {socketConnected || snapshot ? 'Live Ecosystem Sync Active' : 'Synchronizing...'}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-emerald-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              PayPal Mode:{' '}
              <strong className="text-gold-300">
                {snapshot?.paypalConfig.isSandboxConfigured
                  ? 'LIVE SANDBOX CREDENTIALS'
                  : 'SANDBOX DEMO ENGINE (Configurable)'}
              </strong>
            </span>
          </div>

          {/* Instant Judge Demo Role Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-300/80 font-medium mr-1 hidden sm:inline">
              Judge Quick Role Switcher:
            </span>
            {(
              [
                {
                  role: 'customer',
                  label: 'Customer',
                  icon: <UtensilsCrossed className="w-3 h-3" />,
                },
                { role: 'chef', label: 'Kitchen Staff', icon: <ChefHat className="w-3 h-3" /> },
                {
                  role: 'manager',
                  label: 'Manager',
                  icon: <LayoutDashboard className="w-3 h-3" />,
                },
                { role: 'supplier', label: 'Supplier', icon: <Truck className="w-3 h-3" /> },
              ] as { role: UserRole; label: string; icon: React.ReactNode }[]
            ).map((r) => {
              const isCurrent = currentUser?.role === r.role && activeView === r.role;
              return (
                <button
                  key={r.role}
                  onClick={() => handleRoleNav(r.role)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium transition-all ${
                    isCurrent
                      ? 'bg-gold-500 text-charcoal-950 font-semibold shadow-sm'
                      : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/50'
                  }`}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <button
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md border border-emerald-400/30 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="w-5 h-5 text-ivory-50" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg tracking-tight text-ivory-50">
                FEEDO <span className="text-gold-400">PAY</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-800/90 text-emerald-200 border border-emerald-600/40">
                OS v2.4
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/90 hidden sm:block">
              Order Smart. Pay Securely. Eat Faster. Waste Less.
            </p>
          </div>
        </button>

        {/* Primary Ecosystem Modules (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-emerald-900/60 p-1 rounded-xl border border-emerald-800/80">
          <button
            onClick={() => setActiveView('landing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'landing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => handleRoleNav('customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'customer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Customer Dining</span>
          </button>

          <button
            onClick={() => handleRoleNav('chef')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'chef'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Kitchen Staff</span>
            {snapshot && snapshot.metrics.activeKitchenOrders > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-gold-500 text-charcoal-950 font-bold text-[10px]">
                {snapshot.metrics.activeKitchenOrders}
              </span>
            )}
          </button>

          <button
            onClick={() => handleRoleNav('manager')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'manager'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Manager & PayPal IQ</span>
          </button>

          <button
            onClick={() => handleRoleNav('supplier')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'supplier'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Supplier Portal</span>
          </button>

          <button
            onClick={() => setActiveView('iot-counter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'iot-counter'
                ? 'bg-gold-500 text-charcoal-950 font-semibold shadow-sm'
                : 'text-gold-300 hover:bg-emerald-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>IoT Smart Counter</span>
            {snapshot?.smartCounter.currentReadyToken && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-400 text-charcoal-950 font-mono font-bold text-[10px] animate-pulse">
                {snapshot.smartCounter.currentReadyToken}
              </span>
            )}
          </button>
        </nav>

        {/* Right Actions: Live Demo Trigger, Cart, Notifications & User */}
        <div className="flex items-center gap-2">
          <button
            onClick={startLiveDemo}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-md ${
              isDemoActive
                ? 'bg-gold-400 text-charcoal-950 ring-2 ring-gold-300'
                : 'bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-charcoal-950" />
            <span className="hidden sm:inline">START LIVE FEEDO DEMO</span>
            <span className="sm:hidden">LIVE DEMO</span>
          </button>

          {/* Always-Visible Customer Cart & PayPal Checkout Button */}
          <button
            onClick={() => {
              if (totalCartItems > 0) {
                setActiveView('customer');
                setIsCheckoutModalOpen(true);
              } else {
                handleRoleNav('customer');
                showToast(
                  'Select a Dish to Checkout',
                  'Add Chicken Biryani or Dosa from the menu to open PayPal Checkout.',
                  'emerald'
                );
              }
            }}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              totalCartItems > 0
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-400/50 shadow-md'
                : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border-emerald-700/60'
            }`}
            title="Smart Cart & PayPal Checkout"
          >
            <ShoppingBag className="w-4 h-4 text-gold-300" />
            <span className="hidden md:inline">
              {totalCartItems > 0 ? 'PayPal Checkout' : 'Cart'}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${
                totalCartItems > 0
                  ? 'bg-gold-400 text-charcoal-950'
                  : 'bg-emerald-800 text-emerald-200'
              }`}
            >
              {totalCartItems}
            </span>
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown((prev) => !prev)}
              className="relative p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60 transition-colors"
              title="Real-Time Ecosystem Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-charcoal-950 text-[10px] font-bold flex items-center justify-center">
                  {Math.min(9, unreadCount)}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-charcoal-900 border border-emerald-800 shadow-2xl p-4 z-50 text-ivory-50">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-emerald-800/80">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <span className="font-display font-bold text-sm">Live Ecosystem Feed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkNotificationsRead}
                        className="inline-flex items-center gap-1 text-[11px] text-gold-300 hover:text-gold-200 font-semibold"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifDropdown(false)}
                      className="text-xs text-emerald-300 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                  {visibleNotifications.length === 0 ? (
                    <p className="text-xs text-emerald-300/70 py-4 text-center">
                      No notifications yet.
                    </p>
                  ) : (
                    visibleNotifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.targetRole !== 'all') {
                            handleRoleNav(n.targetRole);
                          }
                          setShowNotifDropdown(false);
                        }}
                        className={`cursor-pointer p-2.5 rounded-xl border text-xs transition-colors ${
                          n.read
                            ? 'bg-charcoal-950/60 border-emerald-900/50 opacity-75'
                            : 'bg-emerald-950/90 border-emerald-700/80 hover:border-gold-400/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-gold-300">{n.title}</span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-emerald-100/90 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Auth / Current Account Pill */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 text-xs transition-all"
          >
            {currentUser ? (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-ivory-50 leading-none">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-gold-300 uppercase font-mono">
                    {currentUser.role}
                  </div>
                </div>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-gold-400" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tablet / Mobile Navigation Bar with Icons */}
      <div className="lg:hidden flex items-center justify-around border-t border-emerald-800/60 bg-emerald-950 px-2 py-1.5 text-[11px] overflow-x-auto">
        <button
          onClick={() => setActiveView('landing')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'landing'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'text-emerald-200 hover:bg-emerald-900'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleRoleNav('customer')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'customer'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'text-emerald-200 hover:bg-emerald-900'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Customer</span>
        </button>
        <button
          onClick={() => handleRoleNav('chef')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'chef'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'text-emerald-200 hover:bg-emerald-900'
          }`}
        >
          <ChefHat className="w-3.5 h-3.5" />
          <span>Chef ({snapshot?.metrics.activeKitchenOrders || 0})</span>
        </button>
        <button
          onClick={() => handleRoleNav('manager')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'manager'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'text-emerald-200 hover:bg-emerald-900'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Manager</span>
        </button>
        <button
          onClick={() => handleRoleNav('supplier')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'supplier'
              ? 'bg-emerald-700 text-white font-semibold'
              : 'text-emerald-200 hover:bg-emerald-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Supplier</span>
        </button>
        <button
          onClick={() => setActiveView('iot-counter')}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
            activeView === 'iot-counter'
              ? 'bg-gold-500 text-charcoal-950 font-bold'
              : 'text-gold-300 hover:bg-emerald-900'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>IoT Counter</span>
        </button>
      </div>
    </header>
  );
};
