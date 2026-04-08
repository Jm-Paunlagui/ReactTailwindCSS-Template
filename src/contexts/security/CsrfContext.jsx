/**
 * CsrfContext.jsx
 * ───────────────
 * React context that exposes the CSRF token lifecycle to the component tree.
 * Wraps csrfManager so UI components never import it directly.
 */

/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import csrfManager from "../../middleware/security/CsrfMiddleware";

const CsrfContext = createContext(null);

// Module-level flag prevents double-initialisation during StrictMode double-mount.
let _globalContextInitialized = false;

// ── Provider ───────────────────────────────────────────────────────────────

export const CsrfProvider = ({ children }) => {
    const [csrfToken, setCsrfToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [tokenExpiration, setTokenExpiration] = useState(null);
    const initRef = useRef(false);

    // ── One-time initialisation ────────────────────────────────────────────
    useEffect(() => {
        if (initRef.current || _globalContextInitialized) return;

        const init = async () => {
            try {
                initRef.current = true;
                _globalContextInitialized = true;
                setLoading(true);
                setError(null);

                console.debug("[CsrfContext] initialising …");
                const refreshed = await csrfManager.handlePageRefresh();
                const token = refreshed
                    ? csrfManager.getToken()
                    : await csrfManager.initialize();

                setCsrfToken(token);
                setIsInitialized(true);

                const info = csrfManager.getDebugInfo();
                if (info.tokenExpiresAt)
                    setTokenExpiration(info.tokenExpiresAt);
                console.debug("[CsrfContext] ready");
            } catch (err) {
                console.error("[CsrfContext] init failed:", err);
                setError(err.message);
                setCsrfToken(null);
                initRef.current = false;
                _globalContextInitialized = false;
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // ── Listen for token updates ───────────────────────────────────────────
    useEffect(() => {
        if (!isInitialized) return;
        return csrfManager.addListener((token) => {
            setCsrfToken(token);
            const info = csrfManager.getDebugInfo();
            if (info.tokenExpiresAt) setTokenExpiration(info.tokenExpiresAt);
        });
    }, [isInitialized]);

    // ── Actions ───────────────────────────────────────────────────────────
    const refreshToken = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const token = await csrfManager.forceRefresh();
            setCsrfToken(token);
            const info = csrfManager.getDebugInfo();
            if (info.tokenExpiresAt) setTokenExpiration(info.tokenExpiresAt);
        } catch (err) {
            setError(err.message);
            console.error("[CsrfContext] refresh failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearToken = useCallback(() => {
        csrfManager.clearToken();
        setCsrfToken(null);
        setTokenExpiration(null);
        setError(null);
        setIsInitialized(false);
        initRef.current = false;
        _globalContextInitialized = false;
    }, []);

    const value = {
        csrfToken,
        loading,
        error,
        tokenExpiration,
        isInitialized,
        refreshToken,
        clearToken,
        manager: csrfManager,
    };

    return (
        <CsrfContext.Provider value={value}>{children}</CsrfContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────

export const useCsrfContext = () => {
    const ctx = useContext(CsrfContext);
    if (!ctx)
        throw new Error("useCsrfContext must be used within a <CsrfProvider>");
    return ctx;
};
