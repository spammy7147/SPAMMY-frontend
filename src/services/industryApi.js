import { fetchApi } from './api'

export const industryApi = {
    templates: () => fetchApi('/api/industry/templates'),
    createTemplate: (payload) => fetchApi('/api/industry/templates', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    locationGroups: () => fetchApi('/api/industry/location-groups'),
    createLocationGroup: (payload) => fetchApi('/api/industry/location-groups', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    runs: () => fetchApi('/api/industry/runs'),
    createRun: (payload) => fetchApi('/api/industry/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
    }),
    run: (runId) => fetchApi(`/api/industry/runs/${runId}`),
    confirmMatch: (plannedJobId, industryJobId) => fetchApi(
        `/api/industry/planned-jobs/${plannedJobId}/matches/${industryJobId}`,
        { method: 'POST' },
    ),
    clearMatch: (plannedJobId) => fetchApi(
        `/api/industry/planned-jobs/${plannedJobId}/matches`,
        { method: 'DELETE' },
    ),
}
