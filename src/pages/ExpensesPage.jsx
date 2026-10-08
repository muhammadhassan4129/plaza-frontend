import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
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

// Use the user's local calendar date for the form.
// Do not use toISOString() to choose today's date.
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
  paidBy: 'Plaza Management',
});

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// Match the UTC calendar-date convention used by the backend.
const displayDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toISOString().slice(0, 10);
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-900 ' +
  'text-sm bg-white disabled:opacity-60';

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 ' +
  'rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-sm ' +
  'font-medium disabled:opacity-50 disabled:cursor-not-allowed';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 ' +
  'rounded-xl border border-slate-300 text-slate-700 text-sm ' +
  'hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed';

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

// ==================== PAGE ====================

const ExpensesPage = () => {
  // Empty string means all months.
  const [selectedMonth, setSelectedMonth] = useState('');

  // Store the period with the response so old data is never
  // presented under a newly selected month.
  const [records, setRecords] = useState({
    month: null,
    expenses: [],
    summary: null,
  });

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

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

    if (mounted.current) {
      setLoading(true);
    }

    try {
      // Both requests use exactly the same selected month.
      const [expenseResponse, summaryResponse] = await Promise.all([
        fetchExpenses(selectedMonth),
        fetchFinancialSummary(selectedMonth),
      ]);

      if (!mounted.current || request !== requestId.current) {
        return false;
      }

      if (!summaryResponse.data) {
        throw new Error('Financial summary was not returned by the server');
      }

      setRecords({
        month: selectedMonth,
        expenses: expenseResponse.data || [],
        summary: summaryResponse.data,
      });

      return true;
    } catch (requestError) {
      if (!mounted.current || request !== requestId.current) {
        return false;
      }

      // Do not show stale totals as if they were current.
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
      // Mutations explicitly refresh after they finish.
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

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const onEscape = (event) => {
      if (event.key === 'Escape' && !actionLock.current) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', onEscape);

    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [isModalOpen]);

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
      // Send YYYY-MM-DD directly. Backend stores the calendar date.
      date: formData.date,
      description: formData.description.trim(),
      paidBy: formData.paidBy.trim() || 'Plaza Management',
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

      // loadData handles refresh errors separately.
      // A failed refresh does not mean expense creation failed.
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

      // Clear the old totals until both requests return.
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

  const periodLabel = selectedMonth || 'All Months';
  const netProfitLoss = number(summary?.netProfitLoss);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-blue-900" />
            Building Expenses & Maintenance
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Track expenses, collections and net profit or loss.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          disabled={Boolean(busy)}
          className={buttonClass}
        >
          <Plus className="w-4 h-4" />
          Log Expense
        </button>
      </header>

      {error && <Alert>{error}</Alert>}
      {successMsg && <Alert success>{successMsg}</Alert>}

      {/* ==================== MONTH FILTER ==================== */}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-64">
            <Field label="Filter by month">
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
            </Field>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedMonth('');
              setError('');
              setSuccessMsg('');
            }}
            disabled={Boolean(busy) || !selectedMonth}
            className={secondaryButtonClass}
          >
            All Months
          </button>

          <button
            type="button"
            onClick={() => {
              setError('');
              loadData();
            }}
            disabled={loading || Boolean(busy)}
            className={secondaryButtonClass}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <p className="text-sm text-slate-600 mt-4">
          Showing: <strong>{periodLabel}</strong>. The expense list
          and summary use the same period.
        </p>
      </section>

      {/* ==================== SUMMARY ==================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Total Revenue
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-2">
              {summary ? money(summary.totalRevenue) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {periodLabel}
            </p>
          </div>

          <TrendingUp className="w-8 h-8 text-emerald-600" />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Total Expenses
            </p>
            <p className="text-2xl font-extrabold text-rose-600 mt-2">
              {summary ? money(summary.totalExpenses) : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {periodLabel}
            </p>
          </div>

          <TrendingDown className="w-8 h-8 text-rose-600" />
        </div>

        <div
          className={`p-6 rounded-2xl shadow-sm flex justify-between items-center gap-3 text-white ${
            !summary
              ? 'bg-slate-700'
              : netProfitLoss < 0
                ? 'bg-rose-900'
                : 'bg-emerald-900'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase opacity-80">
              Net Profit / Loss
            </p>
            <p className="text-2xl font-extrabold mt-2">
              {summary ? money(netProfitLoss) : '—'}
            </p>
            <p className="text-xs mt-2">
              {summary?.status || periodLabel}
            </p>
          </div>

          <DollarSign className="w-8 h-8" />
        </div>
      </div>

      {/* ==================== EXPENSE TABLE ==================== */}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white text-xs uppercase">
              <tr>
                {[
                  'Date',
                  'Title',
                  'Category',
                  'Description',
                  'Paid By',
                  'Amount',
                  'Actions',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="py-4 px-4 whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!hasCurrentData ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-slate-500"
                  >
                    {loading
                      ? 'Loading expenses and summary...'
                      : 'Data unavailable. Please refresh.'}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-10 text-slate-500"
                  >
                    No expenses found for {periodLabel}.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-slate-50">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {displayDate(expense.date)}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {expense.title}
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-100">
                        {expense.category}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {expense.description || '—'}
                    </td>

                    <td className="py-4 px-4">
                      {expense.paidBy || 'Plaza Management'}
                    </td>

                    <td className="py-4 px-4 font-bold text-rose-600 whitespace-nowrap">
                      {money(expense.amount)}
                    </td>

                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(expense)}
                        disabled={Boolean(busy) || loading}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {busy === `delete:${expense._id}`
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CREATE MODAL ==================== */}

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-modal-title"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center gap-4">
              <h3
                id="expense-modal-title"
                className="text-lg font-bold"
              >
                Log Building Expense
              </h3>

              <button
                type="button"
                onClick={closeModal}
                disabled={Boolean(busy)}
                aria-label="Close expense form"
                className="disabled:opacity-40"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && <Alert>{formError}</Alert>}

              <fieldset disabled={Boolean(busy)} className="space-y-5">
                <Field label="Expense Title">
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
                </Field>

                <Field label="Category">
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
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Amount (PKR)">
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
                  </Field>

                  <Field label="Expense Date">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>

                <p className="text-xs text-slate-500">
                  This expense will appear in the report for its selected
                  date: {formData.date || 'choose a date'}.
                </p>

                <Field label="Paid By">
                  <input
                    type="text"
                    name="paidBy"
                    value={formData.paidBy}
                    onChange={handleChange}
                    placeholder="Plaza Management"
                    className={inputClass}
                  />
                </Field>

                <Field label="Description (Optional)">
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief details about the expense..."
                    className={`${inputClass} resize-none`}
                  />
                </Field>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className={secondaryButtonClass}
                  >
                    Cancel
                  </button>

                  <button type="submit" className={buttonClass}>
                    {busy === 'create' ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;