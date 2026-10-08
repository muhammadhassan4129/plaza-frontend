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

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 ' +
  'bg-white text-sm focus:outline-none focus:ring-2 ' +
  'focus:ring-blue-900 disabled:bg-slate-100 disabled:text-slate-500';

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 ' +
  'rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm ' +
  'font-medium disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 ' +
  'rounded-xl border border-slate-300 text-slate-700 text-sm ' +
  'hover:bg-slate-100 disabled:opacity-50';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase text-slate-600 mb-2">
      {label}
    </span>
    {children}
  </label>
);

const Alert = ({ children, success = false }) => (
  <div
    role={success ? 'status' : 'alert'}
    className={`p-4 rounded-xl border text-sm ${
      success
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-red-50 border-red-200 text-red-700'
    }`}
  >
    {children}
  </div>
);

const tenantFields = [
  ['tenantName', 'Tenant Full Name', true, 'text'],
  ['tenantCnic', 'CNIC Number', true, 'text'],
  ['tenantPhone', 'Phone Number', true, 'tel'],
  ['tenantWhatsApp', 'WhatsApp', false, 'tel'],
  ['tenantAddress', 'Permanent Address', false, 'text'],
  ['emergencyContact', 'Emergency Contact', false, 'tel'],
];

// ==================== PAGE ====================

const AgreementsPage = () => {
  const [agreements, setAgreements] = useState([]);
  const [availableShops, setAvailableShops] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [loading, setLoading] = useState(false);
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

    // Refresh shop availability before a new agreement is submitted.
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

    for (const [field] of tenantFields) {
      payload[field] = String(payload[field] ?? '').trim();
    }

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
        // A lost response does not prove that creation failed.
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-900" />
            Lease Agreements & Tenant Onboarding
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Manage tenants, commercial units and lease details.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading || saving}
            className={secondaryClass}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>

          <button
            onClick={openCreate}
            disabled={saving}
            className={buttonClass}
          >
            <Plus className="w-4 h-4" />
            New Agreement
          </button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}
      {successMsg && <Alert success>{successMsg}</Alert>}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tenant, CNIC, phone or shop..."
            aria-label="Search agreements"
            className={`${inputClass} pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter agreement status"
          className={`${inputClass} sm:max-w-[200px]`}
        >
          <option value="">All Statuses</option>

          {statuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <span className="text-sm text-slate-500">
          {filteredAgreements.length} agreement(s)
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white text-xs uppercase">
              <tr>
                {[
                  'Shops',
                  'Tenant',
                  'Phone / CNIC',
                  'Lease Period',
                  'Monthly Rent',
                  'Status',
                  'Action',
                ].map((heading) => (
                  <th key={heading} className="px-4 py-4 whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!filteredAgreements.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {loading ? 'Loading agreements...' : 'No agreements found.'}
                  </td>
                </tr>
              ) : (
                filteredAgreements.map((agreement) => (
                  <tr key={agreement._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-900" />
                        {shopLabel(agreement)}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {agreement.tenant?.name || 'Unavailable'}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-600">
                      <div>{agreement.tenant?.phone || '—'}</div>
                      <div className="mt-1">{agreement.tenant?.cnic || '—'}</div>
                    </td>

                    <td className="px-4 py-4 text-xs whitespace-nowrap">
                      {displayDate(agreement.startDate)}
                      {' → '}
                      {displayDate(agreement.endDate)}
                    </td>

                    <td className="px-4 py-4 font-bold text-emerald-700 whitespace-nowrap">
                      {money(agreement.monthlyRent ?? agreement.rentAmount)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          agreement.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {agreement.status || '—'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => setSelectedAgreement(agreement)}
                        className="text-blue-900 bg-blue-50 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap"
                      >
                        View / Print
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CREATE FORM ==================== */}

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create lease agreement"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold">Create Lease Agreement</h3>

              <button
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && <Alert>{formError}</Alert>}
              {!formReady && !loading && (
                <Alert>Shop or tenant data could not be loaded. Close this form and refresh.</Alert>
              )}
              {loading && (
                <p className="text-sm text-blue-800">Refreshing shops and tenants...</p>
              )}

              <fieldset disabled={saving || loading || !formReady} className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-600 mb-2">
                    Select Available Shops — {formData.shopIds.length} selected
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 p-3 rounded-xl">
                    {!availableShops.length ? (
                      <p className="text-sm text-slate-500">
                        No available shops.
                      </p>
                    ) : (
                      availableShops.map((shop) => (
                        <label
                          key={shop._id}
                          className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={formData.shopIds.includes(shop._id)}
                            onChange={() => toggleShop(shop._id)}
                          />
                          <span>
                            Shop #{shop.shopNumber}
                            <span className="block text-xs text-slate-500">
                              {shop.floor} · {shop.sizeSqFt ?? '—'} sq ft
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <Field label="Existing or New Tenant">
                  <select
                    name="tenantId"
                    value={formData.tenantId}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Register New Tenant</option>

                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name} — {tenant.cnic || tenant.phone}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tenantFields.map(([name, label, required, type]) => (
                    <Field key={name} label={label}>
                      <input
                        type={type}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        required={required && !formData.tenantId}
                        disabled={Boolean(formData.tenantId)}
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Expiry Date">
                    <input
                      type="date"
                      name="endDate"
                      min={formData.startDate || undefined}
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Combined Monthly Rent">
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
                  </Field>

                  <Field label="Security Deposit">
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
                  </Field>

                  <Field label="Annual Increment (%)">
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
                  </Field>
                </div>

                <p className="text-xs text-slate-500">
                  Monthly rent is the combined amount for all selected shops.
                </p>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={secondaryClass}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={!availableShops.length}
                    className={buttonClass}
                  >
                    {saving ? 'Saving...' : 'Save Agreement'}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* Portal keeps print output separate from the app/sidebar. */}

      {selectedAgreement && createPortal(
        <div
          id="agreement-print-preview"
          role="dialog"
          aria-modal="true"
          aria-label="Agreement preview"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
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

          <div className="agreement-document bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
            <div className="no-print flex justify-between items-center gap-4 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Agreement Preview
              </h2>

              <button
                onClick={() => setSelectedAgreement(null)}
                aria-label="Close preview"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="py-6 text-sm text-slate-800 leading-relaxed space-y-5">
              <h2 className="text-center font-bold text-lg">
                COMMERCIAL COMPOSITE RENTAL DEED
              </h2>

              <p>
                This agreement is between Plaza Management (First Party)
                and <strong>{selectedAgreement.tenant?.name || 'Unavailable'}</strong>
                {' '}(CNIC: {selectedAgreement.tenant?.cnic || 'Unavailable'}),
                hereinafter referred to as the Tenant.
              </p>

              <div className="space-y-3">
                <p>
                  <strong>Rented Commercial Units:</strong>{' '}
                  {getShops(selectedAgreement).map((shop) =>
                    `Shop #${shop.shopNumber ?? 'Unavailable'}${
                      shop.floor != null ? ` (${shop.floor})` : ''
                    }`
                  ).join(', ') || 'Unavailable'}
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
                  {money(selectedAgreement.securityDeposit)} (Refundable)
                </p>

                <p>
                  <strong>Annual Rent Escalation:</strong>{' '}
                  {number(selectedAgreement.incrementPercentage)}%
                  {' after every 12 months.'}
                </p>

                <p>
                  <strong>Tenant Phone:</strong>{' '}
                  {selectedAgreement.tenant?.phone || '—'}
                </p>
              </div>

              <p>
                <strong>Terms & Conditions:</strong>{' '}
                The tenant is authorized to combine these commercial units
                for unified office/showroom operations, maintain utility
                payments on time, and clear dues monthly.
              </p>

              <div className="signatures grid grid-cols-2 gap-8 pt-16 text-center">
                <div className="border-t border-slate-400 pt-3">
                  <p className="font-bold">Plaza Management Authority</p>
                  <p className="text-xs mt-2">Signature / Date</p>
                </div>

                <div className="border-t border-slate-400 pt-3">
                  <p className="font-bold">
                    {selectedAgreement.tenant?.name || 'Tenant'}
                  </p>
                  <p className="text-xs mt-2">Signature / Date</p>
                </div>
              </div>
            </div>

            <div className="no-print flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                onClick={() => window.print()}
                className={buttonClass}
              >
                <Printer className="w-4 h-4" />
                Print Agreement
              </button>

              <button
                onClick={() => setSelectedAgreement(null)}
                className={secondaryClass}
              >
                Close
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