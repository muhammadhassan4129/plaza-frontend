import axios from 'axios';

const API_BASE = (
  process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

const API_URL = `${API_BASE}/shops`;

const notifyChanges = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('plaza-shops-updated'));
  window.dispatchEvent(new Event('plaza-agreements-updated'));
  window.dispatchEvent(new Event('plaza-finances-updated'));
};

export const fetchShops = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createShop = async (shopData) => {
  const response = await axios.post(API_URL, shopData);
  notifyChanges();
  return response.data;
};

export const updateShop = async (id, shopData) => {
  const response = await axios.put(
    `${API_URL}/${encodeURIComponent(id)}`,
    shopData
  );

  notifyChanges();
  return response.data;
};

export const deleteShop = async (id) => {
  const response = await axios.delete(
    `${API_URL}/${encodeURIComponent(id)}`
  );

  notifyChanges();
  return response.data;
};