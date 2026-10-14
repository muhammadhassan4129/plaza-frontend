import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  fetchInvoices,
  createInvoice,
  updateInvoice,
  updateInvoicePayment,
  deleteInvoice,
} from '../services/invoiceService';

import { fetchAgreements } from '../services/agreementService';

import {
  Plus,
  Trash2,
  X,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building,
  RefreshCw,
  Search,
  Wallet,
  Clock,
  FileText,
  Pencil,
  Save,
  Printer,
  CalendarDays,
} from 'lucide-react';

// ==================== HELPERS ====================

const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const money = (value) =>
  `PKR ${number(value).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const validAmount = (value, allowZero = true) => {
  if (
    !['number', 'string'].includes(typeof value) ||
    String(value).trim() === ''
  ) {
    return false;
  }

  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0) &&
    Math.abs(amount - roundMoney(amount)) < 0.0000001
  );
};

const pakistanDate = (value = new Date()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const currentMonth = () => pakistanDate().slice(0, 7);

const displayDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const monthNames = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const normalizeMonth = (value) => {
  if (typeof value !== 'string') return '';

  const text = value.trim();

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return text;

  const match = text.match(/^([a-z]+)\s+(\d{4})$/i);
  if (!match) return '';

  const index = monthNames.findIndex(
    (month) => month.toLowerCase() === match[1].toLowerCase()
  );

  return index < 0
    ? ''
    : `${match[2]}-${String(index + 1).padStart(2, '0')}`;
};

const monthLabel = (value) => {
  const key = normalizeMonth(value);
  if (!key) return value || '—';

  const [year, month] = key.split('-');
  return `${monthNames[Number(month) - 1]} ${year}`;
};

const idOf = (value) => String(value?._id ?? value ?? '');

const shopsLabel = (agreement) =>
  (agreement?.shops || [])
    .filter(Boolean)
    .map((shop) => `#${shop.shopNumber ?? 'Unavailable'}`)
    .join(', ') || '—';

const tenantName = (invoice) =>
  invoice?.agreement?.tenant?.name || 'Unavailable';

const remaining = (invoice) =>
  roundMoney(
    number(invoice?.totalAmount) - number(invoice?.paidAmount)
  );

const isOverdue = (invoice, today) => {
  const dueDay = invoice.dueDate
    ? pakistanDate(invoice.dueDate)
    : '';

  return remaining(invoice) > 0 && dueDay && dueDay < today;
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const readArray = (response, label) => {
  const rows = Array.isArray(response) ? response : response?.data;

  if (!Array.isArray(rows)) {
    throw new Error(`Invalid ${label} response from server.`);
  }

  return rows;
};

const chargeFields = [
  ['electricityCharges', 'Electricity charges'],
  ['waterCharges', 'Water charges'],
  ['maintenanceFee', 'Maintenance fee'],
  ['lateFine', 'Late fine'],
];

const createFields = [
  ...chargeFields,
  ['previousBalance', 'Opening / previous balance'],
];

const newForm = () => ({
  agreementId: '',
  monthYear: currentMonth(),
  electricityCharges: '0',
  waterCharges: '0',
  maintenanceFee: '0',
  lateFine: '0',
  previousBalance: '0',
});

const printRows = [
  ['rentAmount', 'Monthly rent'],
  ...chargeFields,
  ['previousBalance', 'Opening / previous balance'],
];

// ==================== STYLES ====================

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white ' +
  'px-3.5 py-3 text-base text-slate-900 outline-none transition ' +
  'focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 ' +
  'disabled:bg-slate-50 sm:text-sm';

const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 ' +
  'rounded-xl px-4 py-2.5 text-sm font-semibold transition ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const primaryButton =
  `${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`;

const secondaryButton =
  `${buttonClass} border border-slate-200 bg-white ` +
  'text-slate-600 hover:bg-slate-50';

const successButton =
  `${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`;

const dangerButton =
  `${buttonClass} bg-rose-600 text-white hover:bg-rose-700`;

// ==================== COMPONENTS ====================

function Notice({ children, tone = 'error', onDismiss }) {
  const styles = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={tone === 'success' ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles[tone]}`}
    >
      <Icon className="mt-1 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-6">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded p-1"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Badge({ value }) {
  const styles = {
    Paid: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Partial: 'border-amber-100 bg-amber-50 text-amber-700',
    Unpaid: 'border-rose-100 bg-rose-50 text-rose-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[value] || 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value || 'Unknown'}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function MoneyRow({ label, value, strong = false }) {
  return (
    <div
      className={`flex justify-between gap-4 py-2 text-sm ${
        strong ? 'border-t border-slate-200 pt-3 font-bold' : ''
      }`}
    >
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-900">{money(value)}</span>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div
      className="no-print flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6"
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
}

function Modal({
  title,
  description,
  icon: Icon = Receipt,
  busy,
  onClose,
  printable = false,
  children,
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const optionsRef = useRef({ busy, onClose });

  useEffect(() => {
    optionsRef.current = { busy, onClose };
  }, [busy, onClose]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
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
    panel.focus();

    const focusable = () =>
      Array.from(
        panel.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex="0"]'
        )
      ).filter(
        (element) =>
          !element.matches(':disabled') &&
          element.getClientRects().length > 0
      );

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!optionsRef.current.busy) {
          optionsRef.current.onClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (!elements.length) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (active === first || active === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === panel)
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
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        !previousFocus.matches(':disabled')
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      id={printable ? 'invoice-print-root' : 'invoice-modal-root'}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {printable && (
        <style>{`
          @media print {
            @page { size: A4; margin: 14mm; }

            body > :not(#invoice-print-root) {
              display: none !important;
            }

            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }

            #invoice-print-root {
              display: block !important;
              position: static !important;
              padding: 0 !important;
              background: white !important;
              backdrop-filter: none !important;
            }

            #invoice-print-root .invoice-panel,
            #invoice-print-root .invoice-scroll {
              display: block !important;
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              max-height: none !important;
              overflow: visible !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              padding: 0 !important;
            }

            #invoice-print-root .no-print {
              display: none !important;
            }

            #invoice-print-root .invoice-paper {
              padding: 0 !important;
              font-size: 11px !important;
            }

            #invoice-print-root .invoice-parties {
              grid-template-columns: 1fr 1fr !important;
            }

            #invoice-print-root table {
              width: 100% !important;
              border-collapse: collapse !important;
            }

            #invoice-print-root thead {
              display: table-header-group;
            }

            #invoice-print-root tr,
            #invoice-print-root .avoid-break {
              break-inside: avoid;
            }

            #invoice-print-root * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-busy={Boolean(busy)}
        tabIndex={-1}
        className={`invoice-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-2xl ${
          printable ? 'sm:max-w-3xl' : 'sm:max-w-2xl'
        }`}
      >
        <div className="no-print flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={onClose}
            aria-label="Close dialog"
            className={`${buttonClass} px-2 text-slate-500 hover:bg-slate-100`}
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

function InvoiceDocument({ invoice }) {
  const tenant = invoice.agreement?.tenant;
  const balance = remaining(invoice);

  return (
    <article className="invoice-paper p-6 text-sm text-slate-800 sm:p-9">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b-2 border-indigo-600 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-700">
            <Building className="h-6 w-6" />
            <h1 className="text-2xl font-extrabold tracking-tight">
              KHALIL PLAZA
            </h1>
          </div>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-500">
            Commercial property management
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-extrabold tracking-wide text-slate-900">
            INVOICE
          </p>
          <p className="mt-2 break-all font-mono text-sm text-indigo-700">
            {invoice.invoiceNumber}
          </p>
          <div className="mt-3">
            <Badge value={invoice.status} />
          </div>
        </div>
      </header>

      <div className="invoice-parties grid gap-6 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Billed to
          </p>
          <h2 className="mt-2 break-words text-lg font-bold">
            {tenant?.name || 'Unavailable'}
          </h2>
          <p className="mt-2 text-slate-600">
            CNIC: {tenant?.cnic || '—'}
          </p>
          <p className="mt-1 text-slate-600">
            Phone: {tenant?.phone || '—'}
          </p>
          {tenant?.whatsapp && (
            <p className="mt-1 text-slate-600">
              WhatsApp: {tenant.whatsapp}
            </p>
          )}
          <p className="mt-2 break-words font-semibold">
            Shops: {shopsLabel(invoice.agreement)}
          </p>
        </div>

        <dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {[
            ['Billing month', monthLabel(invoice.monthYear)],
            ['Issued on', displayDate(invoice.createdAt)],
            ['Due date', displayDate(invoice.dueDate)],
            ['Last payment', displayDate(invoice.paymentDate)],
            ['Payment mode', invoice.paymentMode || 'None'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <table className="w-full table-fixed text-left text-sm">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="w-12 px-3 py-3" scope="col">#</th>
            <th className="px-3 py-3" scope="col">Description</th>
            <th className="w-40 px-3 py-3 text-right" scope="col">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {printRows.map(([field, label], index) => (
            <tr key={field} className="border-b border-slate-200">
              <td className="px-3 py-3 text-slate-400">{index + 1}</td>
              <td className="px-3 py-3">{label}</td>
              <td className="break-words px-3 py-3 text-right font-medium">
                {money(invoice[field])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="avoid-break ml-auto mt-5 max-w-sm">
        <MoneyRow label="Invoice total" value={invoice.totalAmount} />
        <MoneyRow label="Payments received" value={invoice.paidAmount} />

        <div className="mt-2 flex justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
          <span className="font-bold">Balance due</span>
          <strong className="text-right text-lg">{money(balance)}</strong>
        </div>
      </div>

      <div className="avoid-break mt-7 rounded-xl border border-slate-200 p-4 text-xs leading-6 text-slate-500">
        Please quote the invoice number when making payment.
        The balance shown applies to this invoice only.
        Other unpaid invoices remain payable separately.
      </div>

      <footer className="avoid-break mt-12 flex items-end justify-between gap-8">
        <p className="text-xs text-slate-400">
          Khalil Plaza · Monthly rent and utilities
        </p>
        <div className="min-w-[160px] border-t border-slate-400 pt-3 text-center text-xs">
          Authorized signature / stamp
        </div>
      </footer>
    </article>
  );
}

// ==================== PAGE ====================

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [agreementsReady, setAgreementsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [today, setToday] = useState(pakistanDate);

  // Only one modal can be open.
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(newForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [modalError, setModalError] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');
  const [automationWarning, setAutomationWarning] = useState('');

  const mounted = useRef(false);
  const actionLock = useRef(false);
  const requestId = useRef(0);
  const dialogRef = useRef(null);
  const monthSeen = useRef(currentMonth());

  const loadData = useCallback(async () => {
    const request = ++requestId.current;
    if (mounted.current) setLoading(true);

    const results = await Promise.allSettled([
      fetchInvoices(),
      fetchAgreements(),
    ]);

    if (!mounted.current || request !== requestId.current) return;

    const errors = [];

    try {
      if (results[0].status === 'rejected') throw results[0].reason;

      const body = results[0].value;
      setInvoices(readArray(body, 'invoices'));
      setAutomationWarning(body.automationWarning || '');
      setLoaded(true);
    } catch (requestError) {
      errors.push(getErrorMessage(requestError, 'Could not load invoices'));
    }

    try {
      if (results[1].status === 'rejected') throw results[1].reason;

      setAgreements(readArray(results[1].value, 'agreements'));
      setAgreementsReady(true);
    } catch (requestError) {
      setAgreementsReady(false);
      errors.push(
        getErrorMessage(requestError, 'Could not load agreements')
      );
    }

    setToday(pakistanDate());
    setError(errors.join(' | '));
    setLoading(false);

    // Open edit/payment/print snapshots are deliberately not replaced.
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadData();

    const refresh = () => {
      if (
        !actionLock.current &&
        !dialogRef.current &&
        document.visibilityState === 'visible'
      ) {
        monthSeen.current = currentMonth();
        loadData();
      }
    };

    const timer = window.setInterval(() => {
      if (!mounted.current) return;

      setToday(pakistanDate());

      if (monthSeen.current !== currentMonth()) {
        refresh();
      }
    }, 60000);

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-invoices-updated', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      mounted.current = false;
      ++requestId.current;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-invoices-updated', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadData]);

  const closeDialog = () => {
    if (actionLock.current) return;
    dialogRef.current = null;
    setDialog(null);
    setModalError('');
  };

  const openDialog = (kind, invoice = null) => {
    if (actionLock.current || loading) return;

    if (
      kind === 'edit' &&
      (
        typeof invoice?.editSnapshot !== 'string' ||
        !invoice.editSnapshot
      )
    ) {
      setError('Edit information is missing. Update the backend and refresh.');
      return;
    }

    setModalError('');
    setError('');
    setSuccess('');

    if (kind === 'create') {
      setForm(newForm());
    }

    if (kind === 'edit') {
      setForm(
        Object.fromEntries(
          chargeFields.map(([field]) => [
            field,
            String(invoice[field] ?? 0),
          ])
        )
      );
    }

    if (kind === 'payment') {
      setPaymentAmount('');
      setPaymentMode('Cash');
    }

    const next = { kind, invoice };
    dialogRef.current = next;
    setDialog(next);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  // Shared request handling keeps duplicate clicks locked and
  // refreshes after ambiguous payment/save responses.
  const runAction = async (kind, action) => {
    if (actionLock.current) return;

    actionLock.current = true;
    ++requestId.current;
    setBusy(true);
    setLoading(false);
    setModalError('');
    setError('');
    setSuccess('');

    let confirmedSaved = false;

    try {
      const response = await action();
      confirmedSaved = true;

      if (!mounted.current) return;

      dialogRef.current = null;
      setDialog(null);

      setSuccess(
        response.message ||
        (
          kind === 'delete'
            ? 'Invoice deleted successfully.'
            : 'Invoice saved successfully.'
        )
      );

      if (response.revenueSyncPending) {
        setWarning(
          response.message ||
          'Payment saved, but revenue tracking needs review. Do not submit it again.'
        );
      }

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      const message = getErrorMessage(requestError, 'Request failed');
      const status = requestError.response?.status;
      const uncertain = confirmedSaved || !status || status >= 500;

      if (
        uncertain ||
        kind === 'payment' ||
        kind === 'delete' ||
        status === 409 ||
        status === 404
      ) {
        dialogRef.current = null;
        setDialog(null);
        await loadData();

        if (mounted.current) {
          setError(
            uncertain
              ? `${message}. The action may already have completed. Check the refreshed invoice before submitting again.`
              : `${message}. Review the refreshed list and reopen the action if needed.`
          );
        }
      } else {
        setModalError(message);
      }
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const selectedAgreement = agreements.find(
    (agreement) => agreement._id === form.agreementId
  );

  const activeAgreements = agreements.filter(
    (agreement) => agreement.status === 'Active'
  );

  const existingCreateInvoice = invoices.find(
    (invoice) =>
      idOf(invoice.agreement) === form.agreementId &&
      normalizeMonth(invoice.monthYear) === form.monthYear
  );

  const handleChargesSubmit = (event) => {
    event.preventDefault();

    if (actionLock.current || !dialog) return;
    setModalError('');

    const editing = dialog.kind === 'edit';
    const fields = editing ? chargeFields : createFields;
    const payload = {};

    for (const [field, label] of fields) {
      const value = form[field] === '' ? 0 : form[field];

      if (!validAmount(value)) {
        setModalError(
          `${label} must be zero or greater, with at most 2 decimal places.`
        );
        return;
      }

      payload[field] = roundMoney(value);
    }

    if (editing) {
      const total = roundMoney(
        number(dialog.invoice.rentAmount) +
        number(dialog.invoice.previousBalance) +
        Object.values(payload).reduce((sum, amount) => sum + amount, 0)
      );

      if (total < number(dialog.invoice.paidAmount)) {
        setModalError('Total cannot be less than recorded payments.');
        return;
      }

      payload.expectedSnapshot = dialog.invoice.editSnapshot;

      runAction('edit', () =>
        updateInvoice(dialog.invoice._id, payload)
      );
      return;
    }

    if (!agreementsReady || !selectedAgreement) {
      setModalError('Select an available active agreement.');
      return;
    }

    if (
      selectedAgreement.status !== 'Active' ||
      !normalizeMonth(form.monthYear) ||
      form.monthYear > currentMonth()
    ) {
      setModalError('Choose an active agreement and a valid current or past month.');
      return;
    }

    if (existingCreateInvoice) {
      setModalError('This month already has an invoice. Edit the existing invoice.');
      return;
    }

    payload.agreementId = form.agreementId;
    payload.monthYear = form.monthYear;

    runAction('create', () => createInvoice(payload));
  };

  const handlePayment = (event) => {
    event.preventDefault();

    if (actionLock.current || !dialog?.invoice) return;
    setModalError('');

    const balance = remaining(dialog.invoice);

    if (!validAmount(paymentAmount, false)) {
      setModalError('Enter a positive payment amount with at most 2 decimals.');
      return;
    }

    const amount = roundMoney(paymentAmount);

    if (balance <= 0 || amount > balance) {
      setModalError(`Payment cannot exceed ${money(balance)}.`);
      return;
    }

    if (!['Cash', 'Bank Transfer', 'Cheque'].includes(paymentMode)) {
      setModalError('Select a valid payment mode.');
      return;
    }

    runAction('payment', () =>
      updateInvoicePayment(dialog.invoice._id, {
        paymentAmount: amount,
        expectedPaidAmount: number(dialog.invoice.paidAmount),
        paymentMode,
      })
    );
  };

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const text = [
        invoice.invoiceNumber,
        invoice.monthYear,
        tenantName(invoice),
        invoice.agreement?.tenant?.phone,
        invoice.agreement?.tenant?.cnic,
        shopsLabel(invoice.agreement),
      ].filter(Boolean).join(' ').toLowerCase();

      return (
        (!statusFilter || invoice.status === statusFilter) &&
        (!monthFilter || normalizeMonth(invoice.monthYear) === monthFilter) &&
        (!query || text.includes(query))
      );
    });
  }, [invoices, search, statusFilter, monthFilter]);

  const counts = useMemo(() => ({
    total: filteredInvoices.length,
    collected: filteredInvoices.reduce(
      (sum, invoice) => sum + number(invoice.paidAmount), 0
    ),
    outstanding: filteredInvoices.reduce(
      (sum, invoice) => sum + remaining(invoice), 0
    ),
    overdue: filteredInvoices.filter(
      (invoice) => isOverdue(invoice, today)
    ).length,
  }), [filteredInvoices, today]);

  const editing = dialog?.kind === 'edit';
  const chargesOpen = editing || dialog?.kind === 'create';

  const previewTotal = roundMoney(
    number(editing ? dialog.invoice.rentAmount : selectedAgreement?.monthlyRent) +
    (editing ? number(dialog.invoice.previousBalance) : 0) +
    (editing ? chargeFields : createFields).reduce(
      (sum, [field]) => sum + number(form[field]), 0
    )
  );

  const actions = (invoice) => (
    <div className="flex flex-wrap gap-2">
      {remaining(invoice) > 0 && (
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => openDialog('payment', invoice)}
          className={`${successButton} px-3`}
        >
          <Wallet className="h-4 w-4" /> Pay
        </button>
      )}
      <button
        type="button"
        disabled={busy || loading}
        onClick={() => openDialog('edit', invoice)}
        className={`${secondaryButton} px-3`}
      >
        <Pencil className="h-4 w-4" /> Edit
      </button>
      <button
        type="button"
        disabled={busy || loading}
        onClick={() => openDialog('print', invoice)}
        className={`${buttonClass} bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100`}
      >
        <Printer className="h-4 w-4" /> Print
      </button>
      <button
        type="button"
        disabled={busy || loading}
        onClick={() => openDialog('delete', invoice)}
        aria-label={`Delete ${invoice.invoiceNumber}`}
        title="Delete invoice"
        className={`${buttonClass} bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Property Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Invoices & payments
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Monthly rent, utility charges and payment records.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || busy}
              className={secondaryButton}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => openDialog('create')}
              disabled={loading || busy || !agreementsReady}
              className={primaryButton}
            >
              <Plus className="h-4 w-4" /> Manual invoice
            </button>
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <div className="text-sm leading-6 text-indigo-900">
            <p className="font-semibold">Monthly rent invoices are automatic</p>
            <p className="text-indigo-700">
              Eligible active agreements receive one invoice per month.
              New invoices are due on the 10th. Use Edit to add utilities or fines.
            </p>
          </div>
        </div>

        {error && <Notice onDismiss={() => setError('')}>{error}</Notice>}
        {success && (
          <Notice tone="success" onDismiss={() => setSuccess('')}>
            {success}
          </Notice>
        )}
        {warning && (
          <Notice tone="warning" onDismiss={() => setWarning('')}>
            {warning}
          </Notice>
        )}
        {automationWarning && (
          <Notice tone="warning">{automationWarning}</Notice>
        )}

        <div>
          <p className="mb-3 text-xs text-slate-500">
            Summary for the filtered invoices
          </p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              ['Invoices', counts.total, FileText, 'bg-indigo-50 text-indigo-600'],
              ['Collected', money(counts.collected), Wallet, 'bg-emerald-50 text-emerald-600'],
              ['Outstanding', money(counts.outstanding), Receipt, 'bg-amber-50 text-amber-600'],
              ['Overdue', counts.overdue, Clock, 'bg-rose-50 text-rose-600'],
            ].map(([label, value, Icon, color]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
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
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Invoice history</h2>
              <span aria-live="polite" className="text-xs text-slate-400">
                {loading ? 'Refreshing…' : `${filteredInvoices.length} matching`}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search invoices"
                  placeholder="Search invoice, tenant, CNIC or shop..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>
              <input
                type="month"
                aria-label="Filter by billing month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className={inputClass}
              />
              <select
                aria-label="Filter by payment status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="">All statuses</option>
                {['Paid', 'Partial', 'Unpaid'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3 text-xs">
              <button
                type="button"
                onClick={() => setMonthFilter(currentMonth())}
                className="font-semibold text-indigo-600"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                  setMonthFilter('');
                }}
                className="font-semibold text-slate-500"
              >
                Clear filters
              </button>
            </div>
          </div>

          {!loaded && loading ? (
            <div role="status" className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
              <span className="sr-only">Loading invoices...</span>
            </div>
          ) : !filteredInvoices.length ? (
            <div className="px-6 py-16 text-center">
              <Receipt className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="font-bold text-slate-800">
                {loaded ? 'No invoices found' : 'Could not load invoices'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {search || statusFilter || monthFilter
                  ? 'Try clearing the filters.'
                  : 'Refresh to check invoices for eligible active agreements.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {filteredInvoices.map((invoice) => (
                  <article key={invoice._id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900">
                          {tenantName(invoice)}
                        </h3>
                        <p className="mt-1 break-all font-mono text-xs text-indigo-600">
                          {invoice.invoiceNumber}
                        </p>
                      </div>
                      <Badge value={invoice.status} />
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <p>Shops: {shopsLabel(invoice.agreement)}</p>
                      <p>{monthLabel(invoice.monthYear)}</p>
                      <p className={isOverdue(invoice, today) ? 'font-semibold text-rose-600' : ''}>
                        Due: {displayDate(invoice.dueDate)}
                        {isOverdue(invoice, today) ? ' · Overdue' : ''}
                      </p>
                    </div>

                    <div className="my-4 border-y border-slate-100 py-2">
                      <MoneyRow label="Total" value={invoice.totalAmount} />
                      <MoneyRow label="Paid" value={invoice.paidAmount} />
                      <MoneyRow label="Balance due" value={remaining(invoice)} />
                    </div>

                    {actions(invoice)}
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {['Invoice / Month', 'Tenant / Shops', 'Due date', 'Total / Paid / Due', 'Status', 'Actions'].map((label) => (
                        <th key={label} scope="col" className="px-5 py-4">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice._id} className="hover:bg-indigo-50/30">
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs font-bold text-indigo-600">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{monthLabel(invoice.monthYear)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="min-w-[120px] font-semibold text-slate-900">
                            {tenantName(invoice)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Shops: {shopsLabel(invoice.agreement)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs">
                          {displayDate(invoice.dueDate)}
                          {isOverdue(invoice, today) && (
                            <p className="mt-1 font-semibold text-rose-600">Overdue</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs leading-6">
                          <p className="font-bold text-slate-900">Total: {money(invoice.totalAmount)}</p>
                          <p className="text-emerald-700">Paid: {money(invoice.paidAmount)}</p>
                          <p className="font-semibold text-rose-700">Due: {money(remaining(invoice))}</p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge value={invoice.status} />
                          {invoice.paymentMode !== 'None' && (
                            <p className="mt-2 text-xs text-slate-500">{invoice.paymentMode}</p>
                          )}
                        </td>
                        <td className="min-w-[240px] px-5 py-4">{actions(invoice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* CREATE / EDIT */}

      {chargesOpen && (
        <Modal
          title={editing ? 'Edit invoice charges' : 'Generate manual invoice'}
          description={
            editing
              ? `${dialog.invoice.invoiceNumber} · ${tenantName(dialog.invoice)}`
              : 'Use for a missing past invoice or to recreate a deleted month.'
          }
          icon={editing ? Pencil : Plus}
          busy={busy}
          onClose={closeDialog}
        >
          <form onSubmit={handleChargesSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {modalError && <Notice>{modalError}</Notice>}

              <fieldset disabled={busy} className="space-y-5">
                {!editing ? (
                  <>
                    <Field label="Active agreement / tenant">
                      <select
                        name="agreementId"
                        value={form.agreementId}
                        onChange={handleChange}
                        required
                        className={inputClass}
                      >
                        <option value="">Choose agreement...</option>
                        {activeAgreements.map((agreement) => (
                          <option key={agreement._id} value={agreement._id}>
                            {shopsLabel(agreement)} — {agreement.tenant?.name || 'Unavailable'} — {money(agreement.monthlyRent)}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Invoice month">
                        <input
                          type="month"
                          name="monthYear"
                          value={form.monthYear}
                          max={currentMonth()}
                          onChange={handleChange}
                          required
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Due date · fixed">
                        <input
                          type="date"
                          value={form.monthYear ? `${form.monthYear}-10` : ''}
                          readOnly
                          className={`${inputClass} bg-slate-50`}
                        />
                      </Field>
                    </div>

                    {existingCreateInvoice && (
                      <Notice tone="warning">
                        {existingCreateInvoice.invoiceNumber} already exists for this agreement and month.
                        Close this form and use its Edit button.
                      </Notice>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-800">
                    {monthLabel(dialog.invoice.monthYear)} · Due {displayDate(dialog.invoice.dueDate)}.
                    Rent and existing payments remain saved; update the additional charges below.
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {(editing ? chargeFields : createFields).map(([field, label]) => (
                    <Field key={field} label={label}>
                      <input
                        type="number"
                        name={field}
                        value={form[field] ?? ''}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={inputClass}
                      />
                    </Field>
                  ))}
                </div>

                {!editing && (
                  <p className="text-xs leading-5 text-slate-500">
                    Leave opening balance at 0 if the amount is already owed on another invoice.
                    Adding it again would count it twice.
                  </p>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <MoneyRow
                    label="Monthly rent"
                    value={editing ? dialog.invoice.rentAmount : selectedAgreement?.monthlyRent}
                  />
                  {editing && (
                    <MoneyRow label="Saved opening balance" value={dialog.invoice.previousBalance} />
                  )}
                  <MoneyRow label="Invoice total" value={previewTotal} strong />
                  {editing && (
                    <>
                      <MoneyRow label="Already paid" value={dialog.invoice.paidAmount} />
                      <MoneyRow
                        label="New balance due"
                        value={roundMoney(previewTotal - number(dialog.invoice.paidAmount))}
                        strong
                      />
                    </>
                  )}
                </div>
              </fieldset>
            </div>

            <ModalFooter>
              <button type="button" onClick={closeDialog} disabled={busy} className={secondaryButton}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || (!editing && (!agreementsReady || Boolean(existingCreateInvoice)))}
                className={primaryButton}
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {busy ? 'Saving…' : editing ? 'Save changes' : 'Generate invoice'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* PAYMENT */}

      {dialog?.kind === 'payment' && (
        <Modal
          title="Record payment"
          description={`${dialog.invoice.invoiceNumber} · ${tenantName(dialog.invoice)}`}
          icon={Wallet}
          busy={busy}
          onClose={closeDialog}
        >
          <form onSubmit={handlePayment} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
              {modalError && <Notice>{modalError}</Notice>}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <MoneyRow label="Invoice total" value={dialog.invoice.totalAmount} />
                <MoneyRow label="Already paid" value={dialog.invoice.paidAmount} />
                <MoneyRow label="Remaining balance" value={remaining(dialog.invoice)} strong />
              </div>

              <fieldset disabled={busy} className="space-y-4">
                <Field label="Amount received this time">
                  <input
                    type="number"
                    min="0.01"
                    max={remaining(dialog.invoice)}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    required
                    className={inputClass}
                    placeholder="Enter this payment only"
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(remaining(dialog.invoice)))}
                  className="text-sm font-semibold text-indigo-600"
                >
                  Use full remaining: {money(remaining(dialog.invoice))}
                </button>

                <Field label="Payment mode">
                  <select
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className={inputClass}
                  >
                    {['Cash', 'Bank Transfer', 'Cheque'].map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </Field>
              </fieldset>
            </div>

            <ModalFooter>
              <button type="button" onClick={closeDialog} disabled={busy} className={secondaryButton}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className={successButton}>
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {busy ? 'Saving…' : 'Record payment'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION */}

      {dialog?.kind === 'delete' && (
        <Modal
          title="Delete invoice?"
          description={`${dialog.invoice.invoiceNumber} · ${tenantName(dialog.invoice)}`}
          icon={Trash2}
          busy={busy}
          onClose={closeDialog}
        >
          <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
            <Notice tone="warning">
              This permanently deletes the invoice and its linked revenue record.
              It will not automatically return for this month.
            </Notice>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                {monthLabel(dialog.invoice.monthYear)} · Shops {shopsLabel(dialog.invoice.agreement)}
              </p>
              <MoneyRow label="Invoice total" value={dialog.invoice.totalAmount} />
              <MoneyRow label="Recorded payments" value={dialog.invoice.paidAmount} />
              <MoneyRow label="Balance due" value={remaining(dialog.invoice)} strong />
            </div>

            {number(dialog.invoice.paidAmount) > 0 && (
              <Notice>
                This invoice has recorded payments. Deleting it also removes
                its linked collection record from the system.
              </Notice>
            )}
          </div>

          <ModalFooter>
            <button type="button" disabled={busy} onClick={closeDialog} className={secondaryButton}>
              Keep invoice
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction('delete', () => deleteInvoice(dialog.invoice._id))
              }
              className={dangerButton}
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {busy ? 'Deleting…' : 'Yes, delete invoice'}
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* PRINT PREVIEW */}

      {dialog?.kind === 'print' && (
        <Modal
          title="Invoice preview"
          description="Print on A4 paper or choose Save as PDF in the print dialog."
          icon={Printer}
          onClose={closeDialog}
          printable
        >
          <div className="invoice-scroll min-h-0 overflow-y-auto overscroll-contain">
            {modalError && (
              <div className="no-print p-5">
                <Notice>{modalError}</Notice>
              </div>
            )}
            <InvoiceDocument invoice={dialog.invoice} />
          </div>

          <ModalFooter>
            <button type="button" onClick={closeDialog} className={secondaryButton}>
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setModalError('');
                try {
                  window.print();
                } catch {
                  setModalError('Could not open the print dialog. Please try again.');
                }
              }}
              className={primaryButton}
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default InvoicesPage;