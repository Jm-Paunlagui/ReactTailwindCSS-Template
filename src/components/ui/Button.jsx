/**
 * Button.jsx — Reusable button component.
 *
 * Uses the same class convention as pre-set-styles.jsx:
 *   orange-400 / purple-400 / danger-400 / warn-400
 *
 * Props:
 *   variant  — 'primary' | 'accent' | 'danger' | 'warning' | 'ghost'  (default: 'primary')
 *   size     — 'sm' | 'md' | 'lg'  (default: 'md')
 *   loading  — boolean
 *   disabled — boolean
 *   onClick  — handler
 *   type     — 'button' | 'submit' | 'reset'  (default: 'button')
 *   className — additional classes
 *   children
 */

const BASE =
    "inline-flex items-center justify-center gap-2 font-aumovio-bold tracking-wide rounded-lg " +
    "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] " +
    "active:scale-[0.98] backface-hidden border";

const VARIANTS = {
    primary:
        "text-orange-400 bg-orange-400/10 border-orange-400/25 " +
        "hover:bg-orange-400 hover:text-white hover:border-transparent " +
        "hover:shadow-xl hover:shadow-orange-400/30",
    accent:
        "text-purple-400 bg-purple-400/10 border-purple-400/20 " +
        "hover:bg-purple-400 hover:text-white hover:border-transparent " +
        "hover:shadow-xl hover:shadow-purple-400/30",
    danger:
        "text-danger-400 bg-danger-100 border-danger-400/20 " +
        "hover:bg-danger-400 hover:text-white hover:border-transparent " +
        "hover:shadow-xl hover:shadow-danger-400/30",
    warning:
        "text-warn-400 bg-warn-100/20 border-warn-400/30 " +
        "hover:bg-warn-100/20 hover:text-black hover:border-transparent " +
        "hover:shadow-xl hover:shadow-warn-400/30",
    ghost:
        "text-grey-500 bg-transparent border-grey-300 " +
        "hover:bg-grey-100 hover:text-black hover:border-grey-400",
};

const SIZES = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    onClick,
    type = "button",
    className = "",
    children,
}) {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`${BASE} ${VARIANTS[variant] ?? VARIANTS.primary} ${SIZES[size] ?? SIZES.md} ${isDisabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""} ${className}`}
        >
            {loading && (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            )}
            {children}
        </button>
    );
}
