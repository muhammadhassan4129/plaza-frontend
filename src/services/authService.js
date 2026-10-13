import axios from 'axios';

// Agar aapka environment variable define nahi hai toh fallback URL use kar lein
const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth`;

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
    const adminData = getCurrentAdmin();
    if (adminData && adminData.token) {
      await axios.post(`${API_URL}/logout`, {}, {
        headers: { Authorization: `Bearer ${adminData.token}` }
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  }
};

export const updateProfile = async (userData) => {
  const adminData = getCurrentAdmin();
  const response = await axios.put(`${API_URL}/profile`, userData, {
    headers: { Authorization: `Bearer ${adminData?.token}` }
  });
  if (response.data.success && response.data.data) {

    const updatedInfo = { ...adminData, ...response.data.data, token: adminData.token };
    localStorage.setItem('adminToken', JSON.stringify(updatedInfo));
  }
  return response.data;
};

export const createManager = async (managerData) => {
  const adminData = getCurrentAdmin();
  const response = await axios.post(`${API_URL}/managers`, managerData, {
    headers: { Authorization: `Bearer ${adminData?.token}` }
  });
  return response.data;
};

export const getManagers = async () => {
  const adminData = getCurrentAdmin();
  const response = await axios.get(`${API_URL}/managers`, {
    headers: { Authorization: `Bearer ${adminData?.token}` }
  });
  return response.data;
};

export const deleteManager = async (managerId) => {
  const adminData = getCurrentAdmin();
  const response = await axios.delete(`${API_URL}/managers/${managerId}`, {
    headers: { Authorization: `Bearer ${adminData?.token}` }
  });
  return response.data;
};

export const updateManager = async (managerId, managerData) => {
  const adminData = getCurrentAdmin();
  const response = await axios.put(`${API_URL}/managers/${managerId}`, managerData, {
    headers: { Authorization: `Bearer ${adminData?.token}` }
  });
  return response.data;
};