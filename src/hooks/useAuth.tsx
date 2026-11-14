import { useState, useEffect, createContext, useContext } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { isAllowedVanpowerRedirectUrl } from '../lib/security';
import Cookies from 'js-cookie';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    needsSSOSync: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    generateCustomTokenAndRedirect: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    needsSSOSync: false,
    signInWithGoogle: async () => { },
    logout: async () => { },
    generateCustomTokenAndRedirect: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsSSOSync, setNeedsSSOSync] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // User is signed in, sync root domain cookie
                const domain = window.location.hostname.includes('vanpower.live') ? '.vanpower.live' : window.location.hostname;
                Cookies.set('vp_session_token', 'true', {
                    domain: domain,
                    path: '/',
                    secure: window.location.protocol === 'https:',
                    sameSite: 'lax',
                    expires: 7 // 7 days
                });
                sessionStorage.removeItem('vp_sso_attempted');
            } else {
                const sessionToken = Cookies.get('vp_session_token');
                const ssoAttempted = sessionStorage.getItem('vp_sso_attempted');

                if (sessionToken && !ssoAttempted) {
                    // We believe they are logged in on the root domain, but not locally.
                    // Instead of a jarring redirect, flag that they need to sync their session.
                    setNeedsSSOSync(true);
                    setLoading(false);
                    return;
                }

                // Clear cookie if no SSO sync is needed
                const domain = window.location.hostname.includes('vanpower.live') ? '.vanpower.live' : window.location.hostname;
                Cookies.remove('vp_session_token', { domain: domain, path: '/' });
            }
            setUser(currentUser);
            if (currentUser) setNeedsSSOSync(false);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        try {
            googleProvider.setCustomParameters({
                prompt: 'select_account'
            });
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const logout = async () => {
        try {
            const domain = window.location.hostname.includes('vanpower.live') ? '.vanpower.live' : window.location.hostname;
            Cookies.remove('vp_session_token', { domain: domain, path: '/' });
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const generateCustomTokenAndRedirect = async (destinationUrl: string) => {
        if (!isAllowedVanpowerRedirectUrl(destinationUrl)) {
            console.error("Blocked untrusted redirect URL in generateCustomTokenAndRedirect:", destinationUrl);
            return;
        }
        if (!user) {
            window.location.href = destinationUrl;
            return;
        }

        try {
            const idToken = await user.getIdToken();
            const response = await fetch('https://us-central1-vanpower-f15f9.cloudfunctions.net/exchangeSessionForToken', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.customToken) {
                    const url = new URL(destinationUrl);
                    url.searchParams.set('sso_token', data.customToken);
                    window.location.href = url.toString();
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to generate custom token, redirecting normally", error);
        }
        window.location.href = destinationUrl;
    };

    return (
        <AuthContext.Provider value={{ user, loading, needsSSOSync, signInWithGoogle, logout, generateCustomTokenAndRedirect }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
