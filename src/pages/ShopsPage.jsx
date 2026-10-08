import React, { useState, useEffect } from 'react';
import { fetchShops, createShop, deleteShop } from '../services/shopService';
import { Plus, Trash2, X, Store, Building, Layers } from 'lucide-react';

const ShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    shopNumber: '',
    floor: 'Ground Floor',
    utilityZone: 'Standard Corridor Line',
    sizeSqFt: '',
    type: 'Retail Shop',
    status: 'Available',
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadShops = async () => {
    try {
      const res = await fetchShops();
      setShops(res.data);
    } catch (err) {
      setError('Failed to load shops');
    }
  };

  useEffect(() => {
    loadShops();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createShop(formData);
      setSuccessMsg('Shop added successfully!');
      setFormData({ shopNumber: '', floor: 'Ground Floor', utilityZone: 'Standard Corridor Line', sizeSqFt: '', type: 'Retail Shop', status: 'Available' });
      setIsModalOpen(false);
      loadShops();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding shop');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this shop?')) {
      try {
        await deleteShop(id);
        loadShops();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Store className="w-8 h-8 text-blue-900" />
            Shops & Units Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage commercial units, multi-level floors, utility zones, and real-time status[cite: 4].</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Shop
        </button>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl">{error}</div>}
      {successMsg && <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl">{successMsg}</div>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Shop #</th>
                <th className="py-4 px-6 font-semibold">Floor & Zone</th>
                <th className="py-4 px-6 font-semibold">Size (Sq Ft)</th>
                <th className="py-4 px-6 font-semibold">Type</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {shops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No shops found. Click "Add New Shop" to get started.
                  </td>
                </tr>
              ) : (
                shops.map((shop) => (
                  <tr key={shop._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-900" /> {shop.shopNumber}
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="font-medium text-slate-900">{shop.floor}</div>
                      <div className="text-xs text-slate-400">{shop.utilityZone}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{shop.sizeSqFt} sq. ft</td>
                    <td className="py-4 px-6 text-slate-600">{shop.type}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        shop.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                        shop.status === 'Occupied' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDelete(shop._id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 transform transition-all">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-400" /> Add Commercial Unit
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Shop Number</label>
                  <input
                    type="text"
                    name="shopNumber"
                    placeholder="e.g., GF-01, FF-12"
                    value={formData.shopNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Floor Name</label>
                  <select
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm bg-white"
                  >
                    <option value="Basement">Basement</option>
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="Rooftop">Rooftop</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Size (Sq Ft)</label>
                  <input
                    type="number"
                    name="sizeSqFt"
                    placeholder="e.g., 450"
                    value={formData.sizeSqFt}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Utility Zone</label>
                  <input
                    type="text"
                    name="utilityZone"
                    placeholder="e.g., Main Corridor Line A"
                    value={formData.utilityZone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Property Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm bg-white"
                  >
                    <option value="Retail Shop">Retail Shop</option>
                    <option value="Corporate Office">Corporate Office</option>
                    <option value="Storage Godown">Storage Godown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-none text-slate-800 text-sm bg-white"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
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
                  Save Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopsPage;