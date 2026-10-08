import axios from 'axios';

const API_BASE = (
  process.env.REACT_APP_API_URL || '/api'
).replace(/\/+$/, '');

const API_URL = `${API_BASE}/tenants`;

const notifyChanges = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('plaza-tenants-updated'));
  window.dispatchEvent(new Event('plaza-agreements-updated'));
  window.dispatchEvent(new Event('plaza-finances-updated'));
};

export const fetchTenants = async () => {
  const response = await axios.get(`${API_URL}/get`);
  return response.data;
};

export const createTenant = async (tenantData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    tenantData
  );

  notifyChanges();
  return response.data;
};

export const deleteTenant = async (id) => {
  const response = await axios.delete(
    `${API_URL}/delete/${encodeURIComponent(id)}`
  );

  notifyChanges();
  return response.data;
};

// Uses the existing live tenant-report endpoint.
export const fetchTenantLedger = async (tenantId) => {
  const response = await axios.get(
    `${API_BASE}/reports/tenant/details`,
    { params: { tenantId } }
  );

  return response.data;
};

// For relative document paths, this must point to the server
// location under which uploaded files are already served.
export const getTenantDocumentUrl = (documentPath) => {
  if (
    typeof documentPath !== 'string' ||
    !documentPath.trim()
  ) {
    return null;
  }

  const raw = documentPath.trim().replace(/\\/g, '/');

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      return url.href;
    }

    // Reject unsupported URL schemes and protocol-relative URLs.
    if (/^[a-z][a-z\d+.-]*:/i.test(raw) || raw.startsWith('//')) {
      return null;
    }

    const base = (
      process.env.REACT_APP_FILE_BASE_URL ||
      API_BASE.replace(/\/api$/i, '') ||
      '/'
    ).replace(/\/?$/, '/');

    const baseUrl = new URL(base, window.location.origin);

    if (!['http:', 'https:'].includes(baseUrl.protocol)) {
      return null;
    }

    // Support common absolute disk paths ending in /uploads/...
    const uploadsIndex = raw.indexOf('/uploads/');
    const relativePath = uploadsIndex >= 0
      ? raw.slice(uploadsIndex + 1)
      : raw.replace(/^\.?\//, '');

    const parts = relativePath.split('/');

    if (parts.some((part) => part === '..')) return null;

    return new URL(
      parts.map(encodeURIComponent).join('/'),
      baseUrl
    ).href;
  } catch {
    return null;
  }
};