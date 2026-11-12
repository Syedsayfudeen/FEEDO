import React, { useState } from 'react';
import {
  KeyRound,
  X,
  UtensilsCrossed,
  ChefHat,
  LayoutDashboard,
  Truck,
  LogOut,
  UserPlus,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useEcosystem } from '../context/EcosystemContext.tsx';
import { UserRole } from '../../shared/types.ts';

export const AuthModal: React.FC = () => {
  const {
    currentUser,
    isAuthModalOpen,
    setIsAuthModalOpen,
    loginWithEmail,
    switchDemoRole,
    logout,
    showToast,
    refreshState,
  } = useEcosystem();

  const [tab, setTab] = useState<'DEMO_ACCOUNTS' | 'LOGIN' | 'REGISTER' | 'FORGOT'>(
    'DEMO_ACCOUNTS'
  );
  const [email, setEmail] = useState('student@feedo.demo');
  const [password, setPassword] = useState('feedo2026');
  const [showPassword, setShowPassword] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('feedo2026');
  const [regRole, setRegRole] = useState<UserRole>('customer');
  const [regCompany, setRegCompany] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const demoAccounts: {
    role: UserRole;
    title: string;
    badge: string;
    email: string;
    person: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      role: 'customer',
      title: '1. Customer Login',
      badge: 'Customer Portal & Customer AI',
      email: 'student@feedo.demo',
      person: 'Aarav Sharma (Year 3 CSE)',
      desc: 'Select Dine-In (Table Reservation) or Takeaway (Pickup Counter), pay with PayPal, track live Token & Assigned Chef, and chat with FEEDO Customer AI.',
      icon: <UtensilsCrossed className="w-5 h-5 text-emerald-800" />,
    },
    {
      role: 'chef',
      title: '2. Kitchen Staff Login (Common Kitchen Login)',
      badge: 'ONE Shared KDS Login',
      email: 'chef@feedo.demo',
      person: 'Kitchen Staff Monitor (Shared KDS Terminal)',
      desc: 'Single common login for all kitchen staff. Assign preloaded chefs from the dropdown to each order and advance NEW → PREPARING → READY → COMPLETED.',
      icon: <ChefHat className="w-5 h-5 text-emerald-800" />,
    },
    {
      role: 'manager',
      title: '3. Canteen Manager Login',
      badge: 'Manager Control & Manager AI',
      email: 'manager@feedo.demo',
      person: 'Meera Krishnan (Canteen Operations Director)',
      desc: 'Full Menu & Inventory CRUD, Chef Roster management, PayPal Refunds, Supplier dock verification, and FEEDO Manager AI (Daily/Weekly/Monthly P&L).',
      icon: <LayoutDashboard className="w-5 h-5 text-emerald-800" />,
    },
    {
      role: 'supplier',
      title: '4. Supplier Login',
      badge: '5-Stage Supply Chain Portal',
      email: 'supplier@feedo.demo',
      person: 'Rohan Deshmukh (Verdant Harvest Foods Pvt Ltd)',
      desc: 'Receive low-stock replenishment requests, progress through Accept → Processing → Dispatch → Delivered, and manage supplier profile.',
      icon: <Truck className="w-5 h-5 text-emerald-800" />,
    },
  ];

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await loginWithEmail(email, password);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      if (regPassword.trim().length < 4) {
        throw new Error('Password must be at least 4 characters long.');
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          role: regRole,
          companyName: regRole === 'supplier' ? regCompany || `${regName} Agro Supplies` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      await refreshState();
      await loginWithEmail(regEmail, regPassword);
      setIsAuthModalOpen(false);
      showToast(
        `Registered & Signed In as ${regName}`,
        `Role: ${regRole.toUpperCase()}`,
        'emerald'
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSent(true);
    showToast(
      'Password Reset Instructions Sent',
      `Sent recovery link & demo code (feedo2026) to ${forgotEmail}`,
      'emerald'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-ivory-50 border border-emerald-900/20 shadow-2xl overflow-hidden my-6">
        <div className="bg-emerald-950 text-ivory-50 px-6 py-4 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800/80 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-gold-300" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">
                FEEDO — Four Role-Based Authentication Portal
              </h3>
              <p className="text-xs text-emerald-200">
                Customer • Kitchen Staff (Common Login) • Canteen Manager • Supplier | Demo Password:{' '}
                <code className="text-gold-300 font-mono">feedo2026</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1.5 bg-ivory-200 p-1 rounded-xl">
            <button
              onClick={() => {
                setTab('DEMO_ACCOUNTS');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'DEMO_ACCOUNTS'
                  ? 'bg-emerald-900 text-white shadow'
                  : 'text-charcoal-800 hover:bg-ivory-300'
              }`}
            >
              4 Role Login Cards
            </button>
            <button
              onClick={() => {
                setTab('LOGIN');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'LOGIN'
                  ? 'bg-emerald-900 text-white shadow'
                  : 'text-charcoal-800 hover:bg-ivory-300'
              }`}
            >
              Credential Sign-In
            </button>
            <button
              onClick={() => {
                setTab('REGISTER');
                setError(null);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === 'REGISTER'
                  ? 'bg-emerald-900 text-white shadow'
                  : 'text-charcoal-800 hover:bg-ivory-300'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
              {error}
            </div>
          )}

          {tab === 'DEMO_ACCOUNTS' && (
            <div className="space-y-3">
              <div className="text-xs text-charcoal-800/90 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>
                  <strong>4 Unified Ecosystem Roles:</strong> Note that Kitchen Staff uses{' '}
                  <strong>ONE Common Kitchen Login</strong> (`chef@feedo.demo`) where individual chefs are assigned via dropdown.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {demoAccounts.map((acc) => {
                  const isCurrent = currentUser?.email === acc.email;
                  return (
                    <div
                      key={acc.role}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                        isCurrent
                          ? 'bg-emerald-50/90 border-emerald-700 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-emerald-600/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center shrink-0 mt-0.5">
                          {acc.icon}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display font-bold text-sm text-charcoal-900">
                              {acc.title}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                              {acc.badge}
                            </span>
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-ivory-200 text-emerald-950 font-semibold">
                              {acc.email}
                            </span>
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                            {acc.person}
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                            {acc.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          await switchDemoRole(acc.role);
                          setIsAuthModalOpen(false);
                        }}
                        className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-gold-500 text-charcoal-950'
                            : 'bg-emerald-900 hover:bg-emerald-800 text-white'
                        }`}
                      >
                        {isCurrent ? 'Active Role' : 'Enter Portal'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'LOGIN' && (
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm focus:outline-none focus:border-emerald-800"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-charcoal-900">
                    Password (Demo: feedo2026)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotSent(false);
                      setTab('FORGOT');
                    }}
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-stone-300 text-sm focus:outline-none focus:border-emerald-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-display font-bold text-sm"
              >
                Sign In to FEEDO Ecosystem
              </button>
            </form>
          )}

          {tab === 'FORGOT' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-ivory-100 border border-stone-200 text-xs text-stone-700">
                Enter your registered FEEDO email address to receive a password reset link. For demo
                accounts, the universal password is{' '}
                <code className="font-mono font-bold text-emerald-900">feedo2026</code>.
              </div>
              <div>
                <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="student@feedo.demo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm"
                  required
                />
              </div>
              {forgotSent ? (
                <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Recovery link dispatched to {forgotEmail}! You can also sign in right now using{' '}
                    <code className="font-mono">feedo2026</code>.
                  </span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-display font-bold text-sm"
                >
                  Send Password Recovery Link
                </button>
              )}
              <button
                type="button"
                onClick={() => setTab('LOGIN')}
                className="w-full py-2 text-xs font-bold text-emerald-900 hover:underline"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {tab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g., Nisha Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nisha@campus.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                    Select Account Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm"
                  >
                    <option value="customer">Customer / Student</option>
                    <option value="supplier">Supplier Partner</option>
                    <option value="manager">Canteen Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-stone-300 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {regRole === 'supplier' && (
                <div>
                  <label className="block text-xs font-semibold text-charcoal-900 mb-1">
                    Supplier Company / Business Name
                  </label>
                  <input
                    type="text"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="e.g., FreshGreen Agro Foods Pvt Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 text-sm"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-display font-bold text-sm flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Account & Sign In</span>
              </button>
            </form>
          )}

          {currentUser && (
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
              <span className="text-stone-600">
                Signed in as <strong>{currentUser.name}</strong> ({currentUser.email})
              </span>
              <button
                onClick={() => {
                  logout();
                  setIsAuthModalOpen(false);
                }}
                className="text-red-700 hover:text-red-900 font-semibold flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
