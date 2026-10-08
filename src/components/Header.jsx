import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Building2,
  LayoutDashboard,
  Store,
  Users,
  FileText,
  Receipt,
  Wallet,
  BarChart3,
} from 'lucide-react';

const pages = [
  {
    path: '/',
    title: 'Dashboard',
    subtitle: 'Your plaza at a glance',
    icon: LayoutDashboard,
  },
  {
    path: '/shops',
    title: 'Shops & Units',
    subtitle: 'Manage your commercial spaces',
    icon: Store,
  },
  {
    path: '/tenants',
    title: 'Tenants',
    subtitle: 'Profiles, documents and records',
    icon: Users,
  },
  {
    path: '/agreements',
    title: 'Agreements',
    subtitle: 'Leases and tenancy details',
    icon: FileText,
  },
  {
    path: '/invoices',
    title: 'Billing & Invoices',
    subtitle: 'Payments and outstanding balances',
    icon: Receipt,
  },
  {
    path: '/expenses',
    title: 'Expenses',
    subtitle: 'Track your operating costs',
    icon: Wallet,
  },
  {
    path: '/reports',
    title: 'Reports & Analytics',
    subtitle: 'A clear view of your finances',
    icon: BarChart3,
  },
];

const Header = ({ onOpenSidebar, sidebarOpen = false }) => {
  const { pathname } = useLocation();

  const currentPage =
    pages.find((page) =>
      page.path === '/'
        ? pathname === '/'
        : pathname === page.path || pathname.startsWith(`${page.path}/`)
    ) || {
      title: 'Khalil Plaza',
      subtitle: 'Property management workspace',
      icon: Building2,
    };

  const PageIcon = currentPage.icon;

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl lg:h-20 lg:pl-72">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open navigation menu"
            aria-controls="plaza-sidebar"
            aria-expanded={sidebarOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 sm:flex">
            <PageIcon className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900 sm:text-base">
              {currentPage.title}
            </p>

            <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
              {currentPage.subtitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </span>

          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">
              Khalil Plaza
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Management workspace
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;