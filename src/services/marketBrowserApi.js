import api from './api';

export const marketBrowserApi = {
    // 마켓 브라우저 최상위 그룹 조회
    getRootGroups: async () => {
        const response = await api.get('/marketbrowser/groups');
        return response.data;
    },

    // 하위 그룹 조회
    getSubGroups: async (parentId) => {
        const response = await api.get(`/marketbrowser/groups/${parentId}`);
        return response.data;
    },

    // 마켓 주문 내역 조회 (판매/구매 분리)
    getOrders: async (typeId, isBuyOrder, regionId = 10000002, page = 0, size = 100) => {
        const response = await api.get(`/marketbrowser/types/${typeId}/orders`, {
            params: { isBuyOrder, regionId, page, size }
        });
        return response.data;
    }
};
