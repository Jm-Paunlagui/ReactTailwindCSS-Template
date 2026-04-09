/**
 * Badge.jsx — Status badge / pill component.
 *
 * Props:
 *   variant — 'green' | 'red' | 'warning' | 'blue' | 'purple' | 'cyan' | 'amber' | 'grey'
 *   dot     — boolean (show pulse dot)
 *   size    — 'sm' | 'md'
 *   children
 */

const VARIANTS = {
    green: "text-success-400 bg-success-100/60 border-success-400/30",
    red: "text-danger-400  bg-danger-100      border-danger-400/30",
    warning: "text-warn-400    bg-warn-100/20     border-warn-400/30",
    blue: "text-blue-400    bg-blue-100/25     border-blue-400/30",
    purple: "text-purple-400  bg-purple-100/28   border-purple-400/35",
    cyan: "text-turquoise-400 bg-turquoise-100/22 border-turquoise-400/25",
    amber: "text-yellow-400  bg-yellow-100      border-yellow-400/30",
    grey: "text-grey-500    bg-grey-100        border-grey-400/30",
    orange: "text-orange-400  bg-orange-100/20   border-orange-400/30",
};

const DOT_COLORS = {
    green: "bg-success-400   ring-success-400/30",
    red: "bg-danger-400    ring-danger-400/30",
    warning: "bg-warn-400      ring-warn-400/30",
    blue: "bg-blue-400      ring-blue-400/30",
    purple: "bg-purple-400    ring-purple-400/30",
    cyan: "bg-turquoise-400 ring-turquoise-400/30",
    amber: "bg-yellow-400    ring-yellow-400/30",
    grey: "bg-grey-400      ring-grey-400/30",
    orange: "bg-orange-400    ring-orange-400/30",
};

export default function Badge({
    variant = "grey",
    dot = false,
    size = "md",
    children,
}) {
    const sizeClass =
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-aumovio-bold tracking-wide
                rounded-lg border shadow-sm
                ${VARIANTS[variant] ?? VARIANTS.grey}
                ${sizeClass}`}
        >
            {dot && (
                <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ring-2 animate-pulse
                        ${DOT_COLORS[variant] ?? DOT_COLORS.grey}`}
                />
            )}
            {children}
        </span>
    );
}
