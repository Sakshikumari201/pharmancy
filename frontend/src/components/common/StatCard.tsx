import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
    accent: 'text-emerald-400'
  },
  blue: {
    bg: 'bg-sky-950/20 border-sky-500/20 hover:border-sky-500/40',
    iconBg: 'bg-sky-500/15 text-sky-400',
    accent: 'text-sky-400'
  },
  amber: {
    bg: 'bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40',
    iconBg: 'bg-amber-500/15 text-amber-400',
    accent: 'text-amber-400'
  },
  rose: {
    bg: 'bg-rose-950/20 border-rose-500/20 hover:border-rose-500/40',
    iconBg: 'bg-rose-500/15 text-rose-400',
    accent: 'text-rose-400'
  },
  purple: {
    bg: 'bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/40',
    iconBg: 'bg-indigo-500/15 text-indigo-400',
    accent: 'text-indigo-400'
  },
  slate: {
    bg: 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600',
    iconBg: 'bg-slate-700/60 text-slate-300',
    accent: 'text-slate-300'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
  trend,
  onClick
}) => {
  const styles = colorStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-5 backdrop-blur-md transition-all duration-200 ${styles.bg} ${
        onClick ? 'cursor-pointer transform hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl ${styles.iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={`text-xs font-semibold ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
};
