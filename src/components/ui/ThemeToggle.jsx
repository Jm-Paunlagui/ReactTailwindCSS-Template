import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../../contexts/theme/ThemeContext";

export function ThemeToggle({ size = "md" }) {
    const { isDark, toggle } = useTheme();
    const sz = size === "sm" ? "w-4 h-4" : "w-5 h-5";
    return (
        <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="p-2 transition-all duration-200 border border-transparent rounded-lg text-grey-500 hover:text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/20"
        >
            {isDark ? <SunIcon className={sz} /> : <MoonIcon className={sz} />}
        </button>
    );
}
