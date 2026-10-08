import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  CheckCircle,
  Building,
  User,
  RefreshCw,
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

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm bg-white';

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 ' +
  'rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-medium ' +
  'text-sm disabled:opacity-50 disabled:cursor-not-allowed';

const cancelClass =
  'px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 ' +
  'hover:bg-slate-100 text-sm disabled:opacity-50';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase text-slate-600 mb-2">
      {label}
    </span>
    {children}
  </label>
);

const Alert = ({ children, type = 'error' }) => (
  <div
    role={type === 'error' ? 'alert' : 'status'}
    className={`p-4 rounded-xl border text-sm ${
      type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : type === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-800'
          : 'bg-red-50 border-red-200 text-red-700'
    }`}
  >
    {children}
  </div>
);

const Modal = ({ title, onClose, busy, children }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, busy]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex justify-between items-center gap-4">
          <h3 className="font-bold">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close dialog"
            className="disabled:opacity-40"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

// ==================== PAGE ====================

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);

  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [createError, setCreateError] = useState('');

  // Keep the original paid amount from when the payment form opened.
  // Backend rejects submission if another payment changed it.
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

    if (!mounted.current || request !== requestId.current) {
      return;
    }

    const errors = [];

    if (invoiceResult.status === 'fulfilled') {
      setInvoices(invoiceResult.value.data || []);
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

    if (errors.length) {
      setError(errors.join(' | '));
    }

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
        // The server may have saved the invoice before connection loss.
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

      // Update amounts immediately while preserving populated tenant/shop data.
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

      // Close the old form. Do not silently update expectedPaidAmount
      // and then resubmit the same amount.
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-blue-900" />
            Financial Ledger & Monthly Billing
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Monthly invoices, utilities and partial payments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError('');
              loadData();
            }}
            disabled={loading || Boolean(busy)}
            className={cancelClass}
          >
            <span className="flex items-center gap-2">
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />
              Refresh
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setIsCreateOpen(true);
            }}
            disabled={loading || Boolean(busy)}
            className={buttonClass}
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}
      {warning && <Alert type="warning">{warning}</Alert>}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase">
                {[
                  'Serial #',
                  'Month / Shop',
                  'Tenant',
                  'Rent & Utilities',
                  'Fine / Previous',
                  'Total / Paid / Due',
                  'Status & Mode',
                  'Actions',
                ].map((heading) => (
                  <th key={heading} className="py-4 px-4 whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {!invoices.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    {loading ? 'Loading invoices...' : 'No invoices found.'}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const remaining = roundMoney(
                    number(invoice.totalAmount) -
                      number(invoice.paidAmount)
                  );

                  const statusClass =
                    invoice.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : invoice.status === 'Partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800';

                  return (
                    <tr key={invoice._id} className="hover:bg-slate-50">
                      <td className="py-4 px-4 font-mono text-xs font-bold text-blue-900">
                        {invoice.invoiceNumber}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold">
                          {invoice.monthYear}
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Building className="w-3 h-3" />
                          {invoice.agreement?.shops
                            ?.map((shop) => `#${shop.shopNumber}`)
                            .join(', ') || '—'}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4 text-slate-400" />
                          {invoice.agreement?.tenant?.name || 'Unavailable'}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-xs space-y-1">
                        <div>Rent: {money(invoice.rentAmount)}</div>
                        <div>Electricity: {money(invoice.electricityCharges)}</div>
                        <div>Water: {money(invoice.waterCharges)}</div>
                        <div>Maintenance: {money(invoice.maintenanceFee)}</div>
                      </td>

                      <td className="py-4 px-4 text-xs space-y-1">
                        <div>Fine: {money(invoice.lateFine)}</div>
                        <div>Previous: {money(invoice.previousBalance)}</div>
                      </td>

                      <td className="py-4 px-4 text-xs space-y-1">
                        <div className="font-bold text-slate-900">
                          Total: {money(invoice.totalAmount)}
                        </div>
                        <div className="font-bold text-emerald-700">
                          Paid: {money(invoice.paidAmount)}
                        </div>
                        <div className="font-bold text-rose-700">
                          Due: {money(invoice.balanceDue)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                        >
                          {invoice.status}
                        </span>

                        <div className="text-xs text-slate-500 mt-2">
                          {invoice.paymentMode || 'None'}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {remaining > 0 && (
                            <button
                              type="button"
                              onClick={() => openPayment(invoice)}
                              disabled={Boolean(busy) || loading}
                              className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Pay
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(invoice)}
                            disabled={Boolean(busy) || loading}
                            aria-label={`Delete ${invoice.invoiceNumber}`}
                            className="bg-rose-50 text-rose-600 p-2 rounded-lg disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CREATE MODAL ==================== */}

      {isCreateOpen && (
        <Modal
          title="Generate Monthly Invoice"
          onClose={closeCreate}
          busy={Boolean(busy)}
        >
          <form onSubmit={handleCreate} className="p-6 space-y-5">
            {createError && <Alert>{createError}</Alert>}

            <fieldset disabled={Boolean(busy)} className="space-y-5">
              <Field label="Agreement / Tenant">
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
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Invoice Month">
                  <input
                    type="month"
                    name="monthYear"
                    value={formData.monthYear}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </Field>

                <Field label="Due Date">
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {amountFields.map(([name, label]) => (
                  <Field key={name} label={label}>
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
                  </Field>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span>Monthly Rent</span>
                  <strong>{money(selectedAgreement?.monthlyRent)}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Invoice Total</span>
                  <strong>{money(invoicePreview)}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreate}
                  className={cancelClass}
                >
                  Cancel
                </button>

                <button type="submit" className={buttonClass}>
                  {busy === 'create' ? 'Creating...' : 'Generate Invoice'}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}

      {/* ==================== PAYMENT MODAL ==================== */}

      {paymentInvoice && (
        <Modal
          title={`Record Payment — ${paymentInvoice.invoiceNumber}`}
          onClose={closePayment}
          busy={Boolean(busy)}
        >
          <form onSubmit={handlePayment} className="p-6 space-y-5">
            {paymentError && <Alert>{paymentError}</Alert>}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-3">
              <div className="flex justify-between gap-4">
                <span>Invoice Month</span>
                <strong>{paymentInvoice.monthYear}</strong>
              </div>

              <div className="flex justify-between gap-4">
                <span>Total Amount</span>
                <strong>{money(paymentInvoice.totalAmount)}</strong>
              </div>

              <div className="flex justify-between gap-4 text-emerald-700">
                <span>Already Paid</span>
                <strong>{money(paymentInvoice.paidAmount)}</strong>
              </div>

              <div className="flex justify-between gap-4 text-rose-700">
                <span>Remaining Balance</span>
                <strong>{money(paymentRemaining)}</strong>
              </div>
            </div>

            <fieldset disabled={Boolean(busy)} className="space-y-5">
              <Field label="Amount Received This Time">
                <input
                  type="number"
                  min="0.01"
                  max={paymentRemaining}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  placeholder="Enter this payment only"
                  required
                  autoFocus
                  className={inputClass}
                />
              </Field>

              <p className="text-xs text-slate-500">
                Enter only the new payment. Previously paid money is added automatically.
              </p>

              <button
                type="button"
                onClick={() => setPaymentAmount(String(paymentRemaining))}
                className="text-sm font-semibold text-blue-800"
              >
                Use full remaining balance: {money(paymentRemaining)}
              </button>

              <Field label="Payment Mode">
                <select
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value)}
                  className={inputClass}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </Field>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closePayment}
                  className={cancelClass}
                >
                  Cancel
                </button>

                <button type="submit" className={buttonClass}>
                  {busy === 'payment' ? 'Saving Payment...' : 'Record Payment'}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default InvoicesPage;