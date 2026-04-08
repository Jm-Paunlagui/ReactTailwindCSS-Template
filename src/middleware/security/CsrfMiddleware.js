/**
 * csrfManager.js
 * ──────────────
 * Singleton that manages the CSRF token lifecycle:
 *   • Fetches token from  GET  /api/v1/csrf/token
 *   • Refreshes via       POST /api/v1/csrf/refresh
 *   • Schedules automatic pre-expiry rotation
 *   • Emits change events so React contexts / hooks stay in sync
 *
 * The backend (csrf-csrf library) owns the HTTP-only secret cookie.
 * This module only stores the token string in memory and sends it
 * as the x-csrf-token request header.
 */

// NOTE: Cannot import getCookie from helpers/Auth due to circular dependency
// (Auth → httpClient → csrfManager), so cookie reading is inlined below.
const _getCookie = (key) => {
    if (typeof window === "undefined") return "";
    return document.cookie.split("; ").reduce((r, v) => {
        const parts = v.split("=");
        return parts[0] === key ? decodeURIComponent(parts[1]) : r;
    }, "");
};

let globalInitializationInProgress = false;

class CsrfManager {
    constructor() {
        this.token = null;
        this.tokenPromise = null; // deduplicate concurrent fetchToken calls
        this.refreshPromise = null; // deduplicate concurrent refreshToken calls
        this.initializationPromise = null;
        this.lastFetchTime = null;
        this.tokenExpiry = null; // ms timestamp
        this.tokenExpiresAt = null; // ISO string from backend
        this.isInitialized = false;
        this.refreshTimer = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 s base (exponential back-off)
        this.tokenMaxAge = 3_600_000; // 1 h — must match backend
        this.refreshBeforeExpiry = 10_000; // refresh 10 s before expiry
        this.listeners = new Set();
        this._initializing = false;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Idempotent initialisation — multiple calls return the same promise.
     */
    async initialize() {
        if (this.isInitialized && this.token) return this.token;
        if (globalInitializationInProgress) {
            await this._sleep(100);
            if (this.isInitialized && this.token) return this.token;
        }
        if (this.initializationPromise) return this.initializationPromise;

        globalInitializationInProgress = true;
        this._initializing = true;
        this.initializationPromise = this._initializeInternal();

        try {
            return await this.initializationPromise;
        } finally {
            this._initializing = false;
            globalInitializationInProgress = false;
        }
    }

    getToken() {
        if (this.token && this._isTokenValid()) return this.token;
        if (this.token && !this._isTokenValid()) {
            console.debug("[CSRF] token expired, clearing");
            this.token = null;
        }
        return null;
    }

    needsRefresh() {
        if (!this.token) return true;
        if (this.tokenExpiresAt) {
            const remaining =
                new Date(this.tokenExpiresAt).getTime() - Date.now();
            if (remaining <= this.refreshBeforeExpiry) {
                console.debug(
                    `[CSRF] needs refresh (${Math.round(remaining / 1000)} s left)`,
                );
                return true;
            }
            return false;
        }
        return false;
    }

    async refreshToken() {
        if (this.refreshPromise) return this.refreshPromise;

        const BASE = this._baseUrl();
        this.refreshPromise = (async () => {
            try {
                console.debug("[CSRF] refreshing via /csrf/refresh …");
                const res = await fetch(`${BASE}csrf/refresh`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok) {
                    this._redirectBadRequest();
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();
                if (!data.success || !data.token) {
                    this._redirectBadRequest();
                    throw new Error(data.message || "Empty refresh response");
                }

                this._applyToken(data);
                this.notifyListeners();
                console.debug("[CSRF] token refreshed");
                return this.token;
            } catch (err) {
                console.error("[CSRF] refresh failed:", err);
                throw err;
            }
        })();

        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    async refreshIfNeeded() {
        if (this.needsRefresh()) {
            try {
                return await this.refreshToken();
            } catch {
                return null;
            }
        }
        return this.getToken();
    }

    async forceRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        try {
            const t = await this.refreshToken();
            this.notifyListeners();
            return t;
        } catch (err) {
            console.error("[CSRF] force refresh failed:", err);
            this.clearToken();
            throw err;
        }
    }

    async ensureTokenReady() {
        if (!this.isInitialized) {
            const ok = await this.handlePageRefresh();
            if (ok) {
                const t = this.getToken();
                if (t) return t;
            }
        }

        let t = this.getToken();
        if (t) return t;

        if (!this.isInitialized) t = await this.initialize();
        if (t) return t;

        t = await this.refreshIfNeeded();
        if (t) return t;

        throw new Error(
            "[CSRF] unable to obtain token after multiple attempts",
        );
    }

    async waitForToken(timeoutMs = 10_000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const t = this.getToken();
            if (t) return t;
            await this._sleep(100);
        }
        throw new Error("[CSRF] timeout waiting for token");
    }

    clearToken() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.token = null;
        this.tokenExpiry = null;
        this.tokenExpiresAt = null;
        this.lastFetchTime = null;
        this.isInitialized = false;
        this.retryCount = 0;
        this.initializationPromise = null;
        this.refreshPromise = null;
        this.notifyListeners();
        console.debug("[CSRF] token cleared");
    }

    /** Subscribe to token changes. Returns an unsubscribe function. */
    addListener(cb) {
        this.listeners.add(cb);
        return () => this.listeners.delete(cb);
    }

    notifyListeners() {
        this.listeners.forEach((cb) => {
            try {
                cb(this.token);
            } catch (e) {
                console.error("[CSRF] listener error:", e);
            }
        });
    }

    /**
     * Handle page-refresh scenario — backend will reuse the existing HTTP-only
     * secret cookie if still valid, or issue a new one.
     */
    async handlePageRefresh() {
        console.debug("[CSRF] handlePageRefresh: fetching token");
        try {
            const t = await this.fetchToken();
            if (t) {
                this.token = t;
                this.isInitialized = true;
                this.notifyListeners();
                return true;
            }
            return false;
        } catch (err) {
            console.error("[CSRF] handlePageRefresh failed:", err);
            return false;
        }
    }

    getDebugInfo() {
        const remaining = this.tokenExpiresAt
            ? new Date(this.tokenExpiresAt).getTime() - Date.now()
            : null;
        return {
            hasToken: !!this.token,
            tokenLength: this.token?.length ?? 0,
            tokenPreview: this.token ? `${this.token.substring(0, 8)}…` : null,
            isInitialized: this.isInitialized,
            isInitializing: this._initializing,
            tokenExpiresAt: this.tokenExpiresAt,
            timeUntilExpirySeconds:
                remaining != null ? Math.floor(remaining / 1000) : null,
            needsRefresh: this.token ? this.needsRefresh() : false,
            hasRefreshTimer: !!this.refreshTimer,
            lastFetchTime: this.lastFetchTime,
            retryCount: this.retryCount,
        };
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    async _initializeInternal() {
        try {
            console.debug("[CSRF] _initializeInternal: fetching token");
            const t = await this.fetchToken();
            this.token = t;
            this.isInitialized = true;
            this.notifyListeners();
            return t;
        } catch (err) {
            console.error("[CSRF] _initializeInternal failed:", err);
            this.isInitialized = false;
            throw err;
        } finally {
            this.initializationPromise = null;
        }
    }

    async fetchToken() {
        if (this.tokenPromise) return this.tokenPromise;
        this.tokenPromise = this._fetchWithRetry();
        try {
            return await this.tokenPromise;
        } finally {
            this.tokenPromise = null;
        }
    }

    async _fetchWithRetry() {
        const BASE = this._baseUrl();
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const res = await fetch(`${BASE}csrf/token`, {
                    method: "GET",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                });

                if (!res.ok)
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);

                const data = await res.json();
                if (!data.success || !data.token)
                    throw new Error(data.message || "Empty token response");

                this._applyToken(data);
                this.retryCount = 0;
                console.debug("[CSRF] token fetched", {
                    length: data.token.length,
                    expiresAt: data.expiresAt,
                });
                return data.token;
            } catch (err) {
                this.retryCount = attempt + 1;
                console.error(
                    `[CSRF] fetch attempt ${attempt + 1} failed:`,
                    err,
                );
                if (attempt === this.maxRetries)
                    throw new Error(
                        `[CSRF] failed after ${this.maxRetries + 1} attempts: ${err.message}`,
                    );
                await this._sleep(this.retryDelay * Math.pow(2, attempt));
            }
        }
    }

    /** Store token data received from backend */
    _applyToken(data) {
        this.token = data.token;
        this.lastFetchTime = Date.now();
        if (data.expiresIn) this.tokenExpiry = Date.now() + data.expiresIn;
        if (data.expiresAt) this.tokenExpiresAt = data.expiresAt;

        const refreshIn =
            data.refreshIn > 0
                ? data.refreshIn
                : data.expiresIn
                  ? Math.max(0, data.expiresIn - this.refreshBeforeExpiry)
                  : null;

        if (refreshIn != null) this._scheduleRefresh(refreshIn);
    }

    _isTokenValid() {
        if (!this.token) return false;
        if (this.tokenExpiry && Date.now() > this.tokenExpiry) return false;
        return typeof this.token === "string" && this.token.length > 0;
    }

    _scheduleRefresh(ms) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        const safeMs = Math.max(0, ms);
        this.refreshTimer = setTimeout(async () => {
            try {
                await this.refreshToken();
            } catch (err) {
                console.error(
                    "[CSRF] auto-refresh failed, retrying in 30 s:",
                    err,
                );
                setTimeout(
                    () => this.refreshToken().catch(console.error),
                    30_000,
                );
            }
        }, safeMs);
    }

    _baseUrl() {
        const raw =
            import.meta.env.VITE_API_BASE_URL ||
            import.meta.env.VITE_BaseURL ||
            "http://localhost:3000";
        return raw.endsWith("/") ? raw : `${raw}/`;
    }

    _redirectBadRequest() {
        if (typeof window !== "undefined")
            window.location.href = "/bad-request";
    }

    _sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
}

// Singleton
const csrfManager = new CsrfManager();
export default csrfManager;
export { CsrfManager };
