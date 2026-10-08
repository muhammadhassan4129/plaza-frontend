import React, { useState, useEffect } from 'react';
import {
  generateMonthlyReport,
  fetchReports,
  fetchMonthReport,
  fetchTenantReport,
  fetchShopReport,
  fetchComparisonReport,
} from '../services/reportService';
import { fetchAgreements } from '../services/agreementService';
import { fetchTenants } from '../services/tenantService';
import { fetchShops } from '../services/shopService';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  X,
  Download,
  Filter,
  Calendar,
} from 'lucide-react';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [filterMonth, setFilterMonth] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  // Export states
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  // Dropdowns for detailed reports
  const [agreements, setAgreements] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [shops, setShops] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [tenantReport, setTenantReport] = useState(null);
  const [shopReport, setShopReport] = useState(null);
  const [comparisonReport, setComparisonReport] = useState(null);

  // Load initial data
  useEffect(() => {
    loadReports();
    loadDropdownData();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchReports(startMonth, endMonth);
      setReports(res.data || []);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    }
    setLoading(false);
  };

  const loadDropdownData = async () => {
    try {
      const [agrRes, tenRes, shopRes] = await Promise.all([
        fetchAgreements(),
        fetchTenants(),
        fetchShops(),
      ]);
      setAgreements(agrRes.data || []);
      setTenants(tenRes.data || []);
      setShops(shopRes.data || []);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!filterMonth) {
      setError('Please select a month');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await generateMonthlyReport(filterMonth);
      setSuccessMsg(res.message || 'Report generated successfully!');
      loadReports();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating report');
    }
    setLoading(false);
  };

  const handleTenantReport = async () => {
    if (!selectedTenant || !startMonth || !endMonth) {
      setError('Please select tenant and date range');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchTenantReport(selectedTenant, startMonth, endMonth);
      setTenantReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tenant report');
    }
    setLoading(false);
  };

  const handleShopReport = async () => {
    if (!selectedShop || !startMonth || !endMonth) {
      setError('Please select shop and date range');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchShopReport(selectedShop, startMonth, endMonth);
      setShopReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shop report');
    }
    setLoading(false);
  };

  const handleComparisonReport = async () => {
    if (!startMonth || !endMonth) {
      setError('Please select date range');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchComparisonReport(startMonth, endMonth);
      setComparisonReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comparison report');
    }
    setLoading(false);
  };

  // ===== EXPORT FUNCTIONS =====

  const handleExportReportPDF = (monthYear) => {
    if (!monthYear) {
      setError('Please select a report first');
      return;
    }
    setExportLoading(true);
    try {
      window.open(`/api/exports/report/pdf/${monthYear}`, '_blank');
      setSuccessMsg('📥 PDF downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to download PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportAllReportsExcel = () => {
    if (reports.length === 0) {
      setError('No reports available to export');
      return;
    }
    setExportLoading(true);
    try {
      window.open(`/api/exports/reports/excel`, '_blank');
      setSuccessMsg('📥 Excel file downloaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to download Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportInvoicePDF = (invoiceId, invoiceNumber) => {
    if (!invoiceId) {
      setError('Invoice ID is missing');
      return;
    }
    setExportLoading(true);
    try {
      window.open(`/api/exports/invoice/pdf/${invoiceId}`, '_blank');
      setSuccessMsg(`📥 Invoice ${invoiceNumber} downloaded!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to download invoice');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportTenantExcel = (tenantId) => {
    if (!tenantId) {
      setError('Please select a tenant first');
      return;
    }
    setExportLoading(true);
    try {
      window.open(`/api/exports/tenant/excel/${tenantId}`, '_blank');
      setSuccessMsg('📥 Tenant report exported!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to download tenant report');
    } finally {
      setExportLoading(false);
    }
  };

  const getDashboardMetrics = () => {
    if (reports.length === 0) return null;

    let selectedReport = null;
    
    if (filterMonth) {
      selectedReport = reports.find(r => r.monthYear === filterMonth);
    } else {
      selectedReport = reports[0];
    }

    if (!selectedReport) return null;

    const totalRevenue = reports.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalExpenses = reports.reduce((sum, r) => sum + r.totalExpenses, 0);
    const totalProfit = reports.reduce(
      (sum, r) => sum + (r.netProfit > 0 ? r.netProfit : 0),
      0
    );
    const avgCollectionRate = (
      reports.reduce((sum, r) => sum + parseFloat(r.collectionRate), 0) /
      reports.length
    ).toFixed(2);

    return {
      latestReport: selectedReport,
      totalRevenue,
      totalExpenses,
      totalProfit,
      avgCollectionRate,
    };
  };

  const metrics = getDashboardMetrics();

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-900" />
          Financial Reports & Analytics
        </h1>
        <p className="text-slate-500 text-sm">
          Comprehensive profit/loss analysis, tenant payment tracking, and shop-wise revenue reports
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 p-4 mb-6 rounded-r-xl flex justify-between items-center">
          <span>{successMsg}</span>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
        <div className="flex gap-0 overflow-x-auto">
          {[
            { id: 'dashboard', label: '📊 Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'monthly', label: '📅 Monthly Reports', icon: <Calendar className="w-4 h-4" /> },
            {
              id: 'tenant',
              label: '👤 Tenant-wise',
              icon: <Receipt className="w-4 h-4" />,
            },
            { id: 'shop', label: '🏪 Shop-wise', icon: <DollarSign className="w-4 h-4" /> },
            {
              id: 'comparison',
              label: '📈 Comparison',
              icon: <TrendingUp className="w-4 h-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-900 text-blue-900 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Month Filter Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📅 Select Month to View</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  View Report For
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900 bg-white"
                >
                  <option value="">📌 Latest Month</option>
                  {reports.map((report) => (
                    <option key={report._id} value={report.monthYear}>
                      📅 {report.monthYear}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700">
                    {filterMonth
                      ? `📊 Viewing: ${filterMonth}`
                      : `📊 Viewing: Latest Report (${reports[0]?.monthYear || 'No data available'})`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📥 Export Reports</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleExportReportPDF(filterMonth || reports[0]?.monthYear)}
                disabled={exportLoading || reports.length === 0}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'PDF Report'}
              </button>
              <button
                onClick={handleExportAllReportsExcel}
                disabled={exportLoading || reports.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'All Reports (Excel)'}
              </button>
            </div>
          </div>

          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Revenue</p>
                    <h3 className="text-3xl font-bold mt-1">
                      PKR {(metrics.totalRevenue / 1000).toFixed(1)}K
                    </h3>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
                <p className="text-blue-100 text-xs">
                  {reports.length} months tracked
                </p>
              </div>

              {/* Total Expenses */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Total Expenses</p>
                    <h3 className="text-3xl font-bold mt-1">
                      PKR {(metrics.totalExpenses / 1000).toFixed(1)}K
                    </h3>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-200" />
                </div>
                <p className="text-orange-100 text-xs">Maintenance, utilities & salaries</p>
              </div>

              {/* Total Profit */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">Net Profit</p>
                    <h3 className="text-3xl font-bold mt-1">
                      PKR {(metrics.totalProfit / 1000).toFixed(1)}K
                    </h3>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-200" />
                </div>
                <p className="text-emerald-100 text-xs">
                  {((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1)}% margin
                </p>
              </div>

              {/* Collection Rate */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Collection Rate</p>
                    <h3 className="text-3xl font-bold mt-1">{metrics.avgCollectionRate}%</h3>
                  </div>
                  <Receipt className="w-8 h-8 text-purple-200" />
                </div>
                <p className="text-purple-100 text-xs">Payment discipline</p>
              </div>
            </div>
          )}

          {/* Latest Month Summary */}
          {metrics && metrics.latestReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                {filterMonth 
                  ? `📊 Details: ${metrics.latestReport.monthYear}` 
                  : `📊 Latest Month: ${metrics.latestReport.monthYear}`}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Revenue Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800 text-sm uppercase text-slate-500">
                    Revenue Breakdown
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Rent Collected</span>
                      <span className="font-semibold text-slate-900">
                        PKR {metrics.latestReport.totalRentCollected.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Utilities</span>
                      <span className="font-semibold text-slate-900">
                        PKR {metrics.latestReport.totalUtilitiesCollected.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Late Fines</span>
                      <span className="font-semibold text-rose-600">
                        PKR {metrics.latestReport.totalLateFines.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between">
                      <span className="font-semibold text-slate-900">Total Revenue</span>
                      <span className="font-bold text-blue-600 text-base">
                        PKR {metrics.latestReport.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Status */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800 text-sm uppercase text-slate-500">
                    Invoice Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-emerald-600">✓ Paid</span>
                      <span className="font-semibold text-emerald-900">
                        {metrics.latestReport.invoicesPaid}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-rose-600">✗ Unpaid</span>
                      <span className="font-semibold text-rose-900">
                        {metrics.latestReport.invoicesUnpaid}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-600">⊕ Partial</span>
                      <span className="font-semibold text-amber-900">
                        {metrics.latestReport.invoicesPartial}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 text-xs">Outstanding</span>
                        <span className="font-bold text-rose-600">
                          PKR {metrics.latestReport.totalOutstanding.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profit & Loss */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-800 text-sm uppercase text-slate-500">
                    Profit & Loss
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Expenses</span>
                      <span className="font-semibold text-slate-900">
                        PKR {metrics.latestReport.totalExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={`border-t border-slate-200 pt-2 mt-2 flex justify-between ${
                        metrics.latestReport.netProfit > 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      <span className="font-semibold">
                        {metrics.latestReport.netProfit > 0 ? 'Net Profit' : 'Net Loss'}
                      </span>
                      <span className="font-bold text-base">
                        PKR {Math.abs(metrics.latestReport.netProfit).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Margin</span>
                      <span>{metrics.latestReport.profitMargin}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MONTHLY REPORTS */}
      {activeTab === 'monthly' && (
        <div>
          {/* Generate & Filter Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Generate Monthly Report</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Select Month & Year
                </label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={loading || !filterMonth}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Export Options Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📥 Export Options</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExportAllReportsExcel}
                disabled={exportLoading || reports.length === 0}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Download className="w-5 h-5" />
                {exportLoading ? 'Downloading...' : 'Export All Reports (Excel)'}
              </button>

              <button
                onClick={() => {
                  if (!selectedReport) {
                    setError('Please select a report first from the table');
                    return;
                  }
                  handleExportReportPDF(selectedReport.monthYear);
                }}
                disabled={exportLoading || !selectedReport}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Download className="w-5 h-5" />
                {exportLoading ? 'Downloading...' : 'Export Selected Report (PDF)'}
              </button>
            </div>
          </div>

          {/* Monthly Reports Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-semibold">Month</th>
                    <th className="py-4 px-6 font-semibold text-right">Total Revenue</th>
                    <th className="py-4 px-6 font-semibold text-right">Total Expenses</th>
                    <th className="py-4 px-6 font-semibold text-right">Net Profit/Loss</th>
                    <th className="py-4 px-6 font-semibold text-center">Profit Margin</th>
                    <th className="py-4 px-6 font-semibold text-center">Collection Rate</th>
                    <th className="py-4 px-6 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No reports generated yet. Generate one above.
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          {report.monthYear}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-blue-600">
                          PKR {report.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right font-semibold text-orange-600">
                          PKR {report.totalExpenses.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span
                            className={`font-bold ${
                              report.netProfit > 0
                                ? 'text-emerald-600'
                                : report.netProfit < 0
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            PKR {Math.abs(report.netProfit || report.netLoss || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center font-semibold text-slate-900">
                          {report.profitMargin}%
                        </td>
                        <td className="py-4 px-6 text-center font-semibold text-slate-900">
                          {report.collectionRate}%
                        </td>
                        <td className="py-4 px-6 text-center space-x-2 flex justify-center">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs hover:underline"
                            title="View details in modal"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleExportReportPDF(report.monthYear)}
                            disabled={exportLoading}
                            className="text-red-600 hover:text-red-800 font-medium text-xs hover:underline disabled:text-slate-400"
                            title="Download as PDF"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TENANT-WISE REPORT */}
      {activeTab === 'tenant' && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Tenant Payment History</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Select Tenant
                </label>
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">Choose tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Start Month
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  End Month
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <button
                onClick={handleTenantReport}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Export Section */}
          {tenantReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📥 Export Tenant Report</h3>
              <button
                onClick={() => handleExportTenantExcel(selectedTenant)}
                disabled={exportLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'Export as Excel'}
              </button>
            </div>
          )}

          {tenantReport && (
            <div className="space-y-6">
              {/* Tenant Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Tenant Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Name</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {tenantReport.tenantInfo.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">CNIC</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {tenantReport.tenantInfo.cnic}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Phone</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {tenantReport.tenantInfo.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">WhatsApp</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {tenantReport.tenantInfo.whatsapp || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-bold uppercase text-blue-600">Total Collected</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    PKR {tenantReport.financialSummary.totalCollected.toLocaleString()}
                  </p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                  <p className="text-xs font-bold uppercase text-rose-600">Outstanding</p>
                  <p className="text-2xl font-bold text-rose-900 mt-2">
                    PKR {tenantReport.financialSummary.totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs font-bold uppercase text-emerald-600">Avg Monthly</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    PKR {tenantReport.financialSummary.averageMonthlyPayment.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-bold uppercase text-purple-600">Payment Rate</p>
                  <p className="text-2xl font-bold text-purple-900 mt-2">
                    {tenantReport.financialSummary.paymentRate}%
                  </p>
                </div>
              </div>

              {/* Payment History Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h4 className="font-bold text-slate-900">Monthly Payment History</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-6 font-semibold text-slate-700">Month</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Invoice #
                        </th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">Rent</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Utilities
                        </th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">Total</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">Paid</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">Due</th>
                        <th className="py-3 px-6 font-semibold text-center text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenantReport.paymentHistory.map((payment, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-6 font-medium text-slate-900">
                            {payment.monthYear}
                          </td>
                          <td className="py-3 px-6 text-right text-slate-600 font-mono text-xs">
                            {payment.invoiceNumber}
                          </td>
                          <td className="py-3 px-6 text-right font-medium text-slate-900">
                            {payment.rentAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right font-medium text-slate-900">
                            {payment.utilities.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-slate-900">
                            {payment.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-emerald-600">
                            {payment.paidAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-rose-600">
                            {payment.balanceDue.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                payment.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : payment.status === 'Partial'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SHOP-WISE REPORT */}
      {activeTab === 'shop' && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Shop Revenue Analysis</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Select Shop
                </label>
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">Choose shop...</option>
                  {shops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      Shop #{shop.shopNumber} - {shop.floor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Start Month
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  End Month
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <button
                onClick={handleShopReport}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Export Section */}
          {shopReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📥 Export Shop Report</h3>
              <button
                onClick={() => handleExportTenantExcel(selectedShop)}
                disabled={exportLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'Export as Excel'}
              </button>
            </div>
          )}

          {shopReport && (
            <div className="space-y-6">
              {/* Shop Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Shop Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Shop Number</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      #{shopReport.shopInfo.shopNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Floor</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {shopReport.shopInfo.floor}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Type</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {shopReport.shopInfo.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Size</p>
                    <p className="text-slate-900 font-semibold mt-1">
                      {shopReport.shopInfo.sizeSqFt} Sq.Ft.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">Status</p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold inline-block mt-1 ${
                        shopReport.shopInfo.status === 'Occupied'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {shopReport.shopInfo.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-bold uppercase text-blue-600">Total Collected</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    PKR {shopReport.financialSummary.totalCollected.toLocaleString()}
                  </p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                  <p className="text-xs font-bold uppercase text-rose-600">Outstanding</p>
                  <p className="text-2xl font-bold text-rose-900 mt-2">
                    PKR {shopReport.financialSummary.totalOutstanding.toLocaleString()}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs font-bold uppercase text-purple-600">Invoices</p>
                  <p className="text-2xl font-bold text-purple-900 mt-2">
                    {shopReport.financialSummary.invoiceCount}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs font-bold uppercase text-emerald-600">Paid / Unpaid</p>
                  <p className="text-lg font-bold text-emerald-900 mt-2">
                    {shopReport.financialSummary.paidInvoices} /{' '}
                    {shopReport.financialSummary.unpaidInvoices}
                  </p>
                </div>
              </div>

              {/* Agreement History */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h4 className="font-bold text-slate-900">Tenant History</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-6 font-semibold text-slate-700">Tenant</th>
                        <th className="py-3 px-6 font-semibold text-slate-700">Start Date</th>
                        <th className="py-3 px-6 font-semibold text-slate-700">End Date</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Monthly Rent
                        </th>
                        <th className="py-3 px-6 font-semibold text-center text-slate-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {shopReport.agreementHistory.map((agreement, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-6 font-medium text-slate-900">
                            {agreement.tenant}
                          </td>
                          <td className="py-3 px-6 text-slate-600">
                            {new Date(agreement.startDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6 text-slate-600">
                            {new Date(agreement.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-6 text-right font-bold text-slate-900">
                            PKR {agreement.monthlyRent.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-center">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                agreement.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {agreement.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMPARISON REPORT */}
      {activeTab === 'comparison' && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Monthly Trend Analysis</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Start Month
                </label>
                <input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  End Month
                </label>
                <input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <button
                onClick={handleComparisonReport}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all"
              >
                {loading ? 'Loading...' : 'Generate Analysis'}
              </button>
            </div>
          </div>

          {/* Export Section */}
          {comparisonReport && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">📥 Export Comparison Report</h3>
              <button
                onClick={handleExportAllReportsExcel}
                disabled={exportLoading || reports.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exporting...' : 'Export as Excel'}
              </button>
            </div>
          )}

          {comparisonReport && (
            <div className="space-y-6">
              {/* Period Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-bold uppercase text-blue-600">Period</p>
                  <p className="text-lg font-bold text-blue-900 mt-2">
                    {comparisonReport.periodSummary.startMonth} to{' '}
                    {comparisonReport.periodSummary.endMonth}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {comparisonReport.periodSummary.monthsCount} months
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs font-bold uppercase text-blue-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-blue-900 mt-2">
                    PKR {(comparisonReport.periodSummary.totalRevenue / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <p className="text-xs font-bold uppercase text-orange-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-orange-900 mt-2">
                    PKR {(comparisonReport.periodSummary.totalExpenses / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs font-bold uppercase text-emerald-600">Total Profit</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">
                    PKR {(comparisonReport.periodSummary.totalProfit / 1000).toFixed(1)}K
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    Avg Collection: {comparisonReport.periodSummary.averageCollectionRate}%
                  </p>
                </div>
              </div>

              {/* Monthly Trend Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h4 className="font-bold text-slate-900">Monthly Performance Trend</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-6 font-semibold text-slate-700">Month</th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Revenue
                        </th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Expenses
                        </th>
                        <th className="py-3 px-6 font-semibold text-right text-slate-700">
                          Profit/Loss
                        </th>
                        <th className="py-3 px-6 font-semibold text-center text-slate-700">
                          Collection %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {comparisonReport.monthlyTrend.map((month, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-6 font-medium text-slate-900">
                            {month.monthYear}
                          </td>
                          <td className="py-3 px-6 text-right font-semibold text-blue-600">
                            PKR {month.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right font-semibold text-orange-600">
                            PKR {month.expenses.toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-right">
                            <span
                              className={`font-bold ${
                                month.profit > 0
                                  ? 'text-emerald-600'
                                  : month.profit < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-600'
                              }`}
                            >
                              PKR {month.profit.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-center font-semibold text-slate-900">
                            {month.collectionRate}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-bold">Report: {selectedReport.monthYear}</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Revenue */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase text-slate-500 mb-3">
                  Revenue Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold">Rent Collected</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      PKR {selectedReport.totalRentCollected.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs text-emerald-600 font-semibold">Utilities</p>
                    <p className="text-xl font-bold text-emerald-900 mt-1">
                      PKR {selectedReport.totalUtilitiesCollected.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                    <p className="text-xs text-rose-600 font-semibold">Late Fines</p>
                    <p className="text-xl font-bold text-rose-900 mt-1">
                      PKR {selectedReport.totalLateFines.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold">Total Revenue</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      PKR {selectedReport.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase text-slate-500 mb-3">
                  Expenses by Category
                </h4>
                <div className="space-y-2">
                  {Object.entries(selectedReport.expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                      <span className="text-slate-700 text-sm font-medium">{category}</span>
                      <span className="font-semibold text-slate-900">
                        PKR {amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                    <span className="text-orange-700 font-bold">Total Expenses</span>
                    <span className="font-bold text-orange-900">
                      PKR {selectedReport.totalExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoices */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm uppercase text-slate-500 mb-3">
                  Invoice Status
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200">
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="text-lg font-bold text-slate-900">
                      {selectedReport.totalInvoicesGenerated}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg text-center border border-emerald-200">
                    <p className="text-xs text-emerald-600">Paid</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {selectedReport.invoicesPaid}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg text-center border border-rose-200">
                    <p className="text-xs text-rose-600">Unpaid</p>
                    <p className="text-lg font-bold text-rose-900">
                      {selectedReport.invoicesUnpaid}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                    <p className="text-xs text-amber-600">Partial</p>
                    <p className="text-lg font-bold text-amber-900">
                      {selectedReport.invoicesPartial}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profit & Loss */}
              <div className="border-t-2 border-slate-200 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className={`p-4 rounded-lg text-center border-2 ${
                      selectedReport.netProfit > 0
                        ? 'bg-emerald-50 border-emerald-300'
                        : 'bg-rose-50 border-rose-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${selectedReport.netProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {selectedReport.netProfit > 0 ? 'NET PROFIT' : 'NET LOSS'}
                    </p>
                    <p
                      className={`text-2xl font-bold mt-2 ${
                        selectedReport.netProfit > 0
                          ? 'text-emerald-900'
                          : 'text-rose-900'
                      }`}
                    >
                      PKR {Math.abs(selectedReport.netProfit || selectedReport.netLoss || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg text-center border-2 border-purple-300">
                    <p className="text-xs font-bold text-purple-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-900 mt-2">
                      {selectedReport.profitMargin}%
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg text-center border-2 border-blue-300">
                    <p className="text-xs font-bold text-blue-600">Collection Rate</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">
                      {selectedReport.collectionRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;