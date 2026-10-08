import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  fetchTenants,
  createTenant,
  deleteTenant,
  fetchTenantLedger,
  getTenantDocumentUrl,
} from '../services/tenantService';

const emptyForm = () => ({
  name: '',
  cnic: '',
  phone: '',
  whatsapp: '',
  address: '',
  emergencyContact: '',
  status: 'Active',
});

const fieldDefinitions = [
  ['name', 'Tenant Full Name', true],
  ['cnic', 'CNIC Number', true],
  ['phone', 'Phone Number', true],
  ['whatsapp', 'WhatsApp Number', false],
  ['address', 'Permanent Address', true],
  ['emergencyContact', 'Emergency Contact', false],
];

const fileDefinitions = [
  ['scannedCnic', 'Scanned CNIC'],
  ['businessRegistration', 'Business Registration'],
  ['signedContract', 'Signed Contract'],
];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';

const buttonClass =
  'rounded-lg border px-3 py-2 text-sm disabled:opacity-50';

const money = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const messageOf = (error, fallback) =>
  error.response?.data?.message || fallback;

function TenantReport({ tenant, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mounted = useRef(false);
  const requestId = useRef(0);

  const loadReport = useCallback(async () => {
    const current = ++requestId.current;

    setLoading(true);
    setError('');
    setReport(null);

    try {
      const response = await fetchTenantLedger(tenant._id);

      if (
        !response.data?.financialSummary ||
        !response.data?.invoicesSummary ||
        !Array.isArray(response.data?.paymentHistory)
      ) {
        throw new Error('Invalid tenant report response');
      }

      if (mounted.current && current === requestId.current) {
        setReport(response.data);
      }
    } catch (err) {
      if (mounted.current && current === requestId.current) {
        setError(
          messageOf(err, 'Could not load the tenant report.')
        );
      }
    } finally {
      if (mounted.current && current === requestId.current) {
        setLoading(false);
      }
    }
  }, [tenant._id]);

  useEffect(() => {
    mounted.current = true;
    loadReport();

    const refresh = () => loadReport();
    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-finances-updated', refresh);
    document.addEventListener('visibilitychange', visible);

    return () => {
      mounted.current = false;
      requestId.current += 1;

      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-finances-updated', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadReport]);

  return createPortal(
    <div
      id="tenant-report-print"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4"
    >
      <style>{`
        @media print {
          body > *:not(#tenant-report-print) {
            display: none !important;
          }

          #tenant-report-print {
            position: static !important;
            overflow: visible !important;
            padding: 0 !important;
            background: white !important;
          }

          #tenant-report-print .report-card {
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          #tenant-report-print .no-print {
            display: none !important;
          }

          #tenant-report-print .report-table {
            overflow: visible !important;
          }

          #tenant-report-print thead {
            display: table-header-group;
          }

          #tenant-report-print tr {
            break-inside: avoid;
          }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-report-title"
        className="report-card mx-auto my-6 max-w-4xl rounded-xl bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="tenant-report-title" className="text-xl font-bold">
            Tenant Report — All Months
          </h2>

          <button
            className={`${buttonClass} no-print`}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mb-5 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="text-lg font-semibold">{tenant.name}</p>
          <p>CNIC: {tenant.cnic}</p>
          <p>Phone: {tenant.phone}</p>
          <p>WhatsApp: {tenant.whatsapp || '—'}</p>
          <p>Emergency Contact: {tenant.emergencyContact || '—'}</p>
          <p>Address: {tenant.permanentAddress || tenant.address || '—'}</p>
          <p>Documents: {tenant.documents?.length || 0}</p>
        </div>

        {loading && <p role="status">Loading current report...</p>}

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && report && (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              {[
                ['Total Collected', money(report.financialSummary.totalCollected)],
                ['Outstanding', money(report.financialSummary.totalOutstanding)],
                ['Paid Invoices', report.invoicesSummary.paid],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-4">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>

            <p className="mb-3 text-sm text-slate-600">
              Agreements: {report.agreementCount} | Invoices:{' '}
              {report.invoicesSummary.total} | Partial:{' '}
              {report.invoicesSummary.partial} | Unpaid:{' '}
              {report.invoicesSummary.unpaid}
            </p>

            <div className="report-table overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {['Month', 'Invoice', 'Total', 'Paid', 'Balance', 'Status'].map(
                      (title) => (
                        <th key={title} className="p-3">{title}</th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {report.paymentHistory.map((invoice, index) => (
                    <tr
                      key={invoice.invoiceId || invoice.id || `${invoice.invoiceNumber}-${index}`}
                      className="border-b"
                    >
                      <td className="p-3">{invoice.monthYear}</td>
                      <td className="p-3">{invoice.invoiceNumber}</td>
                      <td className="p-3">{money(invoice.totalAmount)}</td>
                      <td className="p-3">{money(invoice.paidAmount)}</td>
                      <td className="p-3">{money(invoice.balanceDue)}</td>
                      <td className="p-3">{invoice.status}</td>
                    </tr>
                  ))}

                  {!report.paymentHistory.length && (
                    <tr>
                      <td colSpan={6} className="p-5 text-center">
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="no-print mt-5 flex justify-end gap-2">
          <button
            disabled={loading}
            onClick={loadReport}
            className={buttonClass}
          >
            Refresh Report
          </button>

          <button
            disabled={loading || !report || Boolean(error)}
            onClick={() => window.print()}
            className={`${buttonClass} bg-purple-900 text-white`}
          >
            Print Report
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [reportTenant, setReportTenant] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({});

  const mounted = useRef(false);
  const requestId = useRef(0);
  const actionLock = useRef(false);

  const loadTenants = useCallback(async () => {
    const current = ++requestId.current;

    if (mounted.current) {
      setLoading(true);
      setError('');
    }

    try {
      const response = await fetchTenants();

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid tenants response');
      }

      if (mounted.current && current === requestId.current) {
        setTenants(response.data);
        setLoaded(true);
      }
    } catch (err) {
      if (mounted.current && current === requestId.current) {
        setError(
          messageOf(err, 'Could not refresh tenants. Please try again.')
        );
      }
    } finally {
      if (mounted.current && current === requestId.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadTenants();

    const refresh = () => {
      if (!actionLock.current) loadTenants();
    };

    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-tenants-updated', refresh);
    window.addEventListener('plaza-agreements-updated', refresh);
    document.addEventListener('visibilitychange', visible);

    return () => {
      mounted.current = false;
      requestId.current += 1;

      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-tenants-updated', refresh);
      window.removeEventListener('plaza-agreements-updated', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadTenants]);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');

    return tenants.filter((tenant) => {
      if (statusFilter && tenant.status !== statusFilter) return false;

      const text = [
        tenant.name,
        tenant.cnic,
        tenant.phone,
        tenant.whatsapp,
        tenant.permanentAddress,
      ].filter(Boolean).join(' ').toLowerCase();

      const cnicMatch =
        /^[\d\s-]+$/.test(query) &&
        digits.length > 0 &&
        String(tenant.cnic || '').replace(/\D/g, '').includes(digits);

      return text.includes(query) || cnicMatch;
    });
  }, [tenants, search, statusFilter]);

  const openForm = () => {
    if (actionLock.current) return;

    setForm(emptyForm());
    setFiles({});
    setFormError('');
    setSuccess('');
    setModalOpen(true);
  };

  const closeForm = () => {
    if (!actionLock.current) setModalOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (actionLock.current) return;

    setFormError('');

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setFormError('Name, phone and address are required.');
      return;
    }

    const cnic = form.cnic.replace(/[\s-]/g, '');

    if (!/^\d{13}$/.test(cnic)) {
      setFormError('CNIC must contain 13 digits.');
      return;
    }

    const data = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      data.append(key, key === 'cnic' ? cnic : value.trim());
    });

    Object.values(files).filter(Boolean).forEach((file) => {
      data.append('documents', file);
    });

    actionLock.current = true;
    requestId.current += 1;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await createTenant(data);

      if (mounted.current) {
        if (response.data?._id) {
          setTenants((previous) => [
            response.data,
            ...previous.filter((item) => item._id !== response.data._id),
          ]);
        }

        setModalOpen(false);
        setForm(emptyForm());
        setFiles({});
        setSuccess(response.message || 'Tenant added successfully.');
      }

      await loadTenants();
    } catch (err) {
      const uncertain = !err.response || err.response.status >= 500;

      if (mounted.current) {
        if (uncertain) {
          setModalOpen(false);
        } else {
          setFormError(messageOf(err, 'Could not add tenant.'));
        }
      }

      await loadTenants();

      if (mounted.current && uncertain) {
        setError(
          'Save confirmation was not received. Check the tenant list before submitting again.'
        );
      }
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const removeTenant = async (tenant) => {
    if (actionLock.current) return;

    if (!window.confirm(
      `Delete ${tenant.name}? Tenants with agreement or payment history cannot be deleted.`
    )) {
      return;
    }

    actionLock.current = true;
    requestId.current += 1;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const response = await deleteTenant(tenant._id);

      if (mounted.current) {
        setTenants((previous) =>
          previous.filter((item) => item._id !== tenant._id)
        );

        setSuccess(response.message || 'Tenant deleted successfully.');
      }

      await loadTenants();
    } catch (err) {
      const message =
        !err.response || err.response.status >= 500
          ? 'Delete confirmation was not received. Check the refreshed list before retrying.'
          : messageOf(err, 'Could not delete tenant.');

      await loadTenants();
      if (mounted.current) setError(message);
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Tenants Directory
            </h1>
            <p className="text-sm text-slate-500">
              Tenant details, documents and payment reports.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              disabled={busy || loading}
              onClick={loadTenants}
              className={buttonClass}
            >
              Refresh
            </button>

            <button
              disabled={busy}
              onClick={openForm}
              className={`${buttonClass} bg-blue-900 text-white`}
            >
              Add New Tenant
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
            aria-label="Search tenants"
            placeholder="Search name, CNIC, phone or address..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${inputClass} max-w-md`}
          />

          <select
            aria-label="Filter tenant status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`${inputClass} max-w-xs`}
          >
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <p className="mb-3 text-sm text-slate-500" aria-live="polite">
          {loading
            ? 'Loading tenants...'
            : loaded
            ? `Showing ${filteredTenants.length} of ${tenants.length} tenants`
            : 'Tenants have not loaded.'}
        </p>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white">
              <tr>
                {['Name', 'CNIC', 'Contact', 'Address', 'Documents', 'Status', 'Actions'].map(
                  (title) => <th key={title} className="p-4">{title}</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredTenants.map((tenant) => (
                <tr key={tenant._id}>
                  <td className="p-4 font-semibold">{tenant.name}</td>
                  <td className="whitespace-nowrap p-4">{tenant.cnic}</td>

                  <td className="p-4">
                    <div>{tenant.phone}</div>
                    {tenant.whatsapp && (
                      <div className="text-xs text-emerald-700">
                        WA: {tenant.whatsapp}
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    {tenant.permanentAddress || tenant.address || '—'}
                  </td>

                  <td className="p-4">
                    {tenant.documents?.length ? (
                      tenant.documents.map((documentPath, index) => {
                        const url = getTenantDocumentUrl(documentPath);

                        return url ? (
                          <a
                            key={`${documentPath}-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block whitespace-nowrap text-blue-700 underline"
                          >
                            Document {index + 1}
                          </a>
                        ) : (
                          <span key={index} className="block text-slate-500">
                            Document {index + 1}: unavailable link
                          </span>
                        );
                      })
                    ) : 'No documents'}
                  </td>

                  <td className="p-4">{tenant.status}</td>

                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        onClick={() => setReportTenant(tenant)}
                        className={`${buttonClass} text-purple-800`}
                      >
                        Report
                      </button>

                      <button
                        disabled={busy}
                        onClick={() => removeTenant(tenant)}
                        className={`${buttonClass} text-red-700`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filteredTenants.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {loading
                      ? 'Loading...'
                      : !loaded
                      ? 'Unable to load tenants. Please try Refresh.'
                      : tenants.length
                      ? 'No tenants match your filters.'
                      : 'No tenants found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tenant-form-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="tenant-form-title" className="text-xl font-bold">
                  Add Tenant
                </h2>

                <button disabled={busy} onClick={closeForm} className={buttonClass}>
                  Close
                </button>
              </div>

              {formError && (
                <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
                  {formError}
                </div>
              )}

              <form onSubmit={submit}>
                <fieldset disabled={busy} className="space-y-4">
                  {fieldDefinitions.map(([name, label, required]) => (
                    <label key={name} className="block text-sm font-medium">
                      {label}{required ? ' *' : ''}
                      <input
                        name={name}
                        value={form[name]}
                        required={required}
                        type={['phone', 'whatsapp'].includes(name) ? 'tel' : 'text'}
                        placeholder={name === 'cnic' ? '12345-1234567-1' : ''}
                        onChange={(event) => {
                          const { name: key, value } = event.target;
                          setForm((previous) => ({ ...previous, [key]: value }));
                        }}
                        className={inputClass}
                      />
                    </label>
                  ))}

                  <div className="space-y-3 border-t pt-3">
                    <p className="text-sm font-semibold">
                      Optional Documents — Maximum 3 Files
                    </p>

                    {fileDefinitions.map(([name, label]) => (
                      <label key={name} className="block text-sm">
                        {label}
                        <input
                          type="file"
                          name={name}
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            setFiles((previous) => ({ ...previous, [name]: file }));
                          }}
                          className={inputClass}
                        />
                      </label>
                    ))}
                  </div>

                  <label className="block text-sm font-medium">
                    Status
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          status: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>

                  <div className="flex justify-end gap-2 border-t pt-4">
                    <button type="button" onClick={closeForm} className={buttonClass}>
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className={`${buttonClass} bg-blue-900 text-white`}
                    >
                      {busy ? 'Saving...' : 'Save Tenant'}
                    </button>
                  </div>
                </fieldset>
              </form>
            </div>
          </div>
        )}

        {reportTenant && (
          <TenantReport
            key={reportTenant._id}
            tenant={tenants.find((item) => item._id === reportTenant._id) || reportTenant}
            onClose={() => setReportTenant(null)}
          />
        )}
      </div>
    </div>
  );
}