/**
 * Auth.js
 * ───────
 * Cookie / localStorage helpers and authentication utilities.
 * Domain-agnostic — no inventory or area-specific logic.
 */

import cookie from "js-cookie";
import { toast } from "react-toastify";
import httpClient from "../HttpClient";

// ── Token cache (avoids repeated /verify calls) ──────────────────────────
let _authCache = null;
let _authCacheTimestamp = null;
let _pendingAuthReq = null;
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 min

// ── Cookie helpers ────────────────────────────────────────────────────────

export const setCookie = (key, value, options = {}) => {
    if (typeof window === "undefined") return;
    cookie.set(key, value, {
        domain: window.location.hostname,
        SameSite: "Strict",
        path: "/",
        ...options,
    });
};

export const removeCookie = (key) => {
    if (typeof window === "undefined") return;
    cookie.remove(key, {
        domain: window.location.hostname,
        path: "/",
        sameSite: "strict",
        expires: 1,
    });
};

export const getCookie = (key) => {
    if (typeof window === "undefined") return false;
    return cookie.get(key);
};

// ── LocalStorage helpers ──────────────────────────────────────────────────

export const setLocalStorage = (key, value) => {
    if (typeof window !== "undefined")
        localStorage.setItem(key, JSON.stringify(value));
};

export const getLocalStorage = (key) => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
};

export const removeLocalStorage = (key) => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
};

// ── Auth helpers ──────────────────────────────────────────────────────────

/** Persist token cookie then call next(). */
export const authenticate = (token, next) => {
    setCookie("token", token);
    next();
};

export const clearAuthCache = () => {
    _authCache = null;
    _authCacheTimestamp = null;
    _pendingAuthReq = null;
};

const _isCacheValid = () =>
    !!_authCache &&
    !!_authCacheTimestamp &&
    Date.now() - _authCacheTimestamp < AUTH_CACHE_DURATION;

/**
 * Check authentication state.
 * Returns the user object if authenticated, false otherwise.
 * Results are cached for AUTH_CACHE_DURATION to avoid hammering /verify.
 */
export const isAuth = async () => {
    try {
        if (typeof window === "undefined") return false;

        const cookieToken = getCookie("token");
        const userStr = localStorage.getItem("user");

        if (!cookieToken || !userStr) {
            clearAuthCache();
            return false;
        }

        if (_isCacheValid()) return _authCache;
        if (_pendingAuthReq) return await _pendingAuthReq;

        // Use cached localStorage data if it was verified recently
        try {
            const user = JSON.parse(userStr);
            if (
                user._lastVerified &&
                Date.now() - user._lastVerified < 5 * 60 * 1000
            ) {
                _authCache = user;
                _authCacheTimestamp = Date.now();
                return user;
            }
        } catch {
            /* fall through to network verify */
        }

        _pendingAuthReq = (async () => {
            try {
                const res = await httpClient.post("user-auth/verify", {
                    TOKEN: cookieToken,
                });
                const verified = res.data?.data?.user || res.data?.user;

                if (verified) {
                    verified._lastVerified = Date.now();
                    _authCache = verified;
                    _authCacheTimestamp = Date.now();
                    _pendingAuthReq = null;
                    localStorage.setItem("user", JSON.stringify(verified));
                    return verified;
                }

                clearAuthCache();
                if (typeof window !== "undefined")
                    window.location.href = "/invalid-token";
                return false;
            } catch {
                clearAuthCache();
                if (typeof window !== "undefined")
                    window.location.href = "/invalid-token";
                return false;
            }
        })();

        return await _pendingAuthReq;
    } catch {
        clearAuthCache();
        toast.error("Authentication check failed");
        return false;
    }
};

/** Sign the user out locally (clears cookies / localStorage). */
export const signout = () => {
    clearAuthCache();
    removeCookie("token");
    removeLocalStorage("user");
};

/** Update the cached user in localStorage after a profile change. */
export const updateUser = (updatedUser, next) => {
    if (typeof window !== "undefined") {
        localStorage.setItem(
            "user",
            JSON.stringify({
                ...updatedUser,
                _lastVerified: Date.now(),
            }),
        );
    }
    next();
};
