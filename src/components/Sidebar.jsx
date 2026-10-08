import React from 'react';
import { LayoutDashboard, Store, Users, FileText, Receipt, Wallet, LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Dashboard & Analytics', icon: <LayoutDashboard className="w-5 h-5" />, path: '/' },
    { text: 'Shops Management', icon: <Store className="w-5 h-5" />, path: '/shops' },
    { text: 'Tenants Management', icon: <Users className="w-5 h-5" />, path: '/tenants' },
    { text: 'Agreements Management', icon: <FileText className="w-5 h-5" />, path: '/agreements' },
    { text: 'Billing & Invoices', icon: <Receipt className="w-5 h-5" />, path: '/invoices' },
    { text: 'Building Expenses', icon: <Wallet className="w-5 h-5" />, path: '/expenses' },
    { text: 'Reports & Analytics', icon: <FileText className="w-5 h-5" />, path: '/reports' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-slate-900 text-white border-r border-slate-800 flex flex-col z-40">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.text}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 shadow-sm border border-slate-700/50'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-sky-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Button at the Bottom */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;