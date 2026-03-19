import { useState, useEffect } from 'react';

export function useTheme() {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === 'undefined') return true; // Default to dark mode SSR

        // 1. Check Cookie first (for cross-subdomain sync on production)
        const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
        if (match && match[1]) {
            return match[1] === 'dark';
        }

        // 2. Check localStorage (for local development sync)
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }

        // 3. System preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Apply changes to DOM, localStorage, and Cookie
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            document.cookie = "theme=dark; domain=.vanpower.live; path=/; max-age=31536000";
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            document.cookie = "theme=light; domain=.vanpower.live; path=/; max-age=31536000";
        }
    }, [isDarkMode]);

    // Synchronize state across tabs and windows
    useEffect(() => {
        // Sync via localStorage for same-origin (e.g., localhost dev servers sharing the same port or same hostname)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'theme') {
                setIsDarkMode(e.newValue === 'dark');
            }
        };
        window.addEventListener('storage', handleStorage);

        // Sync via Cookie reading for cross-subdomain (detect when returning to tab)
        const handleFocusOrVisibility = () => {
            const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
            if (match && match[1]) {
                setIsDarkMode(match[1] === 'dark');
            }
        };

        window.addEventListener('visibilitychange', handleFocusOrVisibility);
        window.addEventListener('focus', handleFocusOrVisibility);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('visibilitychange', handleFocusOrVisibility);
            window.removeEventListener('focus', handleFocusOrVisibility);
        };
    }, []);

    return [isDarkMode, setIsDarkMode] as const;
}
