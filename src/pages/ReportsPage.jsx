import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  generateMonthlyReport,
  fetchReports,
  fetchMonthReport,
  fetchTenantReport,
  fetchShopReport,
  fetchComparisonReport,
  exportReportPDF,
  exportReportsExcel,
  exportTenantExcel,
  exportShopExcel, 
} from '../services/reportService';

import { fetchTenants } from '../services/tenantService';
import { fetchShops } from '../services/shopService';

import {
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';

// ==================== HELPERS ====================

const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const money = (value) =>
  `PKR ${number(value).toLocaleString('en-PK', {
    maximumFractionDigits: 2,
  })}`;

const percentage = (value) => `${number(value).toFixed(2)}%`;

const netAmount = (report) =>
  number(report?.totalRevenue) - number(report?.totalExpenses);

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB');
};

const currentMonth = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, '0')}`;
};

const errorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  'Something went wrong';

const validateRange = (start, end, required = false) => {
  if (required && (!start || !end)) {
    throw new Error('Please select start and end month');
  }

  if (start && end && start > end) {
    throw new Error('Start month cannot be after end month');
  }
};

// Ignore responses from old filters or an unmounted component.
const useRemoteData = (loader, requestKey, enabled = true) => {
  const [state, setState] = useState({
    loader: null,
    requestKey: null,
    data: null,
    loading: false,
    error: '',
  });

  useEffect(() => {
    let cancelled = false;

    if (!enabled) return undefined;

    setState({
      loader,
      requestKey,
      data: null,
      loading: true,
      error: '',
    });

    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (cancelled) return;

        setState({
          loader,
          requestKey,
          data,
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (cancelled) return;

        setState({
          loader,
          requestKey,
          data: null,
          loading: false,
          error: errorMessage(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [loader, requestKey, enabled]);

  if (!enabled) {
    return { data: null, loading: false, error: '' };
  }

  if (
    state.loader !== loader ||
    state.requestKey !== requestKey
  ) {
    return { data: null, loading: true, error: '' };
  }

  return state;
};

// ==================== UI COMPONENTS ====================

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-900 text-sm';

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 ' +
  'rounded-xl bg-blue-900 text-white text-sm font-medium ' +
  'hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed';

const Panel = ({ title, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6">
    {title && (
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        {title}
      </h3>
    )}
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase text-slate-600 mb-2">
      {label}
    </span>
    {children}
  </label>
);

const Metric = ({ title, value, tone = 'blue', note }) => {
  const tones = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    red: 'bg-rose-50 border-rose-200 text-rose-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
  };

  return (
    <div className={`rounded-xl border p-5 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-bold uppercase">{title}</p>
      <p className="text-2xl font-extrabold mt-2 break-words">{value}</p>
      {note && <p className="text-xs mt-2">{note}</p>}
    </div>
  );
};

const Badge = ({ status }) => {
  const positive = ['Paid', 'Profit', 'Active', 'Occupied'].includes(
    status
  );

  const negative = ['Unpaid', 'Loss'].includes(status);

  const style = positive
    ? 'bg-emerald-100 text-emerald-800'
    : negative
      ? 'bg-rose-100 text-rose-800'
      : status === 'Partial'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status || '—'}
    </span>
  );
};

const Row = ({ label, value, strong = false }) => (
  <div
    className={`flex justify-between gap-4 py-2 ${
      strong ? 'border-t border-slate-200 font-bold' : ''
    }`}
  >
    <span className="text-slate-600">{label}</span>
    <span className="text-right text-slate-900">{value}</span>
  </div>
);

const DataTable = ({ columns, rows, rowKey, emptyText = 'No records found.' }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-900 text-white">
        <tr>
          {columns.map((column) => (
            <th key={column.key} className="px-4 py-3 whitespace-nowrap">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-100 bg-white">
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              className="text-center px-4 py-8 text-slate-500"
            >
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr
              key={rowKey ? rowKey(row, index) : index}
              className="hover:bg-slate-50"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3">
                  {column.render
                    ? column.render(row)
                    : row[column.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

const MonthRange = ({ start, end, onStart, onEnd }) => (
  <>
    <Field label="Start month">
      <input
        type="month"
        value={start}
        onChange={(event) => onStart(event.target.value)}
        className={inputClass}
      />
    </Field>

    <Field label="End month">
      <input
        type="month"
        value={end}
        onChange={(event) => onEnd(event.target.value)}
        className={inputClass}
      />
    </Field>
  </>
);

const ReportDetails = ({ report }) => {
  const net = netAmount(report);

  const previousBalanceCollected =
    Math.round(
      (
        number(report.totalRevenue) -
        number(report.totalRentCollected) -
        number(report.totalUtilitiesCollected) -
        number(report.totalLateFines)
      ) * 100
    ) / 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            Revenue Breakdown
          </h4>

          <Row label="Rent collected" value={money(report.totalRentCollected)} />
          <Row label="Utilities" value={money(report.totalUtilitiesCollected)} />
          <Row label="Late fines" value={money(report.totalLateFines)} />

          {previousBalanceCollected > 0.01 && (
            <Row
              label="Previous balance collected"
              value={money(previousBalanceCollected)}
            />
          )}

          <Row label="Total revenue" value={money(report.totalRevenue)} strong />
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            Invoice Status
          </h4>

          <Row label="Total invoices" value={number(report.totalInvoicesGenerated)} />
          <Row label="Paid" value={number(report.invoicesPaid)} />
          <Row label="Partial" value={number(report.invoicesPartial)} />
          <Row label="Unpaid" value={number(report.invoicesUnpaid)} />
          <Row label="Outstanding" value={money(report.totalOutstanding)} strong />
        </div>

        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            Profit & Loss
          </h4>

          <Row label="Total expenses" value={money(report.totalExpenses)} />

          <Row
            label={net < 0 ? 'Net loss' : net > 0 ? 'Net profit' : 'Break even'}
            value={money(Math.abs(net))}
            strong
          />

          <Row label="Margin" value={percentage(report.profitMargin)} />
          <Row label="Collection rate" value={percentage(report.collectionRate)} />

          <Badge status={net < 0 ? 'Loss' : net > 0 ? 'Profit' : 'Break Even'} />
        </div>
      </div>

      <div>
        <h4 className="font-bold text-slate-900 mb-3">
          Expenses by Category
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {Object.entries(report.expensesByCategory || {}).map(
            ([category, amount]) => (
              <Row key={category} label={category} value={money(amount)} />
            )
          )}
        </div>

        <Row label="Total expenses" value={money(report.totalExpenses)} strong />
      </div>
    </div>
  );
};

// ==================== PAGE ====================

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  // Separate dashboard selection from the month used for generation.
  const [dashboardMonth, setDashboardMonth] = useState('latest');
  const [generateMonth, setGenerateMonth] = useState(currentMonth);

  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [detailsMonth, setDetailsMonth] = useState('');

  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const generateLock = useRef(false);
  const exportLock = useRef(false);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('plaza-finances-updated', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('plaza-finances-updated', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    if (!detailsMonth) return undefined;

    const onEscape = (event) => {
      if (event.key === 'Escape') setDetailsMonth('');
    };

    window.addEventListener('keydown', onEscape);

    return () => window.removeEventListener('keydown', onEscape);
  }, [detailsMonth]);

  const loadReports = useCallback(async () => {
    const response = await fetchReports();

    return [...(response.data || [])].sort((a, b) =>
      String(b.monthYear).localeCompare(String(a.monthYear))
    );
  }, []);

  const loadTenants = useCallback(async () => {
    const response = await fetchTenants();
    return response.data || [];
  }, []);

  const loadShops = useCallback(async () => {
    const response = await fetchShops();
    return response.data || [];
  }, []);

  const loadTenantReport = useCallback(async () => {
    validateRange(startMonth, endMonth);

    const response = await fetchTenantReport(
      selectedTenant,
      startMonth,
      endMonth
    );

    return response.data;
  }, [selectedTenant, startMonth, endMonth]);

  const loadShopReport = useCallback(async () => {
    validateRange(startMonth, endMonth);

    const response = await fetchShopReport(
      selectedShop,
      startMonth,
      endMonth
    );

    return response.data;
  }, [selectedShop, startMonth, endMonth]);

  const loadComparison = useCallback(async () => {
    validateRange(startMonth, endMonth, true);

    const response = await fetchComparisonReport(startMonth, endMonth);
    return response.data;
  }, [startMonth, endMonth]);

  const loadDetails = useCallback(async () => {
    const response = await fetchMonthReport(detailsMonth);
    return response.data;
  }, [detailsMonth]);

  const reportsState = useRemoteData(
    loadReports,
    `${refreshKey}:${activeTab}:${dashboardMonth}`
  );

  const tenantsState = useRemoteData(
    loadTenants,
    refreshKey,
    activeTab === 'tenant'
  );

  const shopsState = useRemoteData(
    loadShops,
    refreshKey,
    activeTab === 'shop'
  );

  const tenantState = useRemoteData(
    loadTenantReport,
    refreshKey,
    activeTab === 'tenant' && Boolean(selectedTenant)
  );

  const shopState = useRemoteData(
    loadShopReport,
    refreshKey,
    activeTab === 'shop' && Boolean(selectedShop)
  );

  const comparisonState = useRemoteData(
    loadComparison,
    refreshKey,
    activeTab === 'comparison' && Boolean(startMonth && endMonth)
  );

  const detailsState = useRemoteData(
    loadDetails,
    refreshKey,
    Boolean(detailsMonth)
  );

  const reports = reportsState.data || [];
  const tenants = tenantsState.data || [];
  const shops = shopsState.data || [];

  const tenantReport = tenantState.data;
  const shopReport = shopState.data;
  const comparisonReport = comparisonState.data;

  const visibleReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          (!startMonth || report.monthYear >= startMonth) &&
          (!endMonth || report.monthYear <= endMonth)
      ),
    [reports, startMonth, endMonth]
  );

  const dashboardReports =
    dashboardMonth === 'all'
      ? reports
      : dashboardMonth === 'latest'
        ? reports.slice(0, 1)
        : reports.filter((report) => report.monthYear === dashboardMonth);

  const dashboardReport = dashboardReports[0];

  const revenue = dashboardReports.reduce(
    (sum, report) => sum + number(report.totalRevenue),
    0
  );

  const expenses = dashboardReports.reduce(
    (sum, report) => sum + number(report.totalExpenses),
    0
  );

  const profit = revenue - expenses;

  const averageCollection = dashboardReports.length
    ? dashboardReports.reduce(
        (sum, report) => sum + number(report.collectionRate),
        0
      ) / dashboardReports.length
    : 0;

  const rangeInvalid =
    Boolean(startMonth && endMonth) && startMonth > endMonth;

  const resourceError =
    reportsState.error ||
    tenantsState.error ||
    shopsState.error ||
    tenantState.error ||
    shopState.error ||
    comparisonState.error ||
    detailsState.error;

  const activeLoading =
    reportsState.loading ||
    tenantState.loading ||
    shopState.loading ||
    comparisonState.loading;

  const handleGenerate = async () => {
    if (generateLock.current) return;

    if (!generateMonth) {
      setError('Please select a month');
      return;
    }

    generateLock.current = true;
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const response = await generateMonthlyReport(generateMonth);

      setSuccess(response.message || 'Monthly report updated.');
      refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      generateLock.current = false;
      setGenerating(false);
    }
  };

  const handleExport = async (action) => {
    if (exportLock.current) return;

    exportLock.current = true;
    setExporting(true);
    setError('');
    setSuccess('');

    try {
      await action();
      setSuccess('Download started.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
  };

  const exportPDF = (month) => {
    if (!month) return;
    handleExport(() => exportReportPDF(month));
  };

  const exportExcel = (start, end) => {
    if (start && end && start > end) {
      setError('Start month cannot be after end month');
      return;
    }

    handleExport(() => exportReportsExcel(start, end));
  };

  const monthlyColumns = [
    { key: 'monthYear', label: 'Month' },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row) => money(row.totalRevenue),
    },
    {
      key: 'expenses',
      label: 'Expenses',
      render: (row) => money(row.totalExpenses),
    },
    {
      key: 'net',
      label: 'Net Profit / Loss',
      render: (row) => (
        <span className={netAmount(row) < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
          {money(netAmount(row))}
        </span>
      ),
    },
    {
      key: 'margin',
      label: 'Margin',
      render: (row) => percentage(row.profitMargin),
    },
    {
      key: 'collection',
      label: 'Collection',
      render: (row) => percentage(row.collectionRate),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-3">
          <button
            onClick={() => setDetailsMonth(row.monthYear)}
            className="text-blue-700 font-semibold"
          >
            View
          </button>

          <button
            onClick={() => exportPDF(row.monthYear)}
            disabled={exporting}
            className="text-rose-600 font-semibold disabled:opacity-50"
          >
            PDF
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen space-y-6">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-900" />
            Financial Reports & Analytics
          </h1>

          <p className="text-slate-500 text-sm mt-2">
            Monthly collections, expenses, tenant payments and shop reports.
          </p>
        </div>

        <button
          onClick={refresh}
          disabled={activeLoading}
          className={buttonClass}
        >
          <RefreshCw className={`w-4 h-4 ${activeLoading ? 'animate-spin' : ''}`} />
          {activeLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {(error || resourceError) && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          {error || resourceError}
        </div>
      )}

      {success && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex justify-between gap-4">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} aria-label="Dismiss message">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <nav className="flex overflow-x-auto bg-white rounded-xl border border-slate-200">
        {[
          ['dashboard', 'Dashboard'],
          ['monthly', 'Monthly Reports'],
          ['tenant', 'Tenant-wise'],
          ['shop', 'Shop-wise'],
          ['comparison', 'Comparison'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setError('');
              setSuccess('');
            }}
            className={`px-5 py-4 whitespace-nowrap text-sm font-semibold border-b-2 ${
              activeTab === id
                ? 'border-blue-900 text-blue-900 bg-blue-50'
                : 'border-transparent text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ==================== DASHBOARD ==================== */}

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <Panel title="Select Month">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Field label="View report for">
                <select
                  value={dashboardMonth}
                  onChange={(event) => setDashboardMonth(event.target.value)}
                  className={inputClass}
                >
                  <option value="latest">Latest Month</option>
                  <option value="all">All Months</option>

                  {reports.map((report) => (
                    <option key={report.monthYear} value={report.monthYear}>
                      {report.monthYear}
                    </option>
                  ))}
                </select>
              </Field>

              <button
                className={buttonClass}
                onClick={() => exportPDF(dashboardReport?.monthYear)}
                disabled={exporting || !dashboardReport || dashboardMonth === 'all'}
              >
                <Download className="w-4 h-4" />
                Month PDF
              </button>

              <button
                className={buttonClass}
                disabled={exporting || !dashboardReports.length}
                onClick={() =>
                  dashboardMonth === 'all'
                    ? exportExcel()
                    : exportExcel(
                        dashboardReport?.monthYear,
                        dashboardReport?.monthYear
                      )
                }
              >
                <Download className="w-4 h-4" />
                {dashboardMonth === 'all' ? 'All Months Excel' : 'Month Excel'}
              </button>
            </div>
          </Panel>

          {reportsState.loading ? (
            <Panel>Loading current report data...</Panel>
          ) : dashboardReports.length === 0 ? (
            <Panel>No report data available for this selection.</Panel>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Metric
                  title="Total Revenue"
                  value={money(revenue)}
                  note={`${dashboardReports.length} month(s) included`}
                />
                <Metric title="Total Expenses" value={money(expenses)} tone="orange" />
                <Metric
                  title="Net Profit / Loss"
                  value={money(profit)}
                  tone={profit < 0 ? 'red' : 'green'}
                  note={`${percentage(revenue > 0 ? (profit / revenue) * 100 : 0)} margin`}
                />
                <Metric
                  title="Avg Collection Rate"
                  value={percentage(averageCollection)}
                  tone="purple"
                />
              </div>

              <Panel
                title={
                  dashboardMonth === 'all'
                    ? `Latest Month Details: ${dashboardReport.monthYear}`
                    : `Month Details: ${dashboardReport.monthYear}`
                }
              >
                <ReportDetails report={dashboardReport} />
              </Panel>
            </>
          )}
        </div>
      )}

      {/* ==================== MONTHLY ==================== */}

      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <Panel title="Generate or Update Monthly Report">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <Field label="Month">
                <input
                  type="month"
                  value={generateMonth}
                  onChange={(event) => setGenerateMonth(event.target.value)}
                  className={inputClass}
                />
              </Field>

              <button
                onClick={handleGenerate}
                disabled={generating || !generateMonth}
                className={buttonClass}
              >
                <Calendar className="w-4 h-4" />
                {generating ? 'Updating...' : 'Generate / Update'}
              </button>
            </div>
          </Panel>

          <Panel title="Filter Monthly Reports">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <MonthRange
                start={startMonth}
                end={endMonth}
                onStart={setStartMonth}
                onEnd={setEndMonth}
              />

              <button
                onClick={() => exportExcel(startMonth, endMonth)}
                disabled={exporting || rangeInvalid || !visibleReports.length}
                className={buttonClass}
              >
                <Download className="w-4 h-4" />
                Export Filtered Excel
              </button>
            </div>

            {rangeInvalid && (
              <p className="mt-3 text-sm text-red-600">
                Start month cannot be after end month.
              </p>
            )}
          </Panel>

          <DataTable
            columns={monthlyColumns}
            rows={rangeInvalid ? [] : visibleReports}
            rowKey={(row) => row.monthYear}
            emptyText={reportsState.loading ? 'Loading reports...' : 'No reports in this period.'}
          />
        </div>
      )}

      {/* ==================== TENANT ==================== */}

      {activeTab === 'tenant' && (
        <div className="space-y-6">
          <Panel title="Tenant Payment History">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Tenant">
                <select
                  value={selectedTenant}
                  onChange={(event) => setSelectedTenant(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose tenant...</option>

                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </Field>

              <MonthRange
                start={startMonth}
                end={endMonth}
                onStart={setStartMonth}
                onEnd={setEndMonth}
              />
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Leave the date range empty for all months.
            </p>
          </Panel>

          {tenantState.loading && <Panel>Loading tenant report...</Panel>}

          {tenantReport && (
            <>
              <Panel title="Tenant Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <Row label="Name" value={tenantReport.tenantInfo?.name || '—'} />
                  <Row label="CNIC" value={tenantReport.tenantInfo?.cnic || '—'} />
                  <Row label="Phone" value={tenantReport.tenantInfo?.phone || '—'} />
                  <Row label="WhatsApp" value={tenantReport.tenantInfo?.whatsapp || '—'} />
                </div>
              </Panel>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Metric title="Collected" value={money(tenantReport.financialSummary?.totalCollected)} />
                <Metric title="Outstanding" value={money(tenantReport.financialSummary?.totalOutstanding)} tone="red" />
                <Metric title="Avg Fully Paid Invoice" value={money(tenantReport.financialSummary?.averageMonthlyPayment)} tone="green" />
                <Metric title="Payment Rate" value={percentage(tenantReport.financialSummary?.paymentRate)} tone="purple" />
              </div>

              <Panel title="Invoice Summary">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Row label="Total" value={number(tenantReport.invoicesSummary?.total)} />
                  <Row label="Paid" value={number(tenantReport.invoicesSummary?.paid)} />
                  <Row label="Partial" value={number(tenantReport.invoicesSummary?.partial)} />
                  <Row label="Unpaid" value={number(tenantReport.invoicesSummary?.unpaid)} />
                </div>
              </Panel>

              <DataTable
                rows={tenantReport.paymentHistory || []}
                rowKey={(row, index) => row.invoiceId || row.id || row.invoiceNumber || index}
                columns={[
                  { key: 'monthYear', label: 'Month' },
                  { key: 'invoiceNumber', label: 'Invoice #' },
                  { key: 'rent', label: 'Rent', render: (row) => money(row.rentAmount) },
                  { key: 'utilities', label: 'Utilities', render: (row) => money(row.utilities) },
                  { key: 'fine', label: 'Fine', render: (row) => money(row.lateFine) },
                  { key: 'previous', label: 'Previous Balance', render: (row) => money(row.previousBalance) },
                  { key: 'total', label: 'Total', render: (row) => money(row.totalAmount) },
                  { key: 'paid', label: 'Paid', render: (row) => money(row.paidAmount) },
                  { key: 'due', label: 'Due', render: (row) => money(row.balanceDue) },
                  { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
                  { key: 'paymentDate', label: 'Last Payment', render: (row) => formatDate(row.paymentDate) },
                ]}
              />

           <button
  className={buttonClass}
  disabled={exporting || tenantState.loading || rangeInvalid}
  onClick={() =>
    handleExport(() =>
      exportTenantExcel(selectedTenant, startMonth, endMonth)
    )
  }
>
  <Download className="w-4 h-4" />
  {exporting ? 'Exporting...' : 'Export Tenant Excel'}
</button>
            </>
          )}
        </div>
      )}

      {/* ==================== SHOP ==================== */}

      {activeTab === 'shop' && (
        <div className="space-y-6">
          <Panel title="Shop Revenue Analysis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Shop">
                <select
                  value={selectedShop}
                  onChange={(event) => setSelectedShop(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Choose shop...</option>

                  {shops.map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      Shop #{shop.shopNumber} — {shop.floor}
                    </option>
                  ))}
                </select>
              </Field>

              <MonthRange
                start={startMonth}
                end={endMonth}
                onStart={setStartMonth}
                onEnd={setEndMonth}
              />
            </div>
          </Panel>

          {shopState.loading && <Panel>Loading shop report...</Panel>}

          {shopReport && (
            <>
              <Panel title="Shop Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <Row label="Shop number" value={shopReport.shopInfo?.shopNumber} />
                  <Row label="Floor" value={shopReport.shopInfo?.floor} />
                  <Row label="Type" value={shopReport.shopInfo?.type} />
                  <Row label="Size" value={`${number(shopReport.shopInfo?.sizeSqFt)} Sq.Ft.`} />
                  <Row label="Status" value={<Badge status={shopReport.shopInfo?.status} />} />
                </div>
              </Panel>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Metric title="Collected" value={money(shopReport.financialSummary?.totalCollected)} />
                <Metric title="Outstanding" value={money(shopReport.financialSummary?.totalOutstanding)} tone="red" />
                <Metric title="Invoices" value={number(shopReport.financialSummary?.invoiceCount)} tone="purple" />
                <Metric
                  title="Paid / Partial / Unpaid"
                  value={`${number(shopReport.financialSummary?.paidInvoices)} / ${number(shopReport.financialSummary?.partialInvoices)} / ${number(shopReport.financialSummary?.unpaidInvoices)}`}
                  tone="green"
                />
              </div>

              <Panel title="Tenant History">
                <DataTable
                  rows={shopReport.agreementHistory || []}
                  rowKey={(row, index) => row.id || index}
                  columns={[
                    { key: 'tenant', label: 'Tenant' },
                    { key: 'startDate', label: 'Start', render: (row) => formatDate(row.startDate) },
                    { key: 'endDate', label: 'End', render: (row) => formatDate(row.endDate) },
                    { key: 'rent', label: 'Monthly Rent', render: (row) => money(row.monthlyRent) },
                    { key: 'status', label: 'Status', render: (row) => <Badge status={row.status} /> },
                  ]}
                />
              </Panel>

             <button
  className={buttonClass}
  disabled={exporting || shopState.loading || rangeInvalid}
  onClick={() =>
    handleExport(() =>
      exportShopExcel(selectedShop, startMonth, endMonth)
    )
  }
>
  <Download className="w-4 h-4" />
  {exporting ? 'Exporting...' : 'Export Shop Excel'}
</button>
            </>
          )}
        </div>
      )}

      {/* ==================== COMPARISON ==================== */}

      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <Panel title="Monthly Trend Analysis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <MonthRange
                start={startMonth}
                end={endMonth}
                onStart={setStartMonth}
                onEnd={setEndMonth}
              />

              <button
                className={buttonClass}
                onClick={() => exportExcel(startMonth, endMonth)}
                disabled={
                  exporting ||
                  comparisonState.loading ||
                  rangeInvalid ||
                  !comparisonReport?.monthlyTrend?.length
                }
              >
                <Download className="w-4 h-4" />
                Export Period Excel
              </button>
            </div>

            {(!startMonth || !endMonth) && (
              <p className="text-sm text-slate-500 mt-3">
                Select both months to load the comparison.
              </p>
            )}
          </Panel>

          {comparisonState.loading && <Panel>Loading comparison...</Panel>}

          {comparisonReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Metric
                  title="Period"
                  value={`${comparisonReport.periodSummary?.startMonth} → ${comparisonReport.periodSummary?.endMonth}`}
                  note={`${number(comparisonReport.periodSummary?.monthsCount)} months`}
                />
                <Metric
                  title="Revenue"
                  value={money(comparisonReport.periodSummary?.totalRevenue)}
                />
                <Metric
                  title="Expenses"
                  value={money(comparisonReport.periodSummary?.totalExpenses)}
                  tone="orange"
                />
                <Metric
                  title="Net Profit / Loss"
                  value={money(comparisonReport.periodSummary?.totalProfit)}
                  tone={number(comparisonReport.periodSummary?.totalProfit) < 0 ? 'red' : 'green'}
                  note={`Avg collection: ${percentage(comparisonReport.periodSummary?.averageCollectionRate)}`}
                />
              </div>

              <DataTable
                rows={comparisonReport.monthlyTrend || []}
                rowKey={(row) => row.monthYear}
                columns={[
                  { key: 'monthYear', label: 'Month' },
                  { key: 'revenue', label: 'Revenue', render: (row) => money(row.revenue) },
                  { key: 'expenses', label: 'Expenses', render: (row) => money(row.expenses) },
                  {
                    key: 'profit',
                    label: 'Net Profit / Loss',
                    render: (row) => (
                      <span className={number(row.profit) < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                        {money(row.profit)}
                      </span>
                    ),
                  },
                  { key: 'collectionRate', label: 'Collection', render: (row) => percentage(row.collectionRate) },
                ]}
              />
            </>
          )}
        </div>
      )}

      {/* ==================== DETAILS MODAL ==================== */}

      {detailsMonth && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4">
              <h3 id="report-modal-title" className="font-bold">
                Report: {detailsMonth}
              </h3>

              <button
                onClick={() => setDetailsMonth('')}
                aria-label="Close report"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailsState.loading && <p>Loading latest report...</p>}

              {detailsState.error && (
                <p className="text-red-600">{detailsState.error}</p>
              )}

              {detailsState.data && (
                <>
                  <ReportDetails report={detailsState.data} />

                  <button
                    className={buttonClass}
                    disabled={exporting}
                    onClick={() => exportPDF(detailsMonth)}
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;