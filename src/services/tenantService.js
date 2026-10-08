import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/tenants`;

// Get all tenants
export const fetchTenants = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

// Create a tenant
export const createTenant = async (tenantData) => {
  const response = await axios.post(`${API_URL}/create`, tenantData);
  return response.data;
};

// Delete a tenant
export const deleteTenant = async (id) => {
  const response = await axios.delete(`${API_URL}/delete/${id}`);
  return response.data;
};