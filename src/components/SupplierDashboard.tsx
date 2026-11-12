import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  ShieldAlert,
  Building2,
  Package,
  MapPin,
  Phone,
  Save,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';

export const SupplierDashboard: React.FC = () => {
  const { snapshot, currentUser, apiFetch, showToast } = useEcosystem();

  const supplierUser =
    snapshot?.users.find((u) => u.role === 'supplier') || currentUser;

  const [companyName, setCompanyName] = useState(
    supplierUser?.companyName || 'Verdant Harvest Foods Pvt Ltd'
  );
  const [contactName, setContactName] = useState(supplierUser?.name || 'Rohan Deshmukh');
  const [phone, setPhone] = useState(supplierUser?.phone || '+91 98450 77210');
  const [address, setAddress] = useState(
    supplierUser?.address || 'Plot 42, Agro Cold-Chain Park, Phase II'
  );
  const [categoriesText, setCategoriesText] = useState(
    (supplierUser?.suppliedCategories || ['Poultry', 'Grains', 'Dairy', 'Produce', 'Spices']).join(
      ', '
    )
  );
  const [savingProfile, setSavingProfile] = useState(false);

  if (!snapshot) return null;

  const { supplierRequests, ingredients } = snapshot;

  const handleUpdateStatus = async (
    reqId: string,
    status: 'ACCEPTED' | 'PROCESSING' | 'REJECTED' | 'DISPATCHED'
  ) => {
    try {
      await apiFetch(`/api/supplier/requests/${reqId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          notes:
            status === 'DISPATCHED'
              ? 'Dispatched via refrigerated cold-chain van #VH-14; awaiting Manager dock verification.'
              : status === 'PROCESSING'
              ? 'Quality inspection & cold-storage packing in progress at Verdant Harvest warehouse.'
              : `Request ${status.toLowerCase()} by Verdant Harvest Dispatch Desk.`,
        }),
      });
      showToast(
        `Replenishment Order #${reqId} → ${status}`,
        status === 'DISPATCHED'
          ? 'En route to FEEDO receiving dock. Manager must verify delivery to increment stock.'
          : 'Status synchronized with FEEDO Manager.',
        'emerald'
      );
    } catch (err: any) {
      showToast('Supplier Update Error', err.message, 'red');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/supplier/profile', {
        method: 'POST',
        body: JSON.stringify({
          name: contactName,
          companyName,
          phone,
          address,
          suppliedCategories: categoriesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      showToast('Supplier Profile Updated', 'Synchronized with FEEDO Procurement Directory');
    } catch (err: any) {
      showToast('Profile Update Failed', err.message, 'red');
    } finally {
      setSavingProfile(false);
    }
  };

  const totalDeliveredValue = supplierRequests
    .filter((r) => r.status === 'DELIVERED_VERIFIED')
    .reduce((sum, r) => sum + r.totalEstimate, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Supplier Header */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-charcoal-950 text-ivory-50 p-6 sm:p-8 shadow-xl border border-emerald-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-xs text-gold-300 font-mono">
            <Truck className="w-3.5 h-3.5" />
            <span>SUPPLIER B2B PORTAL • 5-STAGE REPLENISHMENT ENGINE</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl">
            {supplierUser?.companyName || 'Verdant Harvest Foods Pvt Ltd'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl">
            Manage incoming replenishment requests across 5 stages: Request Received → Accept →
            Processing → Dispatch → Delivered & Verified by Manager.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700">
            <div className="text-[10px] font-mono uppercase text-emerald-200">Received</div>
            <div className="font-display font-extrabold text-xl text-gold-400">
              {supplierRequests.filter((r) => r.status === 'PENDING').length}
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700">
            <div className="text-[10px] font-mono uppercase text-emerald-200">In Transit</div>
            <div className="font-display font-extrabold text-xl text-white">
              {
                supplierRequests.filter((r) =>
                  ['ACCEPTED', 'PROCESSING', 'DISPATCHED'].includes(r.status)
                ).length
              }
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700">
            <div className="text-[10px] font-mono uppercase text-emerald-200">Delivered</div>
            <div className="font-display font-extrabold text-xl text-green-400">
              {supplierRequests.filter((r) => r.status === 'DELIVERED_VERIFIED').length}
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-900/80 border border-emerald-700">
            <div className="text-[10px] font-mono uppercase text-emerald-200">Settled Value</div>
            <div className="font-display font-extrabold text-xl text-gold-300">
              ${totalDeliveredValue.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Step Inventory Integrity Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-950">
        <ShieldAlert className="w-5 h-5 text-emerald-800 shrink-0" />
        <div>
          <strong>Closed-Loop Verification Protocol:</strong> Accepting, processing, or dispatching
          an order updates shipment telemetry in real time, and restaurant kitchen stock is
          automatically incremented once the FEEDO Manager verifies physical delivery at the dock.
        </div>
      </div>

      {/* Incoming Replenishment Requests & 5-Stage Dispatch Controls */}
      <div className="rounded-3xl bg-white border border-emerald-900/10 p-6 shadow-premium space-y-5">
        <h2 className="font-display font-extrabold text-xl text-charcoal-900">
          Incoming Replenishment Requests & 5-Stage Supply Chain Pipeline
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {supplierRequests.map((req) => {
            const stageNum =
              req.status === 'DELIVERED_VERIFIED'
                ? 5
                : req.status === 'DISPATCHED'
                ? 4
                : req.status === 'PROCESSING'
                ? 3
                : req.status === 'ACCEPTED'
                ? 2
                : 1;

            return (
              <div
                key={req.id}
                className="rounded-2xl bg-ivory-50 border border-emerald-900/15 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-900">
                      Order #{req.id} • Invoice {req.invoiceNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : 'bg-gold-400 text-charcoal-950'
                      }`}
                    >
                      {req.urgency} URGENCY
                    </span>
                  </div>

                  <div className="font-display font-extrabold text-lg text-charcoal-900">
                    {req.requestedQuantity} {req.unit} — {req.ingredientName}
                  </div>

                  {/* 5-Stage Visual Stepper */}
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[
                      { step: 1, label: 'Received' },
                      { step: 2, label: 'Accepted' },
                      { step: 3, label: 'Processing' },
                      { step: 4, label: 'Dispatched' },
                      { step: 5, label: 'Delivered' },
                    ].map((s) => (
                      <div key={s.step} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            stageNum >= s.step ? 'bg-emerald-800' : 'bg-stone-200'
                          }`}
                        />
                        <div
                          className={`text-[9px] font-bold text-center ${
                            stageNum >= s.step ? 'text-emerald-900' : 'text-stone-400'
                          }`}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-emerald-900/10 font-mono text-[11px]">
                    <div>
                      <span className="text-charcoal-800/60 block">Unit Wholesale Price:</span>
                      <strong>
                        ${req.unitPrice.toFixed(2)} / {req.unit}
                      </strong>
                    </div>
                    <div>
                      <span className="text-charcoal-800/60 block">Total Invoice Est:</span>
                      <strong className="text-emerald-800">
                        ${req.totalEstimate.toFixed(2)} USD
                      </strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-charcoal-800/60">Requested By:</span>{' '}
                      <strong>{req.requestedBy}</strong>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-charcoal-800/80 italic">&ldquo;{req.notes}&rdquo;</p>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-900/10 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-900">
                    Stage: {req.status}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {req.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-gold-300" />
                          <span>Accept Order</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                          className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 font-semibold text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {req.status === 'ACCEPTED' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'PROCESSING')}
                          className="px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Mark Processing</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'DISPATCHED')}
                          className="px-3.5 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-bold text-xs flex items-center gap-1.5 shadow"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Dispatch Shipment</span>
                        </button>
                      </>
                    )}

                    {req.status === 'PROCESSING' && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'DISPATCHED')}
                        className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-display font-bold text-xs flex items-center gap-1.5 shadow"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Dispatch Cold-Chain Van</span>
                      </button>
                    )}

                    {req.status === 'DISPATCHED' && (
                      <span className="text-[11px] font-mono text-amber-900 bg-amber-100 px-3 py-1 rounded-lg font-semibold">
                        Dispatched • Awaiting Manager Dock Verification
                      </span>
                    )}

                    {req.status === 'DELIVERED_VERIFIED' && (
                      <span className="text-[11px] font-mono text-green-800 bg-green-100 px-3 py-1 rounded-lg font-bold">
                        ✓ Delivered & Stock Restored
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supplier Business Profile & Wholesale Catalogue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-3xl bg-white border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            <h2 className="font-display font-bold text-lg text-stone-900">
              Supplier Profile & Contact Details
            </h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Cold-Chain Warehouse Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Supplied Categories (comma-separated)
              </label>
              <input
                type="text"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-ivory-50 border border-stone-200"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Supplier Profile</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 rounded-3xl bg-white border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="font-display font-bold text-lg text-charcoal-900">
            Supplier Wholesale Product Catalogue & Cold-Chain Availability
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ingredients.map((ing) => (
              <div
                key={ing.id}
                className="p-3.5 rounded-2xl bg-ivory-50 border border-stone-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-800 font-semibold">
                    {ing.category}
                  </span>
                  <h4 className="font-display font-bold text-sm text-charcoal-900">{ing.name}</h4>
                  <div className="text-xs text-stone-600 font-mono mt-0.5">
                    Wholesale: ${ing.costPerUnit.toFixed(2)} / {ing.unit}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-mono text-xs font-bold">
                    In Warehouse
                  </span>
                  <div className="text-[10px] font-mono text-stone-500 mt-1">
                    500+ {ing.unit} ready
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
