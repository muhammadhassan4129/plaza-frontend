import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(
  /\/+$/,
  ''
);

const API_URL = `${API_BASE}/invoices`;

const notifyFinancialUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plaza-finances-updated'));
  }
};

// Get all invoices
export const fetchInvoices = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

// Create monthly invoice
export const createInvoice = async (invoiceData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    invoiceData
  );

  notifyFinancialUpdate();

  return response.data;
};

// paymentAmount = amount received THIS TIME.
// expectedPaidAmount = cumulative paid amount shown before submission.
export const updateInvoicePayment = async (id, paymentData) => {
  const response = await axios.put(
    `${API_URL}/update-payment/${encodeURIComponent(id)}`,
    paymentData
  );

  notifyFinancialUpdate();

  return response.data;
};

// Delete invoice
export const deleteInvoice = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyFinancialUpdate();

  return response.data;
};