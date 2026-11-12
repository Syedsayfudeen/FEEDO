import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  Receipt,
  Sparkles,
  RefreshCcw,
  X,
  CreditCard,
  Wallet,
  CalendarClock,
  Smartphone,
} from 'lucide-react';
import { useEcosystem, handleFoodImageError } from '../context/EcosystemContext.tsx';
import { Order } from '../../shared/types.ts';

export const PayPalCheckoutModal: React.FC = () => {
  const {
    snapshot,
    currentUser,
    cart,
    orderType,
    selectedTable,
    specialInstructions,
    clearCart,
    isCheckoutModalOpen,
    setIsCheckoutModalOpen,
    setReceiptOrder,
    showToast,
    isDemoActive,
    demoStep,
    setDemoStep,
    setDemoHighlightOrderId,
    refreshState,
    updateSnapshotDirectly,
  } = useEcosystem();

  const [stage, setStage] = useState<
    'REVIEW' | 'CREATING_ORDER' | 'AWAITING_APPROVAL' | 'CAPTURING' | 'SUCCESS' | 'FAILED'
  >('REVIEW');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    | 'PayPal Account'
    | 'Debit or Credit Card (PayPal Guest)'
    | 'PayPal Pay Later'
    | 'Venmo / Apple Pay / Google Pay'
  >('PayPal Account');

  const [createdPayPalOrder, setCreatedPayPalOrder] = useState<{
    internalOrderId: string;
    paypalOrderId: string;
    mode: 'PAYPAL_SANDBOX' | 'PAYPAL_DEMO_SIMULATION';
    subtotal: number;
    tax: number;
    totalAmount: number;
    currency: string;
    estimatedPrepMinutes: number;
    prepExplanation: string;
  } | null>(null);

  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subtotal = Number(
    cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0).toFixed(2)
  );
  const estimatedTax = Number((subtotal * 0.05).toFixed(2));
  const estimatedTotal = Number((subtotal + estimatedTax).toFixed(2));
  const currency = snapshot?.paypalConfig.currency || 'USD';
  const isLiveSandboxConfigured = Boolean(
    snapshot?.paypalConfig.isSandboxConfigured && snapshot?.paypalConfig.clientId
  );

  useEffect(() => {
    if (isCheckoutModalOpen) {
      setStage('REVIEW');
      setCreatedPayPalOrder(null);
      setConfirmedOrder(null);
      setErrorMessage(null);
    }
  }, [isCheckoutModalOpen]);

  if (!isCheckoutModalOpen) return null;

  // Step 1: Create Order on Backend (verifying ingredients & calculating server price)
  const handleInitiateCheckout = async (forceDemoMode: boolean = false) => {
    try {
      setErrorMessage(null);
      setStage('CREATING_ORDER');
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            specialInstructions: c.specialInstructions,
          })),
          orderType,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
          paymentMethodUsed: selectedPaymentMethod,
          specialInstructions,
          customerId: currentUser?.id || 'usr-customer-1',
          customerName: currentUser?.name || 'Aarav Sharma',
          customerEmail: currentUser?.email || 'student@feedo.demo',
          forceDemoMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStage('FAILED');
        setErrorMessage(data.message || data.error || 'Ingredient or order validation failed.');
        return;
      }
      if (data?.snapshot) {
        updateSnapshotDirectly(data.snapshot);
      }
      setCreatedPayPalOrder(data);
      setStage('AWAITING_APPROVAL');
    } catch (err: any) {
      setStage('FAILED');
      setErrorMessage(err.message || 'Network error creating PayPal order.');
    }
  };

  // Step 2: Capture Approved Order on Backend (or simulate declined funding instrument)
  const handleCaptureOrder = async (simulateFailureReason?: string) => {
    if (!createdPayPalOrder) return;
    try {
      setStage('CAPTURING');
      setErrorMessage(null);
      const res = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypalOrderId: createdPayPalOrder.paypalOrderId,
          internalOrderId: createdPayPalOrder.internalOrderId,
          simulateFailureReason,
          payerEmail: currentUser?.email || 'student@feedo.demo',
          payerName: currentUser?.name || 'Aarav Sharma',
          orderType,
          tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
          paymentMethodUsed: selectedPaymentMethod,
          specialInstructions,
          fallbackItems: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            quantity: c.quantity,
            specialInstructions: c.specialInstructions,
          })),
        }),
      });
      const data = await res.json();
      if (data?.snapshot) {
        updateSnapshotDirectly(data.snapshot);
      }
      if (!res.ok || !data.captured) {
        setStage('FAILED');
        setErrorMessage(
          data.message ||
            'PayPal payment capture failed. Order was NOT confirmed and zero inventory was deducted.'
        );
        showToast(
          'Payment Declined — Rollback Safe',
          'No inventory deducted; kitchen notified.',
          'red'
        );
        return;
      }

      setConfirmedOrder(data.order);
      setStage('SUCCESS');
      clearCart();
      if (!data?.snapshot) {
        await refreshState();
      }
      showToast(
        `PayPal Verified! Token ${data.order.tokenNumber} Issued`,
        `Dispatched to Kitchen Monitor • Est. ${data.order.estimatedPrepMinutes} mins`,
        'emerald'
      );

      if (isDemoActive && demoStep <= 5) {
        setDemoHighlightOrderId(data.order.id);
        setDemoStep(5);
      }
    } catch (err: any) {
      setStage('FAILED');
      setErrorMessage(err.message || 'Error capturing PayPal payment.');
    }
  };

  const handleCancelOrder = async () => {
    if (createdPayPalOrder) {
      const res = await fetch('/api/paypal/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paypalOrderId: createdPayPalOrder.paypalOrderId,
          internalOrderId: createdPayPalOrder.internalOrderId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.snapshot) {
        updateSnapshotDirectly(data.snapshot);
      }
    }
    setStage('FAILED');
    setErrorMessage(
      'Payment cancelled by customer before capture. Pending order voided; zero inventory deducted.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-ivory-50 border border-emerald-900/20 shadow-2xl overflow-hidden my-8">
        {/* Modal Header with Official PayPal Branding */}
        <div className="bg-emerald-950 text-ivory-50 px-6 py-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-white flex items-center gap-1.5 shadow">
              <span className="font-display font-black italic text-base tracking-tight text-[#003087]">
                Pay
              </span>
              <span className="font-display font-black italic text-base tracking-tight text-[#0079C1] -ml-1.5">
                Pal
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base">
                  PayPal Verified Checkout Engine
                </h3>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-semibold ${
                    isLiveSandboxConfigured
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                      : 'bg-gold-500/20 text-gold-300 border border-gold-400/40'
                  }`}
                >
                  {isLiveSandboxConfigured
                    ? 'LIVE SANDBOX SDK'
                    : 'SANDBOX ORDERS V2 ENGINE'}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                5% GST Server Calculation • Ingredient Lock • Instant Digital Token Generation
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckoutModalOpen(false)}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* STAGE 1: REVIEW & SELECT PAYPAL METHOD */}
          {stage === 'REVIEW' && (
            <>
              <div className="rounded-2xl bg-white border border-stone-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <span className="font-display font-bold text-sm text-charcoal-900">
                    Order Summary ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                  </span>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                    {orderType === 'DINE_IN'
                      ? `OPTION A: DINE-IN • Table #${selectedTable || 5}`
                      : 'OPTION B: TAKEAWAY • Pickup Counter #2'}
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {cart.map((c) => (
                    <div
                      key={c.menuItem.id}
                      className="flex items-center justify-between text-xs py-1"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={c.menuItem.image}
                          alt={c.menuItem.name}
                          onError={handleFoodImageError}
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200"
                        />
                        <div>
                          <div className="font-semibold text-charcoal-900">
                            {c.quantity}x {c.menuItem.name}
                          </div>
                          <div className="text-[11px] text-emerald-800">
                            Ingredients Verified ({c.menuItem.recipe.length} recipe components)
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold text-charcoal-900">
                        ${(c.menuItem.price * c.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Server-Calculated Subtotal</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>GST (5% Applicable Tax)</span>
                    <span className="font-mono">${estimatedTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-display font-extrabold text-base text-charcoal-900 pt-1">
                    <span>Total Payable ({currency})</span>
                    <span className="font-mono text-emerald-900">
                      ${estimatedTotal.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* PayPal Reference Checkout Method Selector */}
              <div className="rounded-2xl bg-white border border-stone-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">
                    Select PayPal Checkout Funding Method
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-display font-black italic text-xs text-[#003087]">
                      Pay
                    </span>
                    <span className="font-display font-black italic text-xs text-[#0079C1] -ml-1">
                      Pal
                    </span>
                    <span className="text-[10px] text-stone-500 ml-1">Buyer Protection</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'PayPal Account',
                      title: 'PayPal Account',
                      sub: 'Instant Wallet & Balance',
                      icon: Wallet,
                    },
                    {
                      id: 'Debit or Credit Card (PayPal Guest)',
                      title: 'Debit or Credit Card',
                      sub: 'Visa, Mastercard, Amex via PayPal',
                      icon: CreditCard,
                    },
                    {
                      id: 'PayPal Pay Later',
                      title: 'Pay Later (BNPL)',
                      sub: '4 interest-free payments',
                      icon: CalendarClock,
                    },
                    {
                      id: 'Venmo / Apple Pay / Google Pay',
                      title: 'Venmo / Apple Pay / Google Pay',
                      sub: 'Eligible Digital Wallets',
                      icon: Smartphone,
                    },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedPaymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(m.id as any)}
                        className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? 'bg-blue-50/70 border-[#0070ba] ring-1 ring-[#0070ba]'
                            : 'bg-ivory-50 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isSelected ? 'text-[#0070ba]' : 'text-stone-500'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900">{m.title}</div>
                          <div className="text-[10px] text-stone-500">{m.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payment-to-Operations Security Notice */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                <Lock className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Zero-Trust Payment-to-Operations Guarantee:</span>{' '}
                  Your order will only be confirmed, deducted from kitchen inventory, and assigned a
                  digital token after backend verification of the PayPal capture response.
                </div>
              </div>

              {/* If Live PayPal Sandbox SDK is configured, render official @paypal/react-paypal-js PayPalButtons */}
              {isLiveSandboxConfigured && snapshot?.paypalConfig.clientId && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-charcoal-800">
                    Official PayPal JavaScript SDK Checkout (<code>@paypal/react-paypal-js</code>):
                  </div>
                  <PayPalScriptProvider
                    options={{
                      clientId: snapshot.paypalConfig.clientId,
                      currency,
                      intent: 'capture',
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                      createOrder={async () => {
                        setErrorMessage(null);
                        const res = await fetch('/api/paypal/create-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            items: cart.map((c) => ({
                              menuItemId: c.menuItem.id,
                              quantity: c.quantity,
                              specialInstructions: c.specialInstructions,
                            })),
                            orderType,
                            tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
                            paymentMethodUsed: selectedPaymentMethod,
                            specialInstructions,
                            customerId: currentUser?.id,
                            customerName: currentUser?.name,
                            customerEmail: currentUser?.email,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setErrorMessage(data.message || 'Failed to create PayPal order.');
                          throw new Error(data.message);
                        }
                        setCreatedPayPalOrder(data);
                        return data.paypalOrderId;
                      }}
                      onApprove={async (data) => {
                        setStage('CAPTURING');
                        const res = await fetch('/api/paypal/capture-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            paypalOrderId: data.orderID,
                            orderType,
                            tableNumber: orderType === 'DINE_IN' ? selectedTable : undefined,
                            paymentMethodUsed: selectedPaymentMethod,
                          }),
                        });
                        const capData = await res.json();
                        if (!res.ok || !capData.captured) {
                          setStage('FAILED');
                          setErrorMessage(capData.message || 'Payment capture failed.');
                          return;
                        }
                        setConfirmedOrder(capData.order);
                        setStage('SUCCESS');
                        clearCart();
                        await refreshState();
                        if (isDemoActive && demoStep <= 5) {
                          setDemoHighlightOrderId(capData.order.id);
                          setDemoStep(5);
                        }
                      }}
                      onCancel={async (data: any) => {
                        if (data?.orderID) {
                          await fetch('/api/paypal/cancel-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paypalOrderId: data.orderID }),
                          });
                        }
                        setStage('FAILED');
                        setErrorMessage(
                          'PayPal checkout was cancelled before approval. Zero stock deducted.'
                        );
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              )}

              {/* Primary PayPal Checkout Button + "Powered by PayPal" Directly Below */}
              <div className="space-y-2">
                <button
                  onClick={() => handleInitiateCheckout(false)}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#ffc439] hover:bg-[#f4b829] text-[#003087] font-display font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <span className="font-black italic text-base">PayPal</span>
                  <span>
                    Proceed with {selectedPaymentMethod} (${estimatedTotal.toFixed(2)})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Required "Powered by PayPal" badge directly below the checkout button */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5 text-xs text-stone-600 font-semibold">
                  <Lock className="w-3.5 h-3.5 text-[#003087]" />
                  <span>Powered by</span>
                  <span className="font-display font-black italic text-[#003087]">Pay</span>
                  <span className="font-display font-black italic text-[#0079C1] -ml-1.5">Pal</span>
                  <span className="text-[11px] text-stone-400">• 256-Bit TLS Encrypted</span>
                </div>
              </div>
            </>
          )}

          {/* STAGE 2: CREATING ORDER OR CAPTURING */}
          {(stage === 'CREATING_ORDER' || stage === 'CAPTURING') && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-800 animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-lg text-charcoal-900">
                  {stage === 'CREATING_ORDER'
                    ? 'Verifying Kitchen Ingredients & Creating PayPal Order...'
                    : 'Capturing Payment & Executing Atomic Inventory Lock...'}
                </h4>
                <p className="text-xs text-charcoal-800/70 font-mono">
                  {stage === 'CREATING_ORDER'
                    ? 'POST /api/paypal/create-order'
                    : `POST /api/paypal/capture-order (${createdPayPalOrder?.paypalOrderId})`}
                </p>
              </div>
            </div>
          )}

          {/* STAGE 3: AWAITING BUYER APPROVAL IN PAYPAL CHECKOUT WINDOW */}
          {stage === 'AWAITING_APPROVAL' && createdPayPalOrder && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#003087] text-white p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/15">
                      {selectedPaymentMethod}
                    </span>
                    <h4 className="font-display font-bold text-lg mt-1">
                      Approve Payment to FEEDO Smart Canteen
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-blue-200">Amount Due (incl. 5% GST)</div>
                    <div className="font-mono font-extrabold text-xl text-[#ffc439]">
                      ${createdPayPalOrder.totalAmount.toFixed(2)} {createdPayPalOrder.currency}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono bg-black/20 p-3 rounded-xl">
                  <div>
                    <span className="text-blue-200">PayPal Order ID:</span>{' '}
                    <strong className="text-white">{createdPayPalOrder.paypalOrderId}</strong>
                  </div>
                  <div>
                    <span className="text-blue-200">Order Mode:</span>{' '}
                    <strong className="text-white">
                      {orderType === 'DINE_IN'
                        ? `Dine-In (Table #${selectedTable || 5})`
                        : 'Takeaway (Pickup Counter #2)'}
                    </strong>
                  </div>
                  <div className="sm:col-span-2 text-emerald-300">
                    ✓ Backend verified ingredient stock • Kitchen Est:{' '}
                    {createdPayPalOrder.estimatedPrepMinutes} mins
                  </div>
                </div>
              </div>

              {/* Interactive Approval / Failure Test Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => handleCaptureOrder()}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-display font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold-300" />
                  <span>
                    Approve & Capture Payment (${createdPayPalOrder.totalAmount.toFixed(2)})
                  </span>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-stone-500 font-semibold">
                  <span>Powered by</span>
                  <span className="font-display font-black italic text-[#003087]">PayPal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => handleCaptureOrder('INSTRUMENT_DECLINED')}
                    className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span>Test Failed Payment (Declined Card)</span>
                  </button>

                  <button
                    onClick={handleCancelOrder}
                    className="py-2.5 px-3 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel PayPal Checkout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 4: VERIFIED PAYMENT SUCCESS & DIGITAL TOKEN ISSUED */}
          {stage === 'SUCCESS' && confirmedOrder && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-950 text-ivory-50 border border-emerald-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                    <div>
                      <h4 className="font-display font-extrabold text-lg">
                        Payment Captured & Digital Token Generated!
                      </h4>
                      <p className="text-xs text-emerald-200 font-mono">
                        Capture ID: {confirmedOrder.paypalCaptureId} •{' '}
                        {confirmedOrder.paymentMethodUsed || 'PayPal Account'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right bg-gold-500 text-charcoal-950 px-3.5 py-1.5 rounded-xl">
                    <div className="text-[10px] font-mono uppercase font-bold">Digital Token</div>
                    <div className="font-mono font-black text-2xl leading-none">
                      {confirmedOrder.tokenNumber}
                    </div>
                  </div>
                </div>

                {/* Token & Order Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-emerald-900/70 p-3.5 rounded-xl border border-emerald-800">
                  <div className="flex items-center gap-2 text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>
                      Order Type:{' '}
                      <strong>
                        {confirmedOrder.orderType === 'DINE_IN'
                          ? `Dine-In (Table #${confirmedOrder.tableNumber || 5})`
                          : `Takeaway (Pickup Counter #${confirmedOrder.counterNumber || 2})`}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>
                      Assigned Chef:{' '}
                      <strong>{confirmedOrder.assignedChefName || 'Chef not assigned'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>Recipe Ingredients Deducted Atomically</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span>
                      Est. Waiting Time: <strong>{confirmedOrder.estimatedPrepMinutes} mins</strong>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-emerald-100/90 bg-emerald-800/40 p-2.5 rounded-lg flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-gold-300 shrink-0 mt-0.5" />
                  <span>
                    <strong>Kitchen Prep Intelligence:</strong> {confirmedOrder.prepExplanation}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setIsCheckoutModalOpen(false);
                    setReceiptOrder(confirmedOrder);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-900 font-semibold text-xs flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>View Printable Receipt & Token</span>
                </button>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Track Live Order Status
                </button>
              </div>
            </div>
          )}

          {/* STAGE 5: PAYMENT FAILURE RECOVERY */}
          {stage === 'FAILED' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-2">
                <div className="flex items-center gap-2 font-display font-bold text-base text-red-800">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Payment Not Completed — Atomic Protection Active</span>
                </div>
                <p className="text-xs leading-relaxed">{errorMessage}</p>
                <div className="p-2.5 rounded-xl bg-white/90 border border-red-200 text-[11px] font-mono text-red-800 space-y-1">
                  <div>✓ Order Status: NOT CONFIRMED (Blocked from Kitchen Display)</div>
                  <div>✓ Kitchen Inventory: 0.00 kg deducted (100% preserved)</div>
                  <div>✓ Digital Token: Not issued</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-ivory-200 text-charcoal-800 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setStage('REVIEW');
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  <span>Retry PayPal Checkout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
