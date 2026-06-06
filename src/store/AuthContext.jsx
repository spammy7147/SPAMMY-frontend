/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const lastCheckTimeRef = useRef(0);

    const checkAuth = useCallback(async (force = false) => {
        const now = Date.now();
        if (!force && now - lastCheckTimeRef.current < 2000) {
            return;
        }
        lastCheckTimeRef.current = now;

        try {
            const userData = await api.auth.me();
            if (userData.authenticated) {
                setUser(userData);
            } else {
                setUser(null);
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        } catch (error) {
            console.error('[Auth] Check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();

        const handleFocus = () => checkAuth();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [checkAuth]);

    const logout = async () => {
        try {
            await api.auth.logout();
            setUser(null);
            window.location.href = '/login';
        } catch {
            console.error('Logout failed');
            setUser(null);
            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
