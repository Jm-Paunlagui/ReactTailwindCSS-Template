/**
 * useDebounce.js — Debounce a reactive value.
 *
 * Usage:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 300);
 *
 *   // Pass isDebouncing to SearchBar: isDebouncing={search !== debouncedSearch}
 */

import { useEffect, useState } from "react";

export function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default useDebounce;
