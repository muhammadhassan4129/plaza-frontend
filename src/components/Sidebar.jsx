import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { getCurrentAdmin, logoutAdmin } from '../services/authService'; // authService se functions import kiye

import {
  Building2,
  LayoutDashboard,
  Store,
  Users,
  FileText,
  Receipt,
  Wallet,
  LogOut,
  BarChart3,
  ChevronRight,
  X,
  Settings, // Settings Icon Add kiya
} from 'lucide-react';

// Sabhi possible menu items define hain
const menuGroups = [
  {
    title: 'Overview',
    items: [
      {
        key: 'dashboard',
        text: 'Dashboard',
        icon: LayoutDashboard,
        path: '/',
      },
    ],
  },
  {
    title: 'Property Management',
    items: [
      {
        key: 'shops',
        text: 'Shops & Units',
        icon: Store,
        path: '/shops',
      },
      {
        key: 'tenants',
        text: 'Tenants',
        icon: Users,
        path: '/tenants',
      },
      {
        key: 'agreements',
        text: 'Agreements',
        icon: FileText,
        path: '/agreements',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        key: 'invoices',
        text: 'Billing & Invoices',
        icon: Receipt,
        path: '/invoices',
      },
      {
        key: 'expenses',
        text: 'Expenses',
        icon: Wallet,
        path: '/expenses',
      },
      {
        key: 'reports',
        text: 'Reports & Analytics',
        icon: BarChart3,
        path: '/reports',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        key: 'settings',
        text: 'Settings & Profile',
        icon: Settings,
        path: '/settings',
      },
    ],
  },
];

const Sidebar = ({ open = false, onClose, panelRef }) => {
  const navigate = useNavigate();

  // Logged-in User Data aur Role Fetch Karein
  const currentUser = getCurrentAdmin();
  const isSuperAdmin = currentUser?.role === 'admin';
  const allowedPages = currentUser?.allowedPages || [];

  const handleLogout = () => {
    onClose?.();
    logoutAdmin(); 
  };

  // User Access filter Function:
// User Access filter Function:
  const filteredMenuGroups = menuGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        if (isSuperAdmin) return true; 
        if (item.key === 'settings') return false; 

        return allowedPages.includes(item.key); 
      });

      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        id="plaza-sidebar"
        ref={panelRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Main navigation"
        tabIndex={-1}
        className={`
          fixed inset-y-0 left-0 z-[60]
          flex w-72 max-w-[85vw] flex-col
          border-r border-slate-800 bg-slate-950 text-white
          shadow-2xl transition-transform duration-300 ease-out
          motion-reduce:transition-none
          lg:visible lg:z-40 lg:max-w-none lg:translate-x-0 lg:shadow-none
          ${
            open
              ? 'visible translate-x-0'
              : 'invisible -translate-x-full'
          }
        `}
      >
        {/* Brand */}
        <div className="flex h-20 shrink-0 items-center justify-between gap-2 border-b border-white/5 px-5">
          <Link
            to="/"
            onClick={onClose}
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg shadow-indigo-500/20">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-base font-bold tracking-tight">
                Khalil Plaza
              </span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-400">
                {isSuperAdmin ? 'Super Admin' : 'Manager Workspace'}
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            data-sidebar-close
            aria-label="Close navigation menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Primary"
          className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 py-6"
        >
          {filteredMenuGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </p>

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={onClose}
                      className={({ isActive }) => `
                        group relative flex items-center gap-3
                        rounded-xl border px-3 py-3 text-sm font-medium
                        transition-colors duration-150
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-indigo-400
                        ${
                          isActive
                            ? 'border-indigo-400/20 bg-indigo-500/15 text-indigo-200'
                            : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute -left-4 top-3 bottom-3 w-1 rounded-r-full bg-indigo-400" />
                          )}

                          <Icon
                            aria-hidden="true"
                            className={`h-[18px] w-[18px] shrink-0 ${
                              isActive
                                ? 'text-indigo-400'
                                : 'text-slate-500 group-hover:text-slate-300'
                            }`}
                          />

                          <span className="flex-1">{item.text}</span>

                          {isActive && (
                            <ChevronRight
                              className="h-4 w-4 text-indigo-400"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="shrink-0 border-t border-white/5 p-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {currentUser && (
            <div className="mb-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {currentUser.email}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;