import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { Badge } from '../common/Badge';
import {
  Activity,
  LogOut,
  Sparkles,
  Shield,
  Pill,
  CreditCard,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onOpenGuide: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenGuide, onToggleSidebar }) => {
  const { user, logout, switchRole } = useAuth();

  const roleBadgeConfig: Record<Role, { variant: 'purple' | 'success' | 'info'; label: string; icon: React.ReactNode }> = {
    ADMIN: { variant: 'purple', label: 'Admin', icon: <Shield className="h-3 w-3" /> },
    PHARMACIST: { variant: 'success', label: 'Pharmacist', icon: <Pill className="h-3 w-3" /> },
    CASHIER: { variant: 'info', label: 'Cashier', icon: <CreditCard className="h-3 w-3" /> }
  };

  const currentRoleConfig = user?.role ? roleBadgeConfig[user.role] : roleBadgeConfig.CASHIER;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Toggle Navigation"
          >
            <Activity className="h-6 w-6 text-emerald-400" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-900/30">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight">Pharma<span className="text-emerald-400">Pulse</span></span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Algions AI Labs Assessment Suite</p>
            </div>
          </div>
        </div>

        {/* Center: Evaluator Quick Role Switcher */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold">
          <span className="text-[11px] text-slate-400 px-2 uppercase tracking-wider font-bold">Role:</span>
          <button
            onClick={() => switchRole('ADMIN')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              user?.role === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin
          </button>
          <button
            onClick={() => switchRole('PHARMACIST')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              user?.role === 'PHARMACIST'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Pill className="h-3.5 w-3.5" />
            Pharmacist
          </button>
          <button
            onClick={() => switchRole('CASHIER')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              user?.role === 'CASHIER'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-900/30 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Cashier
          </button>
        </div>

        {/* Right Action: Acceptance Guide Trigger & User Pill */}
        <div className="flex items-center gap-3">
          {/* Reviewer Acceptance Criteria Button */}
          <button
            onClick={onOpenGuide}
            className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all hover:scale-105"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rubric & Criteria</span>
            <span className="sm:hidden">Rubric</span>
          </button>

          {/* User profile dropdown pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{user?.name}</div>
              <div className="flex items-center gap-1">
                <Badge variant={currentRoleConfig.variant} size="sm">
                  {currentRoleConfig.icon}
                  {currentRoleConfig.label}
                </Badge>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
