import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  fetchAgreements,
  fetchAgreementFormData,
  createAgreement,
  updateAgreement,
  deleteAgreement,
} from '../services/agreementService';

import {
  FileText,
  Plus,
  X,
  Building,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Store,
  Wallet,
  FileCheck2,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';

// ==================== HELPERS ====================

const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const emptyTenant = {
  tenantId: '',
  tenantName: '',
  tenantCnic: '',
  tenantPhone: '',
  tenantWhatsApp: '',
  tenantAddress: '',
  emergencyContact: '',
};

const initialForm = () => ({
  shopIds: [],
  ...emptyTenant,
  startDate: localDate(),
  endDate: '',
  rentAmount: '',
  securityDeposit: '',
  incrementPercentage: 10,
});

const number = (value) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const money = (value) =>
  `PKR ${number(value).toLocaleString('en-PK', {
    maximumFractionDigits: 2,
  })}`;

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const validAmount = (value, allowZero = true) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  ) {
    return false;
  }

  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0) &&
    Math.abs(amount - roundMoney(amount)) < 0.0000001
  );
};

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const displayDate = (value) =>
  typeof value === 'string' ? value.slice(0, 10) : '—';

const dateInput = (value) => {
  if (!value) return '';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ''
    : date.toISOString().slice(0, 10);
};

const idOf = (value) =>
  String(value?._id ?? value ?? '').toLowerCase();

const getShops = (agreement) => {
  if (
    Array.isArray(agreement?.shops) &&
    agreement.shops.length
  ) {
    return agreement.shops.filter(Boolean);
  }

  return agreement?.shop ? [agreement.shop] : [];
};

const shopLabel = (agreement) =>
  getShops(agreement)
    .map((shop) => `#${shop.shopNumber ?? 'Unavailable'}`)
    .join(', ') || 'Unavailable';

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message ||
  error.message ||
  fallback;

const initials = (name = '') =>
  String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'A';

const tenantFormValues = (tenant) => ({
  tenantId: idOf(tenant),
  tenantName: tenant?.name || '',
  tenantCnic: tenant?.cnic || '',
  tenantPhone: tenant?.phone || '',
  tenantWhatsApp: tenant?.whatsapp || '',
  tenantAddress:
    tenant?.permanentAddress || tenant?.address || '',
  emergencyContact: tenant?.emergencyContact || '',
});

// Match the backend's 1-, 3- and 5-year lease rules.
const resolveDuration = (start, end) => {
  if (!validDate(start) || !validDate(end)) return null;

  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  for (const years of [1, 3, 5]) {
    const anniversary = new Date(startDate);
    const originalMonth = anniversary.getUTCMonth();

    anniversary.setUTCFullYear(
      anniversary.getUTCFullYear() + years
    );

    if (anniversary.getUTCMonth() !== originalMonth) {
      anniversary.setUTCDate(0);
    }

    const previousDay = new Date(anniversary);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

    if (
      endDate.getTime() === anniversary.getTime() ||
      endDate.getTime() === previousDay.getTime()
    ) {
      return years;
    }
  }

  return null;
};

const tenantFields = [
  ['tenantName', 'Tenant Full Name', true, 'text'],
  ['tenantCnic', 'CNIC Number', true, 'text'],
  ['tenantPhone', 'Phone Number', true, 'tel'],
  ['tenantWhatsApp', 'WhatsApp', false, 'tel'],
  ['tenantAddress', 'Permanent Address', false, 'text'],
  ['emergencyContact', 'Emergency Contact', false, 'tel'],
];

// ==================== STYLES ====================

const inputClass =
  'w-full min-w-0 rounded-xl border border-slate-200 bg-white ' +
  'px-3.5 py-3 text-base text-slate-900 placeholder:text-slate-400 ' +
  'outline-none transition focus:border-indigo-400 focus:ring-4 ' +
  'focus:ring-indigo-500/10 disabled:bg-slate-50 sm:text-sm';

const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl ' +
  'px-4 py-2.5 text-sm font-semibold transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const primaryButton =
  `${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`;

const secondaryButton =
  `${buttonClass} border border-slate-200 bg-white ` +
  'text-slate-600 hover:bg-slate-50';

// ==================== SMALL COMPONENTS ====================

function Badge({ value }) {
  const styles = {
    Active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    Expired: 'border-rose-100 bg-rose-50 text-rose-700',
    Terminated: 'border-rose-100 bg-rose-50 text-rose-700',
    Pending: 'border-amber-100 bg-amber-50 text-amber-700',
    Inactive: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
        styles[value] || styles.Inactive
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value || 'Unknown'}
    </span>
  );
}

function Notice({ children, success = false, onDismiss }) {
  const Icon = success ? CheckCircle2 : AlertCircle;

  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
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

function Avatar({ name }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">
      {initials(name)}
    </span>
  );
}

function ModalFooter({ children }) {
  return (
    <div
      className="no-print flex shrink-0 flex-wrap gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:justify-end sm:px-6"
      style={{
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {children}
    </div>
  );
}

// Shared modal for create, edit and print.
function Modal({
  title,
  description,
  icon: Icon = FileText,
  busy = false,
  printable = false,
  onClose,
  children,
}) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);
  const optionsRef = useRef({ busy, onClose });

  useEffect(() => {
    optionsRef.current = { busy, onClose };
  }, [busy, onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const siblings = Array.from(document.body.children)
      .filter((element) => element !== overlay)
      .map((element) => ({
        element,
        inert: element.inert,
      }));

    siblings.forEach(({ element }) => {
      element.inert = true;
    });

    document.body.style.overflow = 'hidden';
    panel.focus();

    const getFocusable = () =>
      Array.from(
        panel.querySelectorAll(
          'a[href], button, input, select, textarea, ' +
          '[tabindex="0"]'
        )
      ).filter(
        (element) =>
          !element.matches(':disabled') &&
          element.getClientRects().length > 0
      );

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();

        if (!optionsRef.current.busy) {
          optionsRef.current.onClose();
        }

        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusable();

      if (!elements.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || active === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === panel)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event) => {
      if (!panel.contains(event.target)) {
        panel.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);

      document.body.style.overflow = previousOverflow;

      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected &&
        !previousFocus.matches(':disabled')
      ) {
        previousFocus.focus();
      }
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      id={
        printable
          ? 'agreement-print-preview'
          : 'agreement-form-overlay'
      }
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {printable && (
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 16mm;
            }

            body > :not(#agreement-print-preview) {
              display: none !important;
            }

            html, body {
              height: auto !important;
              overflow: visible !important;
              background: white !important;
            }

            #agreement-print-preview {
              display: block !important;
              position: static !important;
              background: white !important;
              padding: 0 !important;
              backdrop-filter: none !important;
            }

            #agreement-print-preview .agreement-document,
            #agreement-print-preview .agreement-scroll {
              display: block !important;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              height: auto !important;
              overflow: visible !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
            }

            #agreement-print-preview .no-print {
              display: none !important;
            }

            #agreement-print-preview .signatures {
              break-inside: avoid;
            }
          }
        `}</style>
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agreement-dialog-title"
        aria-describedby="agreement-dialog-description"
        aria-busy={busy}
        tabIndex={-1}
        className={`agreement-document flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/20 bg-white shadow-2xl outline-none sm:rounded-2xl ${
          printable ? 'sm:max-w-3xl' : 'sm:max-w-2xl'
        }`}
      >
        <div className="no-print flex shrink-0 items-start gap-3 border-b border-slate-100 p-5 sm:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id="agreement-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              {title}
            </h2>

            <p
              id="agreement-dialog-description"
              className="mt-1 text-xs leading-5 text-slate-500"
            >
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}

// ==================== PAGE ====================

const AgreementsPage = () => {
  const [agreements, setAgreements] = useState([]);
  const [availableShops, setAvailableShops] = useState([]);
  const [tenants, setTenants] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState(null);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(initialForm);

  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [printError, setPrintError] = useState('');

  const mounted = useRef(false);
  const saveLock = useRef(false);
  const requestId = useRef(0);
  const printing = useRef(false);

  const isEditing = Boolean(editingAgreement);

  // ==================== LOAD DATA ====================

  const loadData = useCallback(async () => {
    const request = ++requestId.current;

    if (mounted.current) {
      setLoading(true);
    }

    const [agreementResult, formResult] =
      await Promise.allSettled([
        fetchAgreements(),
        fetchAgreementFormData(),
      ]);

    if (
      !mounted.current ||
      request !== requestId.current
    ) {
      return;
    }

    const messages = [];

    if (agreementResult.status === 'fulfilled') {
      const response = agreementResult.value;

      const rows = Array.isArray(response)
        ? response
        : response?.data;

      if (Array.isArray(rows)) {
        setAgreements(rows);
        setLoaded(true);

        setSelectedAgreement((previous) =>
          previous
            ? rows.find(
                (item) => idOf(item) === idOf(previous)
              ) || null
            : null
        );

        // Do not replace editingAgreement here.
        // It holds the snapshot from when Edit was opened.
      } else {
        messages.push(
          'Invalid agreements response from server.'
        );
      }
    } else {
      messages.push(
        getErrorMessage(
          agreementResult.reason,
          'Could not load agreements'
        )
      );
    }

    if (
      formResult.status === 'fulfilled' &&
      Array.isArray(formResult.value?.availableShops) &&
      Array.isArray(formResult.value?.tenants)
    ) {
      setAvailableShops(formResult.value.availableShops);
      setTenants(formResult.value.tenants);
      setFormReady(true);
    } else {
      setFormReady(false);

      messages.push(
        formResult.status === 'rejected'
          ? getErrorMessage(
              formResult.reason,
              'Could not load shops and tenants'
            )
          : 'Invalid shop or tenant response from server.'
      );
    }

    setError(messages.join(' | '));
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadData();

    const refresh = () => {
      if (!saveLock.current && !printing.current) {
        loadData();
      }
    };

    const beforePrint = () => {
      printing.current = true;
    };

    const afterPrint = () => {
      printing.current = false;
    };

    window.addEventListener('focus', refresh);
    window.addEventListener(
      'plaza-agreements-updated',
      refresh
    );
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);

    return () => {
      mounted.current = false;
      ++requestId.current;

      window.removeEventListener('focus', refresh);
      window.removeEventListener(
        'plaza-agreements-updated',
        refresh
      );
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [loadData]);

  // ==================== EDIT FORM OPTIONS ====================

  const currentShopIds = useMemo(
    () =>
      new Set(
        editingAgreement
          ? getShops(editingAgreement).map(idOf)
          : []
      ),
    [editingAgreement]
  );

  // Include shops already attached to the agreement.
  // They are normally Occupied, so they are absent from availableShops.
  const selectableShops = useMemo(() => {
    const result = new Map();

    availableShops.forEach((shop) => {
      result.set(idOf(shop), shop);
    });

    if (editingAgreement) {
      getShops(editingAgreement).forEach((shop) => {
        const id = idOf(shop);

        if (!id) return;

        result.set(
          id,
          typeof shop === 'object'
            ? shop
            : {
                _id: id,
                shopNumber: 'Unavailable',
                status: 'Occupied',
              }
        );
      });
    }

    return [...result.values()];
  }, [availableShops, editingAgreement]);

  const selectableTenants = useMemo(() => {
    const result = new Map();

    tenants.forEach((tenant) => {
      result.set(idOf(tenant), tenant);
    });

    const currentTenant = editingAgreement?.tenant;

    if (
      currentTenant &&
      typeof currentTenant === 'object' &&
      idOf(currentTenant) &&
      !result.has(idOf(currentTenant))
    ) {
      result.set(idOf(currentTenant), currentTenant);
    }

    return [...result.values()];
  }, [tenants, editingAgreement]);

  // ==================== OPEN / CLOSE ====================

  const closeForm = () => {
    if (saveLock.current) return;

    setIsModalOpen(false);
    setEditingAgreement(null);
    setFormError('');
    setFormData(initialForm());
  };

  const openCreate = () => {
    if (saveLock.current) return;

    setSelectedAgreement(null);
    setEditingAgreement(null);
    setFormData(initialForm());
    setFormError('');
    setSuccessMsg('');
    setIsModalOpen(true);

    loadData();
  };

  const openEdit = (agreement) => {
    if (saveLock.current) return;

    if (agreement.status !== 'Active') {
      setError('Only active agreements can be edited.');
      return;
    }

    if (
      typeof agreement.editSnapshot !== 'string' ||
      !agreement.editSnapshot
    ) {
      setError(
        'Edit information is missing. Restart the updated backend, refresh this page and try again.'
      );
      return;
    }

    setSelectedAgreement(null);
    setPrintError('');

    // Preserve the original editSnapshot throughout this edit session.
    setEditingAgreement(agreement);

    setFormData({
      ...initialForm(),
      ...tenantFormValues(agreement.tenant),

      shopIds: getShops(agreement).map(idOf),

      startDate: dateInput(agreement.startDate),
      endDate: dateInput(agreement.endDate),

      rentAmount:
        agreement.monthlyRent ??
        agreement.rentAmount ??
        '',

      securityDeposit: agreement.securityDeposit ?? 0,

      incrementPercentage:
        agreement.annualIncrementPercentage ??
        agreement.incrementPercentage ??
        10,
    });

    setFormError('');
    setSuccessMsg('');
    setIsModalOpen(true);

    loadData();
  };

  const openPreview = (agreement) => {
    if (saveLock.current) return;

    setIsModalOpen(false);
    setEditingAgreement(null);
    setPrintError('');
    setSelectedAgreement(agreement);
  };

  // ==================== FORM CHANGES ====================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name !== 'tenantId') {
      setFormData((previous) => ({
        ...previous,
        [name]: value,
      }));
      return;
    }

    if (!value) {
      setFormData((previous) => ({
        ...previous,
        ...emptyTenant,
      }));
      return;
    }

    const tenant = selectableTenants.find(
      (item) => idOf(item) === value
    );

    if (!tenant) {
      setFormError(
        'Selected tenant is unavailable. Refresh the list.'
      );
      return;
    }

    setFormData((previous) => ({
      ...previous,
      ...tenantFormValues(tenant),
    }));
  };

  const toggleShop = (shopId) => {
    setFormData((previous) => ({
      ...previous,
      shopIds: previous.shopIds.includes(shopId)
        ? previous.shopIds.filter((id) => id !== shopId)
        : [...previous.shopIds, shopId],
    }));
  };

  // ==================== SAVE CREATE / EDIT ====================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saveLock.current) return;

    setFormError('');

    if (!formReady || loading) {
      setFormError(
        'Wait for the shop and tenant lists to load.'
      );
      return;
    }

    if (!formData.shopIds.length) {
      setFormError('Please select at least one shop.');
      return;
    }

    const selectableIds = new Set(
      selectableShops.map(idOf)
    );

    if (
      formData.shopIds.some(
        (id) => !selectableIds.has(id)
      )
    ) {
      setFormError(
        'A selected shop is no longer available. Refresh and select the shops again.'
      );
      return;
    }

    if (formData.tenantId) {
      if (
        !selectableTenants.some(
          (tenant) => idOf(tenant) === formData.tenantId
        )
      ) {
        setFormError('Please select an available tenant.');
        return;
      }
    } else if (
      !formData.tenantName.trim() ||
      !formData.tenantCnic.trim() ||
      !formData.tenantPhone.trim()
    ) {
      setFormError(
        'New tenant name, CNIC and phone are required.'
      );
      return;
    }

    if (
      !validDate(formData.startDate) ||
      !validDate(formData.endDate)
    ) {
      setFormError(
        'Please enter valid start and expiry dates.'
      );
      return;
    }

    if (formData.endDate <= formData.startDate) {
      setFormError(
        'Expiry date must be after the start date.'
      );
      return;
    }

    const durationYears = resolveDuration(
      formData.startDate,
      formData.endDate
    );

    if (!durationYears) {
      setFormError(
        'Dates must match a 1-, 3- or 5-year agreement. Expiry can be the anniversary date or the day before.'
      );
      return;
    }

    if (!validAmount(formData.rentAmount, false)) {
      setFormError(
        'Monthly rent must be positive with at most 2 decimal places.'
      );
      return;
    }

    if (!validAmount(formData.securityDeposit)) {
      setFormError(
        'Enter a valid security deposit. Enter 0 if there is no deposit.'
      );
      return;
    }

    if (!validAmount(formData.incrementPercentage)) {
      setFormError(
        'Annual increment must be zero or greater, with at most 2 decimal places.'
      );
      return;
    }

    const payload = {
      ...formData,

      shopIds: [...new Set(formData.shopIds)],
      durationYears,

      rentAmount: roundMoney(formData.rentAmount),

      securityDeposit: roundMoney(
        formData.securityDeposit
      ),

      incrementPercentage: roundMoney(
        formData.incrementPercentage
      ),
    };

    tenantFields.forEach(([field]) => {
      payload[field] = String(payload[field] ?? '').trim();
    });

    const editingId = editingAgreement?._id;

    if (editingId) {
      payload.expectedSnapshot =
        editingAgreement.editSnapshot;
    }

    saveLock.current = true;
    ++requestId.current;

    setSaving(true);
    setLoading(false);
    setError('');
    setSuccessMsg('');

    try {
      const response = editingId
        ? await updateAgreement(editingId, payload)
        : await createAgreement(payload);

      if (!mounted.current) return;

      setIsModalOpen(false);
      setEditingAgreement(null);
      setFormData(initialForm());

      setSuccessMsg(
        response.message ||
        (
          editingId
            ? 'Agreement updated successfully.'
            : 'Agreement created successfully.'
        )
      );

      await loadData();
    } catch (requestError) {
      if (!mounted.current) return;

      const message = getErrorMessage(
        requestError,
        editingId
          ? 'Could not update agreement'
          : 'Could not create agreement'
      );

      if (
        !requestError.response ||
        requestError.response.status >= 500
      ) {
        // A failed response does not always mean the save failed.
        setIsModalOpen(false);
        setEditingAgreement(null);

        await loadData();

        if (mounted.current) {
          setError(
            `${message}. Check the refreshed agreement list before submitting again; the save may already have completed.`
          );
        }
      } else {
        // Keep the draft open for validation / conflict errors.
        setFormError(message);
      }
    } finally {
      saveLock.current = false;

      if (mounted.current) {
        setSaving(false);
      }
    }
  };

  // ==================== FILTERS / COUNTS ====================

  const statuses = [
    ...new Set(
      agreements
        .map((agreement) => agreement.status)
        .filter(Boolean)
    ),
  ];

  const filteredAgreements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return agreements.filter((agreement) => {
      const matchesStatus =
        !statusFilter ||
        agreement.status === statusFilter;

      const searchableText = [
        shopLabel(agreement),
        agreement.tenant?.name,
        agreement.tenant?.phone,
        agreement.tenant?.cnic,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        (!query || searchableText.includes(query))
      );
    });
  }, [agreements, search, statusFilter]);

  const counts = useMemo(() => {
    const activeAgreements = agreements.filter(
      (item) => item.status === 'Active'
    );

    const rentedShopIds = new Set(
      activeAgreements.flatMap((item) =>
        getShops(item).map(idOf)
      )
    );

    const monthlyRevenue = activeAgreements.reduce(
      (sum, item) =>
        sum + number(item.monthlyRent ?? item.rentAmount),
      0
    );

    return {
      total: agreements.length,
      active: activeAgreements.length,
      shopsRented: rentedShopIds.size,
      monthlyRevenue,
    };
  }, [agreements]);

  // ==================== ACTION BUTTONS ====================

// Open the confirmation modal.
const handleDelete = (agreement) => {
  if (saveLock.current) return;

  if (agreement.canDelete !== true) {
    setError(
      'This agreement cannot be deleted. Refresh to check its invoice status.'
    );
    return;
  }

  setDeleteTarget(agreement);
};

const closeDeleteModal = () => {
  if (saveLock.current) return;
  setDeleteTarget(null);
};

// Run only after the user confirms.
const confirmDelete = async () => {
  if (saveLock.current || !deleteTarget) return;

  const agreement = deleteTarget;

  saveLock.current = true;
  ++requestId.current;

  setSaving(true);
  setLoading(false);
  setError('');
  setSuccessMsg('');

  try {
    const response = await deleteAgreement(agreement._id);

    if (!mounted.current) return;

    setDeleteTarget(null);

    setSelectedAgreement((previous) =>
      previous?._id === agreement._id ? null : previous
    );

    await loadData();

    if (mounted.current) {
      setSuccessMsg(
        response.message || 'Agreement deleted successfully.'
      );
    }
  } catch (requestError) {
    if (!mounted.current) return;

    setDeleteTarget(null);
    await loadData();

    if (mounted.current) {
      setError(
        getErrorMessage(
          requestError,
          'Could not delete agreement'
        )
      );
    }
  } finally {
    saveLock.current = false;

    if (mounted.current) {
      setSaving(false);
    }
  }
};

 const renderActions = (agreement) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      disabled={saving}
      onClick={() => openPreview(agreement)}
      className={`${buttonClass} bg-indigo-50 px-3 text-indigo-700 hover:bg-indigo-100`}
    >
      <Printer className="h-4 w-4" />
      View / Print
    </button>

    <button
      type="button"
      disabled={saving || agreement.status !== 'Active'}
      onClick={() => openEdit(agreement)}
      title={
        agreement.status !== 'Active'
          ? 'Only active agreements can be edited'
          : 'Edit agreement'
      }
      className={`${secondaryButton} px-3`}
    >
      <Pencil className="h-4 w-4" />
      Edit
    </button>

    {agreement.canDelete === true && (
      <button
        type="button"
        disabled={saving}
        onClick={() => handleDelete(agreement)}
        className={`${buttonClass} border border-rose-200 bg-rose-50 px-3 text-rose-700 hover:bg-rose-100`}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    )}
  </div>
);

  const handlePrint = () => {
    setPrintError('');
    printing.current = true;

    try {
      window.print();
    } catch {
      printing.current = false;
      setPrintError(
        'Could not open the print dialog. Please try again.'
      );
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="min-w-0 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">
              Property Management
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Lease agreements
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage tenants, commercial units and lease details.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || saving}
              onClick={loadData}
              className={secondaryButton}
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />

              <span className="sr-only sm:not-sr-only">
                Refresh
              </span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={openCreate}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Plus className="h-4 w-4" />
              New agreement
            </button>
          </div>
        </div>

        {error && (
          <Notice onDismiss={() => setError('')}>
            {error}
          </Notice>
        )}

        {successMsg && (
          <Notice
            success
            onDismiss={() => setSuccessMsg('')}
          >
            {successMsg}
          </Notice>
        )}

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            [
              'Total agreements',
              counts.total,
              FileText,
              'bg-indigo-50 text-indigo-600',
            ],
            [
              'Active leases',
              counts.active,
              FileCheck2,
              'bg-emerald-50 text-emerald-600',
            ],
            [
              'Shops rented',
              counts.shopsRented,
              Store,
              'bg-amber-50 text-amber-600',
            ],
            [
              'Monthly revenue',
              money(counts.monthlyRevenue),
              Wallet,
              'bg-violet-50 text-violet-600',
            ],
          ].map(([label, value, Icon, color]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">
                  {label}
                </p>

                <span className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <p className="mt-3 break-words text-2xl font-bold text-slate-900">
                {loaded ? value : '—'}
              </p>
            </div>
          ))}
        </div>

        {/* AGREEMENTS LIST */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                All agreements
              </h2>

              <span
                aria-live="polite"
                className="text-xs text-slate-400"
              >
                {loading
                  ? 'Refreshing…'
                  : loaded
                    ? `${filteredAgreements.length} matching`
                    : 'Not loaded'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />

                <input
                  type="search"
                  aria-label="Search agreements"
                  placeholder="Search tenant, CNIC, phone or shop..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                aria-label="Filter agreement status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className={inputClass}
              >
                <option value="">All statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!loaded && loading ? (
            <div role="status" className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              ))}

              <span className="sr-only">
                Loading agreements...
              </span>
            </div>
          ) : !filteredAgreements.length ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto mb-4 h-10 w-10 text-indigo-300" />

              <h3 className="font-bold text-slate-800">
                {!loaded
                  ? 'Could not load agreements'
                  : 'No agreements found'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {!loaded
                  ? 'Refresh to try again.'
                  : search || statusFilter
                    ? 'Try another search or status filter.'
                    : 'Create your first lease agreement to get started.'}
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE CARDS */}

              <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 lg:hidden">
                {filteredAgreements.map((agreement) => (
                  <article
                    key={agreement._id}
                    className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={agreement.tenant?.name} />

                        <div className="min-w-0">
                          <h3 className="break-words font-bold text-slate-900">
                            {agreement.tenant?.name ||
                              'Unavailable'}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {agreement.tenant?.cnic || '—'}
                          </p>
                        </div>
                      </div>

                      <Badge value={agreement.status} />
                    </div>

                    <div className="mt-5 space-y-3 text-sm">
                      <div className="flex gap-2 text-slate-600">
                        <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <span>{shopLabel(agreement)}</span>
                      </div>

                      <div className="flex gap-2 text-slate-500">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                        <span>
                          {displayDate(agreement.startDate)}
                          {' → '}
                          {displayDate(agreement.endDate)}
                        </span>
                      </div>

                      <div className="flex gap-2 font-semibold text-emerald-700">
                        <Wallet className="mt-0.5 h-4 w-4 shrink-0" />

                        <span>
                          {money(
                            agreement.monthlyRent ??
                            agreement.rentAmount
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {renderActions(agreement)}
                    </div>
                  </article>
                ))}
              </div>

              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      {[
                        'Shops',
                        'Tenant',
                        'Contact',
                        'Lease period',
                        'Monthly rent',
                        'Status',
                        'Actions',
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-5 py-4"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAgreements.map((agreement) => (
                      <tr
                        key={agreement._id}
                        className="hover:bg-indigo-50/30"
                      >
                        <td className="px-5 py-4 font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <Building className="h-4 w-4 text-indigo-600" />
                            {shopLabel(agreement)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={agreement.tenant?.name}
                            />

                            <div className="min-w-[120px]">
                              <p className="max-w-[180px] break-words font-semibold text-slate-900">
                                {agreement.tenant?.name ||
                                  'Unavailable'}
                              </p>

                              <p className="mt-1 whitespace-nowrap text-xs text-slate-400">
                                {agreement.tenant?.cnic || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          <p className="whitespace-nowrap">
                            {agreement.tenant?.phone || '—'}
                          </p>

                          {agreement.tenant?.whatsapp && (
                            <p className="mt-1 whitespace-nowrap text-emerald-700">
                              WA: {agreement.tenant.whatsapp}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-xs">
                          {displayDate(agreement.startDate)}
                          {' → '}
                          {displayDate(agreement.endDate)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-bold text-emerald-700">
                          {money(
                            agreement.monthlyRent ??
                            agreement.rentAmount
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <Badge value={agreement.status} />
                        </td>

                        <td className="px-5 py-4">
                          {renderActions(agreement)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* ==================== CREATE / EDIT FORM ==================== */}

      {isModalOpen && (
        <Modal
          title={
            isEditing
              ? 'Edit lease agreement'
              : 'Create lease agreement'
          }
          description={
            isEditing
              ? 'Review the existing details and save your changes.'
              : 'Select units, tenant and lease terms.'
          }
          icon={isEditing ? Pencil : FileText}
          busy={saving}
          onClose={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {formError && <Notice>{formError}</Notice>}

              {error && <Notice>{error}</Notice>}

              {!formReady && !loading && (
                <Notice>
                  Shop or tenant data could not be loaded.
                  Close this form and refresh.
                </Notice>
              )}

              {loading && (
                <p
                  role="status"
                  className="flex items-center gap-2 text-sm text-indigo-700"
                >
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing shops and tenants...
                </p>
              )}

              {isEditing && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-800">
                  Existing invoices keep their saved amounts.
                  Tenant and shop changes are allowed only before
                  invoices exist. Existing tenant profile fields
                  are read-only here.
                </div>
              )}

              <fieldset
                disabled={saving || loading || !formReady}
                className="min-w-0 space-y-5"
              >
                {/* SHOP SELECTION */}

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-600">
                    {isEditing
                      ? 'Current and available shops'
                      : 'Available shops'}
                    {' — '}
                    {formData.shopIds.length} selected
                  </p>

                  <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                    {!selectableShops.length ? (
                      <p className="text-sm text-slate-500">
                        No available shops.
                      </p>
                    ) : (
                      selectableShops.map((shop) => {
                        const shopId = idOf(shop);
                        const isCurrent =
                          currentShopIds.has(shopId);

                        return (
                          <label
                            key={shopId}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition ${
                              formData.shopIds.includes(shopId)
                                ? 'border-indigo-300 bg-indigo-50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.shopIds.includes(
                                shopId
                              )}
                              onChange={() =>
                                toggleShop(shopId)
                              }
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />

                            <span>
                              Shop #{shop.shopNumber}

                              <span className="block text-xs text-slate-500">
                                {shop.floor || '—'} ·{' '}
                                {shop.sizeSqFt ?? '—'} sq ft
                              </span>

                              {isEditing && isCurrent && (
                                <span className="mt-1 block text-[10px] font-semibold text-indigo-600">
                                  Current agreement shop
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* TENANT SELECTION */}

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold text-slate-600">
                    Existing or new tenant
                  </span>

                  <select
                    name="tenantId"
                    value={formData.tenantId}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">
                      Register new tenant
                    </option>

                    {selectableTenants.map((tenant) => (
                      <option
                        key={idOf(tenant)}
                        value={idOf(tenant)}
                      >
                        {tenant.name} —{' '}
                        {tenant.cnic || tenant.phone}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {tenantFields.map(
                    ([name, label, required, type]) => (
                      <label
                        key={name}
                        className={`block min-w-0 ${
                          name === 'tenantName'
                            ? 'sm:col-span-2'
                            : ''
                        }`}
                      >
                        <span className="mb-2 block text-xs font-semibold text-slate-600">
                          {label}

                          {required && !formData.tenantId && (
                            <span className="ml-1 text-indigo-500">
                              *
                            </span>
                          )}
                        </span>

                        <input
                          type={type}
                          name={name}
                          value={formData[name]}
                          onChange={handleChange}
                          required={
                            required && !formData.tenantId
                          }
                          disabled={Boolean(formData.tenantId)}
                          className={inputClass}
                        />
                      </label>
                    )
                  )}
                </div>

                {/* DATES */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Start date
                    </span>

                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Expiry date
                    </span>

                    <input
                      type="date"
                      name="endDate"
                      min={formData.startDate || undefined}
                      value={formData.endDate}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>

                <p className="text-xs leading-5 text-slate-500">
                  Lease duration must be 1, 3 or 5 years.
                  Expiry can be the anniversary date or the day
                  before.
                </p>

                {/* FINANCIAL FIELDS */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Combined monthly rent
                    </span>

                    <input
                      type="number"
                      name="rentAmount"
                      min="0.01"
                      step="0.01"
                      value={formData.rentAmount}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Security deposit
                    </span>

                    <input
                      type="number"
                      name="securityDeposit"
                      min="0"
                      step="0.01"
                      value={formData.securityDeposit}
                      onChange={handleChange}
                      required
                      placeholder="0 if none"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-slate-600">
                      Annual increment (%)
                    </span>

                    <input
                      type="number"
                      name="incrementPercentage"
                      min="0"
                      step="0.01"
                      value={formData.incrementPercentage}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>

                <p className="text-xs text-slate-500">
                  Monthly rent is the combined amount for all
                  selected shops.
                </p>
              </fieldset>
            </div>

            <ModalFooter>
              <button
                type="button"
                disabled={saving}
                onClick={closeForm}
                className={`${secondaryButton} flex-1 sm:flex-none`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving ||
                  loading ||
                  !formReady ||
                  !selectableShops.length
                }
                className={`${primaryButton} flex-1 sm:flex-none`}
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : isEditing ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}

                {saving
                  ? 'Saving…'
                  : isEditing
                    ? 'Save changes'
                    : 'Save agreement'}
              </button>
            </ModalFooter>
          </form>
        </Modal>
      )}

      {/* ==================== DELETE CONFIRMATION ==================== */}

{deleteTarget && (
  <Modal
    title="Delete agreement?"
    description="Please review the agreement before confirming."
    icon={Trash2}
    busy={saving}
    onClose={closeDeleteModal}
  >
    <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">
      <div className="flex items-start gap-4 rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <Trash2 className="h-5 w-5" />
        </span>

        <div>
          <h3 className="text-sm font-bold text-rose-900">
            This action cannot be undone
          </h3>

          <p className="mt-1 text-sm leading-6 text-rose-700">
            This agreement will be permanently deleted.
            Deletion is allowed only if it has no invoices.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 p-4">
          <Avatar name={deleteTarget.tenant?.name} />

          <div className="min-w-0">
            <p className="break-words text-sm font-bold text-slate-900">
              {deleteTarget.tenant?.name || 'Unavailable'}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {deleteTarget.tenant?.cnic || '—'}
            </p>
          </div>
        </div>

        <dl className="space-y-3 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Shops</dt>
            <dd className="text-right font-semibold text-slate-900">
              {shopLabel(deleteTarget)}
            </dd>
          </div>

          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Monthly rent</dt>
            <dd className="text-right font-semibold text-slate-900">
              {money(
                deleteTarget.monthlyRent ??
                deleteTarget.rentAmount
              )}
            </dd>
          </div>

          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Lease period</dt>
            <dd className="text-right text-slate-700">
              {displayDate(deleteTarget.startDate)}
              {' → '}
              {displayDate(deleteTarget.endDate)}
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-sm leading-6 text-slate-500">
        Eligible shops will become available again.
        The tenant record will remain saved.
      </p>
    </div>

    <ModalFooter>
      <button
        type="button"
        autoFocus
        disabled={saving}
        onClick={closeDeleteModal}
        className={`${secondaryButton} flex-1 sm:flex-none`}
      >
        Keep agreement
      </button>

      <button
        type="button"
        disabled={saving}
        onClick={confirmDelete}
        className={`${buttonClass} flex-1 bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 sm:flex-none`}
      >
        {saving ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}

        {saving ? 'Deleting…' : 'Yes, delete agreement'}
      </button>
    </ModalFooter>
  </Modal>
)}

      {/* ==================== PRINT PREVIEW ==================== */}

      {selectedAgreement && (
        <Modal
          title="Agreement preview"
          description="Review and print the lease deed."
          icon={Printer}
          printable
          onClose={() => setSelectedAgreement(null)}
        >
          <div className="agreement-scroll min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8">
            {printError && (
              <div className="no-print mb-5">
                <Notice>{printError}</Notice>
              </div>
            )}

            <div className="space-y-5 text-sm leading-relaxed text-slate-800">
              <h2 className="text-center text-lg font-bold">
                COMMERCIAL COMPOSITE RENTAL DEED
              </h2>

              <p>
                This agreement is between Khalil Plaza (First
                Party) and{' '}
                <strong>
                  {selectedAgreement.tenant?.name ||
                    'Unavailable'}
                </strong>{' '}
                (CNIC:{' '}
                {selectedAgreement.tenant?.cnic ||
                  'Unavailable'}),
                hereinafter referred to as the Tenant.
              </p>

              <div className="space-y-3">
                <p>
                  <strong>Rented Commercial Units:</strong>{' '}

                  {getShops(selectedAgreement)
                    .map(
                      (shop) =>
                        `Shop #${
                          shop.shopNumber ?? 'Unavailable'
                        }${
                          shop.floor != null
                            ? ` (${shop.floor})`
                            : ''
                        }`
                    )
                    .join(', ') || 'Unavailable'}
                </p>

                <p>
                  <strong>Lease Duration:</strong>{' '}
                  {displayDate(selectedAgreement.startDate)}
                  {' to '}
                  {displayDate(selectedAgreement.endDate)}
                </p>

                <p>
                  <strong>Combined Monthly Rent:</strong>{' '}

                  {money(
                    selectedAgreement.monthlyRent ??
                    selectedAgreement.rentAmount
                  )}
                </p>

                <p>
                  <strong>Security Deposit:</strong>{' '}
                  {money(selectedAgreement.securityDeposit)}
                  {' '}(Refundable)
                </p>

                <p>
                  <strong>Annual Rent Escalation:</strong>{' '}

                  {number(
                    selectedAgreement.annualIncrementPercentage ??
                    selectedAgreement.incrementPercentage
                  )}
                  % after every 12 months.
                </p>

                <p>
                  <strong>Tenant Phone:</strong>{' '}
                  {selectedAgreement.tenant?.phone || '—'}
                </p>
              </div>

              <p>
                <strong>Terms &amp; Conditions:</strong> The
                tenant is authorized to combine these commercial
                units for unified office/showroom operations,
                maintain utility payments on time, and clear
                dues monthly.
              </p>

              <div className="signatures grid grid-cols-2 gap-8 pt-16 text-center">
                <div className="border-t border-slate-400 pt-3">
                  <p className="font-bold">
                    Khalil Plaza Authority
                  </p>

                  <p className="mt-2 text-xs">
                    Signature / Date
                  </p>
                </div>

                <div className="border-t border-slate-400 pt-3">
                  <p className="font-bold">
                    {selectedAgreement.tenant?.name || 'Tenant'}
                  </p>

                  <p className="mt-2 text-xs">
                    Signature / Date
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setSelectedAgreement(null)}
              className={`${secondaryButton} flex-1 sm:flex-none`}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`${primaryButton} flex-1 sm:flex-none`}
            >
              <Printer className="h-4 w-4" />
              Print agreement
            </button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default AgreementsPage;