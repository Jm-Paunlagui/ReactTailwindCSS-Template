/**
 * formatters.js — Pure transformation utilities.
 * No React, no HTTP, no side effects.
 */

/** Format a date/string to a readable locale string */
export function formatDate(value, options = {}) {
    if (!value) return "N/A";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...options,
    });
}

/** Format date with time included */
export function formatDateTime(value) {
    return formatDate(value, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** Format a number with thousand separators */
export function formatNumber(value) {
    const n = Number(value);
    return isNaN(n) ? "0" : new Intl.NumberFormat("en-US").format(n);
}

/** Format as currency (default: PHP) */
export function formatCurrency(value, currency = "PHP", locale = "en-PH") {
    const n = Number(value);
    if (isNaN(n)) return "—";
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(n);
}

/** Truncate string with ellipsis */
export function truncate(str, max = 50) {
    if (!str) return "";
    return str.length > max ? `${str.slice(0, max)}…` : str;
}

/** "SNAKE_CASE" or "snake_case" → "Snake Case" */
export function toReadableName(str) {
    if (!str) return "";
    return str
        .split(/[_\s-]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

/** Mask email: "jo**e@example.com" */
export function maskEmail(email) {
    if (!email || email.includes("*")) return email ?? "";
    const [local, domain] = email.split("@");
    return `${local.slice(0, 2)}**${local.slice(-1)}@${domain}`;
}
