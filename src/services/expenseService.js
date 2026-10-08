import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(
  /\/+$/,
  ''
);

const API_URL = `${API_BASE}/expenses`;

const notifyFinancialUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plaza-finances-updated'));
  }
};

// Empty month means all-time expenses.
export const fetchExpenses = async (month = '') => {
  const response = await axios.get(`${API_URL}/get`, {
    params: {
      month: month || undefined,
    },
  });

  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    expenseData
  );

  notifyFinancialUpdate();

  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyFinancialUpdate();

  return response.data;
};

export const fetchFinancialSummary = async (month = '') => {
  const response = await axios.get(`${API_URL}/summary`, {
    params: {
      month: month || undefined,
    },
  });

  return response.data;
};