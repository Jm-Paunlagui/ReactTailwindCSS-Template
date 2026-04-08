/**
 * httpClient.js
 * ─────────────
 * Axios-based HTTP client with:
 *   • Automatic JWT injection (from cookie)
 *   • Automatic CSRF token injection for unsafe methods
 *   • CSRF error → automatic token refresh + request retry
 *   • No domain-specific payload injection (removed MATERIALID)
 *
 * Usage:
 *   import httpClient from './httpClient';
 *   const res = await httpClient.get('users');
 *   const res = await httpClient.post('users', { name: 'Alice' });
 */

import axios from "axios";
import { getCookie, getLocalStorage } from "../helpers/Auth";
import csrfManager from "./security/CsrfMiddleware";

const VITE_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BaseURL ||
    "http://localhost:3000";

/** Endpoints that never need a CSRF token. */
const CSRF_EXEMPT = [
    "csrf/token",
    "csrf/refresh",
    "csrf/verify",
    "csrf/status",
];

class HttpClient {
    constructor() {
        const base = VITE_BASE_URL.endsWith("/")
            ? VITE_BASE_URL
            : `${VITE_BASE_URL}/`;

        this.client = axios.create({
            withCredentials: true,
            baseURL: base,
            headers: { "Content-Type": "application/json" },
        });

        this._setupInterceptors();
        this._initCsrf();
    }

    // ── Initialisation ──────────────────────────────────────────────────────

    async _initCsrf() {
        try {
            await csrfManager.initialize();
            console.debug("[HttpClient] CSRF ready");
        } catch (err) {
            console.error("[HttpClient] CSRF init failed:", err);
            if (typeof window !== "undefined")
                window.location.href = "/bad-request";
        }
    }

    // ── Interceptors ────────────────────────────────────────────────────────

    _setupInterceptors() {
        // ── REQUEST ──────────────────────────────────────────────────────────
        this.client.interceptors.request.use(
            async (config) => {
                // 1. Auth token
                const token = getCookie("token");
                if (token) config.headers.Authorization = `Bearer ${token}`;

                // 2. Client identity header (username@userId or anonymous)
                const user = getLocalStorage("user");
                config.headers["X-Client-Username"] = user?.user_data
                    ? `${user.user_data.username}@${user.user_data.userId}`
                    : "anonymous@unknown";

                // 3. CSRF token for unsafe methods
                const isUnsafe = ["POST", "PUT", "DELETE", "PATCH"].includes(
                    config.method?.toUpperCase(),
                );
                const isExempt = CSRF_EXEMPT.some((p) =>
                    config.url?.includes(p),
                );

                if (isUnsafe && !isExempt) {
                    try {
                        const csrfToken = await csrfManager.ensureTokenReady();
                        if (csrfToken) {
                            config.headers["x-csrf-token"] = csrfToken;
                        } else {
                            throw new Error("CSRF token unavailable");
                        }
                    } catch (err) {
                        console.error("[HttpClient] CSRF inject failed:", err);
                        if (typeof window !== "undefined")
                            window.location.href = "/bad-request";
                        throw new Error(
                            `CSRF token required but unavailable: ${err.message}`,
                        );
                    }
                }

                return config;
            },
            (err) => {
                if (typeof window !== "undefined")
                    window.location.href = "/bad-request";
                return Promise.reject(err);
            },
        );

        // ── RESPONSE ─────────────────────────────────────────────────────────
        this.client.interceptors.response.use(
            (res) => res,
            async (err) => {
                const original = err.config;

                const code = err.response?.data?.code;
                const requiresRefresh = err.response?.data?.requiresRefresh;
                const isCsrfError =
                    err.response?.status === 403 &&
                    code &&
                    [
                        "CSRF_SECRET_MISSING",
                        "CSRF_TOKEN_MISSING",
                        "CSRF_TOKEN_INVALID",
                        "CSRF_TOKEN_EXPIRED",
                    ].includes(code);

                const shouldRetry =
                    (isCsrfError || requiresRefresh) &&
                    ["post", "put", "delete", "patch"].includes(
                        original.method?.toLowerCase(),
                    ) &&
                    !original._retry;

                if (shouldRetry) {
                    original._retry = true;
                    try {
                        console.debug(
                            `[HttpClient] CSRF error (${code || "requiresRefresh"}), refreshing …`,
                        );
                        const newToken = csrfManager.getToken()
                            ? await csrfManager.refreshToken()
                            : await csrfManager
                                  .forceRefresh()
                                  .then(() => csrfManager.getToken());

                        if (newToken) {
                            original.headers["x-csrf-token"] = newToken;
                            return this.client(original);
                        }
                    } catch (csrfErr) {
                        console.error(
                            "[HttpClient] retry after CSRF refresh failed:",
                            csrfErr,
                        );
                    }
                }

                return Promise.reject(err);
            },
        );
    }

    // ── HTTP methods ─────────────────────────────────────────────────────────

    get(url, config) {
        return this.client.get(url, config);
    }
    delete(url, config) {
        return this.client.delete(url, config);
    }
    post(url, data, config) {
        return this.client.post(url, data, config);
    }
    put(url, data, config) {
        return this.client.put(url, data, config);
    }
    patch(url, data, config) {
        return this.client.patch(url, data, config);
    }

    /** Generic request (for advanced use). */
    request(endpoint, options = {}) {
        return this.client({ url: endpoint, ...options });
    }

    // ── CSRF helpers (for UI components) ─────────────────────────────────────

    getCsrfInfo() {
        return {
            csrfToken: csrfManager.getToken(),
            isInitialized: csrfManager.isInitialized,
            loading: csrfManager._initializing || false,
            tokenExpiration: csrfManager.tokenExpiresAt,
            manager: csrfManager,
        };
    }

    async testCsrf() {
        try {
            await csrfManager.forceRefresh();
            const res = await this.post("csrf/verify", {
                test: true,
                timestamp: Date.now(),
            });
            return { success: true, data: res.data };
        } catch (err) {
            if (typeof window !== "undefined")
                window.location.href = "/bad-request";
            return { success: false, error: err.response?.data || err.message };
        }
    }

    async refreshCsrfToken() {
        try {
            await csrfManager.forceRefresh();
            return { success: true };
        } catch (err) {
            if (typeof window !== "undefined")
                window.location.href = "/bad-request";
            return { success: false, error: err.message };
        }
    }

    isEndpointCsrfExempt(url) {
        return CSRF_EXEMPT.some((p) => url?.includes(p));
    }

    getDebugInfo() {
        return {
            baseURL: this.client.defaults.baseURL,
            csrfManager: csrfManager.getDebugInfo(),
        };
    }

    /** Direct access to the underlying Axios instance. */
    get axios() {
        return this.client;
    }
}

const httpClient = new HttpClient();
export default httpClient;
export { HttpClient };
