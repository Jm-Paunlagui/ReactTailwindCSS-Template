import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "aumovio-theme";

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        const pref = import.meta.env.VITE_THEME || "system";
        if (pref === "system")
            return window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        return pref;
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggle = useCallback(
        () => setTheme((t) => (t === "dark" ? "light" : "dark")),
        [],
    );

    return (
        <ThemeContext.Provider
            value={{ theme, setTheme, toggle, isDark: theme === "dark" }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
