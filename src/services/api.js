import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Request interceptor to add token
API.interceptors.request.use((req) => {
  const adminData = localStorage.getItem('adminToken');
  if (adminData) {
    const { token } = JSON.parse(adminData);
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
}, (error) => {
  return Promise.reject(error);
});

export default API;