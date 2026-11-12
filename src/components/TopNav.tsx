import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  ChefHat,
  Cpu,
  Home,
  LayoutDashboard,
  LogIn,
  Radio,
  ShoppingBag,
  Truck,
  UtensilsCrossed,
  UserCheck,
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
    apiFetch,
    showToast,
  } = useEcosystem();
  const [showNotifications, setShowNotifications] = useState(false);
  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);
  const notifications = snapshot?.notifications.filter(
    (notification) => notification.targetRole === 'all' || !currentUser || notification.targetRole === currentUser.role
  ) || [];
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const handleRoleNav = async (role: UserRole) => {
    setActiveView(role);
    if (!currentUser || currentUser.role !== role) await switchDemoRole(role);
  };

  const markRead = async () => {
    try {
      await apiFetch('/api/notifications/mark-read', { method: 'POST' });
      showToast('Notifications marked read', 'Your live ecosystem feed is clear.', 'emerald');
    } catch (error: any) {
      showToast('Notification update failed', error.message, 'red');
    }
  };

  const navItems = [
    { role: 'customer' as UserRole, label: 'Customer', icon: UtensilsCrossed },
    { role: 'chef' as UserRole, label: 'Kitchen', icon: ChefHat },
    { role: 'manager' as UserRole, label: 'Manager', icon: LayoutDashboard },
    { role: 'supplier' as UserRole, label: 'Supplier', icon: Truck },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gold-400/20 bg-charcoal-950/95 text-ivory-50 shadow-glass backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6">
        <button onClick={() => setActiveView('landing')} className="flex shrink-0 items-center gap-2.5 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-400/60 bg-gold-400/10 text-gold-300">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-display text-lg font-extrabold leading-none tracking-[0.16em]">FEEDO</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.2em] text-gold-300/80 sm:block">Food experience OS</span>
          </span>
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <button onClick={() => setActiveView('landing')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === 'landing' ? 'bg-gold-400 text-charcoal-950' : 'text-ivory-200 hover:bg-white/10'}`}>
            <Home className="mr-1.5 inline h-3.5 w-3.5" /> Overview
          </button>
          {navItems.map(({ role, label, icon: Icon }) => (
            <button key={role} onClick={() => handleRoleNav(role)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === role ? 'bg-gold-400 text-charcoal-950' : 'text-ivory-200 hover:bg-white/10'}`}>
              <Icon className="mr-1.5 inline h-3.5 w-3.5" /> {label}
              {role === 'chef' && snapshot?.metrics.activeKitchenOrders ? <span className="ml-1 rounded-full bg-charcoal-950 px-1.5 py-0.5 text-[10px] text-gold-300">{snapshot.metrics.activeKitchenOrders}</span> : null}
            </button>
          ))}
          <button onClick={() => setActiveView('iot-counter')} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === 'iot-counter' ? 'bg-gold-400 text-charcoal-950' : 'text-gold-300 hover:bg-white/10'}`}>
            <Cpu className="mr-1.5 inline h-3.5 w-3.5" /> Counter
          </button>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 md:inline-flex">
            <span className={`h-1.5 w-1.5 rounded-full ${socketConnected || snapshot ? 'bg-emerald-300' : 'bg-gold-300'}`} />
            {socketConnected || snapshot ? 'Live' : 'Syncing'}
          </span>
          <button onClick={() => { if (totalCartItems > 0) { setActiveView('customer'); setIsCheckoutModalOpen(true); } else { handleRoleNav('customer'); showToast('Your cart is empty', 'Choose a dish to begin your order.', 'gold'); } }} className="relative rounded-xl border border-gold-400/30 bg-white/5 p-2 text-gold-300 transition hover:bg-gold-400/15" title="Open cart">
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[9px] font-bold text-charcoal-950">{totalCartItems}</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowNotifications((open) => !open)} className="relative rounded-xl border border-white/10 bg-white/5 p-2 text-ivory-200 transition hover:bg-white/10" title="Notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[9px] font-bold text-charcoal-950">{Math.min(9, unreadCount)}</span> : null}
            </button>
            {showNotifications ? (
              <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-gold-400/25 bg-charcoal-900 p-4 text-ivory-50 shadow-2xl">
                <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="flex items-center gap-2 font-display text-sm font-bold"><Radio className="h-4 w-4 text-gold-300" /> Live ecosystem feed</span>
                  {unreadCount > 0 ? <button onClick={markRead} className="flex items-center gap-1 text-[11px] font-semibold text-gold-300"><CheckCheck className="h-3.5 w-3.5" /> Mark read</button> : null}
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? <p className="py-4 text-center text-xs text-ivory-300">No notifications yet.</p> : notifications.slice(0, 8).map((notification) => (
                    <div key={notification.id} className={`rounded-xl border p-2.5 text-xs ${notification.read ? 'border-white/10 bg-white/5 opacity-70' : 'border-gold-400/25 bg-gold-400/10'}`}>
                      <div className="flex justify-between gap-2"><span className="font-semibold text-gold-300">{notification.title}</span><span className="text-[10px] text-ivory-300">{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                      <p className="mt-1 leading-relaxed text-ivory-200">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 transition hover:bg-white/10">
            {currentUser ? <UserCheck className="h-4 w-4 text-gold-300" /> : <LogIn className="h-4 w-4 text-gold-300" />}
            <span className="hidden text-left sm:block"><span className="block text-xs font-semibold leading-none">{currentUser ? currentUser.name.split(' ')[0] : 'Sign in'}</span><span className="mt-1 block text-[9px] uppercase tracking-wider text-gold-300">{currentUser?.role || 'Account'}</span></span>
          </button>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-white/5 px-3 py-1.5 lg:hidden">
        <button onClick={() => setActiveView('landing')} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] text-ivory-200 hover:bg-white/10"><Home className="mr-1 inline h-3 w-3" /> Home</button>
        {navItems.map(({ role, label, icon: Icon }) => <button key={role} onClick={() => handleRoleNav(role)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] ${activeView === role ? 'bg-gold-400 font-bold text-charcoal-950' : 'text-ivory-200 hover:bg-white/10'}`}><Icon className="mr-1 inline h-3 w-3" /> {label}</button>)}
      </div>
    </header>
  );
};
