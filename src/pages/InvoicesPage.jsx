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
  TrendingUp,
  FileText,
  User,
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
    maximumFractionDigits: 2,
  })}`;

const currentMonth = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
};

const initialForm = () => ({
  agreementId: '',
  monthYear: currentMonth(),
  electricityCharges: '',
  waterCharges: '',
  maintenanceFee: '',
  lateFine: '',
  previousBalance: '',
  dueDate: '',
});

const amountFields = [
  ['electricityCharges', 'Electricity Charges'],
  ['waterCharges', 'Water Charges'],
  ['maintenanceFee', 'Maintenance Fee'],
  ['lateFine', 'Late Fine'],
  ['previousBalance', 'Previous Balance'],
];

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const validAmount = (value, allowZero = true) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return false;
  }

  if (typeof value === 'string' && !value.trim()) {
    return false;
  }

  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0) &&
    Math.abs(amount - roundMoney(amount)) < 0.0000001
  );
};

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

const successButton =
  `${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`;

// ==================== SMALL COMPONENTS ====================

function Badge({ value }) {
  const styles = {
    Paid: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Partial: 'border-amber-100 bg-amber-50 text-amber-700',
    Unpaid: 'border-rose-100 bg-rose-50 text-rose-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[value] || styles.Unpaid
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value || 'Unknown'}
    </span>
  );
}

function Notice({ children, success = false, warning = false, onDismiss }) {
  const Icon = success ? CheckCircle2 : AlertCircle;

  const styles = success
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : warning
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles}`}
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
  const initials =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'I';

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
      {initials}
    </span>
  );
}

function Modal({
  title,
  description,
  icon: Icon = Receipt,
  busy = false,
  onClose,
  children,
  wide = false,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);

  useEffect(() => {
    closeRef.current = onClose;
    busyRef.current = busy;
  }, [onClose, busy]);

  useEffect(() => {
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    panel?.focus();

    const keyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) closeRef.current();
      }
    };

    document.addEventListener('keydown', keyDown);

    return () => {
      document.removeEventListener('keydown', keyDown);
      document.body.style.overflow = previousOverflow;

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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
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
      className="flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  );
}

// ==================== PAGE ====================

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [createError, setCreateError] = useState('');

  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentError, setPaymentError] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState('');

  const actionLock = useRef(false);
  const requestId = useRef(0);
  const mounted = useRef(false);

  const loadData = useCallback(async () => {
    const request = ++requestId.current;

    if (mounted.current) setLoading(true);

    const [invoiceResult, agreementResult] = await Promise.allSettled([
      fetchInvoices(),
      fetchAgreements(),
    ]);

    if (!mounted.current || request !== requestId.current) return;

    const errors = [];

    if (invoiceResult.status === 'fulfilled') {
      setInvoices(invoiceResult.value.data || []);
      setLoaded(true);
    } else {
      errors.push(
        getErrorMessage(
          invoiceResult.reason,
          'Could not refresh invoices'
        )
      );
    }

    if (agreementResult.status === 'fulfilled') {
      setAgreements(agreementResult.value.data || []);
    } else {
      errors.push(
        getErrorMessage(
          agreementResult.reason,
          'Could not load agreements'
        )
      );
    }

    if (errors.length) setError(errors.join(' | '));

    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadData();

    const refreshOnFocus = () => {
      if (!actionLock.current) loadData();
    };

    window.addEventListener('focus', refreshOnFocus);

    return () => {
      mounted.current = false;
      ++requestId.current;
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [loadData]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setWarning('');
  };

  const closeCreate = useCallback(() => {
    if (!actionLock.current) setIsCreateOpen(false);
  }, []);

  const closePayment = useCallback(() => {
    if (!actionLock.current) setPaymentInvoice(null);
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (actionLock.current) return;

    setCreateError('');

    if (!formData.agreementId || !formData.monthYear || !formData.dueDate) {
      setCreateError('Select an agreement, month and due date.');
      return;
    }

    const payload = { ...formData };

    for (const [field, label] of amountFields) {
      const value = formData[field] === '' ? 0 : formData[field];

      if (!validAmount(value)) {
        setCreateError(
          `${label} must be zero or greater, with at most 2 decimal places.`
        );
        return;
      }

      payload[field] = roundMoney(value);
    }

    actionLock.current = true;
    ++requestId.current;
    setBusy('create');
    setLoading(false);
    clearMessages();

    try {
      const response = await createInvoice(payload);

      if (!mounted.current) return;

      setIsCreateOpen(false);
      setFormData(initialForm());
      setSuccess(response.message || 'Invoice created successfully.');

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      const message = getErrorMessage(
        requestError,
        'Could not create invoice'
      );

      if (
        !requestError.response ||
        requestError.response.status >= 500
      ) {
        setIsCreateOpen(false);
        await loadData();

        if (mounted.current) {
          setError(
            `${message}. Check the invoice list before creating it again.`
          );
        }
      } else {
        setCreateError(message);
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) setBusy('');
    }
  };

  const openPayment = (invoice) => {
    if (actionLock.current || loading) return;

    clearMessages();
    setPaymentError('');
    setPaymentAmount('');
    setPaymentMode('Cash');
    setPaymentInvoice(invoice);
  };

  const handlePayment = async (event) => {
    event.preventDefault();

    if (actionLock.current || !paymentInvoice) return;

    setPaymentError('');

    const previouslyPaid = roundMoney(
      number(paymentInvoice.paidAmount)
    );

    const remaining = roundMoney(
      number(paymentInvoice.totalAmount) - previouslyPaid
    );

    if (!validAmount(paymentAmount, false)) {
      setPaymentError(
        'Enter a positive payment amount with at most 2 decimal places.'
      );
      return;
    }

    const amountReceived = roundMoney(paymentAmount);

    if (remaining <= 0) {
      setPaymentError('This invoice has no remaining balance.');
      return;
    }

    if (amountReceived > remaining) {
      setPaymentError(
        `Payment cannot exceed the remaining balance of ${money(remaining)}.`
      );
      return;
    }

    actionLock.current = true;
    ++requestId.current;
    setBusy('payment');
    setLoading(false);
    clearMessages();

    try {
      const response = await updateInvoicePayment(
        paymentInvoice._id,
        {
          paymentAmount: amountReceived,
          expectedPaidAmount: previouslyPaid,
          paymentMode,
        }
      );

      if (!mounted.current) return;

      const updatedInvoice = response.data;

      setInvoices((previous) =>
        previous.map((invoice) =>
          invoice._id === updatedInvoice._id
            ? {
                ...invoice,
                ...updatedInvoice,
                agreement: invoice.agreement,
              }
            : invoice
        )
      );

      setPaymentInvoice(null);
      setPaymentAmount('');

      setSuccess(
        `Payment recorded. Total paid: ${money(
          updatedInvoice.paidAmount
        )}. Remaining: ${money(
          updatedInvoice.balanceDue
        )}. Status: ${updatedInvoice.status}.`
      );

      if (response.revenueSyncPending) {
        setWarning(
          response.message ||
            'Payment is saved, but revenue tracking needs review. Do not submit this payment again.'
        );
      }

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      setPaymentInvoice(null);
      await loadData();

      if (!mounted.current) return;

      const message = getErrorMessage(
        requestError,
        'Could not confirm payment'
      );

      if (
        !requestError.response ||
        requestError.response.status >= 500
      ) {
        setError(
          `${message}. Payment may already be recorded. Check the refreshed total and receipt before submitting again.`
        );
      } else {
        setError(
          `${message}. Review the refreshed invoice before recording another payment.`
        );
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) setBusy('');
    }
  };

  const handleDelete = async (invoice) => {
    if (actionLock.current) return;

    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? Its related revenue record will also be deleted.`
    );

    if (!confirmed) return;

    actionLock.current = true;
    ++requestId.current;
    setBusy(`delete:${invoice._id}`);
    setLoading(false);
    clearMessages();

    try {
      await deleteInvoice(invoice._id);

      if (!mounted.current) return;

      setInvoices((previous) =>
        previous.filter((item) => item._id !== invoice._id)
      );

      setSuccess('Invoice deleted successfully.');
      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      await loadData();

      if (mounted.current) {
        setError(
          getErrorMessage(requestError, 'Could not delete invoice')
        );
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) setBusy('');
    }
  };

  const selectedAgreement = agreements.find(
    (agreement) => agreement._id === formData.agreementId
  );

  const invoicePreview = roundMoney(
    number(selectedAgreement?.monthlyRent) +
      amountFields.reduce(
        (sum, [field]) => sum + number(formData[field]),
        0
      )
  );

  const paymentRemaining = paymentInvoice
    ? roundMoney(
        number(paymentInvoice.totalAmount) -
          number(paymentInvoice.paidAmount)
      )
    : 0;

  // ============ STATE CARDS DATA ============
  const counts = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    let overdue = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    invoices.forEach((invoice) => {
      collected += number(invoice.paidAmount);
      outstanding += number(invoice.balanceDue);

      if (
        invoice.status !== 'Paid' &&
        invoice.dueDate &&
        new Date(invoice.dueDate) < today
      ) {
        overdue += 1;
      }
    });

    return {
      total: invoices.length,
      collected,
      outstanding,
      overdue,
    };
  }, [invoices]);

  const statuses = ['Paid', 'Partial', 'Unpaid'];

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matchesStatus =
        !statusFilter || invoice.status === statusFilter;

      const searchableText = [
        invoice.invoiceNumber,
        invoice.monthYear,
        invoice.agreement?.tenant?.name,
        invoice.agreement?.tenant?.phone,
        invoice.agreement?.shops?.map((shop) => `#${shop.shopNumber}`).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [invoices, search, statusFilter]);

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
              Financial ledger
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Monthly invoices, utilities and partial payments.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || Boolean(busy)}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span className="sr-only sm:not-sr-only">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setIsCreateOpen(true);
              }}
              disabled={loading || Boolean(busy)}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              Generate invoice
            </button>
          </div>
        </div>

        {error && (
          <Notice onDismiss={() => setError('')}>{error}</Notice>
        )}
        {success && (
          <Notice success onDismiss={() => setSuccess('')}>
            {success}
          </Notice>
        )}
        {warning && (
          <Notice warning onDismiss={() => setWarning('')}>
            {warning}
          </Notice>
        )}

        {/* ============ STATE CARDS ============ */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            [
              'Total invoices',
              counts.total,
              FileText,
              'bg-indigo-50 text-indigo-600',
            ],
            [
              'Collected',
              money(counts.collected),
              Wallet,
              'bg-emerald-50 text-emerald-600',
            ],
            [
              'Outstanding',
              money(counts.outstanding),
              TrendingUp,
              'bg-amber-50 text-amber-600',
            ],
            [
              'Overdue',
              counts.overdue,
              Clock,
              'bg-rose-50 text-rose-600',
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
                All invoices
              </h2>
              <span
                aria-live="polite"
                className="text-xs text-slate-400"
              >
                {loading
                  ? 'Refreshing…'
                  : loaded
                    ? `${filteredInvoices.length} matching`
                    : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search invoices"
                  placeholder="Search invoice #, tenant, shop or month..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter invoice status"
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
              <span className="sr-only">Loading invoices...</span>
            </div>
          ) : !filteredInvoices.length ? (
            <div className="px-6 py-16 text-center">
              <Receipt className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="font-bold text-slate-800">
                {!loaded
                  ? 'Could not load invoices'
                  : 'No invoices found'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {!loaded
                  ? 'Refresh to try again.'
                  : 'Generate your first monthly invoice to get started.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {filteredInvoices.map((invoice) => {
                  const remaining = roundMoney(
                    number(invoice.totalAmount) -
                      number(invoice.paidAmount)
                  );

                  return (
                    <article
                      key={invoice._id}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={invoice.agreement?.tenant?.name} />
                          <div className="min-w-0">
                            <h3 className="break-words font-bold text-slate-900">
                              {invoice.agreement?.tenant?.name ||
                                'Unavailable'}
                            </h3>
                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {invoice.invoiceNumber}
                            </p>
                          </div>
                        </div>
                        <Badge value={invoice.status} />
                      </div>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="flex gap-2 text-slate-600">
                          <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>
                            {invoice.agreement?.shops
                              ?.map((shop) => `#${shop.shopNumber}`)
                              .join(', ') || '—'}
                          </span>
                        </div>
                        <div className="flex gap-2 text-slate-500">
                          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>{invoice.monthYear}</span>
                        </div>
                      </div>

                      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Total</dt>
                          <dd className="font-bold text-slate-900">
                            {money(invoice.totalAmount)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Paid</dt>
                          <dd className="font-bold text-emerald-700">
                            {money(invoice.paidAmount)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Due</dt>
                          <dd className="font-bold text-rose-700">
                            {money(invoice.balanceDue)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => openPayment(invoice)}
                            disabled={Boolean(busy) || loading}
                            className={`${successButton} flex-1 px-3`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Pay
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(invoice)}
                          disabled={Boolean(busy) || loading}
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                          className={`${buttonClass} bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {[
                        'Invoice',
                        'Month / Shop',
                        'Tenant',
                        'Charges',
                        'Total / Paid / Due',
                        'Status',
                        'Actions',
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
                    {filteredInvoices.map((invoice) => {
                      const remaining = roundMoney(
                        number(invoice.totalAmount) -
                          number(invoice.paidAmount)
                      );

                      return (
                        <tr
                          key={invoice._id}
                          className="hover:bg-indigo-50/30"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={invoice.agreement?.tenant?.name} />
                              <div className="min-w-[120px]">
                                <p className="font-mono text-xs font-bold text-indigo-600">
                                  {invoice.invoiceNumber}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  {invoice.monthYear}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="flex items-center gap-1 text-slate-600">
                              <Building className="h-3 w-3 text-slate-400" />
                              {invoice.agreement?.shops
                                ?.map((shop) => `#${shop.shopNumber}`)
                                .join(', ') || '—'}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-slate-700">
                              <User className="h-4 w-4 text-slate-400" />
                              <span className="max-w-[160px] break-words font-semibold">
                                {invoice.agreement?.tenant?.name ||
                                  'Unavailable'}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="space-y-1">
                              <div>Rent: {money(invoice.rentAmount)}</div>
                              <div>
                                Electricity: {money(invoice.electricityCharges)}
                              </div>
                              <div>Water: {money(invoice.waterCharges)}</div>
                              <div>
                                Maintenance: {money(invoice.maintenanceFee)}
                              </div>
                              {(number(invoice.lateFine) > 0 ||
                                number(invoice.previousBalance) > 0) && (
                                <div className="border-t border-slate-100 pt-1">
                                  Fine: {money(invoice.lateFine)} · Prev:{' '}
                                  {money(invoice.previousBalance)}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 text-xs">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900">
                                Total: {money(invoice.totalAmount)}
                              </div>
                              <div className="font-bold text-emerald-700">
                                Paid: {money(invoice.paidAmount)}
                              </div>
                              <div className="font-bold text-rose-700">
                                Due: {money(invoice.balanceDue)}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge value={invoice.status} />
                            {invoice.paymentMode && (
                              <p className="mt-2 text-xs text-slate-500">
                                {invoice.paymentMode}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {remaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPayment(invoice)}
                                  disabled={Boolean(busy) || loading}
                                  className={`${successButton} px-3`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Pay
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(invoice)}
                                disabled={Boolean(busy) || loading}
                                aria-label={`Delete ${invoice.invoiceNumber}`}
                                className={`${buttonClass} bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ==================== CREATE MODAL ==================== */}

      {isCreateOpen && (
        <Modal
          title="Generate monthly invoice"
          description="Select agreement, month and applicable charges."
          icon={Receipt}
          onClose={closeCreate}
          busy={Boolean(busy)}
        >
          <form
            onSubmit={handleCreate}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
              {createError && <Notice>{createError}</Notice>}

              <fieldset disabled={Boolean(busy)} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Agreement / tenant
                  </span>
                  <select
                    name="agreementId"
                    value={formData.agreementId}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Choose agreement...</option>
                    {agreements.map((agreement) => (
                      <option key={agreement._id} value={agreement._id}>
                        {agreement.shops
                          ?.map((shop) => `#${shop.shopNumber}`)
                          .join(', ')}
                        {' — '}
                        {agreement.tenant?.name || 'Unavailable'}
                        {' — '}
                        {money(agreement.monthlyRent)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Invoice month
                    </span>
                    <input
                      type="month"
                      name="monthYear"
                      value={formData.monthYear}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Due date
                    </span>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {amountFields.map(([name, label]) => (
                    <label key={name} className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-600">
                        {label}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        placeholder="0.00"
                        className={inputClass}
                      />
                    </label>
                  ))}
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-600">Monthly rent</span>
                    <strong className="text-slate-900">
                      {money(selectedAgreement?.monthlyRent)}
                    </strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-4 border-t border-indigo-100 pt-2">
                    <span className="font-semibold text-indigo-700">
                      Invoice total
                    </span>
                    <strong className="text-indigo-700">
                      {money(invoicePreview)}
                    </strong>
                  </div>
                </div>
              </fieldset>
            </div>

            <ModalFooter>
              <button
                type="button"
                onClick={closeCreate}
                disabled={Boolean(busy)}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={Boolean(busy)}
                className={`${primaryButton} flex-1 sm:flex-none`}
              >
                {busy === 'create' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {busy === 'create' ? 'Creating…' : 'Generate invoice'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ==================== PAYMENT MODAL ==================== */}

      {paymentInvoice && (
        <Modal
          title={`Record payment — ${paymentInvoice.invoiceNumber}`}
          description="Enter the new payment. Previous payments are added automatically."
          icon={CheckCircle2}
          onClose={closePayment}
          busy={Boolean(busy)}
        >
          <form
            onSubmit={handlePayment}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
              {paymentError && <Notice>{paymentError}</Notice>}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-3">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Invoice month</span>
                  <strong className="text-slate-900">
                    {paymentInvoice.monthYear}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Total amount</span>
                  <strong className="text-slate-900">
                    {money(paymentInvoice.totalAmount)}
                  </strong>
                </div>

                <div className="flex justify-between gap-4 text-emerald-700">
                  <span>Already paid</span>
                  <strong>{money(paymentInvoice.paidAmount)}</strong>
                </div>

                <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-rose-700">
                  <span className="font-semibold">Remaining balance</span>
                  <strong>{money(paymentRemaining)}</strong>
                </div>
              </div>

              <fieldset disabled={Boolean(busy)} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Amount received this time
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    max={paymentRemaining}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) =>
                      setPaymentAmount(event.target.value)
                    }
                    placeholder="Enter this payment only"
                    required
                    autoFocus
                    className={inputClass}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(String(paymentRemaining))
                  }
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Use full remaining: {money(paymentRemaining)}
                </button>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Payment mode
                  </span>
                  <select
                    value={paymentMode}
                    onChange={(event) =>
                      setPaymentMode(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </label>
              </fieldset>
            </div>

            <ModalFooter>
              <button
                type="button"
                onClick={closePayment}
                disabled={Boolean(busy)}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={Boolean(busy)}
                className={`${successButton} flex-1 sm:flex-none`}
              >
                {busy === 'payment' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {busy === 'payment'
                  ? 'Saving…'
                  : 'Record payment'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default InvoicesPage;