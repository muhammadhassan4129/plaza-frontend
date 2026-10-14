import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(
  /\/+$/,
  ''
);

const API_URL = `${API_BASE}/invoices`;

const notifyFinancialUpdate = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('plaza-invoices-updated'));
  window.dispatchEvent(new Event('plaza-finances-updated'));
  window.dispatchEvent(new Event('plaza-agreements-updated'));
};

export const fetchInvoices = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

export const createInvoice = async (invoiceData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    invoiceData
  );

  notifyFinancialUpdate();
  return response.data;
};

// Send editable charges and the original invoice.editSnapshot
// as expectedSnapshot.
export const updateInvoice = async (id, invoiceData) => {
  const response = await axios.put(
    `${API_URL}/update/${encodeURIComponent(id)}`,
    invoiceData
  );

  notifyFinancialUpdate();
  return response.data;
};

// paymentAmount: received THIS TIME.
// expectedPaidAmount: cumulative amount before submission.
export const updateInvoicePayment = async (id, paymentData) => {
  const response = await axios.put(
    `${API_URL}/update-payment/${encodeURIComponent(id)}`,
    paymentData
  );

  notifyFinancialUpdate();
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyFinancialUpdate();
  return response.data;
};