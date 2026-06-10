import { fetchApi } from './api';

export const marketBrowserApi = {
    // 마켓 브라우저 최상위 그룹 조회
    getRootGroups: () => fetchApi('/api/v1/marketbrowser/groups'),

    // 하위 그룹 조회
    getSubGroups: (parentId) => fetchApi(`/api/v1/marketbrowser/groups/${parentId}`),

    // 마켓 주문 내역 조회 (판매/구매 분리)
    getOrders: (typeId, isBuyOrder, regionId = 10000002, page = 0, size = 100) => {
        const queryParams = new URLSearchParams({
            isBuyOrder,
            regionId,
            page,
            size
        }).toString();
        return fetchApi(`/api/v1/marketbrowser/types/${typeId}/orders?${queryParams}`);
    }
};
