/**
 * Modal.jsx — Accessible modal dialog.
 *
 * Props:
 *   open      — boolean
 *   onClose   — () => void
 *   title     — string
 *   size      — 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 *   children
 */

import { useEffect } from "react";

const SIZES = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
};

export default function Modal({ open, onClose, title, size = "md", children }) {
    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={`relative w-full ${SIZES[size] ?? SIZES.md} bg-white rounded-2xl
                    shadow-2xl animate-scale-in overflow-hidden`}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-grey-200">
                        <h2 className="text-base font-aumovio-bold text-black/85">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            className="flex items-center justify-center w-7 h-7 rounded-lg
                                text-grey-400 hover:text-grey-500 hover:bg-grey-100
                                transition-colors"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                            >
                                <path
                                    d="M13 1L1 13M1 1l12 12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}
