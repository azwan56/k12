import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { getCookieDomain } from '../../../lib/region';

type Language = 'en' | 'zh';

const LANGUAGE_COOKIE_KEY = 'vanpower_language';

export function useLanguage(): [Language, (lang: Language) => void] {
    const [language, setLanguageState] = useState<Language>(() => {
        // Try to get from cookie first
        const cookieLang = Cookies.get(LANGUAGE_COOKIE_KEY) as Language;
        if (cookieLang === 'en' || cookieLang === 'zh') {
            return cookieLang;
        }

        // Fallback to browser preference or default to English
        if (typeof navigator !== 'undefined') {
            const browserLang = navigator.language.toLowerCase();
            if (browserLang.startsWith('zh')) {
                return 'zh';
            }
        }

        return 'en';
    });

    const setLanguage = (newLang: Language) => {
        setLanguageState(newLang);
        // Store in cookie, share across all subdomains (e.g., .vanpower.live or .vanpower.net)
        const domain = getCookieDomain();
        Cookies.set(LANGUAGE_COOKIE_KEY, newLang, { expires: 365, domain, path: '/' });
    };

    useEffect(() => {
        // Ensure initial state is saved to cookie if it wasn't there
        const cookieLang = Cookies.get(LANGUAGE_COOKIE_KEY);
        if (!cookieLang) {
            setLanguage(language);
        }
    }, [language]);

    return [language, setLanguage];
}
