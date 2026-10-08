import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  Users,
  UserCheck,
  UserPlus,
  FileText,
  Search,
  Plus,
  X,
  RefreshCw,
  Trash2,
  BarChart3,
  Printer,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  ExternalLink,
  Save,
  Phone,
  MapPin,
} from 'lucide-react';

import {
  fetchTenants,
  createTenant,
  deleteTenant,
  fetchTenantLedger,
  getTenantDocumentUrl,
} from '../services/tenantService';

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const emptyForm = () => ({
  name: '',
  cnic: '',
  phone: '',
  whatsapp: '',
  address: '',
  emergencyContact: '',
  status: 'Active',
});

const fields = [
  ['name', 'Full name', true, 'e.g. Muhammad Ali'],
  ['cnic', 'CNIC number', true, '12345-1234567-1'],
  ['phone', 'Phone number', true, '0300-1234567'],
  ['whatsapp', 'WhatsApp number', false, 'Optional'],
  ['emergencyContact', 'Emergency contact', false, 'Name or contact number'],
];

const documentFields = [
  ['scannedCnic', 'Scanned CNIC'],
  ['businessRegistration', 'Business registration'],
  ['signedContract', 'Signed contract'],
];

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

const money = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const messageOf = (error, fallback) =>
  error.response?.data?.message || fallback;

const initials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'T';

function Badge({ value }) {
  const styles = {
    Active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Inactive: 'border-slate-200 bg-slate-50 text-slate-600',
    Paid: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Partial: 'border-amber-100 bg-amber-50 text-amber-700',
    Unpaid: 'border-rose-100 bg-rose-50 text-rose-700',
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

function Documents({ documents = [] }) {
  if (!documents.length) {
    return <span className="text-xs text-slate-400">No documents</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {documents.map((documentPath, index) => {
        const url = getTenantDocumentUrl(documentPath);

        return url ? (
          <a
            key={`${documentPath}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <FileText className="h-3.5 w-3.5" />
            Doc {index + 1}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span key={index} className="text-xs text-slate-400">
            Document {index + 1}: unavailable link
          </span>
        );
      })}
    </div>
  );
}

function Modal({
  title,
  description,
  icon: Icon = Users,
  busy = false,
  onClose,
  children,
  wide = false,
  printable = false,
  danger = false,
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
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const siblings = Array.from(document.body.children)
      .filter((element) => element !== overlay)
      .map((element) => ({ element, inert: element.inert }));

    siblings.forEach(({ element }) => {
      element.inert = true;
    });

    document.body.style.overflow = 'hidden';
    panel.focus();

    const getFocusable = () =>
      Array.from(panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), ' +
        '[tabindex]:not([tabindex="-1"])'
      )).filter(
        (element) =>
          !element.matches(':disabled') &&
          element.getClientRects().length > 0
      );

    const keyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) closeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusable();

      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);

      if (
        event.shiftKey &&
        (active === first || active === panel || outside)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === panel || outside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusIn = (event) => {
      if (!panel.contains(event.target)) panel.focus();
    };

    document.addEventListener('keydown', keyDown);
    document.addEventListener('focusin', focusIn);

    return () => {
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('focusin', focusIn);
      document.body.style.overflow = previousOverflow;

      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        previousFocus.getClientRects().length > 0 &&
        !previousFocus.matches(':disabled')
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      id={printable ? 'tenant-report-print' : 'tenant-dialog'}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {printable && (
        <style>{`
          @media print {
            html, body {
              height: auto !important;
              overflow: visible !important;
            }

            body > *:not(#tenant-report-print) {
              display: none !important;
            }

            #tenant-report-print {
              display: block !important;
              position: static !important;
              padding: 0 !important;
              background: white !important;
              backdrop-filter: none !important;
            }

            #tenant-report-print .modal-panel,
            #tenant-report-print .modal-scroll {
              display: block !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              border: 0 !important;
              border-radius: 0 !important;
            }

            #tenant-report-print .no-print {
              display: none !important;
            }

            #tenant-report-print .ledger-table {
              display: block !important;
              overflow: visible !important;
            }

            #tenant-report-print .ledger-cards {
              display: none !important;
            }

            #tenant-report-print table {
              width: 100% !important;
              font-size: 10px !important;
            }

            #tenant-report-print th,
            #tenant-report-print td {
              padding: 7px 4px !important;
              white-space: normal !important;
              overflow-wrap: anywhere;
            }

            #tenant-report-print thead {
              display: table-header-group;
            }

            #tenant-report-print tr {
              break-inside: avoid;
            }

            #tenant-report-print .print-stats {
              display: grid !important;
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        `}</style>
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-dialog-title"
        aria-describedby="tenant-dialog-description"
        aria-busy={busy}
        tabIndex={-1}
        className={`modal-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:rounded-2xl ${
          wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
          }`}>
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="tenant-dialog-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p id="tenant-dialog-description" className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
            className="no-print flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
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

function ModalFooter({ children }) {
  return (
    <div
      className="no-print flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  );
}

function TenantReport({ tenant, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mounted = useRef(false);
  const sequence = useRef(0);
  const printing = useRef(false);

  const loadReport = useCallback(async () => {
    if (!mounted.current || printing.current) return;

    const request = ++sequence.current;

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
        throw new Error('Invalid report response');
      }

      if (mounted.current && request === sequence.current) {
        setReport(response.data);
      }
    } catch (err) {
      if (mounted.current && request === sequence.current) {
        setError(messageOf(err, 'Could not load the tenant report.'));
      }
    } finally {
      if (mounted.current && request === sequence.current) {
        setLoading(false);
      }
    }
  }, [tenant._id]);

  useEffect(() => {
    mounted.current = true;
    loadReport();

    const refresh = () => {
      if (!printing.current) loadReport();
    };

    const visible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const beforePrint = () => { printing.current = true; };
    const afterPrint = () => { printing.current = false; };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-finances-updated', refresh);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    document.addEventListener('visibilitychange', visible);

    return () => {
      mounted.current = false;
      sequence.current += 1;

      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-finances-updated', refresh);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [loadReport]);

  const printReport = () => {
    if (!report || loading) return;

    printing.current = true;
    try {
      window.print();
    } catch {
      printing.current = false;
      setError('Could not open the print dialog. Please try again.');
    }
  };

  return (
    <Modal
      title="Tenant report"
      description="All months · Current invoice balances and collections"
      icon={BarChart3}
      onClose={onClose}
      wide
      printable
    >
      <div className="modal-scroll min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={tenant.name} />
              <div className="min-w-0">
                <h3 className="break-words font-bold text-slate-900">{tenant.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{tenant.cnic}</p>
              </div>
            </div>
            <Badge value={tenant.status} />
          </div>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            {[
              ['Phone', tenant.phone],
              ['WhatsApp', tenant.whatsapp],
              ['Emergency contact', tenant.emergencyContact],
              ['Documents', `${tenant.documents?.length || 0} files`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="mt-1 break-words text-slate-700">{value || '—'}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Address</dt>
              <dd className="mt-1 break-words text-slate-700">
                {tenant.permanentAddress || tenant.address || '—'}
              </dd>
            </div>
          </dl>
        </div>

        {loading && (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading current report…
          </div>
        )}

        {error && <Notice>{error}</Notice>}

        {!loading && report && (
          <>
            <div className="print-stats mb-5 grid gap-3 sm:grid-cols-3">
              {[
                ['Total collected', money(report.financialSummary.totalCollected), 'text-emerald-700'],
                ['Outstanding', money(report.financialSummary.totalOutstanding), 'text-amber-700'],
                ['Paid invoices', report.invoicesSummary.paid, 'text-indigo-700'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`mt-2 break-words text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-500">
              {[
                ['Agreements', report.agreementCount],
                ['Invoices', report.invoicesSummary.total],
                ['Partial', report.invoicesSummary.partial],
                ['Unpaid', report.invoicesSummary.unpaid],
              ].map(([label, value]) => (
                <span key={label} className="rounded-lg bg-slate-100 px-3 py-2">
                  {label}: <strong className="text-slate-700">{value}</strong>
                </span>
              ))}
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-900">Invoice history</h3>

            {!report.paymentHistory.length ? (
              <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                No invoices found.
              </p>
            ) : (
              <>
                <div className="ledger-cards space-y-3 sm:hidden">
                  {report.paymentHistory.map((invoice, index) => (
                    <div
                      key={invoice.invoiceId || invoice.id || index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold">{invoice.invoiceNumber}</p>
                          <p className="mt-1 text-xs text-slate-500">{invoice.monthYear}</p>
                        </div>
                        <Badge value={invoice.status} />
                      </div>

                      <dl className="mt-4 space-y-2 text-xs">
                        {[
                          ['Total', invoice.totalAmount],
                          ['Paid', invoice.paidAmount],
                          ['Balance', invoice.balanceDue],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3">
                            <dt className="text-slate-500">{label}</dt>
                            <dd className="font-semibold">{money(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="ledger-table hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        {['Month', 'Invoice', 'Total', 'Paid', 'Balance', 'Status'].map(
                          (label) => <th scope="col" key={label} className="p-3">{label}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.paymentHistory.map((invoice, index) => (
                        <tr key={invoice.invoiceId || invoice.id || index}>
                          <td className="p-3">{invoice.monthYear}</td>
                          <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                          <td className="whitespace-nowrap p-3">{money(invoice.totalAmount)}</td>
                          <td className="whitespace-nowrap p-3 text-emerald-700">{money(invoice.paidAmount)}</td>
                          <td className="whitespace-nowrap p-3">{money(invoice.balanceDue)}</td>
                          <td className="p-3"><Badge value={invoice.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ModalFooter>
        <button
          type="button"
          disabled={loading}
          onClick={loadReport}
          className={`${secondaryButton} flex-1 sm:flex-none`}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          disabled={loading || !report || Boolean(error)}
          onClick={printReport}
          className={`${primaryButton} flex-1 sm:flex-none`}
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </ModalFooter>
    </Modal>
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
  const [deleteError, setDeleteError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Only one dialog is open at a time.
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState({});

  const mounted = useRef(false);
  const requestId = useRef(0);
  const actionLock = useRef(false);

  const loadTenants = useCallback(async () => {
    if (!mounted.current) return;

    const current = ++requestId.current;
    setLoading(true);
    setError('');

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
        setError(messageOf(err, 'Could not refresh tenants. Please try again.'));
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

  const counts = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'Active').length,
    inactive: tenants.filter((tenant) => tenant.status === 'Inactive').length,
    documented: tenants.filter((tenant) => tenant.documents?.length > 0).length,
  }), [tenants]);

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
        tenant.permanentAddress || tenant.address,
      ].filter(Boolean).join(' ').toLowerCase();

      const numericMatch =
        /^[\d\s+-]+$/.test(query) &&
        digits.length > 0 &&
        [tenant.cnic, tenant.phone, tenant.whatsapp].some(
          (value) => String(value || '').replace(/\D/g, '').includes(digits)
        );

      return text.includes(query) || numericMatch;
    });
  }, [tenants, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageTenants = filteredTenants.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const hasFilters = Boolean(search || statusFilter);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  useEffect(() => {
    setPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  };

  const closeDialog = () => {
    if (!actionLock.current) setDialog(null);
  };

  const openForm = () => {
    if (actionLock.current) return;
    setForm(emptyForm());
    setFiles({});
    setFormError('');
    setSuccess('');
    setDialog({ type: 'create' });
  };

  const chooseFile = (event, key) => {
    const file = event.target.files?.[0] || null;
    setFormError('');

    if (
      file &&
      (!/\.(pdf|jpe?g|png)$/i.test(file.name) || file.size > MAX_FILE_SIZE)
    ) {
      event.target.value = '';
      setFiles((previous) => ({ ...previous, [key]: null }));
      setFormError('Choose a PDF, JPG or PNG file no larger than 5 MB.');
      return;
    }

    setFiles((previous) => ({ ...previous, [key]: file }));
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

        setDialog(null);
        setForm(emptyForm());
        setFiles({});
        setSuccess(response.message || 'Tenant added successfully.');
      }

      await loadTenants();
    } catch (err) {
      const uncertain = !err.response || err.response.status >= 500;

      if (mounted.current) {
        if (uncertain) setDialog(null);
        else setFormError(messageOf(err, 'Could not add tenant.'));
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

  const confirmDelete = async () => {
    if (actionLock.current || dialog?.type !== 'delete') return;

    const tenant = dialog.tenant;

    actionLock.current = true;
    requestId.current += 1;
    setBusy(true);
    setDeleteError('');
    setError('');
    setSuccess('');

    try {
      const response = await deleteTenant(tenant._id);

      if (mounted.current) {
        setTenants((previous) =>
          previous.filter((item) => item._id !== tenant._id)
        );
        setDialog(null);
        setSuccess(response.message || 'Tenant deleted successfully.');
      }

      await loadTenants();
    } catch (err) {
      const uncertain = !err.response || err.response.status >= 500;
      const message = uncertain
        ? 'Delete confirmation was not received. Check the refreshed list before retrying.'
        : messageOf(err, 'Could not delete tenant.');

      await loadTenants();

      if (mounted.current) {
        if (uncertain) {
          setDialog(null);
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

  const actions = (tenant) => (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => setDialog({ type: 'report', tenant })}
        aria-label={`View report for ${tenant.name}`}
        className={`${buttonClass} flex-1 bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100 lg:flex-none`}
      >
        <BarChart3 className="h-4 w-4" />
        Report
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setDeleteError('');
          setDialog({ type: 'delete', tenant });
        }}
        aria-label={`Delete tenant ${tenant.name}`}
        className={`${buttonClass} bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
      >
        <Trash2 className="h-4 w-4" />
        <span className="lg:sr-only">Delete</span>
      </button>
    </div>
  );

  const reportTenant = dialog?.type === 'report'
    ? tenants.find((tenant) => tenant._id === dialog.tenant._id) || dialog.tenant
    : null;

  return (
    <div className="min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Property Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Tenant directory
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Profiles, documents and payment records in one place.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || loading}
              onClick={loadTenants}
              className={secondaryButton}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="sr-only sm:not-sr-only">Refresh</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={openForm}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              Add tenant
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
          <Notice success onDismiss={() => setSuccess('')}>{success}</Notice>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ['Total tenants', counts.total, Users, 'bg-indigo-50 text-indigo-600'],
            ['Active profiles', counts.active, UserCheck, 'bg-emerald-50 text-emerald-600'],
            ['Inactive profiles', counts.inactive, Users, 'bg-slate-100 text-slate-500'],
            ['With documents', counts.documented, FileText, 'bg-amber-50 text-amber-600'],
          ].map(([label, value, Icon, color]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <span className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {loaded ? value : '—'}
              </p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Tenant profiles</h2>
              <span aria-live="polite" className="text-xs text-slate-400">
                {loading ? 'Refreshing…' : loaded ? `${filteredTenants.length} matching profiles` : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search tenants"
                  placeholder="Search name, CNIC, phone or address..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter by tenant status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-lg px-2 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Clear filters
              </button>
            )}
          </div>

          {!loaded && loading ? (
            <div role="status" className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />
              ))}
              <span className="sr-only">Loading tenants...</span>
            </div>
          ) : !pageTenants.length ? (
            <div className="px-6 py-16 text-center">
              <Users className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="font-bold text-slate-800">
                {!loaded ? 'Could not load tenants' : hasFilters ? 'No matching profiles' : 'Add your first tenant'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {!loaded ? 'Refresh to try again.' : hasFilters ? 'Try another search or clear your filters.' : 'Keep tenant details and documents together.'}
              </p>
              <button
                type="button"
                disabled={busy || loading}
                onClick={!loaded ? loadTenants : hasFilters ? clearFilters : openForm}
                className={`${secondaryButton} mt-5`}
              >
                {!loaded ? 'Try again' : hasFilters ? 'Clear filters' : 'Add tenant'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {pageTenants.map((tenant) => (
                  <article key={tenant._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={tenant.name} />
                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-slate-900">{tenant.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{tenant.cnic}</p>
                        </div>
                      </div>
                      <Badge value={tenant.status} />
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex gap-2 text-slate-600">
                        <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <div>
                          <p>{tenant.phone}</p>
                          {tenant.whatsapp && <p className="mt-1 text-xs text-emerald-700">WA: {tenant.whatsapp}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 text-slate-500">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <p className="break-words">{tenant.permanentAddress || tenant.address || 'No address recorded'}</p>
                      </div>
                    </div>

                    <div className="my-4 border-t border-slate-100 pt-4">
                      <Documents documents={tenant.documents} />
                    </div>
                    {actions(tenant)}
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Tenant', 'Contact', 'Address', 'Documents', 'Status', 'Actions'].map(
                        (label) => <th key={label} scope="col" className="px-5 py-4">{label}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageTenants.map((tenant) => (
                      <tr key={tenant._id} className="hover:bg-indigo-50/30">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={tenant.name} />
                            <div className="min-w-[120px]">
                              <p className="max-w-[180px] break-words font-semibold text-slate-900">{tenant.name}</p>
                              <p className="mt-1 whitespace-nowrap text-xs text-slate-400">{tenant.cnic}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="whitespace-nowrap">{tenant.phone}</p>
                          {tenant.whatsapp && <p className="mt-1 whitespace-nowrap text-emerald-700">WA: {tenant.whatsapp}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <p className="w-40 break-words text-xs leading-5 text-slate-500">
                            {tenant.permanentAddress || tenant.address || '—'}
                          </p>
                        </td>
                        <td className="min-w-[135px] px-5 py-4">
                          <Documents documents={tenant.documents} />
                        </td>
                        <td className="px-5 py-4"><Badge value={tenant.status} /></td>
                        <td className="px-5 py-4">{actions(tenant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                <p className="text-xs text-slate-500">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredTenants.length)}
                  {' '}of {filteredTenants.length}
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
                  <span className="px-2 text-xs text-slate-500">{currentPage} / {totalPages}</span>
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

        {dialog?.type === 'create' && (
          <Modal
            title="Add a new tenant"
            description="Create a profile and attach optional documents."
            icon={UserPlus}
            busy={busy}
            onClose={closeDialog}
          >
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
                {formError && <div className="mb-5"><Notice>{formError}</Notice></div>}

                <fieldset disabled={busy} className="min-w-0 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fields.map(([name, label, required, placeholder]) => (
                      <label key={name} className={`block min-w-0 ${name === 'name' ? 'sm:col-span-2' : ''}`}>
                        <span className="mb-2 block text-xs font-semibold text-slate-600">
                          {label}{required && <span className="ml-1 text-indigo-500">*</span>}
                        </span>
                        <input
                          name={name}
                          value={form[name]}
                          required={required}
                          type={['phone', 'whatsapp'].includes(name) ? 'tel' : 'text'}
                          placeholder={placeholder}
                          onChange={(event) => {
                            const { name: key, value } = event.target;
                            setForm((previous) => ({ ...previous, [key]: value }));
                          }}
                          className={inputClass}
                        />
                      </label>
                    ))}

                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">Profile status</span>
                      <select
                        value={form.status}
                        onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
                        className={inputClass}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        Permanent address <span className="text-indigo-500">*</span>
                      </span>
                      <textarea
                        required
                        rows={3}
                        value={form.address}
                        placeholder="House, street, area and city"
                        onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
                        className={`${inputClass} resize-y`}
                      />
                    </label>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Documents</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Optional · PDF, JPG or PNG · Maximum 5 MB per file
                      </p>
                    </div>

                    {documentFields.map(([key, label]) => (
                      <label key={key} className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <span className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <Upload className="h-4 w-4 text-indigo-500" />
                          {label}
                        </span>
                        <input
                          type="file"
                          name={key}
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(event) => chooseFile(event, key)}
                          className="block w-full min-w-0 text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700"
                        />
                        {files[key] && (
                          <span className="mt-2 block break-words text-xs text-emerald-700">
                            Selected: {files[key].name}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <ModalFooter>
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeDialog}
                  className={`${secondaryButton} flex-1 sm:flex-none`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`${primaryButton} flex-1 sm:flex-none`}
                >
                  {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {busy ? 'Saving…' : 'Create tenant'}
                </button>
              </ModalFooter>
            </form>
          </Modal>
        )}

        {dialog?.type === 'delete' && (
          <Modal
            title="Delete this tenant?"
            description="Review the profile before confirming."
            icon={Trash2}
            danger
            busy={busy}
            onClose={closeDialog}
          >
            <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
              {deleteError && <div className="mb-4"><Notice>{deleteError}</Notice></div>}

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Avatar name={dialog.tenant.name} />
                <div className="min-w-0">
                  <p className="break-words font-bold text-slate-900">{dialog.tenant.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{dialog.tenant.cnic}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                This removes the tenant profile. Tenants with agreement
                or payment history cannot be deleted.
              </p>
            </div>

            <ModalFooter>
              <button
                type="button"
                disabled={busy}
                onClick={closeDialog}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Keep tenant
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className={`${buttonClass} flex-1 bg-rose-600 text-white hover:bg-rose-700 sm:flex-none`}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {busy ? 'Deleting…' : 'Delete tenant'}
              </button>
            </ModalFooter>
          </Modal>
        )}

        {reportTenant && (
          <TenantReport
            key={reportTenant._id}
            tenant={reportTenant}
            onClose={closeDialog}
          />
        )}
      </div>
    </div>
  );
}