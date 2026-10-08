import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/invoices`;

// Get all invoices
export const fetchInvoices = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

// Create a monthly invoice
export const createInvoice = async (invoiceData) => {
  const response = await axios.post(`${API_URL}/create`, invoiceData);
  return response.data;
};

// Update invoice payment status (with Revenue tracking)
export const updateInvoicePayment = async (id, paymentData) => {
  const response = await axios.put(`${API_URL}/update-payment/${id}`, paymentData);
  // Revenue tracking ab automatically backend mein hoga
  return response.data;
};

// Delete invoice
export const deleteInvoice = async (id) => {
  const response = await axios.delete(`${API_URL}/delete/${id}`);
  return response.data;
};