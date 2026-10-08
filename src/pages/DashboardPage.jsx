import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Building,
  Users,
  Calendar,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

import { fetchDashboardData } from '../services/dashboardService';

const currency = (value) =>
  `PKR ${Number(value || 0).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const compact = (value) =>
  new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

const monthLabel = (value, short = false) => {
  if (!value) return 'All time';

  const [year, month] = value.split('-').map(Number);

  return new Intl.DateTimeFormat('en-GB', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const currentMonth = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  return [
    parts.find((part) => part.type === 'year').value,
    parts.find((part) => part.type === 'month').value,
  ].join('-');
};

const shopText = (shops = []) =>
  shops.map((shop) => shop.shopNumber).join(', ') || 'Shop unavailable';

const STATUS_CLASSES = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Partial: 'bg-amber-50 text-amber-700',
  Unpaid: 'bg-rose-50 text-rose-700',
};

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

function Panel({ title, subtitle, children, aside }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return (
    <div className="flex min-h-[150px] items-center justify-center rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Metric({ label, value, detail, icon: Icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="break-words text-2xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function TrendChart({ rows }) {
  const width = 660;
  const height = 260;
  const left = 58;
  const top = 20;
  const chartHeight = 180;
  const chartWidth = width - left - 16;

  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.collected, row.expenses])
  );

  const ceiling = maxValue * 1.15;
  const groupWidth = chartWidth / rows.length;
  const barWidth = Math.min(24, groupWidth * 0.25);
  const hasData = rows.some((row) => row.collected || row.expenses);

  if (!hasData) {
    return <EmptyState>No collections or expenses in this six-month period.</EmptyState>;
  }

  return (
    <div>
      <div className="mb-2 flex gap-5 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded bg-indigo-600" />
          Collected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded bg-amber-400" />
          Expenses
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Six-month collected payments and expenses, in PKR"
      >
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (ceiling * tick) / 4;
          const y = top + chartHeight - (chartHeight * tick) / 4;

          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - 10}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
              >
                {compact(value)}
              </text>
            </g>
          );
        })}

        {rows.map((row, index) => {
          const center = left + groupWidth * (index + 0.5);
          const collectedHeight = (row.collected / ceiling) * chartHeight;
          const expenseHeight = (row.expenses / ceiling) * chartHeight;

          return (
            <g key={row.monthYear}>
              <rect
                x={center - barWidth - 3}
                y={top + chartHeight - collectedHeight}
                width={barWidth}
                height={collectedHeight}
                rx="4"
                fill="#4f46e5"
              >
                <title>
                  {monthLabel(row.monthYear)}: Collected {currency(row.collected)}
                </title>
              </rect>

              <rect
                x={center + 3}
                y={top + chartHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx="4"
                fill="#fbbf24"
              >
                <title>
                  {monthLabel(row.monthYear)}: Expenses {currency(row.expenses)}
                </title>
              </rect>

              <text
                x={center}
                y={top + chartHeight + 24}
                textAnchor="middle"
                fontSize="11"
                fill="#64748b"
              >
                {monthLabel(row.monthYear, true)}
              </text>
            </g>
          );
        })}
      </svg>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">View exact monthly figures</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {['Month', 'Collected', 'Expenses', 'Net'].map((label) => (
                  <th className="p-2" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.monthYear} className="border-t">
                  <td className="p-2">{monthLabel(row.monthYear, true)}</td>
                  <td className="p-2">{currency(row.collected)}</td>
                  <td className="p-2">{currency(row.expenses)}</td>
                  <td className="p-2">{currency(row.netProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function InvoiceChart({ data }) {
  if (!data.total) return <EmptyState>No invoices for this period.</EmptyState>;

  const paidEnd = (data.Paid / data.total) * 100;
  const partialEnd = paidEnd + (data.Partial / data.total) * 100;

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        role="img"
        aria-label={`${data.Paid} paid, ${data.Partial} partial, ${data.Unpaid} unpaid invoices`}
        className="flex h-40 w-40 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(
            #10b981 0% ${paidEnd}%,
            #f59e0b ${paidEnd}% ${partialEnd}%,
            #f43f5e ${partialEnd}% 100%
          )`,
        }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-3xl text-slate-900">{data.total}</strong>
          <span className="text-xs text-slate-500">Invoices</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-2 text-center">
        {['Paid', 'Partial', 'Unpaid'].map((status) => (
          <div key={status} className={`rounded-xl p-3 ${STATUS_CLASSES[status]}`}>
            <p className="text-lg font-bold">{data[status]}</p>
            <p className="text-xs">{status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const mounted = useRef(false);
  const sequence = useRef(0);

  // Never display another month's response under the current filter.
  const stats = snapshot?.month === month ? snapshot.data : null;

  const loadData = useCallback(async () => {
    const request = ++sequence.current;

    setLoading(true);
    setError('');

    try {
      const response = await fetchDashboardData(month);
      const data = response.data;

      if (
        !data?.financials ||
        !data?.occupancy ||
        !data?.alerts ||
        !Array.isArray(data.monthlyTrend)
      ) {
        throw new Error('Unexpected dashboard response');
      }

      if (mounted.current && request === sequence.current) {
        setSnapshot({ month, data });
      }
    } catch (err) {
      if (mounted.current && request === sequence.current) {
        setError(
          err.response?.data?.message ||
          'Could not refresh dashboard. Please try again.'
        );
      }
    } finally {
      if (mounted.current && request === sequence.current) {
        setLoading(false);
      }
    }
  }, [month]);

  useEffect(() => {
    mounted.current = true;
    loadData();

    const refresh = () => loadData();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    const events = [
      'focus',
      'plaza-finances-updated',
      'plaza-agreements-updated',
      'plaza-shops-updated',
      'plaza-tenants-updated',
    ];

    events.forEach((event) => window.addEventListener(event, refresh));
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted.current = false;
      sequence.current += 1;

      events.forEach((event) => window.removeEventListener(event, refresh));
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadData]);

  const financials = stats?.financials;
  const occupancy = stats?.occupancy;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">
                <LayoutDashboard className="h-4 w-4" />
                Plaza Management
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Your plaza at a glance
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Collections, expenses and the details that need your attention.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-700 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="h-4 w-4 text-indigo-300" />

              <label htmlFor="dashboard-month" className="text-sm">
                Financial period
              </label>

              <input
                id="dashboard-month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="rounded-lg border border-slate-600 bg-white px-3 py-2 text-sm text-slate-900"
              />

              <button
                type="button"
                onClick={() => setMonth(currentMonth())}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700"
              >
                This month
              </button>

              <button
                type="button"
                onClick={() => setMonth('')}
                className={`rounded-lg px-3 py-2 text-xs ${
                  month ? 'bg-slate-800 hover:bg-slate-700' : 'bg-indigo-600'
                }`}
              >
                All time
              </button>
            </div>

            <span className="text-sm font-medium text-indigo-200">
              {monthLabel(month)}
            </span>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
            {stats && ' Showing the last successfully loaded figures.'}
          </div>
        )}

        {!stats && loading && (
          <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-2xl border bg-white p-5">
                <div className="mb-6 h-4 w-24 rounded bg-slate-100" />
                <div className="h-8 w-32 rounded bg-slate-100" />
              </div>
            ))}
            <p className="sr-only">Loading dashboard...</p>
          </div>
        )}

        {stats && (
          <>
            {(stats.dataQuality.invalidInvoiceMonths > 0 ||
              stats.dataQuality.invalidExpenseDates > 0) && (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                Some records have invalid dates: {stats.dataQuality.invalidInvoiceMonths}{' '}
                invoice month(s), {stats.dataQuality.invalidExpenseDates} expense date(s).
                These records are included in all-time totals but cannot be placed in monthly charts.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Total collected"
                value={currency(financials.totalRevenue)}
                detail="Payments received against invoices, including partial payments."
                icon={Wallet}
                tone="emerald"
              />

              <Metric
                label="Total expenses"
                value={currency(financials.totalExpenses)}
                detail={`Expenses dated within ${month ? monthLabel(month) : 'all recorded periods'}.`}
                icon={ArrowDownRight}
                tone="rose"
              />

              <Metric
                label="Outstanding balance"
                value={currency(financials.totalOutstanding)}
                detail="Remaining balance on invoices in the selected period."
                icon={AlertCircle}
                tone="amber"
              />

              <Metric
                label={financials.netProfit < 0 ? 'Net loss' : 'Net surplus'}
                value={currency(Math.abs(financials.netProfit))}
                detail="Collected payments minus recorded expenses."
                icon={financials.netProfit < 0 ? ArrowDownRight : TrendingUp}
                tone={financials.netProfit < 0 ? 'rose' : 'indigo'}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-900">
                <ArrowUpRight className="h-4 w-4" />
                Collection rate: {financials.collectionRate}%
              </div>

              <p className="text-xs leading-5 text-indigo-800">
                Collected {currency(financials.totalRevenue)} of{' '}
                {currency(financials.totalBilled)} billed.
                {' '}Payments are grouped by the original invoice month.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Panel
                  title="Collection & expense trend"
                  subtitle={`${monthLabel(stats.scope.trendStart, true)} – ${monthLabel(stats.scope.trendEnd, true)} · PKR`}
                >
                  <TrendChart rows={stats.monthlyTrend} />
                </Panel>
              </div>

              <Panel title="Invoice status" subtitle={monthLabel(month)}>
                <InvoiceChart data={stats.invoiceStatus} />
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="Shop occupancy" subtitle="Current shop status — independent of financial filter">
                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-extrabold text-slate-900">
                      {occupancy.occupancyRate}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Occupancy rate</p>
                  </div>
                  <Building className="h-9 w-9 text-indigo-200" />
                </div>

                <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-slate-100">
                  {[
                    [occupancy.occupiedShops, '#4f46e5'],
                    [occupancy.vacantShops, '#10b981'],
                    [occupancy.maintenanceShops, '#f59e0b'],
                  ].map(([count, color], index) => (
                    <div
                      key={index}
                      style={{
                        width: `${occupancy.totalShops ? (count / occupancy.totalShops) * 100 : 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </div>

                <div className="space-y-3 text-sm">
                  {[
                    ['Occupied', occupancy.occupiedShops, 'bg-indigo-600'],
                    ['Available', occupancy.vacantShops, 'bg-emerald-500'],
                    ['Maintenance', occupancy.maintenanceShops, 'bg-amber-500'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex justify-between">
                      <span className="flex items-center gap-2 text-slate-500">
                        <span className={`h-2 w-2 rounded-full ${color}`} />
                        {label}
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex justify-between border-t pt-4 text-sm">
                  <span>Total units</span>
                  <strong>{occupancy.totalShops}</strong>
                </div>
              </Panel>

              <Panel title="Expense breakdown" subtitle={monthLabel(month)}>
                {stats.expensesByCategory.length ? (
                  <div className="space-y-4">
                    {stats.expensesByCategory.map((item, index) => (
                      <div key={item.category}>
                        <div className="mb-1.5 flex items-start justify-between gap-3 text-xs">
                          <span className="text-slate-600">{item.category}</span>
                          <strong className="whitespace-nowrap">
                            {currency(item.amount)}
                          </strong>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>No expenses recorded for this period.</EmptyState>
                )}
              </Panel>

              <Panel title="Property overview" subtitle="Current directory and agreements">
                <div className="space-y-3">
                  {[
                    [Users, 'Registered tenants', stats.directory.tenantsCount],
                    [FileText, 'Agreements marked Active', stats.directory.activeAgreements],
                    [AlertTriangle, 'Lease alerts', stats.alerts.leaseCount],
                    [AlertCircle, 'Invoices overdue >30 days', stats.alerts.overdueCount],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                      <span className="rounded-lg bg-white p-2 text-indigo-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-xs text-slate-600">{label}</span>
                      <strong className="text-lg">{value}</strong>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Expiry alerts include agreements still marked Active after their end date.
                </p>
              </Panel>
            </div>

            <Panel
              title="Recently updated invoices"
              subtitle={`${monthLabel(month)} · Latest 8 invoice records, not individual payment transactions`}
            >
              {stats.recentInvoices.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs uppercase text-slate-400">
                      <tr>
                        {['Invoice / Month', 'Tenant / Shops', 'Total', 'Paid', 'Balance', 'Status'].map(
                          (title) => (
                            <th key={title} className="whitespace-nowrap px-3 pb-3 font-medium">
                              {title}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {stats.recentInvoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-3 py-4">
                            <p className="font-semibold">{invoice.invoiceNumber}</p>
                            <p className="mt-1 text-xs text-slate-400">{invoice.monthYear}</p>
                          </td>
                          <td className="px-3 py-4">
                            <p>{invoice.tenantName}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {shopText(invoice.shops)}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4">{currency(invoice.totalAmount)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-emerald-700">{currency(invoice.paidAmount)}</td>
                          <td className="whitespace-nowrap px-3 py-4">{currency(invoice.balanceDue)}</td>
                          <td className="px-3 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[invoice.status]}`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No invoices for this period.</EmptyState>
              )}
            </Panel>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Needs attention</h2>
                <span className="text-xs text-slate-500">
                  Current alerts across all months · {stats.scope.asOf}
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel
                  title="Lease expiry radar"
                  subtitle={`Next 60 days and expired agreements still marked Active · ${stats.alerts.leaseCount} total`}
                  aside={<AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />}
                >
                  {stats.alerts.expiringAgreements.length ? (
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {stats.alerts.expiringAgreements.map((agreement) => (
                        <div key={agreement.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="text-sm font-bold">{agreement.tenantName}</p>
                            <span className={`text-xs font-semibold ${
                              agreement.daysRemaining < 0 ? 'text-rose-600' : 'text-amber-700'
                            }`}>
                              {agreement.daysRemaining < 0
                                ? `${Math.abs(agreement.daysRemaining)} days past expiry`
                                : agreement.daysRemaining === 0
                                ? 'Expires today'
                                : `${agreement.daysRemaining} days remaining`}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">
                            Shops: {shopText(agreement.shops)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Ends {agreement.endDate}
                            {agreement.phone ? ` · ${agreement.phone}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>No lease expiry alerts.</EmptyState>
                  )}

                  {stats.alerts.leaseCount > 10 && (
                    <p className="mt-3 text-xs text-slate-500">
                      Showing the 10 earliest expiry dates.
                    </p>
                  )}
                </Panel>

                <Panel
                  title="Overdue balances"
                  subtitle={`More than 30 days past due · ${currency(stats.alerts.overdueBalance)} outstanding`}
                  aside={<AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />}
                >
                  {stats.alerts.overdueInvoices.length ? (
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {stats.alerts.overdueInvoices.map((invoice) => (
                        <div key={invoice.id} className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="text-sm font-bold">{invoice.tenantName}</p>
                            <strong className="text-sm text-rose-700">
                              {currency(invoice.balanceDue)}
                            </strong>
                          </div>
                          <p className="mt-2 text-xs text-slate-600">
                            {invoice.invoiceNumber} · Shops: {shopText(invoice.shops)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Due {invoice.dueDate} · {invoice.daysOverdue} days overdue
                          </p>
                          {invoice.phone && (
                            <p className="mt-1 text-xs text-slate-500">{invoice.phone}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>No invoices overdue by more than 30 days.</EmptyState>
                  )}

                  {stats.alerts.overdueCount > 10 && (
                    <p className="mt-3 text-xs text-slate-500">
                      Showing the 10 oldest overdue invoices.
                    </p>
                  )}
                </Panel>
              </div>
            </div>

            <footer className="pb-4 text-center text-xs leading-5 text-slate-400">
              Updated{' '}
              {new Date(stats.scope.generatedAt).toLocaleString('en-PK', {
                timeZone: 'Asia/Karachi',
              })}
              {' '}· Pakistan time
            </footer>
          </>
        )}
      </div>
    </main>
  );
}