import React, { useState, useEffect } from 'react';
import {
  getCurrentAdmin,
  updateProfile,
  createManager,
  getManagers,
  deleteManager,
  updateManager,
} from '../services/authService';
import {
  User,
  Shield,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  XCircle,
  Save,
  AlertTriangle,
} from 'lucide-react';

const AVAILABLE_PAGES = [
  { key: 'dashboard', label: 'Dashboard Overview' },
  { key: 'shops', label: 'Shops Management' },
  { key: 'tenants', label: 'Tenants' },
  { key: 'agreements', label: 'Agreements' },
  { key: 'invoices', label: 'Invoices & Payments' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'reports', label: 'Reports' },
];

const SettingsPage = () => {
  const currentUser = getCurrentAdmin();

  // ================= PROFILE FORM STATES =================
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // ================= MANAGER MANAGEMENT STATES =================
  const [editingManagerId, setEditingManagerId] = useState(null);
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [allowedPages, setAllowedPages] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [managerSuccess, setManagerSuccess] = useState('');
  const [managerError, setManagerError] = useState('');
  const [managerLoading, setManagerLoading] = useState(false);

  // 👉 NEW: Custom Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [managerToDelete, setManagerToDelete] = useState(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchManagers();
    }
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await getManagers();
      if (res.success) setManagersList(res.data);
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  // 1. ADMIN OWN PROFILE UPDATE
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const payload = { name, email };
      if (password) payload.password = password;

      const res = await updateProfile(payload);
      if (res.success) {
        setProfileSuccess('Profile updated successfully!');
        setPassword('');
      }
    } catch (err) {
      setProfileError(
        err.response?.data?.message || 'Failed to update profile.'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. CHECKBOX TOGGLE FOR MANAGER PERMISSIONS
  const handleCheckboxChange = (pageKey) => {
    if (allowedPages.includes(pageKey)) {
      setAllowedPages(allowedPages.filter((p) => p !== pageKey));
    } else {
      setAllowedPages([...allowedPages, pageKey]);
    }
  };

  // RESET MANAGER FORM
  const resetManagerForm = () => {
    setEditingManagerId(null);
    setManagerName('');
    setManagerEmail('');
    setManagerPassword('');
    setAllowedPages([]);
    setManagerError('');
    setManagerSuccess('');
  };

  // SET EDIT MANAGER DATA IN FORM
  const handleEditClick = (mgr) => {
    setEditingManagerId(mgr._id);
    setManagerName(mgr.name);
    setManagerEmail(mgr.email);
    setManagerPassword('');
    setAllowedPages(mgr.allowedPages || []);
    setManagerError('');
    setManagerSuccess('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // 3. CREATE / UPDATE MANAGER
  const handleSaveManager = async (e) => {
    e.preventDefault();
    setManagerError('');
    setManagerSuccess('');
    setManagerLoading(true);

    try {
      if (editingManagerId) {
        const payload = {
          name: managerName,
          email: managerEmail,
          allowedPages,
        };
        if (managerPassword) payload.password = managerPassword;

        const res = await updateManager(editingManagerId, payload);
        if (res.success) {
          setManagerSuccess('Manager permissions updated successfully!');
          resetManagerForm();
          fetchManagers();
        }
      } else {
        const res = await createManager({
          name: managerName,
          email: managerEmail,
          password: managerPassword,
          allowedPages,
        });
        if (res.success) {
          setManagerSuccess('Manager account created successfully!');
          resetManagerForm();
          fetchManagers();
        }
      }
    } catch (err) {
      setManagerError(
        err.response?.data?.message || 'Failed to save manager details.'
      );
    } finally {
      setManagerLoading(false);
    }
  };

  //  4. OPEN DELETE CONFIRMATION MODAL
  const confirmDeleteManager = (mgr) => {
    setManagerToDelete(mgr);
    setDeleteModalOpen(true);
  };

  //  5. EXECUTE DELETE MANAGER
  const handleDeleteManager = async () => {
    if (!managerToDelete) return;
    try {
      const res = await deleteManager(managerToDelete._id);
      if (res.success) {
        if (editingManagerId === managerToDelete._id) resetManagerForm();
        fetchManagers();
        setDeleteModalOpen(false);
        setManagerToDelete(null);
        setManagerSuccess('Manager deleted successfully!');
      }
    } catch (err) {
      setManagerError(err.response?.data?.message || 'Failed to delete manager.');
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8 relative">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your personal credentials and manager access permissions.
        </p>
      </div>

      {/* ================= SECTION 1: ADMIN PROFILE UPDATE ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-600" />
          Update Your Admin Profile
        </h2>

        {profileSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              New Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {profileLoading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* ================= SECTION 2: ADMIN ONLY - MANAGE MANAGERS ================= */}
      {currentUser?.role === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              {editingManagerId
                ? 'Edit Manager Permissions & Info'
                : 'Create New Shop Manager'}
            </h2>
            {editingManagerId && (
              <button
                type="button"
                onClick={resetManagerForm}
                className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <XCircle className="h-4 w-4" /> Cancel Edit
              </button>
            )}
          </div>

          {managerSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{managerSuccess}</span>
            </div>
          )}

          {managerError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{managerError}</span>
            </div>
          )}

          <form
            onSubmit={handleSaveManager}
            className="space-y-4 border-b border-slate-100 pb-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Manager Name
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager Name"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="manager@plaza.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required={!editingManagerId}
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder={
                    editingManagerId
                      ? 'Leave blank to keep same'
                      : '••••••••'
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Assign Page Access Permissions:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_PAGES.map((page) => (
                  <label
                    key={page.key}
                    className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-100 bg-slate-50 text-xs cursor-pointer hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={allowedPages.includes(page.key)}
                      onChange={() => handleCheckboxChange(page.key)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-slate-700 font-medium">
                      {page.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={managerLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              {editingManagerId ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {managerLoading
                ? 'Processing...'
                : editingManagerId
                ? 'Update Manager Access'
                : 'Create Manager Account'}
            </button>
          </form>

          {/* MANAGERS TABLE WITH EDIT & DELETE */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              Existing Managers
            </h3>
            {managersList.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                No managers created yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Allowed Pages</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {managersList.map((mgr) => (
                      <tr key={mgr._id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900">
                          {mgr.name}
                        </td>
                        <td className="p-3 text-slate-600">{mgr.email}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {mgr.allowedPages?.map((p) => (
                              <span
                                key={p}
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => handleEditClick(mgr)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Manager"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteManager(mgr)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Manager"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= CUSTOM DELETE CONFIRMATION MODAL ================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Delete Manager Account
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Are you sure you want to delete <span className="font-semibold text-slate-800">{managerToDelete?.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteManager}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;