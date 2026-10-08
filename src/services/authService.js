import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const loginAdmin = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, { email, password });
  if (response.data.success && response.data.data.token) {
    localStorage.setItem('adminToken', JSON.stringify(response.data.data));
  }
  return response.data;
};


export const getCurrentAdmin = () => {
  const admin = localStorage.getItem('adminToken');
  return admin ? JSON.parse(admin) : null;
};

export const logoutAdmin = async () => {
  try {
    await axios.post(`${API_URL}/logout`);
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  }
};