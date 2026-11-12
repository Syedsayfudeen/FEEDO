import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Play,
  ArrowRight,
  ChefHat,
  UtensilsCrossed,
  LayoutDashboard,
  Truck,
  Cpu,
  CheckCircle2,
  Clock,
  Lock,
  Activity,
  Layers,
  Zap,
  RefreshCw,
  Award,
  CreditCard,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import { UserRole } from '../../shared/types.ts';

export const LandingPage: React.FC = () => {
  const {
    snapshot,
    switchDemoRole,
    setActiveView,
    startLiveDemo,
    setIsAuthModalOpen,
  } = useEcosystem();

  const [activePipelineIndex, setActivePipelineIndex] = useState(0);

  const pipelineSteps = [
    {
      step: '01',
      title: 'Table & Menu Selection',
      subtitle: 'Ingredient-to-Menu Dependency Engine verifies recipe stock before cart checkout.',
      badge: 'Table #12 • Chicken Biryani',
    },
    {
      step: '02',
      title: 'PayPal Sandbox Checkout',
      subtitle: 'Server-calculated amount & OAuth 2.0 Orders v2 API create & capture payment.',
      badge: 'PayPal Capture Verified',
    },
    {
      step: '03',
      title: 'Atomic Stock & Token F204',
      subtitle: 'Verified payment atomically reserves 0.25kg Basmati & 0.30kg Chicken, issuing Token F204.',
      badge: 'Token F204 Generated',
    },
    {
      step: '04',
      title: 'KitchenPulse AI & Chef Prep',
      subtitle: 'Chef Command Center receives F204 with adaptive 12-min prep prediction & batch grouping.',
      badge: 'Est. Prep: 12 Mins',
    },
    {
      step: '05',
      title: 'ESP32 Smart Counter Call',
      subtitle: 'Marking READY triggers OLED display & green pulse LED at Counter 2 for instant pickup.',
      badge: 'NOW READY • COUNTER 2',
    },
    {
      step: '06',
      title: 'Supplier & Waste Analytics',
      subtitle: 'Low-stock triggers Verdant Harvest replenishment; KitchenPulse AI prevents surplus waste.',
      badge: 'Closed-Loop Sync',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePipelineIndex((prev) => (prev + 1) % pipelineSteps.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [pipelineSteps.length]);

  const handleLaunchRole = async (role: UserRole) => {
    await switchDemoRole(role);
  };

  return (
    <div className="min-h-screen bg-ivory-50 text-charcoal-900">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-charcoal-950 text-ivory-50 pt-12 pb-20 lg:py-24 border-b border-emerald-800">
        {/* Decorative Subtle Background Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 2px 2px, rgba(234, 185, 62, 0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/90 border border-emerald-700/80 text-xs font-medium text-emerald-200 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-gold-400" />
                <span>PayPal Verified Payment-to-Operations Architecture</span>
                <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-400/30 font-mono text-[11px]">
                  Orders API v2 + Webhooks
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-gold-400 font-mono text-xs sm:text-sm uppercase tracking-widest font-semibold">
                  FEEDO PAY — The Intelligent Food Commerce Ecosystem
                </p>
                <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-ivory-50">
                  The Future of{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-gold-300 to-gold-400">
                    Intelligent Food Commerce.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-emerald-100/90 max-w-2xl leading-relaxed font-normal">
                  &ldquo;From secure digital payments to intelligent kitchen operations, manage your
                  entire food-service ecosystem through one connected platform.&rdquo;
                </p>
              </div>

              {/* Tagline Pill */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
                <span className="px-3 py-1 rounded-lg bg-emerald-900/70 border border-emerald-700/60">
                  Order Smart.
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-900/70 border border-emerald-700/60">
                  Pay Securely.
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-900/70 border border-emerald-700/60">
                  Eat Faster.
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-900/70 border border-emerald-700/60">
                  Waste Less.
                </span>
              </div>

              {/* Three Primary Hero CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  onClick={startLiveDemo}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 font-display font-bold text-sm shadow-xl transition-all transform hover:-translate-y-0.5"
                >
                  <Play className="w-4 h-4 fill-charcoal-950" />
                  <span>Live Demo (14-Step Judge Walkthrough)</span>
                </button>

                <button
                  onClick={() => handleLaunchRole('customer')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm border border-emerald-400/30 shadow-lg transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="#ecosystem-architecture"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-emerald-900/70 hover:bg-emerald-800/80 text-emerald-100 font-display font-semibold text-sm border border-emerald-700/70 transition-all"
                >
                  <span>Explore Platform</span>
                </a>
              </div>

              {/* Real-Time Ecosystem Metrics Strip */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-900/50 border border-emerald-800/80 backdrop-blur-sm">
                  <div className="text-xs text-emerald-300">Verified PayPal Vol.</div>
                  <div className="font-display font-extrabold text-xl text-ivory-50 mt-0.5">
                    ${snapshot?.metrics.totalRevenue.toFixed(2) || '51.98'}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    {snapshot?.metrics.paymentSuccessRate || 80}% Capture Rate
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-900/50 border border-emerald-800/80 backdrop-blur-sm">
                  <div className="text-xs text-emerald-300">Active Kitchen Queue</div>
                  <div className="font-display font-extrabold text-xl text-gold-400 mt-0.5">
                    {snapshot?.metrics.activeKitchenOrders ?? 2} Orders
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono">
                    Adaptive Prep: ~11m
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-900/50 border border-emerald-800/80 backdrop-blur-sm">
                  <div className="text-xs text-emerald-300">Smart Counter Ready</div>
                  <div className="font-mono font-extrabold text-xl text-emerald-400 mt-0.5">
                    {snapshot?.smartCounter.currentReadyToken || 'F201'}
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono">
                    Counter #{snapshot?.smartCounter.counterNumber || 1} OLED
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-900/50 border border-emerald-800/80 backdrop-blur-sm">
                  <div className="text-xs text-emerald-300">Dining Tables Open</div>
                  <div className="font-display font-extrabold text-xl text-ivory-50 mt-0.5">
                    {snapshot?.metrics.availableTablesCount ?? 13} /{' '}
                    {snapshot?.metrics.totalTablesCount ?? 16}
                  </div>
                  <div className="text-[11px] text-gold-300 font-mono">Table #12 Ready</div>
                </div>
              </div>
            </div>

            {/* Hero Right Column: Live Interactive Token & Workflow Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-charcoal-900/95 border border-emerald-700/70 shadow-2xl p-5 space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-mono text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                      LIVE PAYMENT-TO-OPERATIONS ENGINE
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-gold-500/20 text-gold-300 border border-gold-400/40 font-mono text-[11px] font-semibold">
                    PayPal REST v2
                  </span>
                </div>

                {/* Animated 6-Stage Operational Lifecycle */}
                <div className="space-y-2.5">
                  {pipelineSteps.map((st, idx) => {
                    const isActive = idx === activePipelineIndex;
                    return (
                      <div
                        key={st.step}
                        onClick={() => setActivePipelineIndex(idx)}
                        className={`cursor-pointer p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'bg-emerald-900/90 border-gold-400/80 shadow-md scale-[1.01]'
                            : 'bg-charcoal-950/70 border-emerald-900/60 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-6 h-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center ${
                                isActive
                                  ? 'bg-gold-400 text-charcoal-950'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}
                            >
                              {st.step}
                            </span>
                            <span className="font-display font-bold text-sm text-ivory-50">
                              {st.title}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-charcoal-800 text-emerald-400/70'
                            }`}
                          >
                            {st.badge}
                          </span>
                        </div>
                        {isActive && (
                          <p className="text-xs text-emerald-200/90 mt-1.5 pl-8 leading-relaxed">
                            {st.subtitle}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live Kitchen Token & Smart Counter Preview Box */}
                <div className="rounded-xl bg-black border-2 border-emerald-600/80 p-4 font-mono text-center space-y-1 shadow-inner">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 border-b border-emerald-900 pb-1">
                    <span>ESP32 OLED SIMULATOR</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      COUNTER #{snapshot?.smartCounter.counterNumber || 2}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-300 tracking-widest pt-1">
                    FEEDO SMART COUNTER • NOW READY
                  </div>
                  <div className="text-3xl font-extrabold text-gold-400 tracking-wider py-1">
                    {snapshot?.smartCounter.currentReadyToken || 'F204'}
                  </div>
                  <div className="text-[11px] text-emerald-400 uppercase tracking-widest">
                    COLLECT AT COUNTER {snapshot?.smartCounter.counterNumber || 2}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOUR STAKEHOLDER ROLE CARDS — INSTANT DEMO ACCESS */}
      <section id="ecosystem-architecture" className="py-16 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            Unified Four-Role Ecosystem
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-charcoal-900">
            One Verified Payment Orchestrates Four Dashboards
          </h2>
          <p className="text-sm sm:text-base text-charcoal-800/80">
            Click any stakeholder card below to launch that role immediately with pre-seeded
            demonstration credentials, or click{' '}
            <button
              onClick={startLiveDemo}
              className="text-emerald-700 font-bold underline hover:text-emerald-900"
            >
              START LIVE FEEDO DEMO
            </button>{' '}
            for the guided 14-step judge tour.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Customer / Student */}
          <div className="group rounded-2xl bg-white border border-emerald-900/10 shadow-premium hover:shadow-xl hover:border-emerald-600/50 transition-all p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Stakeholder 01
                </span>
                <h3 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                  Customers & Students
                </h3>
                <p className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded mt-1.5 inline-block border border-emerald-200">
                  student@feedo.demo
                </p>
              </div>
              <ul className="space-y-2 text-xs text-charcoal-800/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Ingredient-aware menu & automatic stockout protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Interactive dining table reservation (Tables 1–16)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>PayPal Sandbox checkout, digital token & receipt</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('customer')}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Launch Customer App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Chef / Kitchen Staff */}
          <div className="group rounded-2xl bg-white border border-emerald-900/10 shadow-premium hover:shadow-xl hover:border-emerald-600/50 transition-all p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <ChefHat className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Stakeholder 02 • Common Kitchen Login
                </span>
                <h3 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                  Kitchen Staff & Chefs
                </h3>
                <p className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded mt-1.5 inline-block border border-emerald-200">
                  chef@feedo.demo
                </p>
              </div>
              <ul className="space-y-2 text-xs text-charcoal-800/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>ONE Common Kitchen Login with Preloaded Chef Dropdown</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>4-Column KDS: New Orders → Preparing → Ready → Completed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1-click READY trigger to ESP32 Smart Counter OLED</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('chef')}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Launch Kitchen Monitor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Manager */}
          <div className="group rounded-2xl bg-white border border-emerald-900/10 shadow-premium hover:shadow-xl hover:border-emerald-600/50 transition-all p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Stakeholder 03
                </span>
                <h3 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                  Restaurant Manager
                </h3>
                <p className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded mt-1.5 inline-block border border-emerald-200">
                  manager@feedo.demo
                </p>
              </div>
              <ul className="space-y-2 text-xs text-charcoal-800/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>PayPal Payment Intelligence & Full/Partial Refunds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>KitchenPulse AI Demand Forecast & Waste Prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Supplier Replenishment & Dock Delivery Verification</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('manager')}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Launch Manager Control</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Supplier */}
          <div className="group rounded-2xl bg-white border border-emerald-900/10 shadow-premium hover:shadow-xl hover:border-emerald-600/50 transition-all p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Stakeholder 04
                </span>
                <h3 className="font-display font-bold text-xl text-charcoal-900 mt-0.5">
                  Agro & Cold-Chain Supplier
                </h3>
                <p className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded mt-1.5 inline-block border border-emerald-200">
                  supplier@feedo.demo
                </p>
              </div>
              <ul className="space-y-2 text-xs text-charcoal-800/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Real-time low-stock replenishment orders from FEEDO</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Accept, reject & update cold-chain dispatch status</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Two-step verification before inventory increment</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handleLaunchRole('supplier')}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Launch Supplier Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* KEY PRODUCT CAPABILITIES & SECURITY ARCHITECTURE */}
      <section className="py-16 bg-ivory-100 border-y border-emerald-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white border border-emerald-900/10 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 text-gold-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Zero-Trust PayPal Payment Engine
              </h3>
              <p className="text-xs text-charcoal-800/80 leading-relaxed">
                Prices are calculated exclusively on the backend. Orders are created via PayPal
                OAuth 2.0 REST APIs with idempotency locks (`PayPal-Request-Id`), webhook signature
                verification, and atomic rollback on declined captures.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-900/10 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 text-gold-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Explainable KitchenPulse AI
              </h3>
              <p className="text-xs text-charcoal-800/80 leading-relaxed">
                No black-box buzzwords: adaptive preparation time estimation factors active orders,
                dish complexity, and on-shift chefs, while providing transparent explanations and
                confidence-graded demand & waste recommendations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-emerald-900/10 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 text-gold-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                ESP32 Smart Counter & Dependency Engine
              </h3>
              <p className="text-xs text-charcoal-800/80 leading-relaxed">
                Recipe-to-ingredient mappings automatically disable dishes when raw ingredients run
                low, and restore them upon verified supplier delivery. Ready orders immediately
                trigger the physical/simulated ESP32 OLED counter display.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
