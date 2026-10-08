import React, { useState, useEffect } from 'react';
import { fetchTenants, createTenant, deleteTenant } from '../services/tenantService';
import { Plus, Trash2, X, Users, UserCheck, FileText, BarChart2 } from 'lucide-react';

const TenantsPage = () => {
  const [tenants, setTenants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTenantReport, setSelectedTenantReport] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    cnic: '',
    phone: '',
    whatsapp: '',
    address: '',
    emergencyContact: '',
    status: 'Active',
  });

  // Separate state for files upload
  const [files, setFiles] = useState({
    scannedCnic: null,
    businessRegistration: null,
    signedContract: null,
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load Tenants
  const loadTenants = async () => {
    try {
      const res = await fetchTenants();
      setTenants(res.data);
    } catch (err) {
      setError('Failed to load tenants');
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles({ ...files, [name]: selectedFiles[0] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      // Using FormData to handle file uploads properly
      const data = new FormData();
      data.append('name', formData.name);
      data.append('cnic', formData.cnic);
      data.append('phone', formData.phone);
      data.append('whatsapp', formData.whatsapp);
      data.append('address', formData.address);
      data.append('emergencyContact', formData.emergencyContact);
      data.append('status', formData.status);

      if (files.scannedCnic) data.append('documents', files.scannedCnic);
      if (files.businessRegistration) data.append('documents', files.businessRegistration);
      if (files.signedContract) data.append('documents', files.signedContract);

      const res = await createTenant(data);
      setSuccessMsg(res.message || 'Tenant added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        cnic: '',
        phone: '',
        whatsapp: '',
        address: '',
        emergencyContact: '',
        status: 'Active',
      });
      setFiles({ scannedCnic: null, businessRegistration: null, signedContract: null });
      setIsModalOpen(false);
      loadTenants();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding tenant');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        await deleteTenant(id);
        loadTenants();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handler for opening the tenant report modal
  const handleReport = (tenant) => {
    setSelectedTenantReport(tenant);
    setIsReportModalOpen(true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-900" />
            Tenants Directory (Dukan-dar)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage verified tenant KYC details, CNIC records, and digital documents.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Tenant
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl">{successMsg}</div>}

      {/* Tenants Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Tenant Name</th>
                <th className="py-4 px-6 font-semibold">CNIC</th>
                <th className="py-4 px-6 font-semibold">Phone / WhatsApp</th>
                <th className="py-4 px-6 font-semibold">Address</th>
                <th className="py-4 px-6 font-semibold">Documents</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No tenants found. Click "Add New Tenant" to get started.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2 pt-5">
                      <UserCheck className="w-4 h-4 text-blue-900" /> {tenant.name}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">{tenant.cnic}</td>
                    <td className="py-4 px-6 text-slate-600 text-xs">
                      <div>P: {tenant.phone}</div>
                      {tenant.whatsapp && <div className="text-emerald-700">WA: {tenant.whatsapp}</div>}
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-xs">{tenant.permanentAddress || tenant.address}</td>
                    <td className="py-4 px-6 text-xs text-blue-700">
                      {tenant.documents && tenant.documents.length > 0 ? (
                        tenant.documents.map((doc, idx) => (
                          <a key={idx} href={`http://localhost:5000/${doc}`} target="_blank" rel="noreferrer" className="block underline">
                            Document {idx + 1}
                          </a>
                        ))
                      ) : (
                        <span className="text-slate-400">No docs</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        tenant.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Report Button */}
                        <button
                          onClick={() => handleReport(tenant)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          title="View / Generate Report"
                        >
                          <BarChart2 className="w-4 h-4" /> Report
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(tenant._id)}
                          className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
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

      {/* Add Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Add New Tenant Profile & KYC
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Tenant Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Muhammad Ali"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">CNIC Number</label>
                  <input
                    type="text"
                    name="cnic"
                    placeholder="12301-1234567-1"
                    value={formData.cnic}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="0300-1234567"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    name="whatsapp"
                    placeholder="0300-1234567"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    name="emergencyContact"
                    placeholder="Reference phone #"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Permanent Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="House #, Street, City"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                />
              </div>

              {/* File Upload Inputs */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <p className="text-xs font-bold uppercase text-blue-900">Upload Digital Documents (CNIC / Agreement)</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Scanned CNIC File</label>
                  <input
                    type="file"
                    name="scannedCnic"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Business Registration File</label>
                  <input
                    type="file"
                    name="businessRegistration"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Signed Contract File</label>
                  <input
                    type="file"
                    name="signedContract"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-900 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 text-sm bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  Save Tenant Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tenant Report Modal */}
      {isReportModalOpen && selectedTenantReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
            <div className="bg-purple-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-purple-300" /> Tenant Summary & Report
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="text-purple-200 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-slate-700 text-sm">
              {/* Tenant Basic Info Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-base">{selectedTenantReport.name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedTenantReport.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedTenantReport.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 text-slate-600">
                  <div><span className="font-semibold text-slate-700">CNIC:</span> {selectedTenantReport.cnic}</div>
                  <div><span className="font-semibold text-slate-700">Phone:</span> {selectedTenantReport.phone}</div>
                  <div><span className="font-semibold text-slate-700">WhatsApp:</span> {selectedTenantReport.whatsapp || 'N/A'}</div>
                  <div><span className="font-semibold text-slate-700">Emergency:</span> {selectedTenantReport.emergencyContact || 'N/A'}</div>
                </div>
                <div className="text-xs pt-1"><span className="font-semibold text-slate-700">Address:</span> {selectedTenantReport.permanentAddress || selectedTenantReport.address}</div>
              </div>

              {/* Financial & Agreement Quick Stats */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3">Performance & Ledger Overview</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                    <span className="block text-xs text-purple-600 font-medium">Total Dues</span>
                    <span className="text-base font-extrabold text-purple-900">PKR 0</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                    <span className="block text-xs text-emerald-600 font-medium">Paid Rentals</span>
                    <span className="text-base font-extrabold text-emerald-900">0 Months</span>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    <span className="block text-xs text-blue-600 font-medium">Documents</span>
                    <span className="text-base font-extrabold text-blue-900">{selectedTenantReport.documents?.length || 0} Files</span>
                  </div>
                </div>
              </div>

              {/* Activity / Remarks section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-2">Manager Notes & History</h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                  No active warnings or fine history recorded for this tenant. All KYC verification documents are securely attached.
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs transition-all flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" /> Print Report
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-md transition-all"
                >
                  Close Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantsPage;