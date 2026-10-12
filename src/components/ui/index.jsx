import { Link } from "react-router-dom";
import { FiLoader, FiCheck, FiX, FiAlertCircle, FiInfo } from "react-icons/fi";

// Button variants
const buttonVariants = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-secondary text-white hover:bg-secondary-dark",
  outline: "border-2 border-primary text-primary hover:bg-primary hover:text-white",
  ghost: "text-gray-600 hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <FiLoader className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Input({
  label,
  error,
  hint,
  className = "",
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className = "",
  rows = 4,
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={`w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500 resize-none ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  error,
  hint,
  options = [],
  placeholder = "Select an option",
  className = "",
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-gray-50 disabled:text-gray-500 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Checkbox({
  label,
  error,
  className = "",
  ...props
}) {
  return (
    <div className="space-y-1">
      <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
          {...props}
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {error && <p className="text-xs text-red-500 ml-7">{error}</p>}
    </div>
  );
}

export function Card({ children, className = "", padding = true }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${padding ? "p-5 sm:p-6" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = "" }) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Status badges
const badgeVariants = {
  default: "bg-gray-100 text-gray-700",
  primary: "bg-primary/10 text-primary",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

export function Badge({ variant = "default", children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Status pill with specific statuses
const statusConfig = {
  // Listing statuses
  draft: { label: "Draft", variant: "default" },
  pending_review: { label: "Pending Review", variant: "warning" },
  published: { label: "Published", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  reserved: { label: "Reserved", variant: "info" },
  rented: { label: "Rented", variant: "primary" },
  archived: { label: "Archived", variant: "default" },
  rejected: { label: "Rejected", variant: "danger" },
  
  // Application statuses
  new: { label: "New", variant: "info" },
  viewing_requested: { label: "Viewing Requested", variant: "warning" },
  in_review: { label: "In Review", variant: "warning" },
  more_info_needed: { label: "More Info Needed", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  withdrawn: { label: "Withdrawn", variant: "default" },
  expired: { label: "Expired", variant: "default" },
  
  // Tenancy statuses
  upcoming: { label: "Upcoming", variant: "info" },
  active: { label: "Active", variant: "success" },
  ended: { label: "Ended", variant: "default" },
  cancelled: { label: "Cancelled", variant: "danger" },
  
  // Payment statuses
  due: { label: "Due", variant: "warning" },
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  failed: { label: "Failed", variant: "danger" },
  disputed: { label: "Disputed", variant: "danger" },
  waived: { label: "Waived", variant: "default" },
  
  // Request statuses
  acknowledged: { label: "Acknowledged", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  waiting_for_tenant: { label: "Waiting for Tenant", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "default" },
  
  // Document statuses
  requested: { label: "Requested", variant: "info" },
  uploaded: { label: "Uploaded", variant: "warning" },
  under_review: { label: "Under Review", variant: "warning" },
  re_upload_required: { label: "Re-upload Required", variant: "danger" },
  
  // Verification statuses
  pending: { label: "Pending", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  unverified: { label: "Unverified", variant: "default" },
};

export function StatusBadge({ status, className = "" }) {
  const config = statusConfig[status] || { label: status, variant: "default" };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

// Alert component
const alertVariants = {
  info: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: FiInfo },
  success: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: FiCheck },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: FiAlertCircle },
  error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: FiX },
};

export function Alert({ variant = "info", title, children, onClose, className = "" }) {
  const config = alertVariants[variant];
  const Icon = config.icon;
  
  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border} ${className}`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 flex-shrink-0 ${config.text}`} />
        <div className="flex-1">
          {title && <h4 className={`font-medium ${config.text}`}>{title}</h4>}
          <div className={`text-sm ${config.text} ${title ? "mt-1" : ""}`}>{children}</div>
        </div>
        {onClose && (
          <button onClick={onClose} className={`${config.text} hover:opacity-70`}>
            <FiX className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Loading spinner
export function Spinner({ size = "md", className = "" }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };
  
  return (
    <FiLoader className={`animate-spin text-primary ${sizes[size]} ${className}`} />
  );
}

// Loading overlay
export function LoadingOverlay({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Page header
export function PageHeader({ title, subtitle, breadcrumbs, actions, className = "" }) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && (
        <nav className="mb-2 text-sm text-gray-500">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && <span className="mx-2">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-900">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}

// Avatar
export function Avatar({ src, name, size = "md", className = "" }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };
  
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }
  
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary ${sizes[size]} ${className}`}
    >
      {initials}
    </div>
  );
}

// Divider
export function Divider({ className = "" }) {
  return <hr className={`border-gray-200 ${className}`} />;
}

// Modal
export function Modal({ isOpen, onClose, title, children, size = "md", className = "" }) {
  if (!isOpen) return null;
  
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative w-full transform rounded-xl bg-white shadow-xl transition-all ${sizes[size]} ${className}`}
        >
          {title && (
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="px-6 py-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

// Tabs
export function Tabs({ tabs, activeTab, onChange, className = "" }) {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Stats card
export function StatsCard({ label, value, change, icon: Icon, trend = "neutral" }) {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  };
  
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`mt-1 text-sm ${trendColors[trend]}`}>{change}</p>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}

// Table
export function Table({ columns, data, onRowClick, emptyMessage = "No data available" }) {
  if (!data.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 font-medium text-gray-600"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, index) => (
            <tr
              key={row.id || index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-gray-900">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================================================
// BACKWARDS COMPATIBILITY - Old component aliases
// =============================================================================

// Old control class for form inputs
export const controlClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20";

// Field component (alias for Input with different structure)
export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

// Panel component (alias for Card with different styling)
export function Panel({ children, className = "" }) {
  return <section className={`rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}

// Empty component (simpler version of EmptyState)
export function Empty({ title, text, action }) {
  return (
    <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
      {text ? <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// Pill component (status pill with predefined colors)
const pillTone = {
  new: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  viewing: "bg-green-100 text-green-700",
  offered: "bg-orange-100 text-orange-700",
  placed: "bg-primary text-white",
  closed: "bg-gray-100 text-gray-700",
  pending: "bg-amber-100 text-amber-700",
  live: "bg-green-100 text-green-700",
  reserved: "bg-orange-100 text-orange-700",
  let: "bg-gray-100 text-gray-700",
  hidden: "bg-gray-100 text-gray-500",
  registered: "bg-amber-100 text-amber-700",
  earned: "bg-green-100 text-green-700",
  paid: "bg-primary text-white",
  contacted: "bg-green-100 text-green-700",
  declined: "bg-gray-100 text-gray-600",
};

export function Pill({ status, children }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${pillTone[status] || "bg-gray-100 text-gray-700"}`}>
      {children}
    </span>
  );
}

// DataTable component (legacy table component)
export function DataTable({ columns, rows, onRow }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRow ? () => onRow(row) : undefined}
              className={`border-t border-gray-100 ${onRow ? "cursor-pointer hover:bg-gray-50" : ""}`}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-middle">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
