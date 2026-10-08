import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/reports`;

// Generate monthly report
export const generateMonthlyReport = async (monthYear) => {
  const response = await axios.post(`${API_URL}/generate`, { monthYear });
  return response.data;
};

// Get all reports with optional filters
export const fetchReports = async (startMonth, endMonth) => {
  let url = `${API_URL}`;
  const params = new URLSearchParams();
  
  if (startMonth) params.append('startMonth', startMonth);
  if (endMonth) params.append('endMonth', endMonth);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await axios.get(url);
  return response.data;
};

// Get single month report
export const fetchMonthReport = async (monthYear) => {
  const response = await axios.get(`${API_URL}/${monthYear}`);
  return response.data;
};

// Get tenant-wise report
export const fetchTenantReport = async (tenantId, startMonth, endMonth) => {
  let url = `${API_URL}/tenant/details?tenantId=${tenantId}`;
  
  if (startMonth) url += `&startMonth=${startMonth}`;
  if (endMonth) url += `&endMonth=${endMonth}`;
  
  const response = await axios.get(url);
  return response.data;
};

// Get shop-wise report
export const fetchShopReport = async (shopId, startMonth, endMonth) => {
  let url = `${API_URL}/shop/details?shopId=${shopId}`;
  
  if (startMonth) url += `&startMonth=${startMonth}`;
  if (endMonth) url += `&endMonth=${endMonth}`;
  
  const response = await axios.get(url);
  return response.data;
};

// Get comparison/trend report
export const fetchComparisonReport = async (startMonth, endMonth) => {
  const response = await axios.get(
    `${API_URL}/comparison/trend?startMonth=${startMonth}&endMonth=${endMonth}`
  );
  return response.data;
};