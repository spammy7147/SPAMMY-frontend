/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
    const { user } = useAuth();
    const [iskAbbreviation, setIskAbbreviation] = useState(true);
    const [timezone, setTimezone] = useState('UTC');
    const [loading, setLoading] = useState(true);

    const fetchSettings = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            const data = await api.characters.settings();
            setIskAbbreviation(data.iskAbbreviation);
            setTimezone(data.timezone || 'UTC');
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSettings = async (newSettings) => {
        try {
            const data = await api.characters.updateSettings(newSettings);
            setIskAbbreviation(data.iskAbbreviation);
            setTimezone(data.timezone);
            return true;
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
