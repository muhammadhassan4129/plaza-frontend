import axios from 'axios';

const API_BASE = (
  process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

export const fetchDashboardData = async (month = '') => {
  const response = await axios.get(`${API_BASE}/dashboard`, {
    params: month ? { month } : {},
  });

  return response.data;
};