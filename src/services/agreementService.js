import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(
  /\/+$/,
  ''
);

const API_URL = `${API_BASE}/agreements`;

const notifyUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('plaza-agreements-updated'));
    window.dispatchEvent(new Event('plaza-finances-updated'));
  }
};

const readArray = (body, label) => {
  const data = Array.isArray(body) ? body : body?.data;

  if (!Array.isArray(data)) {
    throw new Error(`Invalid ${label} response from server`);
  }

  return data;
};

export const fetchAgreements = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

// Uses the same shop and tenant URLs as your existing page.
export const fetchAgreementFormData = async () => {
  const [shopsResponse, tenantsResponse] = await Promise.all([
    axios.get(`${API_BASE}/shops`),
    axios.get(`${API_BASE}/tenants/get`),
  ]);

  return {
    availableShops: readArray(shopsResponse.data, 'shops').filter(
      (shop) => shop.status === 'Available'
    ),
    tenants: readArray(tenantsResponse.data, 'tenants'),
  };
};

export const createAgreement = async (agreementData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    agreementData
  );

  notifyUpdate();

  return response.data;
};

// Existing endpoint retained; its actual behavior is defined by backend.
export const deleteAgreement = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyUpdate();

  return response.data;
};