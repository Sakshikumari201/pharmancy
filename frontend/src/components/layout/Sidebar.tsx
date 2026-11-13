import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  Truck,
  RotateCcw,
  BarChart3,
  Users,
  ShieldAlert,
  Building2,
  FileText,
  Receipt
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  visible?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, isPharmacist } = useAuth();

  const navItems: NavGroup[] = [
    {
      group: 'Core Operations',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'POS Terminal', path: '/pos', icon: ShoppingCart, highlight: true },
        { label: 'Sales History', path: '/sales', icon: Receipt },
        { label: 'Medicines', path: '/medicines', icon: Pill },
        { label: 'Batch Inventory', path: '/batches', icon: Boxes }
      ]
    },
    {
      group: 'Supply & Adjustments',
      items: [
        {
          label: 'Stock Purchases',
          path: '/purchases',
          icon: Truck,
          visible: isAdmin || isPharmacist
        },
        {
          label: 'Adjustments & Returns',
          path: '/adjustments',
          icon: RotateCcw,
          visible: isAdmin || isPharmacist
        },
        { label: 'Suppliers', path: '/suppliers', icon: Building2 }
      ]
    },
    {
      group: 'Intelligence & Safety',
      items: [
        {
          label: 'Financial Reports',
          path: '/reports',
          icon: BarChart3,
          visible: isAdmin || isPharmacist
        },
        {
          label: 'Audit Trail',
          path: '/audit',
          icon: ShieldAlert,
          visible: isAdmin || isPharmacist
        }
      ]
    },
    {
      group: 'Administration',
      items: [
        {
          label: 'Staff & Roles',
          path: '/users',
          icon: Users,
          visible: isAdmin
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-950 border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col justify-between py-4">
          <div className="space-y-6 px-3">
            {navItems.map((group, idx) => {
              const visibleItems = group.items.filter((item) => item.visible !== false);
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx} className="space-y-1">
                  <h5 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {group.group}
                  </h5>
                  <div className="space-y-0.5 pt-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 font-bold'
                                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                            } ${item.highlight && !location.pathname.startsWith('/pos') ? 'border border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : ''}`
                          }
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span>{item.label}</span>
                          {item.highlight && (
                            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              HOT
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick API Docs Link footer */}
          <div className="px-4 pt-4 border-t border-slate-900">
            <a
              href="http://localhost:5000/api/docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold">Swagger Docs</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">v1.0</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
