/**
 * ProtectedRoute.jsx
 * ──────────────────
 * Generic route guard that supports:
 *
 *   1. Role-based access  — pass `role={[ROLES.ADMIN, ROLES.USER]}`
 *   2. Permission-based   — pass `permission={['can_edit', 'can_view']}`
 *                           (any match grants access)
 *   3. Custom predicate   — pass `check={(user) => Boolean}`
 *
 * When none of these props are supplied, any authenticated user passes.
 *
 * HOW TO USE
 * ──────────
 * Simple role guard (standard):
 *   <Route element={<ProtectedRoute role={[ROLES.ADMIN]} />}>
 *     <Route path="admin" element={<AdminPage />} />
 *   </Route>
 *
 * Permission guard (optional, project-specific):
 *   <Route element={<ProtectedRoute permission={['MANAGE_USERS']} />}>
 *     ...
 *   </Route>
 *
 * Custom predicate:
 *   <Route element={<ProtectedRoute check={(u) => u.department === 'HR'} />}>
 *     ...
 *   </Route>
 *
 * NOT every project needs permissions.
 * Simply omit the `permission` prop for role-only protection.
 */

import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getCookie, isAuth } from "../../middleware/authentication/AuthMiddleware";

/**
 * @param {number[]}  [role]        - Allowed userLevel values (numeric, higher = more privileged).
 * @param {string[]}  [permission]  - Allowed permission / area codes.
 *                                    If supplied, user must have at least one.
 *                                    Parsed from comma-separated `user.area` or `user.permissions`.
 * @param {Function}  [check]       - Custom predicate `(user) => boolean`.
 * @param {string}    [redirectTo]  - Where to redirect on failure (default: '/unauthorized-access').
 */
export default function ProtectedRoute({
    role = [],
    permission = [],
    check = null,
    redirectTo = "/unauthorized-access",
}) {
    const [authState, setAuthState] = useState("loading"); // 'loading' | 'ok' | 'denied' | 'unauthenticated'

    useEffect(() => {
        let cancelled = false;

        const verify = async () => {
            const token = getCookie("token");
            if (!token) {
                if (!cancelled) setAuthState("unauthenticated");
                return;
            }

            const user = await isAuth();
            if (!user) {
                if (!cancelled) setAuthState("unauthenticated");
                return;
            }

            // ── Role check ────────────────────────────────────────────────────
            if (role.length > 0) {
                const level = user?.user_data?.userLevel ?? 0;
                if (!role.includes(level)) {
                    if (!cancelled) setAuthState("denied");
                    return;
                }
            }

            // ── Permission / area check (optional) ───────────────────────────
            if (permission.length > 0) {
                // Support comma-separated strings in user.area OR an array in user.permissions
                const rawArea = user?.user_data?.area ?? "";
                const rawPerms = user?.user_data?.permissions ?? "";
                const userPerms = [
                    ...(Array.isArray(rawArea)
                        ? rawArea
                        : rawArea.split(",").map((s) => s.trim())),
                    ...(Array.isArray(rawPerms)
                        ? rawPerms
                        : rawPerms.split(",").map((s) => s.trim())),
                ].filter(Boolean);

                const hasPermission = permission.some((p) =>
                    userPerms.includes(p),
                );
                if (!hasPermission) {
                    if (!cancelled) setAuthState("denied");
                    return;
                }
            }

            // ── Custom predicate ──────────────────────────────────────────────
            if (typeof check === "function" && !check(user)) {
                if (!cancelled) setAuthState("denied");
                return;
            }

            if (!cancelled) setAuthState("ok");
        };

        verify();
        return () => {
            cancelled = true;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (authState === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (authState === "unauthenticated") return <Navigate to="/auth" replace />;
    if (authState === "denied") return <Navigate to={redirectTo} replace />;

    return <Outlet />;
}
