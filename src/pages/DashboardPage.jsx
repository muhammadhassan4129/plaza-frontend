import React, { useState, useEffect } from 'react';
import { fetchDashboardData } from '../services/dashboardService';
import { LayoutDashboard, TrendingUp, Wallet, ArrowDownRight, AlertTriangle, AlertCircle, Building, User, Phone, Calendar, DollarSign, PieChart } from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await fetchDashboardData();
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard analytics');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (error) return <div className="p-8 text-rose-600 font-medium bg-rose-50 m-8 rounded-2xl">{error}</div>;
  if (!stats) return <div className="p-8 text-slate-500 font-medium text-center mt-12">Loading analytics & alerts...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-900" />
          Owner Analytics Dashboard & Alerts
        </h1>
        <p className="text-slate-500 text-sm mt-1">Real-time financial summaries, occupancy matrix overview, and urgent lease/defaulter alerts.</p>
      </div>

      {/* Financial Summary & Occupancy Cards (PDF Requirement) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Occupancy Matrix Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-900 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-blue-900" /> Occupancy Matrix
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.occupancy.occupancyRate}%</h3>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">{stats.occupancy.occupiedShops} Rented</span>
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">{stats.occupancy.vacantShops} Vacant</span>
          </div>
        </div>

        {/* Total Rent Collected */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Rent Collected</p>
            <h3 className="text-2xl font-extrabold text-emerald-700 mt-2">PKR {stats.financials.totalRevenue}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">From Paid Invoices</p>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Outstanding Dues</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-2">PKR {stats.financials.totalOutstanding}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">Unpaid Balances</p>
        </div>

        {/* Net Operational Profit */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Operational Profit</p>
            <h3 className="text-2xl font-extrabold text-purple-700 mt-2">PKR {stats.financials.netProfit}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">Revenue - Expenses (PKR {stats.financials.totalExpenses})</p>
        </div>
      </div>

      {/* Alerts Section (Agreement Expiry Radar & Defaulter List) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Agreement Expiry Radar (30 to 60 Days Warning) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-amber-800 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" /> Agreement Expiry Radar (30-60 Days)
          </h2>
          {stats.expiringAgreements.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center bg-slate-50 rounded-xl">No active leases expiring in the next 30 to 60 days.</p>
          ) : (
            <div className="space-y-3">
              {stats.expiringAgreements.map((agr) => (
                <div key={agr._id} className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/60 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-amber-800" /> Shop #{agr.shop?.shopNumber} <span className="text-xs font-normal text-slate-500">({agr.shop?.floor})</span>
                    </span>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Expires: {agr.endDate?.substring(0, 10)}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs flex items-center gap-1.5 mt-2">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {agr.tenant?.name} &bull; <Phone className="w-3.5 h-3.5 text-slate-400 ml-1" /> {agr.tenant?.phone}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Defaulter List (Overdue Balances Exceeding 30-60 Days) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" /> Defaulter List (Overdue &gt; 30 Days)
          </h2>
          {stats.defaulters.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center bg-slate-50 rounded-xl">No defaulters with balances overdue past 30 days.</p>
          ) : (
            <div className="space-y-3">
              {stats.defaulters.map((inv) => (
                <div key={inv._id} className="p-4 bg-rose-50/60 rounded-xl border border-rose-200/60 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-rose-800" /> Shop #{inv.agreement?.shop?.shopNumber}
                    </span>
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                      PKR {inv.totalAmount}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs flex items-center gap-1.5 mt-2">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {inv.agreement?.tenant?.name} &bull; <Phone className="w-3.5 h-3.5 text-slate-400 ml-1" /> {inv.agreement?.tenant?.phone}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">Billing Month: <span className="font-medium text-slate-700">{inv.monthYear}</span> &bull; <span className="text-rose-600 font-semibold">Overdue Status Flagged</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;