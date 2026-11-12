import React from 'react';
import { ArrowRight, CheckCircle2, ChefHat, Clock3, LayoutDashboard, Play, ShieldCheck, Sparkles, Truck, UtensilsCrossed } from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import { UserRole } from '../../shared/types.ts';
import { CHEF_IMAGE, DINING_IMAGE, FOOD_SPREAD_IMAGE, RESTAURANT_IMAGE, SUPPLY_IMAGE } from '../theme.ts';

const roleCards: Array<{ role: UserRole; title: string; description: string; image: string; icon: React.ReactNode; label: string }> = [
  { role: 'customer', title: 'Customer', label: 'Discover, order and enjoy', description: 'A thoughtful dining journey with ingredient-aware dishes, reservations and secure checkout.', image: FOOD_SPREAD_IMAGE, icon: <UtensilsCrossed className="h-5 w-5" /> },
  { role: 'chef', title: 'Chef', label: 'Prepare every order beautifully', description: 'A focused kitchen command center for live orders, timing and smart preparation.', image: CHEF_IMAGE, icon: <ChefHat className="h-5 w-5" /> },
  { role: 'manager', title: 'Restaurant Manager', label: 'Control operations and performance', description: 'See revenue, demand, payments, inventory and the health of the whole restaurant.', image: RESTAURANT_IMAGE, icon: <LayoutDashboard className="h-5 w-5" /> },
  { role: 'supplier', title: 'Supplier', label: 'Move fresh stock with confidence', description: 'Manage replenishment, cold-chain dispatch and verified delivery in one place.', image: SUPPLY_IMAGE, icon: <Truck className="h-5 w-5" /> },
];

export const LandingPage: React.FC = () => {
  const { snapshot, switchDemoRole, startLiveDemo } = useEcosystem();
  const metrics = snapshot?.metrics;
  const launchRole = async (role: UserRole) => switchDemoRole(role);

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-900">
      <section className="relative overflow-hidden bg-charcoal-950 text-ivory-50">
        <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: `url(${DINING_IMAGE})` }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(214,184,121,0.22),transparent_35%),linear-gradient(115deg,#0b1428_0%,rgba(11,20,40,0.94)_45%,rgba(11,20,40,0.5)_100%)]" />
        <div className="relative mx-auto max-w-[1400px] px-4 pb-14 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-gold-300"><Sparkles className="h-4 w-4" /> Good food. Better tomorrow.</div>
            <p className="mb-3 text-sm font-medium tracking-[0.3em] text-ivory-200">WELCOME TO</p>
            <h1 className="font-display text-6xl font-extrabold tracking-[0.12em] text-gold-300 sm:text-8xl">FEEDO</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-ivory-200 sm:text-lg">One ecosystem. Every food experience.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button onClick={() => launchRole('customer')} className="inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-3 text-sm font-bold text-charcoal-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-gold-300"><span>Start exploring</span><ArrowRight className="h-4 w-4" /></button>
              <button onClick={startLiveDemo} className="inline-flex items-center gap-2 rounded-xl border border-gold-400/50 bg-white/10 px-5 py-3 text-sm font-semibold text-ivory-50 backdrop-blur transition hover:bg-white/15"><Play className="h-4 w-4 fill-current" /> Live platform tour</button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {roleCards.map((card, index) => (
              <button key={card.role} onClick={() => launchRole(card.role)} className="group relative min-h-[290px] overflow-hidden rounded-3xl border border-gold-300/35 bg-charcoal-900/75 text-left shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-gold-300/80">
                <img src={card.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/65 to-transparent" />
                <div className="relative flex h-full min-h-[290px] flex-col justify-end p-5">
                  <div className="mb-auto flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-300/70 bg-charcoal-950/75 text-gold-300 backdrop-blur">{card.icon}</span><span className="text-xs font-mono text-gold-300/80">0{index + 1}</span></div>
                  <div><h2 className="font-display text-xl font-bold text-white">{card.title}</h2><p className="mt-1 text-xs font-semibold text-gold-200">{card.label}</p><p className="mt-2 max-w-xs text-xs leading-relaxed text-ivory-200">{card.description}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-gold-300">Enter workspace <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span></div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1400px] gap-5 px-4 py-10 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:py-14">
        <div className="relative min-h-[300px] overflow-hidden rounded-3xl bg-charcoal-950 p-7 text-ivory-50 shadow-premium sm:p-10">
          <img src={DINING_IMAGE} alt="Warmly lit restaurant dining room" className="absolute inset-0 h-full w-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950 via-charcoal-950/80 to-transparent" />
          <div className="relative max-w-lg"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">The FEEDO loop</span><h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Good food, better experiences.</h2><p className="mt-4 text-sm leading-relaxed text-ivory-200">A verified payment does more than complete a checkout. It connects the table, kitchen, manager, counter and supply chain in one calm operating rhythm.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-gold-200"><span className="rounded-full border border-gold-300/30 bg-white/10 px-3 py-1.5">Order smart</span><span className="rounded-full border border-gold-300/30 bg-white/10 px-3 py-1.5">Pay securely</span><span className="rounded-full border border-gold-300/30 bg-white/10 px-3 py-1.5">Waste less</span></div></div>
        </div>
        <div className="rounded-3xl border border-charcoal-900/10 bg-white p-7 shadow-premium sm:p-8"><div className="flex items-center gap-2 text-sm font-bold text-charcoal-900"><ShieldCheck className="h-5 w-5 text-gold-600" /> Live ecosystem pulse</div><div className="mt-6 grid grid-cols-2 gap-4"><div><p className="text-xs text-charcoal-800/60">Verified revenue</p><p className="mt-1 font-display text-2xl font-extrabold">${metrics?.totalRevenue.toFixed(2) || '0.00'}</p></div><div><p className="text-xs text-charcoal-800/60">Orders today</p><p className="mt-1 font-display text-2xl font-extrabold">{metrics?.totalOrders || 0}</p></div><div><p className="text-xs text-charcoal-800/60">Kitchen queue</p><p className="mt-1 font-display text-2xl font-extrabold text-gold-600">{metrics?.activeKitchenOrders || 0}</p></div><div><p className="text-xs text-charcoal-800/60">Tables open</p><p className="mt-1 font-display text-2xl font-extrabold">{metrics?.availableTablesCount || 0}<span className="text-sm font-semibold text-charcoal-800/50">/{metrics?.totalTablesCount || 0}</span></p></div></div><div className="mt-7 space-y-3 border-t border-charcoal-900/10 pt-5 text-xs text-charcoal-800/80"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ingredient-aware menus</div><div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-gold-600" /> Live kitchen timing</div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-600" /> Server-verified payment flow</div></div></div>
      </section>
    </div>
  );
};
