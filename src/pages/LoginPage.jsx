import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../services/authService';
import {
  Building2,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white ' +
  'px-3.5 py-3 pl-11 text-base text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-indigo-400 focus:ring-4 ' +
  'focus:ring-indigo-500/10 disabled:bg-slate-50 sm:text-sm';

const buttonClass =
  'inline-flex min-h-[48px] w-full items-center justify-center gap-2 ' +
  'rounded-xl px-4 py-3 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginAdmin(email, password);
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not sign in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-2">
        {/* ============ LEFT — BRANDING ============ */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          {/* Decorative circles */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5" />
          <div className="absolute right-10 top-1/2 h-40 w-40 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-tight">
                  Khalil Plaza
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-200">
                  Management system
                </p>
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Commercial property management, simplified.
            </h1>

            <p className="mt-4 text-sm leading-6 text-indigo-100">
              Manage tenants, lease agreements, monthly invoices, expenses and
              financial reports — all in one place.
            </p>

            <ul className="mt-8 space-y-3 text-sm">
              {[
                'Tenant profiles & documents',
                'Lease agreements & shops',
                'Monthly invoices & payments',
                'Expenses & profit reports',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-indigo-50">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-indigo-200">
            © {new Date().getFullYear()} Khalil Plaza. All rights reserved.
          </p>
        </div>

        {/* ============ RIGHT — FORM ============ */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile-only brand */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Building2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Khalil Plaza
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-500">
                  Management system
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
                  Welcome back
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  Sign in to continue
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your admin credentials below.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-6">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Email address
                  </span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@plaza.com"
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Password
                  </span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className={inputClass}
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Authorized personnel only. Contact the administrator if you
              need access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;