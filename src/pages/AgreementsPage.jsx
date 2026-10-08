import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Plus, X, Building, Printer } from 'lucide-react';

const AgreementsPage = () => {
  const [agreements, setAgreements] = useState([]);
  const [availableShops, setAvailableShops] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  const [formData, setFormData] = useState({
    shopIds: [], // Multiple shops ke liye array
    tenantId: '',
    tenantName: '',
    tenantCnic: '',
    tenantPhone: '',
    tenantWhatsApp: '',
    tenantAddress: '',
    emergencyContact: '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: '',
    rentAmount: '',
    securityDeposit: '',
    incrementPercentage: 10,
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/agreements/get`);
      setAgreements(res.data.data);

      const shopsRes = await axios.get(`${process.env.REACT_APP_API_URL}/shops`);
      const freeShops = shopsRes.data.data.filter(s => s.status === 'Available');
      setAvailableShops(freeShops);

      const tenantsRes = await axios.get(`${process.env.REACT_APP_API_URL}/tenants/get`);
      setTenants(tenantsRes.data.data || tenantsRes.data);
    } catch (err) {
      setError('Failed to load agreement or tenant data');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'tenantId') {
      if (value === '') {
        setFormData({
          ...formData,
          tenantId: '',
          tenantName: '',
          tenantCnic: '',
          tenantPhone: '',
          tenantWhatsApp: '',
          tenantAddress: '',
          emergencyContact: '',
        });
      } else {
        const selectedT = tenants.find(t => t._id === value);
        if (selectedT) {
          setFormData({
            ...formData,
            tenantId: value,
            tenantName: selectedT.name || '',
            tenantCnic: selectedT.cnic || '',
            tenantPhone: selectedT.phone || '',
            tenantWhatsApp: selectedT.whatsapp || '',
            tenantAddress: selectedT.permanentAddress || '',
            emergencyContact: selectedT.emergencyContact || '',
          });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Checkbox handler for multiple shops selection
  const handleShopCheckboxChange = (shopId) => {
    let updatedShopIds = [...formData.shopIds];
    if (updatedShopIds.includes(shopId)) {
      updatedShopIds = updatedShopIds.filter(id => id !== shopId);
    } else {
      updatedShopIds.push(shopId);
    }
    setFormData({ ...formData, shopIds: updatedShopIds });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/agreements/create`, formData);
      setSuccessMsg(res.data.message);
      setIsModalOpen(false);
      loadData();
      setFormData({
        shopIds: [],
        tenantId: '',
        tenantName: '',
        tenantCnic: '',
        tenantPhone: '',
        tenantWhatsApp: '',
        tenantAddress: '',
        emergencyContact: '',
        startDate: new Date().toISOString().substring(0, 10),
        endDate: '',
        rentAmount: '',
        securityDeposit: '',
        incrementPercentage: 10,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating agreement');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-900" />
            Lease Agreements & Tenant Onboarding
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage single or multi-shop commercial units, contracts, and security deposits.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Agreement
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl">{successMsg}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
              <th className="py-4 px-6 font-semibold">Shop(s) #</th>
              <th className="py-4 px-6 font-semibold">Tenant Name</th>
              <th className="py-4 px-6 font-semibold">Phone / CNIC</th>
              <th className="py-4 px-6 font-semibold">Lease Period</th>
              <th className="py-4 px-6 font-semibold">Monthly Rent</th>
              <th className="py-4 px-6 font-semibold text-center">Action / View Format</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
            {agreements.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">No active lease agreements found.</td>
              </tr>
            ) : (
              agreements.map((agr) => (
                <tr key={agr._id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-1.5 pt-5">
                    <Building className="w-4 h-4 text-blue-900" /> 
                    {agr.shops && agr.shops.length > 0 
                      ? agr.shops.map(s => `#${s.shopNumber}`).join(', ') 
                      : `Shop #${agr.shop?.shopNumber}`}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-800">{agr.tenant?.name}</td>
                  <td className="py-4 px-6 text-slate-600 text-xs">{agr.tenant?.phone} <br /> <span className="text-slate-400">{agr.tenant?.cnic}</span></td>
                  <td className="py-4 px-6 text-slate-600 text-xs">
                    {agr.startDate?.substring(0, 10)} &rarr; {agr.endDate?.substring(0, 10)}
                  </td>
                  <td className="py-4 px-6 font-bold text-emerald-700">PKR {agr.monthlyRent || agr.rentAmount}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      onClick={() => setSelectedAgreement(agr)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Format
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Create Lease Agreement (Multi-Shop Support)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Multiple Shops Selection Checkboxes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Select Vacant Shop(s) - Choose 1 or more</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 p-3 rounded-xl bg-slate-50">
                  {availableShops.length === 0 ? (
                    <p className="text-xs text-slate-400 col-span-2">No vacant shops available.</p>
                  ) : (
                    availableShops.map((shop) => (
                      <label key={shop._id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-medium cursor-pointer hover:bg-blue-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.shopIds.includes(shop._id)}
                          onChange={() => handleShopCheckboxChange(shop._id)}
                          className="rounded text-blue-900 focus:ring-blue-900 w-4 h-4"
                        />
                        <span>Shop #{shop.shopNumber} ({shop.floor} - {shop.sizeSqFt} sq ft)</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Existing Tenant Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Tenant (Existing or New)</label>
                <select
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm bg-white"
                >
                  <option value="">-- Register New Tenant (Fill details below) --</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name} (CNIC: {t.cnic} - Phone: {t.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Tenant Full Name</label>
                  <input
                    type="text"
                    name="tenantName"
                    placeholder="Muhammad Ali"
                    value={formData.tenantName}
                    onChange={handleChange}
                    required
                    disabled={!!formData.tenantId}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm bg-slate-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">CNIC Number</label>
                  <input
                    type="text"
                    name="tenantCnic"
                    placeholder="XXXXX-XXXXXXX-X"
                    value={formData.tenantCnic}
                    onChange={handleChange}
                    required
                    disabled={!!formData.tenantId}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="tenantPhone"
                    placeholder="0300-1234567"
                    value={formData.tenantPhone}
                    onChange={handleChange}
                    required
                    disabled={!!formData.tenantId}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    name="tenantWhatsApp"
                    placeholder="0300-1234567"
                    value={formData.tenantWhatsApp}
                    onChange={handleChange}
                    disabled={!!formData.tenantId}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Permanent Address</label>
                <input
                  type="text"
                  name="tenantAddress"
                  placeholder="House #, Street, City"
                  value={formData.tenantAddress}
                  onChange={handleChange}
                  disabled={!!formData.tenantId}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm disabled:bg-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Total Monthly Rent (PKR)</label>
                  <input
                    type="number"
                    name="rentAmount"
                    placeholder="Combined Rent"
                    value={formData.rentAmount}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Security Deposit</label>
                  <input
                    type="number"
                    name="securityDeposit"
                    placeholder="PKR"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Annual Hike (%)</label>
                  <input
                    type="number"
                    name="incrementPercentage"
                    value={formData.incrementPercentage}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
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
                  className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium text-sm shadow-md transition-all flex items-center gap-2"
                >
                  Save Agreement & Onboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAgreement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-100 my-8 p-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-900" /> Commercial Lease Agreement Format
              </h2>
              <button onClick={() => setSelectedAgreement(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="py-6 space-y-4 text-slate-700 text-sm leading-relaxed">
              <p className="text-center font-bold text-base text-slate-900 underline">COMMERCIAL COMPOSITE RENTAL DEED</p>
              <p>
                This Agreement is made and executed on this date, between the Plaza Management (First Party) and 
                <span className="font-bold text-slate-900"> {selectedAgreement.tenant?.name}</span> (CNIC: <span className="font-bold text-slate-900">{selectedAgreement.tenant?.cnic}</span>), hereinafter referred to as the Tenant.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p>
                  <span className="font-semibold">Rented Commercial Units:</span> 
                  {selectedAgreement.shops && selectedAgreement.shops.length > 0 
                    ? selectedAgreement.shops.map(s => ` Shop #${s.shopNumber} (${s.floor}, ${s.commercialType})`).join(', ') 
                    : ` Shop #${selectedAgreement.shop?.shopNumber}`}
                </p>
                <p><span className="font-semibold">Lease Duration:</span> From {selectedAgreement.startDate?.substring(0, 10)} to {selectedAgreement.endDate?.substring(0, 10)}</p>
                <p><span className="font-semibold">Combined Monthly Rental:</span> PKR {selectedAgreement.monthlyRent || selectedAgreement.rentAmount} / month</p>
                <p><span className="font-semibold">Security Deposit:</span> PKR {selectedAgreement.securityDeposit} (Refundable)</p>
                <p><span className="font-semibold">Annual Rent Escalation:</span> {selectedAgreement.incrementPercentage}% automatic hike after every 12 months.</p>
              </div>

              <p>
                <strong>Terms & Conditions:</strong> The tenant is authorized to combine these commercial units for unified office/showroom operations, maintain utility payments on time, and clear dues monthly.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-12 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Plaza Management Authority</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">{selectedAgreement.tenant?.name}</p>
                  <p className="text-xs text-slate-500">Tenant Signature</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Agreement
              </button>
              <button
                onClick={() => setSelectedAgreement(null)}
                className="bg-gray-200 hover:bg-gray-300 text-slate-700 px-5 py-2 rounded-xl text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgreementsPage;