import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/shops`;

// Get all shops
export const fetchShops = async () => {
  const response = await axios.get(`${API_URL}`); // Calls /api/shops
  return response.data;
};

// Create a shop
export const createShop = async (shopData) => {
  const response = await axios.post(`${API_URL}`, shopData);
  return response.data;
};

// Delete a shop
export const deleteShop = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};