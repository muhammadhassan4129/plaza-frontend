import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  fetchAgreements,
  fetchAgreementFormData,
  createAgreement,
} from '../services/agreementService';

import {
  FileText,
  Plus,
  X,
  Building,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  Store,
  Wallet,
  FileCheck2,
} from 'lucide-react';

// ==================== HELPERS ====================

const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const emptyTenant = {
  tenantId: '',
  tenantName: '',
  tenantCnic: '',
  tenantPhone: '',
  tenantWhatsApp: '',
  tenantAddress: '',
  emergencyContact: '',
};

const initialForm = () => ({
  shopIds: [],
  ...emptyTenant,
  startDate: localDate(),
  endDate: '',
  rentAmount: '',
  securityDeposit: '',
  incrementPercentage: 10,
});

const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const money = (value) =>
  `PKR ${number(value).toLocaleString('en-PK', {
    maximumFractionDigits: 2,
  })}`;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const validAmount = (value, allowZero = true) => {
  if (String(value).trim() === '') return false;

  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0) &&
    Math.abs(amount - roundMoney(amount)) < 0.0000001
  );
};

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const displayDate = (value) =>
  typeof value === 'string' ? value.slice(0, 10) : '—';

const getShops = (agreement) => {
  if (Array.isArray(agreement.shops) && agreement.shops.length) {
    return agreement.shops.filter(Boolean);
  }

  return agreement.shop ? [agreement.shop] : [];
};

const shopLabel = (agreement) =>
  getShops(agreement)
    .map((shop) => `#${shop.shopNumber ?? 'Unavailable'}`)
    .join(', ') || 'Unavailable';

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';

// ==================== STYLES ====================

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white ' +
  'px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-indigo-400 focus:ring-4 ' +
  'focus:ring-indigo-500/10 disabled:bg-slate-50 sm:text-sm';

const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl ' +
  'px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const primaryButton =
  `${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`;

const secondaryButton =
  `${buttonClass} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;

// ==================== SMALL COMPONENTS ====================

function Badge({ value }) {
  const styles = {
    Active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Expired: 'border-rose-100 bg-rose-50 text-rose-700',
    Terminated: 'border-rose-100 bg-rose-50 text-rose-700',
    Pending: 'border-amber-100 bg-amber-50 text-amber-700',
    Inactive: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[value] || styles.Inactive
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value || 'Unknown'}
    </span>
  );
}

function Notice({ children, success = false, onDismiss }) {
  const Icon = success ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        success
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

function Avatar({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
      {initials(name)}
    </span>
  );
}

// ==================== PAGE ====================

const AgreementsPage = () => {
  const [agreements, setAgreements] = useState([]);
  const [availableShops, setAvailableShops] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mounted = useRef(false);
  const saveLock = useRef(false);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    const request = ++requestId.current;

    if (mounted.current) setLoading(true);

    const [agreementResult, formResult] = await Promise.allSettled([
      fetchAgreements(),
      fetchAgreementFormData(),
    ]);

    if (!mounted.current || request !== requestId.current) return;

    const messages = [];

    if (agreementResult.status === 'fulfilled') {
      const response = agreementResult.value;
      const rows = Array.isArray(response) ? response : response?.data;

      if (Array.isArray(rows)) {
        setAgreements(rows);
        setLoaded(true);

        setSelectedAgreement((previous) =>
          previous
            ? rows.find((item) => item._id === previous._id) || null
            : null
        );
      } else {
        messages.push('Invalid agreements response from server.');
      }
    } else {
      messages.push(
        getErrorMessage(
          agreementResult.reason,
          'Could not load agreements'
        )
      );
    }

    if (formResult.status === 'fulfilled') {
      setAvailableShops(formResult.value.availableShops);
      setTenants(formResult.value.tenants);
      setFormReady(true);
    } else {
      setFormReady(false);

      messages.push(
        getErrorMessage(
          formResult.reason,
          'Could not load shops and tenants'
        )
      );
    }

    setError(messages.join(' | '));
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadData();

    const refresh = () => {
      if (!saveLock.current) loadData();
    };

    window.addEventListener('focus', refresh);

    return () => {
      mounted.current = false;
      ++requestId.current;
      window.removeEventListener('focus', refresh);
    };
  }, [loadData]);

  useEffect(() => {
    if (!isModalOpen && !selectedAgreement) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape' || saveLock.current) return;

      setIsModalOpen(false);
      setSelectedAgreement(null);
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isModalOpen, selectedAgreement]);

  const openCreate = () => {
    if (saveLock.current) return;

    setFormData(initialForm());
    setFormError('');
    setSuccessMsg('');
    setIsModalOpen(true);

    loadData();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name !== 'tenantId') {
      setFormData((previous) => ({
        ...previous,
        [name]: value,
      }));
      return;
    }

    if (!value) {
      setFormData((previous) => ({
        ...previous,
        ...emptyTenant,
      }));
      return;
    }

    const tenant = tenants.find((item) => item._id === value);

    if (!tenant) {
      setFormError('Selected tenant is unavailable. Refresh the list.');
      return;
    }

    setFormData((previous) => ({
      ...previous,
      tenantId: value,
      tenantName: tenant.name || '',
      tenantCnic: tenant.cnic || '',
      tenantPhone: tenant.phone || '',
      tenantWhatsApp: tenant.whatsapp || '',
      tenantAddress: tenant.permanentAddress || '',
      emergencyContact: tenant.emergencyContact || '',
    }));
  };

  const toggleShop = (shopId) => {
    setFormData((previous) => ({
      ...previous,
      shopIds: previous.shopIds.includes(shopId)
        ? previous.shopIds.filter((id) => id !== shopId)
        : [...previous.shopIds, shopId],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saveLock.current) return;

    setFormError('');

    if (!formReady || loading) {
      setFormError('Wait for the shop and tenant lists to load.');
      return;
    }

    if (!formData.shopIds.length) {
      setFormError('Please select at least one available shop.');
      return;
    }

    const availableIds = new Set(
      availableShops.map((shop) => shop._id)
    );

    if (formData.shopIds.some((id) => !availableIds.has(id))) {
      setFormError(
        'A selected shop is no longer available. Refresh and select the shops again.'
      );
      return;
    }

    if (formData.tenantId) {
      if (!tenants.some((tenant) => tenant._id === formData.tenantId)) {
        setFormError('Please select an available tenant.');
        return;
      }
    } else if (
      !formData.tenantName.trim() ||
      !formData.tenantCnic.trim() ||
      !formData.tenantPhone.trim()
    ) {
      setFormError('New tenant name, CNIC and phone are required.');
      return;
    }

    if (
      !validDate(formData.startDate) ||
      !validDate(formData.endDate)
    ) {
      setFormError('Please enter valid start and expiry dates.');
      return;
    }

    if (formData.endDate <= formData.startDate) {
      setFormError('Expiry date must be after the start date.');
      return;
    }

    if (!validAmount(formData.rentAmount, false)) {
      setFormError(
        'Monthly rent must be positive with at most 2 decimal places.'
      );
      return;
    }

    if (!validAmount(formData.securityDeposit)) {
      setFormError(
        'Enter a valid security deposit. Enter 0 if there is no deposit.'
      );
      return;
    }

    if (!validAmount(formData.incrementPercentage)) {
      setFormError(
        'Annual increment must be zero or greater, with at most 2 decimal places.'
      );
      return;
    }

    const payload = {
      ...formData,
      shopIds: [...new Set(formData.shopIds)],
      rentAmount: roundMoney(formData.rentAmount),
      securityDeposit: roundMoney(formData.securityDeposit),
      incrementPercentage: roundMoney(formData.incrementPercentage),
    };

    tenantFields.forEach(([field]) => {
      payload[field] = String(payload[field] ?? '').trim();
    });

    saveLock.current = true;
    ++requestId.current;

    setSaving(true);
    setLoading(false);
    setError('');
    setSuccessMsg('');

    try {
      const response = await createAgreement(payload);

      if (!mounted.current) return;

      setIsModalOpen(false);
      setFormData(initialForm());
      setSuccessMsg(
        response.message || 'Agreement created successfully.'
      );

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      const message = getErrorMessage(
        requestError,
        'Could not create agreement'
      );

      if (
        !requestError.response ||
        requestError.response.status >= 500
      ) {
        setIsModalOpen(false);
        await loadData();

        if (mounted.current) {
          setError(
            `${message}. Check the agreement list before submitting again; the agreement may already be saved.`
          );
        }
      } else {
        setFormError(message);
      }
    } finally {
      saveLock.current = false;

      if (mounted.current) setSaving(false);
    }
  };

  const statuses = [...new Set(
    agreements.map((agreement) => agreement.status).filter(Boolean)
  )];

  const filteredAgreements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agreements.filter((agreement) => {
      const matchesStatus =
        !statusFilter || agreement.status === statusFilter;

      const searchableText = [
        shopLabel(agreement),
        agreement.tenant?.name,
        agreement.tenant?.phone,
        agreement.tenant?.cnic,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [agreements, search, statusFilter]);

  // ============ STATE CARDS DATA ============
  const counts = useMemo(() => {
    const active = agreements.filter(
      (item) => item.status === 'Active'
    ).length;

    const shopsRented = agreements.reduce(
      (sum, item) => sum + getShops(item).length,
      0
    );

    const monthlyRevenue = agreements
      .filter((item) => item.status === 'Active')
      .reduce(
        (sum, item) =>
          sum + number(item.monthlyRent ?? item.rentAmount),
        0
      );

    return {
      total: agreements.length,
      active,
      shopsRented,
      monthlyRevenue,
    };
  }, [agreements]);

  const tenantFields = [
    ['tenantName', 'Tenant Full Name', true, 'text'],
    ['tenantCnic', 'CNIC Number', true, 'text'],
    ['tenantPhone', 'Phone Number', true, 'tel'],
    ['tenantWhatsApp', 'WhatsApp', false, 'tel'],
    ['tenantAddress', 'Permanent Address', false, 'text'],
    ['emergencyContact', 'Emergency Contact', false, 'tel'],
  ];

  return (
    <div className="min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Property Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lease agreements
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage tenants, commercial units and lease details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || saving}
              onClick={loadData}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span className="sr-only sm:not-sr-only">Refresh</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={openCreate}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              New agreement
            </button>
          </div>
        </div>

        {error && (
          <Notice onDismiss={() => setError('')}>{error}</Notice>
        )}
        {successMsg && (
          <Notice success onDismiss={() => setSuccessMsg('')}>
            {successMsg}
          </Notice>
        )}

        {/* ============ STATE CARDS ============ */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            [
              'Total agreements',
              counts.total,
              FileText,
              'bg-indigo-50 text-indigo-600',
            ],
            [
              'Active leases',
              counts.active,
              FileCheck2,
              'bg-emerald-50 text-emerald-600',
            ],
            [
              'Shops rented',
              counts.shopsRented,
              Store,
              'bg-amber-50 text-amber-600',
            ],
            [
              'Monthly revenue',
              money(counts.monthlyRevenue),
              Wallet,
              'bg-violet-50 text-violet-600',
            ],
          ].map(([label, value, Icon, color]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">
                  {label}
                </p>
                <span className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                {loaded ? value : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* ============ LIST SECTION ============ */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                All agreements
              </h2>
              <span
                aria-live="polite"
                className="text-xs text-slate-400"
              >
                {loading
                  ? 'Refreshing…'
                  : loaded
                    ? `${filteredAgreements.length} matching`
                    : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search agreements"
                  placeholder="Search tenant, CNIC, phone or shop..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter agreement status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className={inputClass}
              >
                <option value="">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!loaded && loading ? (
            <div role="status" className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
              <span className="sr-only">Loading agreements...</span>
            </div>
          ) : !filteredAgreements.length ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="font-bold text-slate-800">
                {!loaded
                  ? 'Could not load agreements'
                  : 'No agreements found'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {!loaded
                  ? 'Refresh to try again.'
                  : 'Create your first lease agreement to get started.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {filteredAgreements.map((agreement) => (
                  <article
                    key={agreement._id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={agreement.tenant?.name} />
                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-slate-900">
                            {agreement.tenant?.name || 'Unavailable'}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {agreement.tenant?.cnic || '—'}
                          </p>
                        </div>
                      </div>
                      <Badge value={agreement.status} />
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex gap-2 text-slate-600">
                        <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>{shopLabel(agreement)}</span>
                      </div>
                      <div className="flex gap-2 text-slate-500">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>
                          {displayDate(agreement.startDate)} →{' '}
                          {displayDate(agreement.endDate)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-emerald-700 font-semibold">
                        <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {money(
                            agreement.monthlyRent ??
                              agreement.rentAmount
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAgreement(agreement)
                        }
                        className={`${buttonClass} w-full bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100`}
                      >
                        <Printer className="h-4 w-4" />
                        View / Print
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {[
                        'Shops',
                        'Tenant',
                        'Contact',
                        'Lease period',
                        'Monthly rent',
                        'Status',
                        'Action',
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-5 py-4"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAgreements.map((agreement) => (
                      <tr
                        key={agreement._id}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="px-5 py-4 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <Building className="h-4 w-4 text-indigo-600" />
                            {shopLabel(agreement)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={agreement.tenant?.name} />
                            <div className="min-w-[120px]">
                              <p className="max-w-[180px] break-words font-semibold text-slate-900">
                                {agreement.tenant?.name ||
                                  'Unavailable'}
                              </p>
                              <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
                                {agreement.tenant?.cnic || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          <p className="whitespace-nowrap">
                            {agreement.tenant?.phone || '—'}
                          </p>
                          {agreement.tenant?.whatsapp && (
                            <p className="mt-1 whitespace-nowrap text-emerald-700">
                              WA: {agreement.tenant.whatsapp}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs whitespace-nowrap">
                          {displayDate(agreement.startDate)}
                          {' → '}
                          {displayDate(agreement.endDate)}
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-700 whitespace-nowrap">
                          {money(
                            agreement.monthlyRent ??
                              agreement.rentAmount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge value={agreement.status} />
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAgreement(agreement)
                            }
                            className={`${buttonClass} bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100`}
                          >
                            <Printer className="h-4 w-4" />
                            View / Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ==================== CREATE FORM ==================== */}

      {isModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create lease agreement"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:max-w-2xl sm:rounded-2xl">
            <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Create lease agreement
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Select units, tenant and lease terms.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close form"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
                {formError && <Notice>{formError}</Notice>}
                {!formReady && !loading && (
                  <Notice>
                    Shop or tenant data could not be loaded. Close
                    this form and refresh.
                  </Notice>
                )}
                {loading && (
                  <p className="flex items-center gap-2 text-sm text-indigo-700">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Refreshing shops and tenants...
                  </p>
                )}

                <fieldset
                  disabled={saving || loading || !formReady}
                  className="space-y-5"
                >
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-600">
                      Available shops — {formData.shopIds.length}{' '}
                      selected
                    </p>

                    <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                      {!availableShops.length ? (
                        <p className="text-sm text-slate-500">
                          No available shops.
                        </p>
                      ) : (
                        availableShops.map((shop) => (
                          <label
                            key={shop._id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                              formData.shopIds.includes(shop._id)
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.shopIds.includes(
                                shop._id
                              )}
                              onChange={() => toggleShop(shop._id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>
                              Shop #{shop.shopNumber}
                              <span className="block text-xs text-slate-500">
                                {shop.floor} ·{' '}
                                {shop.sizeSqFt ?? '—'} sq ft
                              </span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Existing or new tenant
                    </span>
                    <select
                      name="tenantId"
                      value={formData.tenantId}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Register new tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id}>
                          {tenant.name} —{' '}
                          {tenant.cnic || tenant.phone}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {tenantFields.map(
                      ([name, label, required, type]) => (
                        <label
                          key={name}
                          className={`block min-w-0 ${
                            name === 'tenantName'
                              ? 'sm:col-span-2'
                              : ''
                          }`}
                        >
                          <span className="mb-2 block text-xs font-semibold text-slate-600">
                            {label}
                            {required && !formData.tenantId && (
                              <span className="ml-1 text-indigo-500">
                                *
                              </span>
                            )}
                          </span>
                          <input
                            type={type}
                            name={name}
                            value={formData[name]}
                            onChange={handleChange}
                            required={
                              required && !formData.tenantId
                            }
                            disabled={Boolean(formData.tenantId)}
                            className={inputClass}
                          />
                        </label>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Start date
                      </span>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Expiry date
                      </span>
                      <input
                        type="date"
                        name="endDate"
                        min={formData.startDate || undefined}
                        value={formData.endDate}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Combined monthly rent
                      </span>
                      <input
                        type="number"
                        name="rentAmount"
                        min="0.01"
                        step="0.01"
                        value={formData.rentAmount}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Security deposit
                      </span>
                      <input
                        type="number"
                        name="securityDeposit"
                        min="0"
                        step="0.01"
                        value={formData.securityDeposit}
                        onChange={handleChange}
                        required
                        placeholder="0 if none"
                        className={inputClass}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Annual increment (%)
                      </span>
                      <input
                        type="number"
                        name="incrementPercentage"
                        min="0"
                        step="0.01"
                        value={formData.incrementPercentage}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <p className="text-xs text-slate-500">
                    Monthly rent is the combined amount for all
                    selected shops.
                  </p>
                </fieldset>
              </div>

              <div
                className="flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
                style={{
                  paddingBottom:
                    'max(1rem, env(safe-area-inset-bottom))',
                }}
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className={`${secondaryButton} flex-1 sm:flex-none`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!availableShops.length || saving}
                  className={`${primaryButton} flex-1 sm:flex-none`}
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {saving ? 'Saving…' : 'Save agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ==================== PRINT PREVIEW ==================== */}

      {selectedAgreement && createPortal(
        <div
          id="agreement-print-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Agreement preview"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <style>{`
            @media print {
              @page { size: A4; margin: 16mm; }

              body > :not(#agreement-print-preview) {
                display: none !important;
              }

              html, body {
                height: auto !important;
                overflow: visible !important;
                background: white !important;
              }

              #agreement-print-preview {
                display: block !important;
                position: static !important;
                background: white !important;
                padding: 0 !important;
                backdrop-filter: none !important;
              }

              #agreement-print-preview .agreement-document {
                width: 100% !important;
                max-width: none !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }

              #agreement-print-preview .no-print {
                display: none !important;
              }

              #agreement-print-preview .signatures {
                break-inside: avoid;
              }
            }
          `}</style>

          <div className="agreement-document flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl">
            <div className="no-print flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Printer className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  Agreement preview
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Review and print the lease deed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAgreement(null)}
                aria-label="Close preview"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8">
              <div className="space-y-5 text-sm leading-relaxed text-slate-800">
                <h2 className="text-center text-lg font-bold">
                  COMMERCIAL COMPOSITE RENTAL DEED
                </h2>

                <p>
                  This agreement is between Khalil Plaza (First
                  Party) and{' '}
                  <strong>
                    {selectedAgreement.tenant?.name || 'Unavailable'}
                  </strong>{' '}
                  (CNIC:{' '}
                  {selectedAgreement.tenant?.cnic || 'Unavailable'}),
                  hereinafter referred to as the Tenant.
                </p>

                <div className="space-y-3">
                  <p>
                    <strong>Rented Commercial Units:</strong>{' '}
                    {getShops(selectedAgreement)
                      .map(
                        (shop) =>
                          `Shop #${
                            shop.shopNumber ?? 'Unavailable'
                          }${
                            shop.floor != null
                              ? ` (${shop.floor})`
                              : ''
                          }`
                      )
                      .join(', ') || 'Unavailable'}
                  </p>

                  <p>
                    <strong>Lease Duration:</strong>{' '}
                    {displayDate(selectedAgreement.startDate)}
                    {' to '}
                    {displayDate(selectedAgreement.endDate)}
                  </p>

                  <p>
                    <strong>Combined Monthly Rent:</strong>{' '}
                    {money(
                      selectedAgreement.monthlyRent ??
                        selectedAgreement.rentAmount
                    )}
                  </p>

                  <p>
                    <strong>Security Deposit:</strong>{' '}
                    {money(selectedAgreement.securityDeposit)}{' '}
                    (Refundable)
                  </p>

                  <p>
                    <strong>Annual Rent Escalation:</strong>{' '}
                    {number(
                      selectedAgreement.incrementPercentage
                    )}
                    % after every 12 months.
                  </p>

                  <p>
                    <strong>Tenant Phone:</strong>{' '}
                    {selectedAgreement.tenant?.phone || '—'}
                  </p>
                </div>

                <p>
                  <strong>Terms &amp; Conditions:</strong> The tenant
                  is authorized to combine these commercial units for
                  unified office/showroom operations, maintain
                  utility payments on time, and clear dues monthly.
                </p>

                <div className="signatures grid grid-cols-2 gap-8 pt-16 text-center">
                  <div className="border-t border-slate-400 pt-3">
                    <p className="font-bold">
                      Khalil Plaza Authority
                    </p>
                    <p className="mt-2 text-xs">Signature / Date</p>
                  </div>

                  <div className="border-t border-slate-400 pt-3">
                    <p className="font-bold">
                      {selectedAgreement.tenant?.name || 'Tenant'}
                    </p>
                    <p className="mt-2 text-xs">Signature / Date</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedAgreement(null)}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className={`${primaryButton} flex-1 sm:flex-none`}
              >
                <Printer className="h-4 w-4" />
                Print agreement
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AgreementsPage;