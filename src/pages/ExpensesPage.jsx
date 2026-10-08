import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchFinancialSummary,
} from '../services/expenseService';

import {
  Plus,
  Trash2,
  X,
  Wallet,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  DollarSign,
} from 'lucide-react';

// ==================== HELPERS ====================

const categories = [
  'Repair & Maintenance',
  'Utilities',
  'Taxes',
  'Administration',
  'Emergency Fixes',
  'Staff Salaries',
];

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

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const initialForm = () => ({
  title: '',
  category: 'Repair & Maintenance',
  amount: '',
  date: today(),
  description: '',
  paidBy: 'Khalil Plaza',
});

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const displayDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toISOString().slice(0, 10);
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

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

const dangerButton =
  `${buttonClass} bg-rose-600 text-white hover:bg-rose-700`;

// ==================== SMALL COMPONENTS ====================

function Badge({ value }) {
  const colors = {
    'Repair & Maintenance': 'border-indigo-100 bg-indigo-50 text-indigo-700',
    Utilities: 'border-amber-100 bg-amber-50 text-amber-700',
    Taxes: 'border-rose-100 bg-rose-50 text-rose-700',
    Administration: 'border-slate-200 bg-slate-50 text-slate-600',
    'Emergency Fixes': 'border-orange-100 bg-orange-50 text-orange-700',
    'Staff Salaries': 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        colors[value] || colors.Administration
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

function Modal({
  title,
  description,
  icon: Icon = Wallet,
  busy = false,
  onClose,
  children,
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
        aria-labelledby="expense-modal-title"
        tabIndex={-1}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id="expense-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {title}
            </h2>
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

const ExpensesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState('');

  const [records, setRecords] = useState({
    month: null,
    expenses: [],
    summary: null,
  });

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const actionLock = useRef(false);
  const requestId = useRef(0);
  const mounted = useRef(false);

  const loadData = useCallback(async () => {
    const request = ++requestId.current;

    if (mounted.current) setLoading(true);

    try {
      const [expenseResponse, summaryResponse] = await Promise.all([
        fetchExpenses(selectedMonth),
        fetchFinancialSummary(selectedMonth),
      ]);

      if (!mounted.current || request !== requestId.current) return false;

      if (!summaryResponse.data) {
        throw new Error('Financial summary was not returned by the server');
      }

      setRecords({
        month: selectedMonth,
        expenses: expenseResponse.data || [],
        summary: summaryResponse.data,
      });

      setLoaded(true);
      return true;
    } catch (requestError) {
      if (!mounted.current || request !== requestId.current) return false;

      setRecords({
        month: selectedMonth,
        expenses: [],
        summary: null,
      });

      setError(
        getErrorMessage(
          requestError,
          'Could not load expense records and financial summary'
        )
      );

      return false;
    } finally {
      if (mounted.current && request === requestId.current) {
        setLoading(false);
      }
    }
  }, [selectedMonth]);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      ++requestId.current;
    };
  }, []);

  useEffect(() => {
    setError('');
    loadData();

    const refresh = () => {
      if (!actionLock.current) loadData();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-finances-updated', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      ++requestId.current;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-finances-updated', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openModal = () => {
    if (actionLock.current) return;

    setFormData(initialForm());
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!actionLock.current) setIsModalOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (actionLock.current) return;

    setFormError('');

    const amount = Number(formData.amount);

    if (!formData.title.trim()) {
      setFormError('Please enter an expense title.');
      return;
    }

    if (!categories.includes(formData.category)) {
      setFormError('Please select a valid category.');
      return;
    }

    if (
      !String(formData.amount).trim() ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(amount - roundMoney(amount)) > 0.0000001
    ) {
      setFormError(
        'Amount must be greater than zero, with at most 2 decimal places.'
      );
      return;
    }

    if (!validDate(formData.date)) {
      setFormError('Please select a valid expense date.');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      category: formData.category,
      amount: roundMoney(amount),
      date: formData.date,
      description: formData.description.trim(),
      paidBy: formData.paidBy.trim() || 'Khalil Plaza',
    };

    actionLock.current = true;
    ++requestId.current;

    setLoading(false);
    setBusy('create');
    setError('');
    setSuccessMsg('');

    try {
      const response = await createExpense(payload);

      if (!mounted.current) return;

      setIsModalOpen(false);
      setFormData(initialForm());

      const outsideCurrentFilter =
        selectedMonth &&
        payload.date.slice(0, 7) !== selectedMonth;

      setSuccessMsg(
        outsideCurrentFilter
          ? `Expense saved for ${payload.date.slice(0, 7)}. Select that month or All Months to view it.`
          : response.message || 'Expense saved successfully.'
      );

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      const message = getErrorMessage(
        requestError,
        'Could not save expense'
      );

      if (
        !requestError.response ||
        requestError.response.status >= 500
      ) {
        setIsModalOpen(false);

        await loadData();

        if (mounted.current) {
          setError(
            `${message}. The expense may already be saved. Check its date/month or All Months before submitting it again.`
          );
        }
      } else {
        setFormError(message);
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) setBusy('');
    }
  };

  const handleDelete = async (expense) => {
    if (actionLock.current) return;

    const confirmed = window.confirm(
      `Delete "${expense.title}" — ${money(expense.amount)}?`
    );

    if (!confirmed) return;

    actionLock.current = true;
    ++requestId.current;

    setLoading(false);
    setBusy(`delete:${expense._id}`);
    setError('');
    setSuccessMsg('');

    try {
      await deleteExpense(expense._id);

      if (!mounted.current) return;

      setRecords({
        month: selectedMonth,
        expenses: [],
        summary: null,
      });

      setSuccessMsg('Expense deleted successfully.');

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      await loadData();

      if (mounted.current) {
        setError(
          `${getErrorMessage(
            requestError,
            'Could not confirm deletion'
          )}. Check the refreshed expense list.`
        );
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) setBusy('');
    }
  };

  const hasCurrentData =
    records.month === selectedMonth &&
    records.summary !== null &&
    !loading;

  const expenses = hasCurrentData ? records.expenses : [];
  const summary = hasCurrentData ? records.summary : null;

  const periodLabel = selectedMonth || 'All months';
  const netProfitLoss = number(summary?.netProfitLoss);

  // ============ FILTER ============
  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesCategory =
        !categoryFilter || expense.category === categoryFilter;

      const searchableText = [
        expense.title,
        expense.category,
        expense.description,
        expense.paidBy,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesCategory && (!query || searchableText.includes(query))
      );
    });
  }, [expenses, search, categoryFilter]);

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
              Building expenses
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Track expenses, collections and net profit or loss.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setError('');
                loadData();
              }}
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
              onClick={openModal}
              disabled={Boolean(busy)}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              Log expense
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

        {/* ============ MONTH FILTER ============ */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[200px_auto_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-slate-600">
                Filter by month
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value);
                  setError('');
                  setSuccessMsg('');
                }}
                disabled={Boolean(busy)}
                className={inputClass}
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth('');
                  setError('');
                  setSuccessMsg('');
                }}
                disabled={Boolean(busy) || !selectedMonth}
                className={secondaryButton}
              >
                All months
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Showing: <strong className="text-slate-700">{periodLabel}</strong>
            {' '}· Expense list and summary use the same period.
          </p>
        </div>

        {/* ============ STATE CARDS ============ */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            [
              'Total revenue',
              summary ? money(summary.totalRevenue) : '—',
              TrendingUp,
              'bg-emerald-50 text-emerald-600',
            ],
            [
              'Total expenses',
              summary ? money(summary.totalExpenses) : '—',
              TrendingDown,
              'bg-rose-50 text-rose-600',
            ],
            [
              'Net profit / loss',
              summary ? money(netProfitLoss) : '—',
              DollarSign,
              !summary
                ? 'bg-slate-100 text-slate-500'
                : netProfitLoss < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-600',
            ],
            [
              'Expense records',
              expenses.length,
              FileText,
              'bg-indigo-50 text-indigo-600',
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
                {loaded && summary ? value : loaded ? value : '—'}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                {periodLabel}
              </p>
            </div>
          ))}
        </div>

        {/* ============ LIST SECTION ============ */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                Expense records
              </h2>
              <span
                aria-live="polite"
                className="text-xs text-slate-400"
              >
                {loading
                  ? 'Refreshing…'
                  : loaded
                    ? `${filteredExpenses.length} matching`
                    : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  aria-label="Search expenses"
                  placeholder="Search title, category, description..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className={inputClass}
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
              <span className="sr-only">Loading expenses...</span>
            </div>
          ) : !filteredExpenses.length ? (
            <div className="px-6 py-16 text-center">
              <Wallet className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="font-bold text-slate-800">
                {!loaded
                  ? 'Could not load expenses'
                  : 'No expenses found'}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {!loaded
                  ? 'Refresh to try again.'
                  : `No expense records for ${periodLabel}.`}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {filteredExpenses.map((expense) => (
                  <article
                    key={expense._id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="break-words font-bold text-slate-900">
                          {expense.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="h-3 w-3" />
                          {displayDate(expense.date)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Badge value={expense.category} />
                    </div>

                    {expense.description && (
                      <p className="mt-3 break-words text-xs leading-5 text-slate-500">
                        {expense.description}
                      </p>
                    )}

                    <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Paid by</dt>
                        <dd className="text-slate-700">
                          {expense.paidBy || 'Khalil Plaza'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">Amount</dt>
                        <dd className="font-bold text-rose-600">
                          {money(expense.amount)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(expense)}
                        disabled={Boolean(busy) || loading}
                        className={`${buttonClass} w-full bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
                      >
                        <Trash2 className="h-4 w-4" />
                        {busy === `delete:${expense._id}`
                          ? 'Deleting…'
                          : 'Delete'}
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
                        'Date',
                        'Title',
                        'Category',
                        'Description',
                        'Paid by',
                        'Amount',
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
                    {filteredExpenses.map((expense) => (
                      <tr
                        key={expense._id}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-xs">
                          <span className="inline-flex items-center gap-2 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {displayDate(expense.date)}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {expense.title}
                        </td>

                        <td className="px-5 py-4">
                          <Badge value={expense.category} />
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[220px] break-words text-xs leading-5 text-slate-500">
                            {expense.description || '—'}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          {expense.paidBy || 'Khalil Plaza'}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-rose-600">
                          {money(expense.amount)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => handleDelete(expense)}
                            disabled={Boolean(busy) || loading}
                            aria-label={`Delete ${expense.title}`}
                            className={`${buttonClass} bg-rose-50 px-3 text-rose-600 hover:bg-rose-100`}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* ==================== CREATE MODAL ==================== */}

      {isModalOpen && (
        <Modal
          title="Log building expense"
          description="Record a new expense with its category and date."
          icon={Wallet}
          onClose={closeModal}
          busy={Boolean(busy)}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5">
              {formError && <Notice>{formError}</Notice>}

              <fieldset disabled={Boolean(busy)} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Expense title
                  </span>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Generator Fuel"
                    required
                    autoFocus
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Category
                  </span>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Amount (PKR)
                    </span>
                    <input
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Expense date
                    </span>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Paid by
                  </span>
                  <input
                    type="text"
                    name="paidBy"
                    value={formData.paidBy}
                    onChange={handleChange}
                    placeholder="Khalil Plaza"
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Description (optional)
                  </span>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief details about the expense..."
                    className={`${inputClass} resize-y`}
                  />
                </label>
              </fieldset>
            </div>

            <ModalFooter>
              <button
                type="button"
                onClick={closeModal}
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
                {busy === 'create' ? 'Saving…' : 'Save expense'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ExpensesPage;