import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/agreements`;

// Get all agreements
export const fetchAgreements = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

// Create a new agreement
export const createAgreement = async (agreementData) => {
  const response = await axios.post(`${API_URL}/create`, agreementData);
  return response.data;
};

// Terminate/Delete agreement
export const deleteAgreement = async (id) => {
  const response = await axios.delete(`${API_URL}/delete/${id}`);
  return response.data;
};