import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  fetchShops,
  createShop,
  updateShop,
  deleteShop,
} from '../services/shopService';

import {
  Plus,
  Trash2,
  X,
  Store,
  Pencil,
  RefreshCw,
} from 'lucide-react';

const FLOORS = [
  'Basement',
  'Ground Floor',
  '1st Floor',
  '2nd Floor',
  'Rooftop',
];

const TYPES = [
  'Retail Shop',
  'Corporate Office',
  'Storage Godown',
];

const emptyForm = () => ({
  shopNumber: '',
  floor: 'Ground Floor',
  utilityZone: 'Standard Corridor Line',
  sizeSqFt: '',
  type: 'Retail Shop',
  status: 'Available',
});

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 ' +
  'text-sm text-slate-800 bg-white disabled:bg-slate-100';

const statusClass = (status) => {
  if (status === 'Available') return 'bg-emerald-100 text-emerald-800';
  if (status === 'Occupied') return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-800';
};

const errorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const ShopsPage = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const mounted = useRef(false);
  const requestId = useRef(0);
  const actionLock = useRef(false);

  const loadShops = useCallback(async () => {
    const currentRequest = ++requestId.current;

    if (mounted.current) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetchShops();

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid shops response');
      }

      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setShops(response.data);
        setLoaded(true);
      }
    } catch (err) {
      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setError(
          errorMessage(
            err,
            'Could not refresh shops. Please try Refresh.'
          )
        );
      }
    } finally {
      if (
        mounted.current &&
        currentRequest === requestId.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadShops();

    const refresh = () => {
      if (!actionLock.current) loadShops();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-shops-updated', refresh);
    window.addEventListener('plaza-agreements-updated', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted.current = false;
      requestId.current += 1;

      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-shops-updated', refresh);
      window.removeEventListener('plaza-agreements-updated', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadShops]);

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shops.filter((shop) => {
      const matchesStatus =
        !statusFilter || shop.status === statusFilter;

      const searchable = [
        shop.shopNumber,
        shop.floor,
        shop.utilityZone,
        shop.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchable.includes(query);
    });
  }, [shops, search, statusFilter]);

  const openForm = (shop = null) => {
    if (actionLock.current) return;

    setError('');
    setSuccess('');
    setFormError('');
    setEditingShop(shop);

    setFormData(
      shop
        ? {
            shopNumber: shop.shopNumber || '',
            floor: shop.floor || 'Ground Floor',
            utilityZone: shop.utilityZone || '',
            sizeSqFt: String(shop.sizeSqFt ?? ''),
            type: shop.type || 'Retail Shop',
            status: shop.status || 'Available',
          }
        : emptyForm()
    );

    setIsModalOpen(true);
  };

  const closeForm = () => {
    if (actionLock.current) return;
    setIsModalOpen(false);
    setFormError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (actionLock.current) return;

    setFormError('');

    const shopNumber = formData.shopNumber.trim();
    const sizeSqFt = Number(formData.sizeSqFt);

    if (!shopNumber) {
      setFormError('Shop number is required.');
      return;
    }

    if (
      !String(formData.sizeSqFt).trim() ||
      !Number.isFinite(sizeSqFt) ||
      sizeSqFt <= 0
    ) {
      setFormError('Shop size must be greater than zero.');
      return;
    }

    const payload = {
      ...formData,
      shopNumber,
      sizeSqFt,
      utilityZone:
        formData.utilityZone.trim() || 'Standard Corridor Line',
    };

    // Occupancy is controlled by the agreement.
    // Omitting this field also avoids resending stale Occupied status.
    if (editingShop?.status === 'Occupied') {
      delete payload.status;
    }

    actionLock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');

    // Prevent an older in-flight list request overwriting this action.
    requestId.current += 1;

    try {
      const response = editingShop
        ? await updateShop(editingShop._id, payload)
        : await createShop(payload);

      if (mounted.current) {
        const saved = response.data;

        if (saved?._id) {
          setShops((previous) => [
            saved,
            ...previous.filter((shop) => shop._id !== saved._id),
          ]);
        }

        setIsModalOpen(false);
        setEditingShop(null);
        setFormData(emptyForm());
        setSuccess(response.message || 'Shop saved successfully.');
      }

      await loadShops();
    } catch (err) {
      const uncertain =
        !err.response || err.response.status >= 500;

      if (mounted.current) {
        if (uncertain) {
          setIsModalOpen(false);
          setSuccess('');
        } else {
          setFormError(errorMessage(err, 'Could not save shop.'));
        }
      }

      await loadShops();

      if (mounted.current && uncertain) {
        setError(
          'Save confirmation was not received. Check the refreshed list before trying again.'
        );
      }
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const handleDelete = async (shop) => {
    if (actionLock.current) return;

    if (
      !window.confirm(
        `Delete shop ${shop.shopNumber}? Shops with agreement or revenue history cannot be deleted.`
      )
    ) {
      return;
    }

    actionLock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    requestId.current += 1;

    try {
      const response = await deleteShop(shop._id);

      if (mounted.current) {
        setShops((previous) =>
          previous.filter((item) => item._id !== shop._id)
        );

        setSuccess(response.message || 'Shop deleted successfully.');
      }

      await loadShops();
    } catch (err) {
      const message =
        !err.response || err.response.status >= 500
          ? 'Delete confirmation was not received. Check the refreshed list before trying again.'
          : errorMessage(err, 'Could not delete shop.');

      await loadShops();

      if (mounted.current) setError(message);
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Store className="h-7 w-7" />
              Shops & Units Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage shops, floors, utility zones and availability.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || loading}
              onClick={loadShops}
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => openForm()}
              className="flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Shop
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="mb-4 rounded-lg bg-emerald-50 p-4 text-emerald-700">
            {success}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            aria-label="Search shops"
            placeholder="Search shop, floor, zone or type..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClass} max-w-md`}
          />

          <select
            aria-label="Filter shops by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} max-w-xs`}
          >
            <option value="">All statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <p className="mb-3 text-sm text-slate-500" aria-live="polite">
          {loading
            ? 'Loading shops...'
            : loaded
            ? `Showing ${visibleShops.length} of ${shops.length} shops`
            : 'Shops have not loaded.'}
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                {['Shop #', 'Floor & Zone', 'Size', 'Type', 'Status', 'Actions'].map(
                  (title) => (
                    <th key={title} className="whitespace-nowrap px-4 py-4">
                      {title}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y">
              {visibleShops.map((shop) => (
                <tr key={shop._id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold">
                    {shop.shopNumber}
                  </td>

                  <td className="px-4 py-4">
                    <div>{shop.floor}</div>
                    <div className="text-xs text-slate-500">
                      {shop.utilityZone || '—'}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    {shop.sizeSqFt} sq. ft
                  </td>

                  <td className="px-4 py-4">{shop.type}</td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(shop.status)}`}
                    >
                      {shop.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openForm(shop)}
                        className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-blue-800 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={busy || shop.status === 'Occupied'}
                        onClick={() => handleDelete(shop)}
                        title={
                          shop.status === 'Occupied'
                            ? 'Occupied shops cannot be deleted'
                            : 'Delete shop'
                        }
                        className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-rose-700 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!visibleShops.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading
                      ? 'Loading...'
                      : !loaded
                      ? 'Unable to load shops. Please try Refresh.'
                      : shops.length
                      ? 'No shops match your filters.'
                      : 'No shops yet. Add your first shop.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shop-form-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
            >
              <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
                <h2 id="shop-form-title" className="font-bold">
                  {editingShop ? 'Edit Shop' : 'Add Shop'}
                </h2>

                <button
                  type="button"
                  disabled={busy}
                  onClick={closeForm}
                  aria-label="Close shop form"
                  className="disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5">
                {formError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <fieldset disabled={busy} className="space-y-4">
                  <label className="block text-sm font-medium">
                    Shop Number
                    <input
                      name="shopNumber"
                      value={formData.shopNumber}
                      onChange={handleChange}
                      required
                      className={`${inputClass} mt-1`}
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Floor
                    <select
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      className={`${inputClass} mt-1`}
                    >
                      {FLOORS.map((floor) => (
                        <option key={floor} value={floor}>{floor}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium">
                    Size (Sq Ft)
                    <input
                      type="number"
                      name="sizeSqFt"
                      min="0"
                      step="any"
                      value={formData.sizeSqFt}
                      onChange={handleChange}
                      required
                      className={`${inputClass} mt-1`}
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Utility Zone
                    <input
                      name="utilityZone"
                      value={formData.utilityZone}
                      onChange={handleChange}
                      className={`${inputClass} mt-1`}
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Property Type
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className={`${inputClass} mt-1`}
                    >
                      {TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  {editingShop?.status === 'Occupied' ? (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      Occupied — terminate the active agreement to release
                      this shop. Other shop details can still be edited.
                    </div>
                  ) : (
                    <label className="block text-sm font-medium">
                      Status
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className={`${inputClass} mt-1`}
                      >
                        <option value="Available">Available</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>

                      <span className="mt-1 block text-xs font-normal text-slate-500">
                        Creating an agreement marks the shop Occupied.
                      </span>
                    </label>
                  )}

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-lg border px-4 py-2"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="rounded-lg bg-blue-900 px-4 py-2 text-white disabled:opacity-50"
                    >
                      {busy ? 'Saving...' : editingShop ? 'Save Changes' : 'Create Shop'}
                    </button>
                  </div>
                </fieldset>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopsPage;