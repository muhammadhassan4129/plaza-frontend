import React, { useState, useEffect } from 'react';
import { fetchExpenses, createExpense, deleteExpense, fetchFinancialSummary } from '../services/expenseService';
import axios from 'axios'; // Ensure axios is available for summary or use service function
import { Plus, Trash2, X, Wallet, Tag, Calendar, DollarSign, TrendingUp, TrendingDown, ShieldAlert } from 'lucide-react';

const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalExpenses: 0, netProfitLoss: 0, status: 'Profit' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Repair & Maintenance',
    amount: '',
    date: new Date().toISOString().substring(0, 10),
    description: '',
    paidBy: 'Plaza Management',
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

const loadData = async () => {
  try {
    const res = await fetchExpenses();
    setExpenses(res.data);
    
    // Using the updated service function
    const summaryRes = await fetchFinancialSummary();
    setSummary(summaryRes.data);
  } catch (err) {
    setError('Failed to load building financial records');
  }
};

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await createExpense(formData);
      setSuccessMsg(res.message || 'Expense logged successfully!');
      setFormData({
        title: '',
        category: 'Repair & Maintenance',
        amount: '',
        date: new Date().toISOString().substring(0, 10),
        description: '',
        paidBy: 'Plaza Management',
      });
      setIsModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error logging expense');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      try {
        await deleteExpense(id);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-900" />
            Building Expenses & Maintenance
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track staff salaries, utility bills, elevator AMC, generator fuel, and net P&L.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Log Expense
        </button>
      </div>

      {/* Financial Summary & Profit/Loss Card (PDF Requirement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">PKR {summary.totalRevenue}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Expenditures</p>
            <h3 className="text-2xl font-extrabold text-rose-600 mt-1">PKR {summary.totalExpenses}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className={`p-6 rounded-2xl shadow-sm border flex items-center justify-between ${summary.netProfitLoss >= 0 ? 'bg-emerald-900 text-white border-emerald-800' : 'bg-rose-900 text-white border-rose-800'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Net Profit / Loss</p>
            <h3 className="text-2xl font-extrabold mt-1">PKR {summary.netProfitLoss}</h3>
          </div>
          <div className="p-3 bg-white/10 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl">{successMsg}</div>}

      {/* Expenses Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-6 font-semibold">Title</th>
                <th className="py-4 px-6 font-semibold">Category</th>
                <th className="py-4 px-6 font-semibold">Description</th>
                <th className="py-4 px-6 font-semibold">Amount</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No expense records found. Click "Log Expense" to get started.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 text-slate-600 text-xs flex items-center gap-1.5 pt-5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {exp.date?.substring(0, 10)}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">{exp.title}</td>
                    <td className="py-4 px-6">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-100">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{exp.description || 'N/A'}</td>
                    <td className="py-4 px-6 font-extrabold text-rose-600">PKR {exp.amount}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDelete(exp._id)}
                        className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 transform transition-all">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-400" /> Log Building Expense
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Expense Title</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="e.g. Generator Fuel / Elevator AMC"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm bg-white"
                  >
                    <option value="Repair & Maintenance">Repair & Maintenance</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Taxes">Taxes</option>
                    <option value="Administration">Administration</option>
                    <option value="Emergency Fixes">Emergency Fixes</option>
                    <option value="Staff Salaries">Staff Salaries</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Amount (PKR)</label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="PKR"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Provide brief details about the expense..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm shadow-md transition-all flex items-center gap-2"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;