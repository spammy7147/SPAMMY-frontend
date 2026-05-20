import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const { user } = useAuth();
    const [iskAbbreviation, setIskAbbreviation] = useState(true);
    const [timezone, setTimezone] = useState('UTC');
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/characters/settings', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setIskAbbreviation(data.iskAbbreviation);
                setTimezone(data.timezone || 'UTC');
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [user]);

    const updateSettings = async (newSettings) => {
        try {
            const res = await fetch('/api/characters/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setIskAbbreviation(data.iskAbbreviation);
                setTimezone(data.timezone);
                return true;
            }
        } catch (error) {
            console.error('Failed to update settings', error);
        }
        return false;
    };

    return (
        <ConfigContext.Provider value={{ iskAbbreviation, timezone, updateSettings, loading }}>
            {children}
        </ConfigContext.Provider>
    );
}

export const useConfig = () => useContext(ConfigContext);
