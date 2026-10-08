import React, { useState, useEffect } from 'react';
import { fetchInvoices, createInvoice, updateInvoicePayment, deleteInvoice } from '../services/invoiceService';
import { fetchAgreements } from '../services/agreementService';
import { Plus, Trash2, X, Receipt, CheckCircle, Building, User, Calendar, DollarSign, Printer } from 'lucide-react';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    agreementId: '',
    monthYear: 'October 2026',
    electricityCharges: '',
    waterCharges: '',
    maintenanceFee: '',
    lateFine: '',
    previousBalance: '',
    dueDate: '',
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const invRes = await fetchInvoices();
      setInvoices(invRes.data);

      const agrRes = await fetchAgreements();
      setAgreements(agrRes.data);
    } catch (err) {
      setError('Failed to load billing data');
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
  
  // Standardize monthYear format - trim whitespace
  const monthYearValue = formData.monthYear.trim();
  
  // Validate required fields
  if (!formData.agreementId) {
    setError('Please select an agreement');
    return;
  }
  
  if (!monthYearValue) {
    setError('Please enter month and year');
    return;
  }
  
  if (!formData.dueDate) {
    setError('Please set a due date');
    return;
  }

  try {
    const res = await createInvoice({
      ...formData,
      monthYear: monthYearValue, // USE STANDARDIZED VALUE
    });
    
    setSuccessMsg(res.message || 'Invoice generated successfully!');
    
    // Reset form
    setFormData({
      agreementId: '',
      monthYear: '', // Empty instead of default
      electricityCharges: '',
      waterCharges: '',
      maintenanceFee: '',
      lateFine: '',
      previousBalance: '',
      dueDate: '',
    });
    
    setIsModalOpen(false);
    loadData(); // Reload invoices list
    
    // Auto-clear success message after 3 seconds
    setTimeout(() => setSuccessMsg(''), 3000);
  } catch (err) {
    setError(err.response?.data?.message || 'Error generating invoice');
    console.error('Invoice creation error:', err);
  }
};

  const handleMarkPaid = async (id) => {
    const mode = prompt('Enter payment mode (Cash, Bank Transfer, Cheque):', 'Cash');
    if (mode) {
      try {
        const paidAmount = prompt('Enter amount paid:', '');
        if (paidAmount) {
          await updateInvoicePayment(id, {
            status: 'Paid',
            paymentMode: mode,
            paidAmount: parseInt(paidAmount),
          });
          // Revenue tracking ab automatically backend mein hoga
          loadData();
          alert('Payment recorded & revenue tracked!');
        }
      } catch (err) {
        console.error(err);
        alert('Error recording payment');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(id);
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
            <Receipt className="w-8 h-8 text-blue-900" />
            Financial Ledger & Monthly Billing
          </h1>
          <p className="text-slate-500 text-sm mt-1">Automated invoices, sub-meter utilities, fine penalties, and digital receipts[cite: 1].</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Generate Invoice
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl">{successMsg}</div>}

      {/* Invoices Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Serial #</th>
                <th className="py-4 px-6 font-semibold">Month / Shop</th>
                <th className="py-4 px-6 font-semibold">Tenant</th>
                <th className="py-4 px-6 font-semibold">Rent & Utilities</th>
                <th className="py-4 px-6 font-semibold">Late Fine / Prev</th>
                <th className="py-4 px-6 font-semibold">Total / Balance Due</th>
                <th className="py-4 px-6 font-semibold">Status & Mode</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No invoices generated yet. Click "Generate Invoice" to get started.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-blue-900">{inv.invoiceNumber}</td>
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-900">{inv.monthYear}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Building className="w-3 h-3 text-blue-900" />
                        {inv.agreement?.shops?.map((shop, idx) => (
                          <span key={idx}>Shop #{shop.shopNumber}{idx < inv.agreement.shops.length - 1 ? ', ' : ''}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {inv.agreement?.tenant?.name}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600 space-y-0.5">
                      <div>Rent: PKR {inv.rentAmount}</div>
                      <div>Elec: PKR {inv.electricityCharges} | Water: PKR {inv.waterCharges}</div>
                      <div>Maint: PKR {inv.maintenanceFee}</div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <div className="text-rose-600 font-semibold">Fine: PKR {inv.lateFine}</div>
                      <div className="text-slate-500">Prev Bal: PKR {inv.previousBalance}</div>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <div className="font-extrabold text-slate-900">Total: PKR {inv.totalAmount}</div>
                      <div className="text-rose-700 font-bold">Due: PKR {inv.balanceDue}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${inv.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                        {inv.status} {inv.paymentMode && inv.paymentMode !== 'None' && `(${inv.paymentMode})`}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.status !== 'Paid' && (
                          <button
                            onClick={() => handleMarkPaid(inv._id)}
                            className="text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          >
                            <CheckCircle className="w-4 h-4" /> Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(inv._id)}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-400" /> Generate Monthly Invoice & Utility Bill
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Agreement / Tenant</label>
                <select
                  name="agreementId"
                  value={formData.agreementId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm bg-white"
                >
                  <option value="" disabled>Choose agreement...</option>
                  {agreements.map((agr) => (
                    <option key={agr._id} value={agr._id}>
                      Shops: {agr.shops?.map(s => `#${s.shopNumber}`).join(', ')} - {agr.tenant?.name} (Rent: PKR {agr.monthlyRent})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Month & Year</label>
                  <input
                    type="text"
                    name="monthYear"
                    placeholder="e.g. October 2026"
                    value={formData.monthYear}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Due Date (Grace period e.g. 10th)</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Electricity (Sub-meter)</label>
                  <input
                    type="number"
                    name="electricityCharges"
                    placeholder="PKR"
                    value={formData.electricityCharges}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Water Charges</label>
                  <input
                    type="number"
                    name="waterCharges"
                    placeholder="PKR"
                    value={formData.waterCharges}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Maintenance Fee</label>
                  <input
                    type="number"
                    name="maintenanceFee"
                    placeholder="PKR"
                    value={formData.maintenanceFee}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Late Fine Penalty</label>
                  <input
                    type="number"
                    name="lateFine"
                    placeholder="PKR"
                    value={formData.lateFine}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Previous Balance</label>
                  <input
                    type="number"
                    name="previousBalance"
                    placeholder="PKR"
                    value={formData.previousBalance}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm"
                  />
                </div>
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
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm shadow-md transition-all"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesPage;