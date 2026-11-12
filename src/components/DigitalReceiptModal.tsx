import React from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  ChefHat,
  UtensilsCrossed,
  Clock,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';

export const DigitalReceiptModal: React.FC = () => {
  const { snapshot, receiptOrder, setReceiptOrder } = useEcosystem();

  if (!receiptOrder) return null;

  // Always resolve the latest version of this order from snapshot so dynamic chef assignment updates live
  const liveOrder =
    snapshot?.orders.find(
      (o) => o.id === receiptOrder.id || o.tokenNumber === receiptOrder.tokenNumber
    ) || receiptOrder;

  const isDineIn =
    liveOrder.orderType === 'DINE_IN' ||
    (!liveOrder.orderType && Boolean(liveOrder.tableNumber));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-ivory-50 border border-emerald-900/20 shadow-2xl overflow-hidden my-6">
        {/* Receipt Top Header */}
        <div className="bg-emerald-950 text-ivory-50 p-6 text-center relative border-b-2 border-dashed border-emerald-700">
          <button
            onClick={() => setReceiptOrder(null)}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-11 h-11 rounded-2xl bg-emerald-800 border border-emerald-600/40 flex items-center justify-center mx-auto mb-2.5">
            <UtensilsCrossed className="w-5 h-5 text-gold-300" />
          </div>
          <h3 className="font-display font-extrabold text-lg tracking-tight">
            FEEDO — DIGITAL TOKEN & RECEIPT
          </h3>
          <p className="text-[11px] text-emerald-200 font-mono mt-0.5">
            All-in-One Intelligent Food Ecosystem
          </p>

          <div className="mt-4 inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-900/90 border border-emerald-700">
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase text-emerald-200">Unique Token</div>
              <div className="font-mono font-black text-2xl text-gold-300 leading-none">
                {liveOrder.tokenNumber}
              </div>
            </div>
            <div className="h-8 w-px bg-emerald-700" />
            <div className="text-left">
              <div className="text-[10px] font-mono uppercase text-emerald-200">
                {isDineIn ? 'Dine-In Table' : 'Takeaway Counter'}
              </div>
              <div className="font-display font-bold text-sm text-white">
                {isDineIn
                  ? `Table #${liveOrder.tableNumber || 5}`
                  : `Pickup Counter #${liveOrder.counterNumber || 2}`}
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 text-xs text-charcoal-900">
          <div className="grid grid-cols-2 gap-2.5 bg-white p-3.5 rounded-xl border border-stone-200 font-mono text-[11px]">
            <div>
              <span className="text-stone-500 block">Order ID:</span>
              <strong className="text-charcoal-900">{liveOrder.id}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Date & Time:</span>
              <strong className="text-charcoal-900">
                {new Date(liveOrder.confirmedAt || liveOrder.createdAt).toLocaleString([], {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
            <div>
              <span className="text-stone-500 block">Customer Name:</span>
              <strong className="text-charcoal-900">{liveOrder.customerName}</strong>
            </div>
            <div>
              <span className="text-stone-500 block">Order Type:</span>
              <strong className="text-emerald-900">
                {isDineIn ? 'Dine-In' : 'Takeaway'}
              </strong>
            </div>
            <div>
              <span className="text-stone-500 block">
                {isDineIn ? 'Selected Table:' : 'Pickup Counter:'}
              </span>
              <strong className="text-charcoal-900">
                {isDineIn
                  ? `Table #${liveOrder.tableNumber || 5}`
                  : `Counter #${liveOrder.counterNumber || 2}`}
              </strong>
            </div>
            <div>
              <span className="text-stone-500 block">
                {isDineIn ? 'Est. Prep Time:' : 'Est. Waiting Time:'}
              </span>
              <strong className="text-emerald-800 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {liveOrder.estimatedPrepMinutes} mins
              </strong>
            </div>
            <div className="col-span-2 pt-1.5 border-t border-stone-100 flex items-center justify-between">
              <span className="text-stone-500 flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5 text-emerald-800" />
                Assigned Chef Name:
              </span>
              <strong
                className={
                  liveOrder.assignedChefName
                    ? 'text-emerald-900 font-bold'
                    : 'text-amber-700 font-semibold'
                }
              >
                {liveOrder.assignedChefName || 'Chef not assigned'}
              </strong>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="font-display font-bold text-xs uppercase tracking-wider text-stone-600">
              Ordered Food Items & Quantities
            </div>
            <div className="divide-y divide-stone-100 bg-white rounded-xl border border-stone-200 px-3.5 py-2">
              {liveOrder.items.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-charcoal-900">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="block text-[10px] text-stone-500 font-mono">
                      Unit Price: ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-charcoal-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="bg-emerald-50/80 rounded-xl p-3.5 border border-emerald-200 space-y-1.5">
            <div className="flex justify-between text-stone-700">
              <span>Subtotal</span>
              <span className="font-mono">${liveOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-700">
              <span>GST (5% Applicable Tax)</span>
              <span className="font-mono">${liveOrder.tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-emerald-200 pt-1.5 flex justify-between font-display font-extrabold text-sm text-emerald-950">
              <span>Total Amount Paid ({liveOrder.currency})</span>
              <span className="font-mono">
                ${liveOrder.totalAmount.toFixed(2)} {liveOrder.currency}
              </span>
            </div>
          </div>

          {/* PayPal Transaction Reference */}
          <div className="bg-white rounded-xl p-3.5 border border-stone-200 space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Payment Method:</span>
              <span className="font-bold text-[#003087]">
                {liveOrder.paymentMethodUsed || 'PayPal Account'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">PayPal Order Ref:</span>
              <span className="text-charcoal-900 font-semibold">
                {liveOrder.paypalOrderId || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">PayPal Capture ID:</span>
              <span className="text-emerald-900 font-bold">
                {liveOrder.paypalCaptureId || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Verification Status:</span>
              <span className="inline-flex items-center gap-1 text-green-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {liveOrder.paymentStatus}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-charcoal-900 font-semibold flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={() => setReceiptOrder(null)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
