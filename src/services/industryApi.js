import { fetchApi } from './api'

export const industryApi = {
    templates: () => fetchApi('/api/industry/templates'),
    manufacturingBlueprints: (query, limit = 10) => fetchApi(
        `/api/industry/blueprints/manufacturing?query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
    ownedBlueprints: (blueprintTypeIds) => {
        const params = new URLSearchParams()
        ;(blueprintTypeIds || []).forEach((blueprintTypeId) => {
            params.append('blueprintTypeIds', String(blueprintTypeId))
        })
        return fetchApi(`/api/industry/blueprints/owned?${params.toString()}`)
    },
    systems: (query, limit = 10) => fetchApi(
        `/api/industry/systems?query=${encodeURIComponent(query)}&limit=${limit}`,
    ),
    facilities: (systemId) => fetchApi(`/api/industry/systems/${systemId}/facilities`),
    structureRigs: () => fetchApi('/api/industry/structure-rigs'),
    manufacturingBom: (targetTypeId, quantity) => fetchApi(
        `/api/industry/bom/manufacturing?targetTypeId=${targetTypeId}&quantity=${quantity}`,
    ),
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
