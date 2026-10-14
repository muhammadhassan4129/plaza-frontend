import axios from 'axios';

const API_BASE = (
  process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

const API_URL = `${API_BASE}/agreements`;

// Notify related pages after a successful change.
const notifyUpdate = () => {
  if (typeof window === 'undefined') return;

  [
    'plaza-agreements-updated',
    'plaza-finances-updated',
    'plaza-shops-updated',
    'plaza-tenants-updated',
  ].forEach((eventName) => {
    window.dispatchEvent(new Event(eventName));
  });
};

const readArray = (body, label) => {
  const data = Array.isArray(body) ? body : body?.data;

  if (!Array.isArray(data)) {
    throw new Error(`Invalid ${label} response from server`);
  }

  return data;
};

// ==================== GET AGREEMENTS ====================

export const fetchAgreements = async () => {
  const response = await axios.get(`${API_URL}/get`);

  return response.data;
};

// ==================== FORM DATA ====================

// The edit form will merge the agreement's current occupied
// shops with these available shops.
export const fetchAgreementFormData = async () => {
  const [shopsResponse, tenantsResponse] = await Promise.all([
    axios.get(`${API_BASE}/shops`),
    axios.get(`${API_BASE}/tenants/get`),
  ]);

  return {
    availableShops: readArray(
      shopsResponse.data,
      'shops'
    ).filter((shop) => shop.status === 'Available'),

    tenants: readArray(tenantsResponse.data, 'tenants'),
  };
};

// ==================== CREATE AGREEMENT ====================

export const createAgreement = async (agreementData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    agreementData
  );

  notifyUpdate();

  return response.data;
};

// ==================== UPDATE AGREEMENT ====================

// agreementData must include:
// expectedSnapshot: the agreement's original editSnapshot,
// captured when the edit form was opened.
export const updateAgreement = async (id, agreementData) => {
  const response = await axios.put(
    `${API_URL}/update/${encodeURIComponent(id)}`,
    agreementData
  );

  notifyUpdate();

  return response.data;
};

// ==================== TERMINATE AGREEMENT ====================

// Existing endpoint retained: terminates the agreement
// while preserving its history.
export const deleteAgreement = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyUpdate();

  return response.data;
};