import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Layers,
  PieChart,
  ArrowRight,
  Plus,
} from "lucide-react";
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
} from "../services/reportService";
import { fetchTenants } from "../services/tenantService";
import { fetchShops } from "../services/shopService";

// Existing service contracts are used throughout. No chart dependency is needed.
const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const money = (value) =>
  `PKR ${number(value).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
const percentage = (value) => `${number(value).toFixed(2)}%`;
const netAmount = (report) =>
  number(report?.totalRevenue) - number(report?.totalExpenses);
const errorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";
const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB");
};
const monthLabel = (value) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || "")) return value || "—";
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
};
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const validateRange = (start, end, required = false) => {
  if (required && (!start || !end))
    throw new Error("Please select start and end month.");
  if (start && end && start > end)
    throw new Error("Start month cannot be after end month.");
};
const clamp = (value) => Math.max(0, Math.min(100, number(value)));
const inputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-50 disabled:text-slate-400 sm:text-sm";
const baseButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const tones = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    text: "text-indigo-600",
    bar: "bg-indigo-500",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
  red: {
    icon: "bg-rose-50 text-rose-600",
    text: "text-rose-600",
    bar: "bg-rose-500",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    text: "text-violet-600",
    bar: "bg-violet-500",
  },
};

// A response belongs only to the filters that requested it. Refreshes retain the
// current result; changing a filter never shows the previous filter's result.
function useRemoteData(loader, requestKey, enabled = true) {
  const [state, setState] = useState({
    loader: null,
    requestKey: null,
    data: null,
    loading: false,
    error: "",
  });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((previous) => ({
      loader,
      requestKey,
      data: previous.loader === loader ? previous.data : null,
      loading: true,
      error: "",
    }));
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (!cancelled)
          setState({ loader, requestKey, data, loading: false, error: "" });
      })
      .catch((error) => {
        if (!cancelled)
          setState((previous) => ({
            ...previous,
            loader,
            requestKey,
            loading: false,
            error: errorMessage(error),
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [loader, requestKey, enabled]);
  if (!enabled) return { data: null, loading: false, error: "" };
  if (state.loader !== loader) return { data: null, loading: true, error: "" };
  return {
    ...state,
    loading: state.loading || state.requestKey !== requestKey,
  };
}

function Button({
  children,
  icon: Icon,
  secondary = false,
  busy = false,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      {...props}
      className={`${baseButton} ${secondary ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" : "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"} ${className}`}
    >
      {busy ? (
        <RefreshCw
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin"
        />
      ) : (
        Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      )}
      {children}
    </button>
  );
}
function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}
const Field = ({ label, children }) => (
  <label className="block min-w-0">
    <span className="mb-2 block text-xs font-semibold text-slate-600">
      {label}
    </span>
    {children}
  </label>
);
function Notice({ children, success = false, onDismiss }) {
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 leading-6">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
function Metric({ title, value, note, tone = "indigo", icon: Icon = Wallet }) {
  const color = tones[tone] || tones.indigo;
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-xs font-semibold leading-5 text-slate-500">
          {title}
        </p>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.icon}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p
        className={`mt-4 break-words text-2xl font-bold tracking-tight tabular-nums ${color.text}`}
      >
        {value}
      </p>
      {note && <p className="mt-2 text-xs leading-5 text-slate-400">{note}</p>}
    </div>
  );
}
function Badge({ status }) {
  const positive = ["Paid", "Profit", "Active", "Occupied"].includes(status);
  const negative = ["Unpaid", "Loss"].includes(status);
  const style = positive
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : negative
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : status === "Partial"
        ? "border-amber-100 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status || "—"}
    </span>
  );
}
const Row = ({ label, value, strong = false }) => (
  <div
    className={`flex items-start justify-between gap-4 py-3 text-sm ${strong ? "mt-2 border-t border-slate-200 font-bold" : ""}`}
  >
    <span className="min-w-0 text-slate-500">{label}</span>
    <span className="min-w-0 break-words text-right font-medium tabular-nums text-slate-900">
      {value ?? "—"}
    </span>
  </div>
);
function Empty({
  icon: Icon = FileText,
  title = "No records found",
  description = "Try a different selection.",
  children,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-12 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
function Loading({ text = "Loading report…" }) {
  return (
    <div
      role="status"
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <RefreshCw className="h-4 w-4 animate-spin" />
        {text}
      </div>
      <div aria-hidden="true" className="mt-5 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
function MonthRange({ start, end, onStart, onEnd }) {
  return (
    <>
      <Field label="Start month">
        <input
          type="month"
          value={start}
          max={end || undefined}
          onChange={(event) => onStart(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="End month">
        <input
          type="month"
          value={end}
          min={start || undefined}
          onChange={(event) => onEnd(event.target.value)}
          className={inputClass}
        />
      </Field>
    </>
  );
}

function DataTable({
  title = "Report records",
  columns,
  rows = [],
  rowKey,
  emptyText = "No records found.",
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => {
    setPage(1);
  }, [rows]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * pageSize, current * pageSize);
  const cell = (row, column) =>
    column.render ? column.render(row) : (row[column.key] ?? "—");
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <span className="text-xs text-slate-400">{rows.length} records</span>
      </div>
      {!rows.length ? (
        <p className="px-5 py-12 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <>
          <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
            {visible.map((row, index) => (
              <article
                key={rowKey ? rowKey(row, index) : index}
                className="min-w-0 rounded-xl border border-slate-200 bg-white p-4"
              >
                <dl className="space-y-3">
                  {columns.map((column, i) => (
                    <div
                      key={column.key}
                      className={`flex flex-wrap items-center justify-between gap-2 ${i === 0 ? "mb-4 border-b border-slate-100 pb-3" : ""}`}
                    >
                      <dt className="text-xs text-slate-500">{column.label}</dt>
                      <dd className="min-w-0 break-words text-right text-sm font-medium tabular-nums text-slate-800">
                        {cell(row, column)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th
                      scope="col"
                      key={column.key}
                      className="whitespace-nowrap px-5 py-4"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row, index) => (
                  <tr
                    key={rowKey ? rowKey(row, index) : index}
                    className="hover:bg-indigo-50/30"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-slate-700"
                      >
                        {cell(row, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-500">
              Showing {(current - 1) * pageSize + 1}–
              {Math.min(current * pageSize, rows.length)} of {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                secondary
                icon={ChevronLeft}
                aria-label="Previous page"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                className="px-3"
              />
              <span className="px-2 text-xs text-slate-500">
                {current} / {pages}
              </span>
              <Button
                secondary
                icon={ChevronRight}
                aria-label="Next page"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
                className="px-3"
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ReportDetails({ report }) {
  const net = netAmount(report);
  const previous =
    Math.round(
      (number(report.totalRevenue) -
        number(report.totalRentCollected) -
        number(report.totalUtilitiesCollected) -
        number(report.totalLateFines)) *
        100,
    ) / 100;
  const revenueItems = [
    ["Rent collected", report.totalRentCollected, "indigo"],
    ["Utilities collected", report.totalUtilitiesCollected, "violet"],
    ["Late fines", report.totalLateFines, "amber"],
  ];
  if (previous > 0.01)
    revenueItems.push(["Previous balance collected", previous, "green"]);
  const categories = Object.entries(report.expensesByCategory || {}).sort(
    (a, b) => number(b[1]) - number(a[1]),
  );
  const expenseScale = Math.max(
    1,
    ...categories.map(([, value]) => Math.abs(number(value))),
  );
  const invoiceTotal = number(report.totalInvoicesGenerated);
  const invoiceRows = [
    ["Paid", report.invoicesPaid, "green"],
    ["Partial", report.invoicesPartial, "amber"],
    ["Unpaid", report.invoicesUnpaid, "red"],
  ];
  return (
    <div className="space-y-5">
      <div className="grid items-stretch gap-5 xl:grid-cols-3">
        <Panel
          title="Revenue breakdown"
          subtitle="Where collections came from"
          icon={Wallet}
        >
          <p className="text-xs text-slate-400">Total revenue</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight tabular-nums text-slate-900">
            {money(report.totalRevenue)}
          </p>
          <div className="mt-6 space-y-5">
            {revenueItems.map(([label, amount, tone]) => (
              <div key={label}>
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold tabular-nums text-slate-800">
                    {money(amount)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full ${tones[tone].bar}`}
                    style={{
                      width: `${clamp(number(report.totalRevenue) > 0 ? (number(amount) / number(report.totalRevenue)) * 100 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Invoice status"
          subtitle="Payment progress for this month"
          icon={Receipt}
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-slate-400">Invoices generated</p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {invoiceTotal}
              </p>
            </div>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              {percentage(report.collectionRate)} collection
            </span>
          </div>
          <div
            aria-hidden="true"
            className="my-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100"
          >
            {invoiceRows.map(([label, count, tone]) => (
              <div
                key={label}
                className={tones[tone].bar}
                style={{
                  width: `${clamp(invoiceTotal ? (number(count) / invoiceTotal) * 100 : 0)}%`,
                }}
              />
            ))}
          </div>
          <div className="space-y-3">
            {invoiceRows.map(([label, count, tone]) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${tones[tone].bar}`} />
                  {label}
                </span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {number(count)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <span className="text-xs font-medium text-amber-700">
              Outstanding balance
            </span>
            <strong className="text-sm tabular-nums text-amber-800">
              {money(report.totalOutstanding)}
            </strong>
          </div>
        </Panel>
        <Panel
          title="Profit & loss"
          subtitle="Revenue after recorded expenses"
          icon={TrendingUp}
        >
          <div
            className={`rounded-xl p-4 ${net < 0 ? "bg-rose-50" : "bg-emerald-50"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600">
                {net < 0 ? "Net loss" : net > 0 ? "Net profit" : "Break even"}
              </p>
              {net < 0 ? (
                <ArrowDownRight className="h-5 w-5 text-rose-500" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              )}
            </div>
            <p
              className={`mt-3 break-words text-2xl font-bold tabular-nums ${net < 0 ? "text-rose-700" : "text-emerald-700"}`}
            >
              {money(Math.abs(net))}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {percentage(report.profitMargin)} profit margin
            </p>
          </div>
          <div className="mt-3">
            <Row label="Revenue" value={money(report.totalRevenue)} />
            <Row label="Expenses" value={money(report.totalExpenses)} />
            <Row
              label="Result"
              value={
                <Badge
                  status={net < 0 ? "Loss" : net > 0 ? "Profit" : "Break Even"}
                />
              }
              strong
            />
          </div>
        </Panel>
      </div>
      <Panel
        title="Expenses by category"
        subtitle="Compare spending across categories"
        icon={PieChart}
        action={
          <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Total{" "}
            <strong className="ml-2 text-slate-900">
              {money(report.totalExpenses)}
            </strong>
          </span>
        }
      >
        {!categories.length ? (
          <p className="py-4 text-sm text-slate-500">
            No expense categories recorded.
          </p>
        ) : (
          <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
            {categories.map(([label, amount], index) => (
              <div key={label}>
                <div className="mb-2 flex items-start justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-start gap-2 text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {label}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                    {money(amount)}
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full ${number(amount) < 0 ? "bg-emerald-400" : "bg-indigo-400"}`}
                    style={{
                      width: `${(Math.abs(number(amount)) / expenseScale) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ReportModal({ month, onClose, children, footer }) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const panel = panelRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children)
      .filter((node) => node !== overlayRef.current)
      .map((node) => [node, node.inert]);
    siblings.forEach(([node]) => {
      node.inert = true;
    });
    document.body.style.overflow = "hidden";
    panel.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ),
      ).filter((node) => node.getClientRects().length);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        panel.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusin = (event) => {
      if (!panel.contains(event.target)) panel.focus();
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("focusin", focusin);
      document.body.style.overflow = overflow;
      siblings.forEach(([node, inert]) => {
        node.inert = inert;
      });
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-slate-50 shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="report-modal-title" className="font-bold text-slate-900">
                {monthLabel(month)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Monthly financial report
              </p>
            </div>
          </div>
          <Button
            secondary
            icon={X}
            aria-label="Close report"
            onClick={onClose}
            className="px-3"
          />
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>
        <div
          className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const tabs = [
  {
    id: "dashboard",
    label: "Overview",
    icon: BarChart3,
    description: "A clear view of collections, expenses and performance.",
  },
  {
    id: "monthly",
    label: "Monthly reports",
    icon: Calendar,
    description: "Generate monthly statements and explore report history.",
  },
  {
    id: "tenant",
    label: "Tenant reports",
    icon: Users,
    description: "Track tenant payments, balances and invoice history.",
  },
  {
    id: "shop",
    label: "Shop reports",
    icon: Store,
    description: "Review shop collections, occupancy and tenant history.",
  },
  {
    id: "comparison",
    label: "Compare months",
    icon: Layers,
    description: "Compare financial performance across a selected period.",
  },
];
const amountColumn = (key, label, field = key) => ({
  key,
  label,
  render: (row) => money(row[field]),
});
const invoiceColumns = [
  {
    key: "monthYear",
    label: "Month",
    render: (row) => monthLabel(row.monthYear),
  },
  { key: "invoiceNumber", label: "Invoice #" },
  amountColumn("rent", "Rent", "rentAmount"),
  amountColumn("utilities", "Utilities"),
  amountColumn("fine", "Fine", "lateFine"),
  amountColumn("previous", "Previous balance", "previousBalance"),
  amountColumn("total", "Total", "totalAmount"),
  amountColumn("paid", "Paid", "paidAmount"),
  amountColumn("due", "Due", "balanceDue"),
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge status={row.status} />,
  },
  {
    key: "paymentDate",
    label: "Last payment",
    render: (row) => formatDate(row.paymentDate),
  },
];
const agreementColumns = [
  { key: "tenant", label: "Tenant" },
  {
    key: "startDate",
    label: "Start",
    render: (row) => formatDate(row.startDate),
  },
  { key: "endDate", label: "End", render: (row) => formatDate(row.endDate) },
  amountColumn("rent", "Monthly rent", "monthlyRent"),
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge status={row.status} />,
  },
];
const comparisonColumns = [
  {
    key: "monthYear",
    label: "Month",
    render: (row) => monthLabel(row.monthYear),
  },
  amountColumn("revenue", "Revenue"),
  amountColumn("expenses", "Expenses"),
  {
    key: "profit",
    label: "Net profit / loss",
    render: (row) => (
      <span
        className={`font-bold ${number(row.profit) < 0 ? "text-rose-600" : "text-emerald-700"}`}
      >
        {money(row.profit)}
      </span>
    ),
  },
  {
    key: "collectionRate",
    label: "Collection",
    render: (row) => percentage(row.collectionRate),
  },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardMonth, setDashboardMonth] = useState("latest");
  const [generateMonth, setGenerateMonth] = useState(currentMonth);
  const [startMonth, setStartMonth] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [selectedTenant, setSelectedTenant] = useState("");
  const [selectedShop, setSelectedShop] = useState("");
  const [detailsMonth, setDetailsMonth] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const generateLock = useRef(false);
  const exportLock = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  useEffect(() => {
    mounted.current = true;
    let timer;
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!exportLock.current && !generateLock.current) refresh();
      }, 150);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("plaza-finances-updated", scheduleRefresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("plaza-finances-updated", scheduleRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  const loadReports = useCallback(async () => {
    const response = await fetchReports();
    return [...(response.data || [])].sort((a, b) =>
      String(b.monthYear).localeCompare(String(a.monthYear)),
    );
  }, []);
  const loadTenants = useCallback(
    async () => (await fetchTenants()).data || [],
    [],
  );
  const loadShops = useCallback(
    async () => (await fetchShops()).data || [],
    [],
  );
  const loadTenantReport = useCallback(async () => {
    validateRange(startMonth, endMonth);
    return (await fetchTenantReport(selectedTenant, startMonth, endMonth)).data;
  }, [selectedTenant, startMonth, endMonth]);
  const loadShopReport = useCallback(async () => {
    validateRange(startMonth, endMonth);
    return (await fetchShopReport(selectedShop, startMonth, endMonth)).data;
  }, [selectedShop, startMonth, endMonth]);
  const loadComparison = useCallback(async () => {
    validateRange(startMonth, endMonth, true);
    return (await fetchComparisonReport(startMonth, endMonth)).data;
  }, [startMonth, endMonth]);
  const loadDetails = useCallback(
    async () => (await fetchMonthReport(detailsMonth)).data,
    [detailsMonth],
  );
  const reportsState = useRemoteData(loadReports, refreshKey);
  const tenantsState = useRemoteData(
    loadTenants,
    refreshKey,
    activeTab === "tenant",
  );
  const shopsState = useRemoteData(loadShops, refreshKey, activeTab === "shop");
  const tenantState = useRemoteData(
    loadTenantReport,
    refreshKey,
    activeTab === "tenant" && Boolean(selectedTenant),
  );
  const shopState = useRemoteData(
    loadShopReport,
    refreshKey,
    activeTab === "shop" && Boolean(selectedShop),
  );
  const comparisonState = useRemoteData(
    loadComparison,
    refreshKey,
    activeTab === "comparison" && Boolean(startMonth && endMonth),
  );
  const detailsState = useRemoteData(
    loadDetails,
    refreshKey,
    Boolean(detailsMonth),
  );
  const reports = useMemo(() => reportsState.data || [], [reportsState.data]);
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
          (!endMonth || report.monthYear <= endMonth),
      ),
    [reports, startMonth, endMonth],
  );
  const dashboardReports =
    dashboardMonth === "all"
      ? reports
      : dashboardMonth === "latest"
        ? reports.slice(0, 1)
        : reports.filter((report) => report.monthYear === dashboardMonth);
  const dashboardReport = dashboardReports[0];
  const revenue = dashboardReports.reduce(
    (sum, report) => sum + number(report.totalRevenue),
    0,
  );
  const expenses = dashboardReports.reduce(
    (sum, report) => sum + number(report.totalExpenses),
    0,
  );
  const profit = revenue - expenses;
  const averageCollection = dashboardReports.length
    ? dashboardReports.reduce(
        (sum, report) => sum + number(report.collectionRate),
        0,
      ) / dashboardReports.length
    : 0;
  const rangeInvalid = Boolean(startMonth && endMonth && startMonth > endMonth);
  const relevantStates =
    activeTab === "tenant"
      ? [tenantsState, tenantState]
      : activeTab === "shop"
        ? [shopsState, shopState]
        : activeTab === "comparison"
          ? [comparisonState]
          : [reportsState];
  const resourceError = relevantStates.find((state) => state.error)?.error;
  const activeLoading = relevantStates.some((state) => state.loading);
  const switchTab = (id) => {
    setActiveTab(id);
    setError("");
    setSuccess("");
  };
  const clearRange = () => {
    setStartMonth("");
    setEndMonth("");
  };
  const rangeProps = {
    start: startMonth,
    end: endMonth,
    onStart: setStartMonth,
    onEnd: setEndMonth,
  };
  const handleGenerate = async () => {
    if (generateLock.current) return;
    if (!generateMonth) {
      setError("Please select a month.");
      return;
    }
    generateLock.current = true;
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const response = await generateMonthlyReport(generateMonth);
      if (mounted.current) {
        setSuccess(response.message || "Monthly report updated.");
        refresh();
      }
    } catch (requestError) {
      if (mounted.current) setError(errorMessage(requestError));
    } finally {
      generateLock.current = false;
      if (mounted.current) setGenerating(false);
    }
  };
  const handleExport = async (action) => {
    if (exportLock.current) return;
    exportLock.current = true;
    setExporting(true);
    setError("");
    setSuccess("");
    try {
      await action();
      if (mounted.current) setSuccess("Download started.");
    } catch (requestError) {
      if (mounted.current) setError(errorMessage(requestError));
    } finally {
      exportLock.current = false;
      if (mounted.current) setExporting(false);
    }
  };
  const exportPDF = (month) => {
    if (month) handleExport(() => exportReportPDF(month));
  };
  const exportExcel = (start, end) => {
    try {
      validateRange(start, end);
    } catch (rangeError) {
      setError(rangeError.message);
      return;
    }
    handleExport(() => exportReportsExcel(start, end));
  };
  const monthlyColumns = [
    {
      key: "monthYear",
      label: "Month",
      render: (row) => (
        <span className="font-semibold text-slate-900">
          {monthLabel(row.monthYear)}
        </span>
      ),
    },
    amountColumn("revenue", "Revenue", "totalRevenue"),
    amountColumn("expenses", "Expenses", "totalExpenses"),
    {
      key: "net",
      label: "Net profit / loss",
      render: (row) => (
        <span
          className={`font-bold ${netAmount(row) < 0 ? "text-rose-600" : "text-emerald-700"}`}
        >
          {money(netAmount(row))}
        </span>
      ),
    },
    {
      key: "margin",
      label: "Margin",
      render: (row) => percentage(row.profitMargin),
    },
    {
      key: "collection",
      label: "Collection",
      render: (row) => percentage(row.collectionRate),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setDetailsMonth(row.monthYear);
            }}
            className={`${baseButton} bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100`}
            aria-label={`View ${monthLabel(row.monthYear)} report`}
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          <Button
            secondary
            icon={Download}
            disabled={exporting}
            onClick={() => exportPDF(row.monthYear)}
            aria-label={`Download ${monthLabel(row.monthYear)} PDF`}
            className="px-3"
          >
            PDF
          </Button>
        </div>
      ),
    },
  ];
  const filtersAction =
    startMonth || endMonth ? (
      <button
        type="button"
        onClick={clearRange}
        className="rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Clear dates
      </button>
    ) : null;
  return (
    <div className="min-h-full min-w-0 bg-slate-50/80 text-slate-900">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Finance workspace
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Reports & analytics
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {tabs.find((tab) => tab.id === activeTab).description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              secondary
              icon={RefreshCw}
              busy={activeLoading}
              disabled={activeLoading || generating}
              onClick={refresh}
            >
              Refresh
            </Button>
            {activeTab !== "monthly" && (
              <Button icon={Plus} onClick={() => switchTab("monthly")}>
                Monthly report
              </Button>
            )}
          </div>
        </header>
        {(error || resourceError) && (
          <Notice onDismiss={error ? () => setError("") : undefined}>
            {error || resourceError}
            {resourceError && (
              <button
                type="button"
                onClick={refresh}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            )}
          </Notice>
        )}
        {success && (
          <Notice success onDismiss={() => setSuccess("")}>
            {success}
          </Notice>
        )}
        <nav
          aria-label="Report sections"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => switchTab(id)}
              className={`flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:flex-1 sm:text-sm ${activeTab === id ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "dashboard" && (
          <div className="space-y-5">
            <Panel
              title="Financial overview"
              subtitle="Choose a period to explore your reports"
              icon={SlidersHorizontal}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="w-full md:max-w-xs">
                  <Field label="Reporting period">
                    <select
                      value={dashboardMonth}
                      onChange={(event) =>
                        setDashboardMonth(event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="latest">Latest available month</option>
                      <option value="all">All months combined</option>
                      {reports.map((report) => (
                        <option key={report.monthYear} value={report.monthYear}>
                          {monthLabel(report.monthYear)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    secondary
                    icon={FileText}
                    disabled={
                      exporting ||
                      reportsState.loading ||
                      !dashboardReport ||
                      dashboardMonth === "all"
                    }
                    onClick={() => exportPDF(dashboardReport?.monthYear)}
                  >
                    Month PDF
                  </Button>
                  <Button
                    icon={Download}
                    busy={exporting}
                    disabled={
                      exporting ||
                      reportsState.loading ||
                      !dashboardReports.length
                    }
                    onClick={() =>
                      dashboardMonth === "all"
                        ? exportExcel()
                        : exportExcel(
                            dashboardReport?.monthYear,
                            dashboardReport?.monthYear,
                          )
                    }
                  >
                    {dashboardMonth === "all"
                      ? "All months Excel"
                      : "Month Excel"}
                  </Button>
                </div>
              </div>
            </Panel>
            {reportsState.loading && !reportsState.data ? (
              <Loading />
            ) : !dashboardReports.length ? (
              <Empty
                title={
                  reportsState.error
                    ? "Reports unavailable"
                    : "Your financial overview starts here"
                }
                description={
                  reportsState.error
                    ? "Use Retry above to load your reports."
                    : "Generate a monthly report to see collections, expenses and payment progress."
                }
              >
                <Button icon={Plus} onClick={() => switchTab("monthly")}>
                  Generate a report
                </Button>
              </Empty>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {dashboardMonth === "all"
                      ? "All recorded months"
                      : monthLabel(dashboardReport.monthYear)}
                  </p>
                  <span className="text-xs text-slate-400">
                    {reportsState.loading
                      ? "Refreshing current figures…"
                      : `${dashboardReports.length} month${dashboardReports.length === 1 ? "" : "s"} included`}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    title="Total revenue"
                    value={money(revenue)}
                    icon={Wallet}
                    note="Recorded collections"
                  />
                  <Metric
                    title="Total expenses"
                    value={money(expenses)}
                    tone="amber"
                    icon={Receipt}
                    note="Recorded operating expenses"
                  />
                  <Metric
                    title={profit < 0 ? "Net loss" : "Net profit"}
                    value={money(Math.abs(profit))}
                    tone={profit < 0 ? "red" : "green"}
                    icon={profit < 0 ? TrendingDown : TrendingUp}
                    note={`${percentage(revenue > 0 ? (profit / revenue) * 100 : 0)} margin`}
                  />
                  <Metric
                    title={
                      dashboardMonth === "all"
                        ? "Average collection rate"
                        : "Collection rate"
                    }
                    value={percentage(averageCollection)}
                    tone="violet"
                    icon={PieChart}
                    note={
                      dashboardMonth === "all"
                        ? "Mean of monthly collection rates"
                        : "Reported monthly collection rate"
                    }
                  />
                </div>
                {dashboardMonth === "all" && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm">
                    <span className="text-indigo-800">
                      Monthly breakdown below:{" "}
                      <strong>{monthLabel(dashboardReport.monthYear)}</strong>
                    </span>
                    <span className="text-xs text-indigo-500">
                      Summary cards above include all months.
                    </span>
                  </div>
                )}
                <ReportDetails report={dashboardReport} />
              </>
            )}
          </div>
        )}

        {activeTab === "monthly" && (
          <div className="space-y-5">
            <Panel
              title="Generate a monthly report"
              subtitle="Create or update the statement for your selected month"
              icon={Calendar}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr] lg:items-end">
                <Field label="Report month">
                  <input
                    type="month"
                    value={generateMonth}
                    onChange={(event) => setGenerateMonth(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Button
                  icon={Plus}
                  busy={generating}
                  disabled={generating || !generateMonth}
                  onClick={handleGenerate}
                >
                  {generating ? "Updating report…" : "Generate / update"}
                </Button>
                <p className="text-xs leading-5 text-slate-400 sm:col-span-2 lg:col-span-1">
                  Updating an existing month refreshes its financial statement.
                </p>
              </div>
            </Panel>
            <Panel
              title="Report history"
              subtitle="Filter by month or leave dates empty for all records"
              icon={SlidersHorizontal}
              action={filtersAction}
            >
              <div className="grid items-end gap-4 md:grid-cols-3">
                <MonthRange {...rangeProps} />
                <Button
                  icon={Download}
                  busy={exporting}
                  disabled={
                    exporting ||
                    reportsState.loading ||
                    rangeInvalid ||
                    !visibleReports.length
                  }
                  onClick={() => exportExcel(startMonth, endMonth)}
                >
                  Export filtered Excel
                </Button>
              </div>
              {rangeInvalid && (
                <p role="alert" className="mt-3 text-xs text-rose-600">
                  Start month cannot be after end month.
                </p>
              )}
            </Panel>
            {reportsState.loading && !reportsState.data ? (
              <Loading text="Loading monthly reports…" />
            ) : (
              <DataTable
                title="Monthly statements"
                columns={monthlyColumns}
                rows={rangeInvalid ? [] : visibleReports}
                rowKey={(row) => row.monthYear}
                emptyText={
                  reportsState.error
                    ? "Reports could not be loaded. Use Retry above."
                    : rangeInvalid
                      ? "Choose a valid month range."
                      : "No reports in this period."
                }
              />
            )}
          </div>
        )}

        {activeTab === "tenant" && (
          <div className="space-y-5">
            <Panel
              title="Tenant payment history"
              subtitle="Select a tenant and an optional month range"
              icon={Users}
              action={filtersAction}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Tenant">
                  <select
                    value={selectedTenant}
                    disabled={tenantsState.loading && !tenants.length}
                    onChange={(event) => setSelectedTenant(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {tenantsState.loading && !tenants.length
                        ? "Loading tenants…"
                        : "Choose a tenant"}
                    </option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <MonthRange {...rangeProps} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Leave dates empty to include all months.
              </p>
            </Panel>
            {!selectedTenant && (
              <Empty
                icon={Users}
                title="Choose a tenant to get started"
                description="See their contact details, collected payments, outstanding balance and full invoice history."
              />
            )}
            {tenantState.loading && !tenantReport && (
              <Loading text="Loading tenant report…" />
            )}
            {selectedTenant &&
              !tenantState.loading &&
              !tenantState.error &&
              !tenantReport && (
                <Empty
                  title="No tenant report available"
                  description="Try another tenant or date range."
                />
              )}
            {tenantReport && (
              <>
                <Panel
                  title={tenantReport.tenantInfo?.name || "Tenant information"}
                  subtitle="Contact & identification"
                  icon={Users}
                  action={
                    <Button
                      secondary
                      icon={Download}
                      busy={exporting}
                      disabled={
                        exporting || tenantState.loading || rangeInvalid
                      }
                      onClick={() =>
                        handleExport(() =>
                          exportTenantExcel(
                            selectedTenant,
                            startMonth,
                            endMonth,
                          ),
                        )
                      }
                    >
                      Tenant Excel
                    </Button>
                  }
                >
                  <div className="grid gap-x-8 md:grid-cols-2">
                    <Row label="Name" value={tenantReport.tenantInfo?.name} />
                    <Row label="CNIC" value={tenantReport.tenantInfo?.cnic} />
                    <Row label="Phone" value={tenantReport.tenantInfo?.phone} />
                    <Row
                      label="WhatsApp"
                      value={tenantReport.tenantInfo?.whatsapp}
                    />
                  </div>
                </Panel>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    title="Total collected"
                    value={money(tenantReport.financialSummary?.totalCollected)}
                    icon={Wallet}
                  />
                  <Metric
                    title="Outstanding balance"
                    value={money(
                      tenantReport.financialSummary?.totalOutstanding,
                    )}
                    tone="red"
                    icon={Receipt}
                  />
                  <Metric
                    title="Average fully paid invoice"
                    value={money(
                      tenantReport.financialSummary?.averageMonthlyPayment,
                    )}
                    tone="green"
                    icon={CheckCircle2}
                  />
                  <Metric
                    title="Payment rate"
                    value={percentage(
                      tenantReport.financialSummary?.paymentRate,
                    )}
                    tone="violet"
                    icon={PieChart}
                  />
                </div>
                <Panel title="Invoice summary" icon={Receipt}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Total", "total"],
                      ["Paid", "paid"],
                      ["Partial", "partial"],
                      ["Unpaid", "unpaid"],
                    ].map(([label, key]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <span className="text-xs text-slate-500">{label}</span>
                        <p className="mt-2 text-2xl font-bold tabular-nums">
                          {number(tenantReport.invoicesSummary?.[key])}
                        </p>
                      </div>
                    ))}
                  </div>
                </Panel>
                <DataTable
                  title="Invoice & payment history"
                  rows={tenantReport.paymentHistory || []}
                  columns={invoiceColumns}
                  rowKey={(row, index) =>
                    row.invoiceId || row.id || row.invoiceNumber || index
                  }
                />
              </>
            )}
          </div>
        )}

        {activeTab === "shop" && (
          <div className="space-y-5">
            <Panel
              title="Shop revenue analysis"
              subtitle="Select a shop and an optional month range"
              icon={Store}
              action={filtersAction}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Shop">
                  <select
                    value={selectedShop}
                    disabled={shopsState.loading && !shops.length}
                    onChange={(event) => setSelectedShop(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      {shopsState.loading && !shops.length
                        ? "Loading shops…"
                        : "Choose a shop"}
                    </option>
                    {shops.map((shop) => (
                      <option key={shop._id} value={shop._id}>
                        Shop #{shop.shopNumber} — {shop.floor}
                      </option>
                    ))}
                  </select>
                </Field>
                <MonthRange {...rangeProps} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Leave dates empty to include all months.
              </p>
            </Panel>
            {!selectedShop && (
              <Empty
                icon={Store}
                title="Explore a shop's performance"
                description="Select a shop to review its revenue, outstanding invoices and tenant history."
              />
            )}
            {shopState.loading && !shopReport && (
              <Loading text="Loading shop report…" />
            )}
            {selectedShop &&
              !shopState.loading &&
              !shopState.error &&
              !shopReport && (
                <Empty
                  title="No shop report available"
                  description="Try another shop or date range."
                />
              )}
            {shopReport && (
              <>
                <Panel
                  title={`Shop #${shopReport.shopInfo?.shopNumber ?? "—"}`}
                  subtitle="Property details"
                  icon={Store}
                  action={
                    <Button
                      secondary
                      icon={Download}
                      busy={exporting}
                      disabled={exporting || shopState.loading || rangeInvalid}
                      onClick={() =>
                        handleExport(() =>
                          exportShopExcel(selectedShop, startMonth, endMonth),
                        )
                      }
                    >
                      Shop Excel
                    </Button>
                  }
                >
                  <div className="grid gap-x-8 md:grid-cols-2">
                    <Row
                      label="Shop number"
                      value={shopReport.shopInfo?.shopNumber}
                    />
                    <Row label="Floor" value={shopReport.shopInfo?.floor} />
                    <Row label="Type" value={shopReport.shopInfo?.type} />
                    <Row
                      label="Size"
                      value={`${number(shopReport.shopInfo?.sizeSqFt)} Sq.Ft.`}
                    />
                    <Row
                      label="Status"
                      value={<Badge status={shopReport.shopInfo?.status} />}
                    />
                  </div>
                </Panel>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    title="Total collected"
                    value={money(shopReport.financialSummary?.totalCollected)}
                    icon={Wallet}
                  />
                  <Metric
                    title="Outstanding balance"
                    value={money(shopReport.financialSummary?.totalOutstanding)}
                    tone="red"
                    icon={Receipt}
                  />
                  <Metric
                    title="Total invoices"
                    value={number(shopReport.financialSummary?.invoiceCount)}
                    tone="violet"
                    icon={FileText}
                  />
                  <Metric
                    title="Paid / partial / unpaid"
                    value={`${number(shopReport.financialSummary?.paidInvoices)} / ${number(shopReport.financialSummary?.partialInvoices)} / ${number(shopReport.financialSummary?.unpaidInvoices)}`}
                    tone="green"
                    icon={CheckCircle2}
                  />
                </div>
                <DataTable
                  title="Tenant & agreement history"
                  rows={shopReport.agreementHistory || []}
                  columns={agreementColumns}
                  rowKey={(row, index) => row.id || index}
                />
              </>
            )}
          </div>
        )}

        {activeTab === "comparison" && (
          <div className="space-y-5">
            <Panel
              title="Compare monthly performance"
              subtitle="Select both months to compare revenue, expenses and profit"
              icon={Layers}
              action={filtersAction}
            >
              <div className="grid items-end gap-4 md:grid-cols-3">
                <MonthRange {...rangeProps} />
                <Button
                  icon={Download}
                  busy={exporting}
                  disabled={
                    exporting ||
                    comparisonState.loading ||
                    rangeInvalid ||
                    !comparisonReport?.monthlyTrend?.length
                  }
                  onClick={() => exportExcel(startMonth, endMonth)}
                >
                  Export period Excel
                </Button>
              </div>
            </Panel>
            {(!startMonth || !endMonth) && (
              <Empty
                icon={Layers}
                title="Select a comparison period"
                description="Choose a start and end month above to review performance across months."
              />
            )}
            {comparisonState.loading && !comparisonReport && (
              <Loading text="Preparing comparison…" />
            )}
            {startMonth &&
              endMonth &&
              !comparisonState.loading &&
              !comparisonState.error &&
              !comparisonReport && (
                <Empty
                  title="No comparison available"
                  description="Try another month range."
                />
              )}
            {comparisonReport && (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800">
                  <Calendar className="h-4 w-4" />
                  {monthLabel(comparisonReport.periodSummary?.startMonth)}
                  <ArrowRight className="h-4 w-4" />
                  {monthLabel(comparisonReport.periodSummary?.endMonth)}
                  <span className="text-xs font-normal text-indigo-500">
                    {number(comparisonReport.periodSummary?.monthsCount)} months
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    title="Period revenue"
                    value={money(comparisonReport.periodSummary?.totalRevenue)}
                    icon={Wallet}
                  />
                  <Metric
                    title="Period expenses"
                    value={money(comparisonReport.periodSummary?.totalExpenses)}
                    tone="amber"
                    icon={Receipt}
                  />
                  <Metric
                    title="Net profit / loss"
                    value={money(comparisonReport.periodSummary?.totalProfit)}
                    tone={
                      number(comparisonReport.periodSummary?.totalProfit) < 0
                        ? "red"
                        : "green"
                    }
                    icon={TrendingUp}
                  />
                  <Metric
                    title="Average collection rate"
                    value={percentage(
                      comparisonReport.periodSummary?.averageCollectionRate,
                    )}
                    tone="violet"
                    icon={PieChart}
                    note="Reported period average"
                  />
                </div>
                <DataTable
                  title="Monthly performance comparison"
                  rows={comparisonReport.monthlyTrend || []}
                  columns={comparisonColumns}
                  rowKey={(row) => row.monthYear}
                />
              </>
            )}
          </div>
        )}

        {detailsMonth && (
          <ReportModal
            month={detailsMonth}
            onClose={() => setDetailsMonth("")}
            footer={
              <>
                <Button secondary onClick={() => setDetailsMonth("")}>
                  Close
                </Button>
                <Button
                  icon={Download}
                  busy={exporting}
                  disabled={
                    exporting ||
                    detailsState.loading ||
                    !detailsState.data ||
                    Boolean(detailsState.error)
                  }
                  onClick={() => exportPDF(detailsMonth)}
                >
                  Download PDF
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              {error && <Notice onDismiss={() => setError("")}>{error}</Notice>}
              {success && (
                <Notice success onDismiss={() => setSuccess("")}>
                  {success}
                </Notice>
              )}
              {detailsState.error && (
                <Notice>
                  {detailsState.error}
                  <button
                    type="button"
                    onClick={refresh}
                    className="ml-3 font-semibold underline"
                  >
                    Retry
                  </button>
                </Notice>
              )}
              {detailsState.loading && !detailsState.data && (
                <Loading text="Loading monthly statement…" />
              )}
              {detailsState.loading && detailsState.data && (
                <p role="status" className="text-xs text-slate-500">
                  Refreshing report…
                </p>
              )}
              {detailsState.data && (
                <ReportDetails report={detailsState.data} />
              )}
              {!detailsState.loading &&
                !detailsState.error &&
                !detailsState.data && (
                  <Empty
                    title="No report available"
                    description="Try refreshing the report list."
                  />
                )}
            </div>
          </ReportModal>
        )}
      </div>
    </div>
  );
}
