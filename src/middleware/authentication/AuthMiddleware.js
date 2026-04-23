/**
 * AuthMiddleware — Authentication helpers.
 *
 * Static class providing cookie/localStorage helpers and the isAuth()
 * check with a 5-minute cache. Mirrors the express-template's AuthMiddleware
 * philosophy: ships a mechanism, not domain-specific logic.
 *
 * Usage:
 *   import AuthMiddleware from '../../middleware/authentication/AuthMiddleware';
 *
 *   const user = await AuthMiddleware.isAuth();
 *   AuthMiddleware.authenticate(token, () => navigate('/dashboard'));
 *   AuthMiddleware.signout();
 */

import cookie from "js-cookie";
import httpClient from "../HttpClient";

// Cache config — avoid redundant /verify calls
let _authCache = null;
let _authCacheTimestamp = null;
let _pendingAuthRequest = null;
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class AuthMiddleware {
    // ─── Cookie helpers ───────────────────────────────────────────────────────

    static setCookie(key, value, options = {}) {
        if (typeof window === "undefined") return;
        cookie.set(key, value, {
            domain: window.location.hostname,
            sameSite: "Strict",
            path: "/",
            ...options,
        });
    }

    static getCookie(key) {
        if (typeof window === "undefined") return null;
        return cookie.get(key) ?? null;
    }

    static removeCookie(key) {
        if (typeof window === "undefined") return;
        cookie.remove(key, {
            domain: window.location.hostname,
            path: "/",
            sameSite: "strict",
        });
    }

    // ─── LocalStorage helpers ─────────────────────────────────────────────────

    static setLocalStorage(key, value) {
        if (typeof window === "undefined") return;
        localStorage.setItem(key, JSON.stringify(value));
    }

    static getLocalStorage(key) {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    static removeLocalStorage(key) {
        if (typeof window === "undefined") return;
        localStorage.removeItem(key);
    }

    // ─── Auth lifecycle ───────────────────────────────────────────────────────

    /**
     * Clear auth cache and call next() — call after successful login.
     * Token cookie is set server-side (HTTP-only) — no client cookie needed.
     */
    static authenticate(token, next) {
        AuthMiddleware.clearAuthCache();
        if (typeof next === "function") next();
    }

    /**
     * Sign out — clear all auth state client-side.
     * Does NOT call the logout endpoint (that's the feature's job).
     */
    static signout() {
        AuthMiddleware.clearAuthCache();
        AuthMiddleware.removeCookie("token"); // cleanup stale plain cookie from older sessions
        AuthMiddleware.removeLocalStorage("user");
    }

    /**
     * Clear the auth cache — call after login, logout, or token refresh.
     */
    static clearAuthCache() {
        _authCache = null;
        _authCacheTimestamp = null;
        _pendingAuthRequest = null;
    }

    /**
     * Check if the user is authenticated.
     *
     * 1. No localStorage user → not logged in, return false immediately
     * 2. In-memory cache still valid (5 min) → return cached user
     * 3. localStorage user verified < 5 min ago → promote to cache, return user
     * 4. Otherwise call GET auth/me — HTTP-only cookie is sent automatically
     *    via withCredentials:true; 401 → clear state and return false.
     *
     * @returns {Object|false} user object or false
     */
    static async isAuth() {
        if (typeof window === "undefined") return false;

        // If no stored user, there is no session to verify
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            AuthMiddleware.clearAuthCache();
            return false;
        }

        // Return from in-memory cache
        if (_authCache && _authCacheTimestamp && Date.now() - _authCacheTimestamp < AUTH_CACHE_DURATION) {
            return _authCache;
        }

        // Deduplicate concurrent calls
        if (_pendingAuthRequest) return _pendingAuthRequest;

        // Fast path: stored user was verified recently — no round-trip needed
        try {
            const user = JSON.parse(userStr);
            if (user._lastVerified && Date.now() - user._lastVerified < 5 * 60 * 1000) {
                _authCache = user;
                _authCacheTimestamp = Date.now();
                return user;
            }
        } catch {
            /* fall through to server verify */
        }

        // Verify with backend — HTTP-only cookie is sent automatically
        _pendingAuthRequest = (async () => {
            try {
                const response = await httpClient.get("auth/me");
                const user = response.data?.data;

                if (user) {
                    const userWithTimestamp = { ...user, _lastVerified: Date.now() };
                    _authCache = userWithTimestamp;
                    _authCacheTimestamp = Date.now();
                    _pendingAuthRequest = null;
                    localStorage.setItem("user", JSON.stringify(userWithTimestamp));
                    return userWithTimestamp;
                }

                AuthMiddleware.clearAuthCache();
                localStorage.removeItem("user");
                return false;
            } catch {
                AuthMiddleware.clearAuthCache();
                localStorage.removeItem("user");
                return false;
            }
        })();

        return _pendingAuthRequest;
    }
}

export default AuthMiddleware;
export { AuthMiddleware };
