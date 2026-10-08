import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

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
  Search,
  Building2,
  CheckCircle2,
  AlertCircle,
  Layers,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Save,
  ShieldCheck,
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

const PAGE_SIZE = 10;

const emptyForm = () => ({
  shopNumber: '',
  floor: 'Ground Floor',
  utilityZone: 'Standard Corridor Line',
  sizeSqFt: '',
  type: 'Retail Shop',
  status: 'Available',
});

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white ' +
  'px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-indigo-400 focus:ring-4 ' +
  'focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-500 ' +
  'sm:text-sm';

const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl ' +
  'px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const primaryButton =
  `${buttonClass} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`;

const secondaryButton =
  `${buttonClass} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;

const errorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

const formatSize = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString('en-PK', { maximumFractionDigits: 2 })
    : '—';
};

function StatusBadge({ status }) {
  const styles = {
    Available: {
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    },
    Occupied: {
      badge: 'border-indigo-100 bg-indigo-50 text-indigo-700',
      dot: 'bg-indigo-500',
    },
    Maintenance: {
      badge: 'border-amber-100 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },
  };

  const style = styles[status] || {
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status || 'Unknown'}
    </span>
  );
}

function Notice({ children, type = 'error', onDismiss }) {
  const positive = type === 'success';
  const Icon = positive ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={positive ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        positive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-6">{children}</p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Portal keeps the dialog above the fixed header and sidebar.
// Background content becomes inert while the dialog is open.
function Modal({
  title,
  description,
  icon: Icon = Store,
  danger = false,
  busy = false,
  onClose,
  children,
}) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const siblings = Array.from(document.body.children)
      .filter((element) => element !== overlay)
      .map((element) => ({
        element,
        inert: element.inert,
      }));

    siblings.forEach(({ element }) => {
      element.inert = true;
    });

    document.body.style.overflow = 'hidden';

    const focusable = () =>
      Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), ' +
          'select:not([disabled]), textarea:not([disabled]), ' +
          '[tabindex]:not([tabindex="-1"])'
        )
      ).filter(
        (element) =>
          !element.matches(':disabled') &&
          element.getClientRects().length > 0
      );

    // Focus the dialog itself to avoid opening the mobile keyboard.
    panel.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        if (!busyRef.current) {
          closeRef.current();
        }

        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusable();

      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (
        event.shiftKey &&
        (current === first || current === panel || !panel.contains(current))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (current === last || current === panel || !panel.contains(current))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event) => {
      if (!panel.contains(event.target)) panel.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);

      document.body.style.overflow = previousOverflow;

      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });

      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected &&
        previouslyFocused.getClientRects().length > 0 &&
        !previouslyFocused.matches(':disabled')
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-dialog-title"
        aria-describedby="shop-dialog-description"
        aria-busy={busy}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              danger
                ? 'bg-rose-50 text-rose-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="shop-dialog-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p
              id="shop-dialog-description"
              className="mt-1 text-xs leading-5 text-slate-500"
            >
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-1 text-indigo-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function ShopsPage() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [deletingShop, setDeletingShop] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const mounted = useRef(false);
  const requestId = useRef(0);
  const actionLock = useRef(false);

  const loadShops = useCallback(async () => {
    if (!mounted.current) return;

    const currentRequest = ++requestId.current;

    setLoading(true);
    setError('');

    try {
      const response = await fetchShops();

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid shops response');
      }

      if (mounted.current && currentRequest === requestId.current) {
        setShops(response.data);
        setLoaded(true);
      }
    } catch (err) {
      if (mounted.current && currentRequest === requestId.current) {
        setError(
          errorMessage(err, 'Could not refresh shops. Please try again.')
        );
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) {
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

    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-shops-updated', refresh);
    window.addEventListener('plaza-agreements-updated', refresh);
    document.addEventListener('visibilitychange', visible);

    return () => {
      mounted.current = false;
      requestId.current += 1;

      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-shops-updated', refresh);
      window.removeEventListener('plaza-agreements-updated', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadShops]);

  const counts = useMemo(
    () => ({
      total: shops.length,
      available: shops.filter((shop) => shop.status === 'Available').length,
      occupied: shops.filter((shop) => shop.status === 'Occupied').length,
      maintenance: shops.filter((shop) => shop.status === 'Maintenance').length,
    }),
    [shops]
  );

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase();

    return shops.filter((shop) => {
      const text = [
        shop.shopNumber,
        shop.floor,
        shop.utilityZone,
        shop.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        (!statusFilter || shop.status === statusFilter) &&
        (!floorFilter || shop.floor === floorFilter) &&
        text.includes(query)
      );
    });
  }, [shops, search, statusFilter, floorFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleShops.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageShops = visibleShops.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasFilters = Boolean(search || statusFilter || floorFilter);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, floorFilter]);

  useEffect(() => {
    setPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setFloorFilter('');
    setPage(1);
  };

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
    setFormData((previous) => ({ ...previous, [name]: value }));
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

    if (editingShop?.status === 'Occupied') {
      delete payload.status;
    }

    actionLock.current = true;
    requestId.current += 1;

    setBusy(true);
    setError('');
    setSuccess('');

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
      const uncertain = !err.response || err.response.status >= 500;

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

  const requestDelete = (shop) => {
    if (actionLock.current || shop.status === 'Occupied') return;

    setDeleteError('');
    setError('');
    setSuccess('');
    setDeletingShop(shop);
  };

  const closeDelete = () => {
    if (actionLock.current) return;
    setDeletingShop(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deletingShop || actionLock.current) return;

    const shop = deletingShop;

    actionLock.current = true;
    requestId.current += 1;
    setBusy(true);
    setDeleteError('');

    try {
      const response = await deleteShop(shop._id);

      if (mounted.current) {
        setShops((previous) =>
          previous.filter((item) => item._id !== shop._id)
        );
        setDeletingShop(null);
        setSuccess(response.message || 'Shop deleted successfully.');
      }

      await loadShops();
    } catch (err) {
      const uncertain = !err.response || err.response.status >= 500;

      const message = uncertain
        ? 'Delete confirmation was not received. Check the refreshed list before retrying.'
        : errorMessage(err, 'Could not delete shop.');

      await loadShops();

      if (mounted.current) {
        if (uncertain) {
          setDeletingShop(null);
          setError(message);
        } else {
          setDeleteError(message);
        }
      }
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const renderActions = (shop) => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => openForm(shop)}
        aria-label={`Edit shop ${shop.shopNumber}`}
        className={`${buttonClass} flex-1 bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100 lg:flex-none`}
      >
        <Pencil className="h-4 w-4" />
        Edit
      </button>

      <button
        type="button"
        disabled={busy || shop.status === 'Occupied'}
        onClick={() => requestDelete(shop)}
        aria-label={`Delete shop ${shop.shopNumber}`}
        title={
          shop.status === 'Occupied'
            ? 'Occupied shops cannot be deleted'
            : 'Delete shop'
        }
        className={`${buttonClass} flex-1 bg-rose-50 px-3 text-rose-600 hover:bg-rose-100 lg:flex-none`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="lg:sr-only">Delete</span>
      </button>
    </div>
  );

  return (
    <div className="min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Property Management
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Shops & units
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage your spaces, availability and property details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || loading}
              onClick={loadShops}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span className="sr-only sm:not-sr-only">Refresh</span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => openForm()}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              Add shop
            </button>
          </div>
        </div>

        {error && (
          <Notice onDismiss={() => setError('')}>
            {error}
            {loaded && ' Existing records may show the last loaded data.'}
          </Notice>
        )}

        {success && (
          <Notice type="success" onDismiss={() => setSuccess('')}>
            {success}
          </Notice>
        )}

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            {
              label: 'Total units',
              value: counts.total,
              icon: Building2,
              color: 'bg-slate-100 text-slate-600',
            },
            {
              label: 'Available',
              value: counts.available,
              icon: Store,
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              label: 'Occupied',
              value: counts.occupied,
              icon: ShieldCheck,
              color: 'bg-indigo-50 text-indigo-600',
            },
            {
              label: 'Maintenance',
              value: counts.maintenance,
              icon: Wrench,
              color: 'bg-amber-50 text-amber-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-500">
                  {label}
                </span>
                <span className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                {loaded ? value : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* Directory */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Unit directory
                </h2>
              </div>

              <span aria-live="polite" className="text-xs text-slate-400">
                {loading
                  ? 'Refreshing…'
                  : loaded
                  ? `${visibleShops.length} matching units`
                  : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px]">
              <div className="relative sm:col-span-2 xl:col-span-1">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />

                <input
                  type="search"
                  aria-label="Search shops"
                  placeholder="Search shop, floor, zone or type..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">All statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
              </select>

              <select
                aria-label="Filter by floor"
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">All floors</option>
                {FLOORS.map((floor) => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>

          {/* Initial loading */}
          {!loaded && loading ? (
            <div role="status" className="space-y-3 p-5">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
              <span className="sr-only">Loading shops...</span>
            </div>
          ) : !pageShops.length ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
                <Store className="h-7 w-7" />
              </span>

              <h3 className="font-bold text-slate-800">
                {!loaded
                  ? 'Could not load shops'
                  : hasFilters
                  ? 'No matching units'
                  : 'Your unit directory starts here'}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {!loaded
                  ? 'Refresh to try loading your records again.'
                  : hasFilters
                  ? 'Try a different search or clear your filters.'
                  : 'Add your first shop to start managing availability and agreements.'}
              </p>

              <button
                type="button"
                disabled={busy || loading}
                onClick={
                  !loaded
                    ? loadShops
                    : hasFilters
                    ? clearFilters
                    : () => openForm()
                }
                className={`${secondaryButton} mt-5`}
              >
                {!loaded ? 'Try again' : hasFilters ? 'Clear filters' : 'Add first shop'}
              </button>
            </div>
          ) : (
            <>
              {/* Mobile and tablet cards */}
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {pageShops.map((shop) => (
                  <article
                    key={shop._id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Store className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-slate-900">
                            {shop.shopNumber}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {shop.floor}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={shop.status} />
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-xs text-slate-400">Property type</dt>
                        <dd className="mt-1 font-medium text-slate-700">
                          {shop.type}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-slate-400">Area</dt>
                        <dd className="mt-1 font-medium text-slate-700">
                          {formatSize(shop.sizeSqFt)} sq. ft
                        </dd>
                      </div>

                      <div className="col-span-2">
                        <dt className="text-xs text-slate-400">Utility zone</dt>
                        <dd className="mt-1 break-words text-slate-600">
                          {shop.utilityZone || '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      {renderActions(shop)}
                      {shop.status === 'Occupied' && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Occupied units cannot be deleted.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Unit', 'Floor & zone', 'Area', 'Property type', 'Status', 'Actions'].map(
                        (title) => (
                          <th
                            key={title}
                            scope="col"
                            className="whitespace-nowrap px-5 py-4 font-semibold"
                          >
                            {title}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {pageShops.map((shop) => (
                      <tr key={shop._id} className="transition-colors hover:bg-indigo-50/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <Store className="h-4 w-4" />
                            </span>
                            <span className="max-w-[160px] break-words font-bold text-slate-900">
                              {shop.shopNumber}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">{shop.floor}</p>
                          <p className="mt-1 max-w-[200px] break-words text-xs text-slate-400">
                            {shop.utilityZone || '—'}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="font-medium">{formatSize(shop.sizeSqFt)}</span>
                          <span className="ml-1 text-xs text-slate-400">sq. ft</span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">{shop.type}</td>

                        <td className="px-5 py-4">
                          <StatusBadge status={shop.status} />
                        </td>

                        <td className="px-5 py-4">{renderActions(shop)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5">
                <p className="text-xs text-slate-500">
                  Showing{' '}
                  <strong className="text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, visibleShops.length)}
                  </strong>
                  {' '}of {visibleShops.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    className={`${secondaryButton} px-3`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-2 text-xs text-slate-500">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(currentPage + 1)}
                    className={`${secondaryButton} px-3`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Add / edit modal */}
        {isModalOpen && (
          <Modal
            title={editingShop ? 'Edit unit details' : 'Add a new unit'}
            description={
              editingShop
                ? 'Update the property details below.'
                : 'Create a shop, office or storage unit in your plaza.'
            }
            icon={editingShop ? Pencil : Store}
            busy={busy}
            onClose={closeForm}
          >
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
                {formError && (
                  <div className="mb-5">
                    <Notice>{formError}</Notice>
                  </div>
                )}

                <fieldset disabled={busy} className="min-w-0 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Shop / unit number" required>
                      <input
                        name="shopNumber"
                        placeholder="e.g. GF-01"
                        value={formData.shopNumber}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Floor" required>
                      <select
                        name="floor"
                        value={formData.floor}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        {FLOORS.map((floor) => (
                          <option key={floor} value={floor}>{floor}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Area in square feet" required>
                      <input
                        type="number"
                        inputMode="decimal"
                        name="sizeSqFt"
                        min="0"
                        step="any"
                        placeholder="e.g. 450"
                        value={formData.sizeSqFt}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Property type">
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        {TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Utility zone">
                    <input
                      name="utilityZone"
                      placeholder="e.g. Main Corridor Line A"
                      value={formData.utilityZone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  {editingShop?.status === 'Occupied' ? (
                    <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">
                          Occupied unit
                        </p>
                        <p className="mt-1 text-xs leading-5 text-indigo-700">
                          You can edit the details. Terminate the active
                          agreement to release this unit.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Field label="Availability">
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="Available">Available</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>

                      <span className="mt-2 block text-xs leading-5 text-slate-400">
                        Creating an agreement marks the unit as Occupied.
                      </span>
                    </Field>
                  )}
                </fieldset>
              </div>

              <div
                className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
                style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeForm}
                  className={`${secondaryButton} flex-1 sm:flex-none`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className={`${primaryButton} flex-1 sm:flex-none`}
                >
                  {busy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {busy ? 'Saving…' : editingShop ? 'Save changes' : 'Create unit'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete confirmation */}
        {deletingShop && (
          <Modal
            title="Delete this unit?"
            description="Review the unit before confirming."
            icon={Trash2}
            danger
            busy={busy}
            onClose={closeDelete}
          >
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              {deleteError && (
                <div className="mb-4">
                  <Notice>{deleteError}</Notice>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="break-words font-bold text-slate-900">
                  {deletingShop.shopNumber}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {deletingShop.floor} · {deletingShop.type}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                This permanently removes the unit. Units with agreement or
                payment history cannot be deleted.
              </p>
            </div>

            <div
              className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                disabled={busy}
                onClick={closeDelete}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Keep unit
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className={`${buttonClass} flex-1 bg-rose-600 text-white hover:bg-rose-700 sm:flex-none`}
              >
                {busy ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {busy ? 'Deleting…' : 'Delete unit'}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}