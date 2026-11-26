import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { isAllowedVanpowerRedirectUrl } from '../lib/security';
import { getAppRegion, getCookieDomain, isCnRegion, type AppRegion } from '../lib/region';
import type { AppUser } from '../lib/authTypes';
import { cnApi } from '../lib/cnApi';
import Cookies from 'js-cookie';

export type { AppUser };

interface AuthContextType {
    region: AppRegion;
    user: AppUser | null;
    loading: boolean;
    needsSSOSync: boolean;
    loginModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
    refreshSession: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    generateCustomTokenAndRedirect: (url: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    region: 'global',
    user: null,
    loading: true,
    needsSSOSync: false,
    loginModalOpen: false,
    openLoginModal: () => { },
    closeLoginModal: () => { },
    refreshSession: async () => { },
    signInWithGoogle: async () => { },
    logout: async () => { },
    generateCustomTokenAndRedirect: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const region = getAppRegion();
    const cnMode = isCnRegion();
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsSSOSync, setNeedsSSOSync] = useState(false);
    const [loginModalOpen, setLoginModalOpen] = useState(false);

    const refreshSession = useCallback(async () => {
        if (!cnMode) return;
        try {
            const res = await cnApi.getMe();
            setUser(res.user);
        } catch (err) {
            console.warn('[useAuth:cn] Failed to fetch session:', err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [cnMode]);

    useEffect(() => {
        if (cnMode) {
            void refreshSession();
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const domain = getCookieDomain();
                Cookies.set('vp_session_token', 'true', {
                    domain: domain,
                    path: '/',
                    secure: window.location.protocol === 'https:',
                    sameSite: 'lax',
                    expires: 7
                });
                sessionStorage.removeItem('vp_sso_attempted');
                setUser({
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    email: currentUser.email,
                    photoURL: currentUser.photoURL,
                    provider: 'google',
                    getIdToken: () => currentUser.getIdToken(),
                });
                setNeedsSSOSync(false);
            } else {
                const sessionToken = Cookies.get('vp_session_token');
                const ssoAttempted = sessionStorage.getItem('vp_sso_attempted');

                if (sessionToken && !ssoAttempted) {
                    setNeedsSSOSync(true);
                    setLoading(false);
                    return;
                }

                const domain = getCookieDomain();
                Cookies.remove('vp_session_token', { domain: domain, path: '/' });
                setUser(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [cnMode, refreshSession]);

    const openLoginModal = useCallback(() => {
        setLoginModalOpen(true);
    }, []);

    const closeLoginModal = useCallback(() => {
        setLoginModalOpen(false);
    }, []);

    const signInWithGoogle = useCallback(async () => {
        if (cnMode) {
            setLoginModalOpen(true);
            return;
        }
        try {
            googleProvider.setCustomParameters({
                prompt: 'select_account'
            });
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    }, [cnMode]);

    const logout = useCallback(async () => {
        if (cnMode) {
            try {
                await cnApi.logout();
            } catch (error) {
                console.error("Error signing out (CN):", error);
            } finally {
                setUser(null);
            }
            return;
        }
        try {
            const domain = getCookieDomain();
            Cookies.remove('vp_session_token', { domain: domain, path: '/' });
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }, [cnMode]);

    const generateCustomTokenAndRedirect = useCallback(async (destinationUrl: string) => {
        if (cnMode) {
            window.location.href = destinationUrl;
            return;
        }
        if (!isAllowedVanpowerRedirectUrl(destinationUrl)) {
            console.error("Blocked untrusted redirect URL in generateCustomTokenAndRedirect:", destinationUrl);
            return;
        }
        if (!user || !user.getIdToken) {
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
    }, [cnMode, user]);

    return (
        <AuthContext.Provider value={{
            region,
            user,
            loading,
            needsSSOSync,
            loginModalOpen,
            openLoginModal,
            closeLoginModal,
            refreshSession,
            signInWithGoogle,
            logout,
            generateCustomTokenAndRedirect
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
