export const fetchApi = async (url, options = {}) => {
    const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        }
    });
    if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
};

export const api = {
    auth: {
        me: () => fetchApi('/api/auth/me'),
        logout: () => fetchApi('/api/auth/logout', { method: 'POST' }),
        characters: () => fetchApi('/api/auth/characters'),
        setMain: (charId) => fetchApi(`/api/auth/characters/${charId}/main`, { method: 'PATCH' }),
        unlink: (charId) => fetchApi(`/api/auth/characters/${charId}`, { method: 'DELETE' }),
    },
    characters: {
        summary: () => fetchApi('/api/characters/summary'),
        updateOmega: (charId, date) => fetchApi(`/api/characters/${charId}/omega`, {
            method: 'PATCH',
            body: JSON.stringify({ omegaExpiresAt: date }),
        }),
        settings: () => fetchApi('/api/characters/settings'),
        updateSettings: (settings) => fetchApi('/api/characters/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        }),
        assets: () => fetchApi('/api/characters/assets'),
        journal: () => fetchApi('/api/characters/journal'),
        missions: () => fetchApi('/api/characters/missions'),
        lp: () => fetchApi('/api/characters/lp'),
        orders: () => fetchApi('/api/characters/orders'),
        standings: () => fetchApi('/api/characters/standings'),
    }
};
