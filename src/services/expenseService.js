import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/expenses`;

export const fetchExpenses = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await axios.post(`${API_URL}/create`, expenseData);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await axios.delete(`${API_URL}/delete/${id}`);
  return response.data;
};

// New function to fetch Net Profit/Loss Financial Summary
export const fetchFinancialSummary = async (month = '') => {
  const url = month ? `${API_URL}/summary?month=${month}` : `${API_URL}/summary`;
  const response = await axios.get(url);
  return response.data;
};