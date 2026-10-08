import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_URL || '/api').replace(
  /\/+$/,
  ''
);

const API_URL = `${API_BASE}/reports`;

export const generateMonthlyReport = async (monthYear) => {
  const response = await axios.post(`${API_URL}/generate`, {
    monthYear,
  });

  return response.data;
};

export const fetchReports = async (startMonth, endMonth) => {
  const response = await axios.get(API_URL, {
    params: {
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    },
  });

  return response.data;
};

export const fetchMonthReport = async (monthYear) => {
  const response = await axios.get(
    `${API_URL}/${encodeURIComponent(monthYear)}`
  );

  return response.data;
};

export const fetchTenantReport = async (
  tenantId,
  startMonth,
  endMonth
) => {
  const response = await axios.get(`${API_URL}/tenant/details`, {
    params: {
      tenantId,
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    },
  });

  return response.data;
};

export const fetchShopReport = async (
  shopId,
  startMonth,
  endMonth
) => {
  const response = await axios.get(`${API_URL}/shop/details`, {
    params: {
      shopId,
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    },
  });

  return response.data;
};

export const fetchComparisonReport = async (
  startMonth,
  endMonth
) => {
  const response = await axios.get(`${API_URL}/comparison/trend`, {
    params: {
      startMonth,
      endMonth,
    },
  });

  return response.data;
};

// Download the actual file and surface backend errors.
const downloadFile = async (path, filename, params = {}) => {
  try {
    const response = await axios.get(`${API_BASE}/exports/${path}`, {
      params,
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  } catch (error) {
    let message = error.response?.data?.message || 'Download failed';

    if (error.response?.data instanceof Blob) {
      try {
        const body = JSON.parse(await error.response.data.text());
        message = body.error || body.message || message;
      } catch {
        message = 'Download failed. Please check the export endpoint.';
      }
    }

    throw new Error(message);
  }
};

export const exportReportPDF = (monthYear) =>
  downloadFile(
    `report/pdf/${encodeURIComponent(monthYear)}`,
    `Report_${monthYear}.pdf`
  );

export const exportReportsExcel = (startMonth, endMonth) =>
  downloadFile('reports/excel', 'Reports.xlsx', {
    startMonth: startMonth || undefined,
    endMonth: endMonth || undefined,
  });

  export const exportTenantExcel = (tenantId, startMonth, endMonth) =>
  downloadFile(
    `tenant/excel/${encodeURIComponent(tenantId)}`,
    `Tenant_${tenantId}.xlsx`,
    {
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    }
  );

export const exportShopExcel = (shopId, startMonth, endMonth) =>
  downloadFile(
    `shop/excel/${encodeURIComponent(shopId)}`,
    `Shop_${shopId}.xlsx`,
    {
      startMonth: startMonth || undefined,
      endMonth: endMonth || undefined,
    }
  );