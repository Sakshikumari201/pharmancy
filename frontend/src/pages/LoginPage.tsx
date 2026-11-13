import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import {
  Pill,
  Shield,
  CreditCard,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@pharmacy.com');
  const [password, setPassword] = useState('Admin@123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsLoading(true);

    try {
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-xl shadow-emerald-950/50 mb-4 ring-4 ring-emerald-500/20">
          <Pill className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          Pharma<span className="text-emerald-400">Pulse</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Enterprise Pharmacy Management & Regulatory Audit System
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>ALGIONS AI LABS Assessment Demo</span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Quick Demo Login Cards */}
        <div className="mb-6 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
            1-Click Reviewer Demo Access
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@pharmacy.com', 'Admin@123')}
              className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-400 text-left transition-all hover:scale-105 group"
            >
              <div className="flex items-center justify-between">
                <Shield className="h-4 w-4 text-indigo-400" />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                  Full
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-white group-hover:text-indigo-300">Admin</div>
              <div className="text-[10px] text-slate-400 font-mono">admin@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('pharmacist@pharmacy.com', 'Pharm@123')}
              className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all hover:scale-105 group"
            >
              <div className="flex items-center justify-between">
                <Pill className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  Stock
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-white group-hover:text-emerald-300">Pharmacist</div>
              <div className="text-[10px] text-slate-400 font-mono">pharmacist@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('cashier@pharmacy.com', 'Cashier@123')}
              className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/30 hover:border-sky-400 text-left transition-all hover:scale-105 group"
            >
              <div className="flex items-center justify-between">
                <CreditCard className="h-4 w-4 text-sky-400" />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400">
                  POS
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-white group-hover:text-sky-300">Cashier</div>
              <div className="text-[10px] text-slate-400 font-mono">cashier@...</div>
            </button>
          </div>
        </div>

        {/* Regular Login Card */}
        <div className="bg-slate-900/90 py-8 px-6 shadow-2xl shadow-emerald-950/30 rounded-2xl border border-slate-800 backdrop-blur-xl sm:px-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                  placeholder="name@pharmacy.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 py-3 px-4 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {isLoading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500 font-mono">
              Database: SQLite with Prisma ORM & Transactional FEFO Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
