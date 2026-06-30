import { fetchApi } from './api';

export const marketBrowserApi = {
    // 마켓 브라우저 최상위 그룹 조회
    getRootGroups: () => fetchApi('/api/marketbrowser/groups'),
    // 하위 그룹 조회
    getSubGroups: (parentId) => fetchApi(`/api/marketbrowser/groups/${parentId}`),
    // 그룹 내 아이템 목록 조회
    getGroupTypes: (groupId) => fetchApi(`/api/marketbrowser/groups/${groupId}/types`),

    // 마켓 주문 내역 조회 (판매/구매 분리)
    getOrders: (typeId, isBuyOrder, regionId = 0, page = 0, size = 100) => {
        const queryParams = new URLSearchParams({
            isBuyOrder,
            regionId,
            page,
            size
        }).toString();
        return fetchApi(`/api/marketbrowser/types/${typeId}/orders?${queryParams}`);
    },

    // 리전 목록 조회
    getRegions: () => fetchApi('/api/sde/regions'),

    // 전체 트리 목록 조회
    getItemTree: () => fetchApi('/api/marketbrowser/items/tree'),

    // 리전/타입 경로 기반 통합 주문 조회
    getOrdersUnified: (regionId, typeId) => fetchApi(`/api/marketbrowser/region/${regionId}/type/${typeId}`)
};
