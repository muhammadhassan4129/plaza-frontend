import React from 'react';
import { Building2 } from 'lucide-react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white z-50 flex items-center px-6 shadow-md border-b border-slate-800">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-blue-400" />
        <h1 className="text-lg font-bold tracking-wider">
          Commercial Plaza Management System
        </h1>
      </div>
    </header>
  );
};

export default Header;