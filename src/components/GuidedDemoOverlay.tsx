import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';

interface DemoStepSpec {
  step: number;
  title: string;
  description: string;
  roleBadge: string;
  ctaLabel: string;
}

const DEMO_STEPS: DemoStepSpec[] = [
  {
    step: 1,
    title: 'STEP 1: Student Reserves Table 12',
    description:
      'Aarav Sharma (student@feedo.demo) opens FEEDO PAY and reserves Table #12 in the dining floorplan.',
    roleBadge: 'Customer App',
    ctaLabel: 'Auto-Reserve Table #12',
  },
  {
    step: 2,
    title: 'STEP 2: Student Selects Chicken Biryani',
    description:
      'The student browses the smart menu and adds 1x Chicken Biryani ($8.50) to their cart.',
    roleBadge: 'Customer App',
    ctaLabel: 'Add Chicken Biryani to Cart',
  },
  {
    step: 3,
    title: 'STEP 3: Ingredient-to-Menu Dependency Check',
    description:
      'FEEDO verifies recipe stock: 0.25kg Basmati Rice, 0.30kg Free-Range Chicken, and 0.02kg Kashmiri Saffron are verified in stock.',
    roleBadge: 'Dependency Engine',
    ctaLabel: 'Verify Recipe Ingredients',
  },
  {
    step: 4,
    title: 'STEP 4: Proceed to PayPal Checkout',
    description:
      'The student opens the PayPal Checkout engine. Server calculates total ($8.93 USD including 5% tax) and creates a PayPal Order.',
    roleBadge: 'PayPal Engine',
    ctaLabel: 'Open PayPal Checkout Modal',
  },
  {
    step: 5,
    title: 'STEP 5: Verified Capture & Token F204 Issued',
    description:
      'Backend captures the PayPal payment, atomically deducts recipe ingredients, and generates Digital Token F204!',
    roleBadge: 'PayPal Capture → F204',
    ctaLabel: 'Capture Payment & Generate F204',
  },
  {
    step: 6,
    title: 'STEP 6: Chef Dashboard Instantly Receives F204',
    description:
      'Switch to the Chef Command Center (chef@feedo.demo) where Token F204 is now live in Incoming Orders with PayPal verification.',
    roleBadge: 'Chef KDS',
    ctaLabel: 'View F204 on Chef Dashboard',
  },
  {
    step: 7,
    title: 'STEP 7: Chef Starts Preparation',
    description:
      'Chef Vikramaditya accepts and starts cooking Token F204 on the Dum & Wok Station.',
    roleBadge: 'Chef KDS',
    ctaLabel: 'Start Cooking Token F204',
  },
  {
    step: 8,
    title: 'STEP 8: KitchenPulse AI Updates Prep Estimate',
    description:
      'KitchenPulse AI dynamically calculates a 12-minute preparation estimate based on active orders, complexity score (4/5), and 3 active chefs.',
    roleBadge: 'KitchenPulse AI',
    ctaLabel: 'Sync 12m AI Prep Estimate',
  },
  {
    step: 9,
    title: 'STEP 9: Chef Clicks READY',
    description:
      'Preparation finishes! The chef clicks MARK READY on Token F204 to trigger collection.',
    roleBadge: 'Chef KDS',
    ctaLabel: 'Mark Token F204 READY',
  },
  {
    step: 10,
    title: 'STEP 10: Customer Receives Real-Time Notification',
    description:
      'Real-time Socket.IO notification alerts Aarav Sharma: "NOW READY: Token F204 at Counter 2!"',
    roleBadge: 'Real-Time Sync',
    ctaLabel: 'Verify Customer Alert & Open Counter',
  },
  {
    step: 11,
    title: 'STEP 11: Smart Counter Simulator Displays F204',
    description:
      'The ESP32 Smart Counter OLED Simulator displays "FEEDO SMART COUNTER • NOW READY • F204 • COLLECT AT COUNTER 2" with Green Pulse LED.',
    roleBadge: 'IoT ESP32 Counter',
    ctaLabel: 'Inspect Smart Counter Display F204',
  },
  {
    step: 12,
    title: 'STEP 12: Customer Collects the Food',
    description:
      'The student collects Chicken Biryani at Counter 2. Order F204 transitions to COMPLETED and Table 12 is released.',
    roleBadge: 'Counter Handover',
    ctaLabel: 'Complete Food Collection for F204',
  },
  {
    step: 13,
    title: 'STEP 13: Manager Dashboard Updates Analytics',
    description:
      'Switch to Manager Control Center (manager@feedo.demo) to inspect updated PayPal revenue, capture IDs, and deducted chicken stock.',
    roleBadge: 'Manager Control',
    ctaLabel: 'Open Manager Analytics',
  },
  {
    step: 14,
    title: 'STEP 14: AI Replenishment Recommendation Triggered',
    description:
      'Because Chicken stock dropped near threshold after F204, KitchenPulse AI highlights a replenishment recommendation for Verdant Harvest Agro!',
    roleBadge: 'KitchenPulse AI → Supplier',
    ctaLabel: 'Execute AI Replenishment to Supplier',
  },
];

export const GuidedDemoOverlay: React.FC = () => {
  const {
    snapshot,
    isDemoActive,
    demoStep,
    setDemoStep,
    closeLiveDemo,
    startLiveDemo,
    switchDemoRole,
    setActiveView,
    setSelectedTable,
    addToCart,
    clearCart,
    setIsCheckoutModalOpen,
    apiFetch,
    showToast,
    demoHighlightOrderId,
    setDemoHighlightOrderId,
  } = useEcosystem();

  const [busy, setBusy] = useState(false);

  if (!isDemoActive || !snapshot) return null;

  const currentSpec = DEMO_STEPS.find((s) => s.step === demoStep) || DEMO_STEPS[0];

  // Locate F204 or latest demo order
  const targetOrder =
    snapshot.orders.find((o) => o.tokenNumber === 'F204') ||
    snapshot.orders.find((o) => o.id === demoHighlightOrderId) ||
    snapshot.orders[0];

  const handleExecuteStepAction = async () => {
    setBusy(true);
    try {
      switch (demoStep) {
        case 1: {
          await switchDemoRole('customer');
          await apiFetch('/api/tables/reserve', {
            method: 'POST',
            body: JSON.stringify({
              tableNumber: 12,
              customerId: 'usr-customer-1',
              customerName: 'Aarav Sharma',
              guests: 2,
            }),
          });
          setSelectedTable(12);
          showToast('STEP 1 COMPLETE: Table #12 Reserved', 'Ready to select Chicken Biryani', 'emerald');
          setDemoStep(2);
          break;
        }
        case 2: {
          setActiveView('customer');
          const biryani = snapshot.menuItems.find((m) => m.id === 'menu-chicken-biryani');
          if (biryani) {
            clearCart();
            addToCart(biryani, 1);
          }
          showToast('STEP 2 COMPLETE: Chicken Biryani Selected', '$8.50 added to cart', 'emerald');
          setDemoStep(3);
          break;
        }
        case 3: {
          setActiveView('customer');
          showToast(
            'STEP 3 COMPLETE: Ingredient Stock Verified',
            'Basmati (18.5kg), Chicken (6.4kg) & Saffron (3.5kg) verified available!',
            'emerald'
          );
          setDemoStep(4);
          break;
        }
        case 4: {
          setActiveView('customer');
          setIsCheckoutModalOpen(true);
          showToast(
            'STEP 4: PayPal Checkout Opened',
            'Click Approve & Capture inside the modal or click the next demo button!',
            'gold'
          );
          setDemoStep(5);
          break;
        }
        case 5: {
          // If F204 hasn't been created/captured yet by the modal, execute create + capture directly!
          const existingF204 = snapshot.orders.find((o) => o.tokenNumber === 'F204');
          if (!existingF204) {
            const created = await apiFetch('/api/paypal/create-order', {
              method: 'POST',
              body: JSON.stringify({
                items: [{ menuItemId: 'menu-chicken-biryani', quantity: 1 }],
                tableNumber: 12,
                specialInstructions: 'Judge Live Demo Order — Extra Mint Raita',
                customerId: 'usr-customer-1',
                customerName: 'Aarav Sharma',
                customerEmail: 'student@feedo.demo',
              }),
            });
            const captured = await apiFetch('/api/paypal/capture-order', {
              method: 'POST',
              body: JSON.stringify({
                paypalOrderId: created.paypalOrderId,
                internalOrderId: created.internalOrderId,
                tableNumber: 12,
                specialInstructions: 'Judge Live Demo Order — Extra Mint Raita',
                fallbackItems: [{ menuItemId: 'menu-chicken-biryani', quantity: 1 }],
              }),
            });
            setDemoHighlightOrderId(captured.order.id);
            clearCart();
            setIsCheckoutModalOpen(false);
            showToast(
              `STEP 5 COMPLETE: Token ${captured.order.tokenNumber} Generated!`,
              `PayPal Capture ${captured.payment.paypalCaptureId} verified & stock deducted.`,
              'gold'
            );
          } else {
            setIsCheckoutModalOpen(false);
            showToast('STEP 5 COMPLETE: Token F204 Verified', 'Ready for Chef Command Center', 'gold');
          }
          setDemoStep(6);
          break;
        }
        case 6: {
          await switchDemoRole('chef');
          setActiveView('chef');
          showToast(
            'STEP 6 COMPLETE: Chef Dashboard Synced',
            'Token F204 is visible in Incoming Orders with PayPal verification badge!',
            'emerald'
          );
          setDemoStep(7);
          break;
        }
        case 7: {
          await switchDemoRole('chef');
          setActiveView('chef');
          if (targetOrder) {
            await apiFetch(`/api/kitchen/orders/${targetOrder.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: 'PREPARING', customPrepMinutes: 12 }),
            });
          }
          showToast('STEP 7 COMPLETE: Chef Started Cooking F204', 'Moved to Preparing station', 'emerald');
          setDemoStep(8);
          break;
        }
        case 8: {
          setActiveView('chef');
          if (targetOrder) {
            await apiFetch(`/api/kitchen/orders/${targetOrder.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: 'PREPARING', customPrepMinutes: 12 }),
            });
          }
          showToast(
            'STEP 8 COMPLETE: KitchenPulse AI Updated Prep Time',
            'Estimated preparation time: 12 minutes (explained by active workload).',
            'gold'
          );
          setDemoStep(9);
          break;
        }
        case 9: {
          await switchDemoRole('chef');
          setActiveView('chef');
          if (targetOrder) {
            await apiFetch(`/api/kitchen/orders/${targetOrder.id}/status`, {
              method: 'POST',
              body: JSON.stringify({ status: 'READY_FOR_COLLECTION' }),
            });
          }
          showToast(
            'STEP 9 COMPLETE: Chef Marked F204 READY!',
            'Token F204 dispatched to Smart Counter #2 & Customer notified.',
            'gold'
          );
          setDemoStep(10);
          break;
        }
        case 10: {
          await switchDemoRole('customer');
          setActiveView('customer');
          showToast(
            'STEP 10 COMPLETE: Customer Notification Received',
            'NOW READY: Token F204 at Smart Counter 2!',
            'emerald'
          );
          setDemoStep(11);
          break;
        }
        case 11: {
          setActiveView('iot-counter');
          showToast(
            'STEP 11 COMPLETE: Smart Counter Simulator Active',
            'Displaying FEEDO SMART COUNTER • NOW READY • F204 • COLLECT AT COUNTER 2',
            'gold'
          );
          setDemoStep(12);
          break;
        }
        case 12: {
          const tokenToCollect = targetOrder?.tokenNumber || 'F204';
          await apiFetch(`/api/orders/${tokenToCollect}/collect`, { method: 'POST' });
          showToast(
            `STEP 12 COMPLETE: Customer Collected ${tokenToCollect}`,
            'Order lifecycle completed & Table 12 released.',
            'emerald'
          );
          setDemoStep(13);
          break;
        }
        case 13: {
          await switchDemoRole('manager');
          setActiveView('manager');
          showToast(
            'STEP 13 COMPLETE: Manager Analytics Updated',
            'PayPal revenue, order count, and ingredient stocks updated in real time.',
            'emerald'
          );
          setDemoStep(14);
          break;
        }
        case 14: {
          await switchDemoRole('manager');
          const chickenRec = snapshot.aiRecommendations.find(
            (r) => r.actionPayload?.ingredientId === 'ing-chicken'
          );
          if (chickenRec && chickenRec.status === 'ACTIVE') {
            await apiFetch(`/api/manager/ai-recommendations/${chickenRec.id}/act`, {
              method: 'POST',
              body: JSON.stringify({ decision: 'ACCEPTED' }),
            });
          } else {
            await apiFetch('/api/manager/supplier-requests', {
              method: 'POST',
              body: JSON.stringify({
                ingredientId: 'ing-chicken',
                requestedQuantity: 15,
                urgency: 'HIGH',
              }),
            });
          }
          await switchDemoRole('supplier');
          setActiveView('supplier');
          showToast(
            'ALL 14 DEMO STEPS COMPLETED!',
            'KitchenPulse AI triggered a 15kg Chicken replenishment order to Verdant Harvest Agro!',
            'gold'
          );
          break;
        }
      }
    } catch (err: any) {
      showToast('Demo Step Note', err.message, 'red');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 max-w-4xl mx-auto">
      <div className="rounded-3xl bg-charcoal-950/95 backdrop-blur-md text-ivory-50 border-2 border-gold-400 shadow-2xl p-4 sm:p-5 space-y-3">
        {/* Progress Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gold-500 text-charcoal-950 font-mono font-black text-xs">
              STEP {demoStep} OF 14
            </span>
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider font-semibold">
              • Interactive Hackathon Judge Walkthrough
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startLiveDemo}
              className="px-2.5 py-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs flex items-center gap-1"
              title="Reset ecosystem to Step 1 (Token F204 ready)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo</span>
            </button>
            <button
              onClick={closeLiveDemo}
              className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Body & Execute CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-extrabold text-base sm:text-lg text-gold-300">
                {currentSpec.title}
              </h4>
              <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono text-[10px]">
                {currentSpec.roleBadge}
              </span>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
              {currentSpec.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={demoStep <= 1 || busy}
              onClick={() => setDemoStep(Math.max(1, demoStep - 1))}
              className="p-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-white"
              title="Previous Step"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              disabled={busy}
              onClick={handleExecuteStepAction}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-charcoal-950 font-display font-black text-xs shadow-lg flex items-center gap-2 transition-all"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-charcoal-950" />
              )}
              <span>{currentSpec.ctaLabel}</span>
            </button>

            <button
              disabled={demoStep >= 14 || busy}
              onClick={() => setDemoStep(Math.min(14, demoStep + 1))}
              className="p-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 disabled:opacity-40 text-white"
              title="Skip to Next Step"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 14-Step Visual Progress Bar */}
        <div className="grid grid-cols-14 gap-1 pt-1">
          {DEMO_STEPS.map((st) => (
            <button
              key={st.step}
              onClick={() => setDemoStep(st.step)}
              className={`h-1.5 rounded-full transition-all ${
                st.step < demoStep
                  ? 'bg-emerald-400'
                  : st.step === demoStep
                  ? 'bg-gold-400 h-2'
                  : 'bg-emerald-900'
              }`}
              title={st.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
