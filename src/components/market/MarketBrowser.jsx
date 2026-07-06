import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, ChevronDown, LayoutGrid } from 'lucide-react'
import { marketBrowserApi } from '@/services/marketBrowserApi'
import { cn } from '@/lib/utils'

const ALL_REGIONS_ID = 0;
const DEFAULT_MARKET_TYPE_ID = 44992;
const DEFAULT_MARKET_ITEM = {
    id: DEFAULT_MARKET_TYPE_ID,
    name: 'PLEX',
    categoryPath: [],
    description: '',
    avgPrice: '0.00',
    change: '0%'
};
const PRIORITY_REGION_IDS = [
    10000002, // The Forge - Jita
    10000043, // Domain - Amarr
    10000032, // Sinq Laison - Dodixie
    10000042, // Metropolis - Hek
];
const SELL_SORT_DEFAULTS = { quantity: 'desc', price: 'asc', location: 'asc', expires: 'asc' };
const BUY_SORT_DEFAULTS = { quantity: 'desc', price: 'desc', location: 'asc', expires: 'asc' };

const regionIdForType = (selectedRegionId, selectedTypeId) => (
    Number(selectedTypeId) === DEFAULT_MARKET_TYPE_ID ? ALL_REGIONS_ID : selectedRegionId
);

const regionName = (region) => region?.name || '';

const sortMarketRegions = (regions) => {
    const regionById = new Map(regions.map((region) => [Number(region.regionId), region]));
    const priorityRegions = PRIORITY_REGION_IDS
        .map((regionId) => regionById.get(regionId))
        .filter(Boolean);
    const priorityRegionIds = new Set(PRIORITY_REGION_IDS);
    const remainingRegions = regions
        .filter((region) => !priorityRegionIds.has(Number(region.regionId)))
        .sort((left, right) => regionName(left).localeCompare(regionName(right)));

    return [...priorityRegions, ...remainingRegions];
};

const orderExpirationTime = (order) => {
    if (!order.issued || !order.duration) return Number.POSITIVE_INFINITY;
    const issuedTime = new Date(order.issued).getTime();
    if (!Number.isFinite(issuedTime)) return Number.POSITIVE_INFINITY;
    return issuedTime + (Number(order.duration) * 24 * 60 * 60 * 1000);
};

const orderSortValue = (order, key) => {
    if (key === 'quantity') return Number(order.volumeRemain || 0);
    if (key === 'price') return Number(order.price || 0);
    if (key === 'location') return String(order.locationName || order.locationId || '').toLowerCase();
    if (key === 'expires') return orderExpirationTime(order);
    return '';
};

const sortOrders = (orders, sort) => {
    const direction = sort.direction === 'desc' ? -1 : 1;
    return [...orders].sort((left, right) => {
        const leftValue = orderSortValue(left, sort.key);
        const rightValue = orderSortValue(right, sort.key);
        let result = 0;

        if (typeof leftValue === 'string' || typeof rightValue === 'string') {
            result = String(leftValue).localeCompare(String(rightValue));
        } else {
            result = leftValue - rightValue;
        }

        if (result === 0) {
            result = Number(left.orderId || 0) - Number(right.orderId || 0);
        }
        return result * direction;
    });
};

const nextOrderSort = (currentSort, key, defaultDirection) => {
    if (currentSort.key === key) {
        return {
            key,
            direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
        };
    }
    return { key, direction: defaultDirection };
};

function SortHeader({ label, sortKey, sort, onSort, align = 'left' }) {
    const active = sort.key === sortKey;

    return (
        <th
            scope="col"
            aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={cn('py-1.5 text-foreground-dim font-medium', align === 'right' ? 'px-2 text-right' : 'px-4 text-left')}
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={cn(
                    'inline-flex items-center gap-1 border-none bg-transparent p-0 text-inherit font-inherit cursor-pointer hover:text-foreground',
                    align === 'right' && 'justify-end w-full',
                )}
            >
                <span>{label}</span>
                <ChevronDown className={cn(
                    'h-3 w-3 transition-transform',
                    active ? 'opacity-100' : 'opacity-0',
                    active && sort.direction === 'asc' && 'rotate-180',
                )} />
            </button>
        </th>
    );
}

function MarketGroupTree({ group, expandedCats, toggleCat, onSelectType }) {
    const handleToggle = () => {
        toggleCat(group.id);
    };

    const children = [
        ...(group.subGroups || []),
        ...(group.types || []).map(t => ({ ...t, isType: true }))
    ];

    const isExpanded = expandedCats.includes(group.id) || group.isSearchResult;

    return (
        <div className="ml-1.5 mt-0.5">
            <button 
                onClick={handleToggle}
                className="w-full flex items-center gap-1.5 px-1.5 py-1 text-[13px] leading-tight font-normal hover:bg-foreground/5 rounded transition-colors text-foreground text-left"
            >
                {isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                <span className="truncate">{group.nameEn || group.nameKo}</span>
            </button>
            {isExpanded && (
                <div className="pl-3">
                    {children.map(child => (
                        child.isType ? (
                            <button 
                                key={`type-${child.id}`}
                                onClick={() => onSelectType(child, group.nameEn || group.nameKo)}
                                className="w-full flex items-center gap-1.5 px-1.5 py-1 text-[13px] leading-tight font-normal text-foreground hover:bg-foreground/5 rounded transition-colors text-left"
                            >
                                <img
                                    src={`https://images.evetech.net/types/${child.id}/icon?size=32`}
                                    alt=""
                                    className="w-4 h-4 shrink-0 rounded bg-muted/20 object-contain"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <span className="truncate">{child.nameEn || child.nameKo}</span>
                            </button>
                        ) : (
                            <MarketGroupTree key={`group-${child.id}`} group={child} expandedCats={expandedCats} toggleCat={toggleCat} onSelectType={onSelectType} />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

const formatExpiresIn = (issuedStr, durationDays) => {
    if (!issuedStr || !durationDays) return `${durationDays}d`;
    const issuedDate = new Date(issuedStr);
    const expiresDate = new Date(issuedDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const diffMs = expiresDate.getTime() - new Date().getTime();
    if (diffMs <= 0) return "Expired";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// 트리 내에서 특정 Type ID 검색 헬퍼 (순수 함수 형태로 컴포넌트 외부에 정의하여 ESLint 에러 방지)
const findTypeInTree = (nodes, id, currentPath = []) => {
    for (const node of nodes) {
        const nodeName = node.nameEn || node.nameKo;
        if (node.types) {
            const t = node.types.find(x => x.id === id);
            if (t) return { type: t, categoryPath: [...currentPath, nodeName] };
        }
        if (node.subGroups) {
            const found = findTypeInTree(node.subGroups, id, [...currentPath, nodeName]);
            if (found) return found;
        }
    }
    return null;
};

const filterTree = (nodes, term) => {
    if (!term) return nodes;
    const lowerTerm = term.toLowerCase();
    
    return nodes
        .map(node => {
            const matchingTypes = (node.types || []).filter(t => 
                (t.nameEn || t.nameKo || '').toLowerCase().includes(lowerTerm)
            );
            
            const matchingSubGroups = node.subGroups ? filterTree(node.subGroups, term) : [];
            
            const nodeNameMatches = (node.nameEn || node.nameKo || '').toLowerCase().includes(lowerTerm);
            
            if (nodeNameMatches || matchingTypes.length > 0 || matchingSubGroups.length > 0) {
                return {
                    ...node,
                    types: matchingTypes,
                    subGroups: matchingSubGroups,
                    isSearchResult: true
                };
            }
            return null;
        })
        .filter(Boolean);
};

const ItemIcon = ({ typeId, name }) => {
    const [imgError, setImgError] = useState(false);

    if (!typeId || imgError) {
        return <LayoutGrid className="w-7 h-7 text-foreground-dim" />;
    }

    return (
        <img 
            src={`https://images.evetech.net/types/${typeId}/icon?size=64`}
            alt={name}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
        />
    );
};

export function MarketBrowser() {
    const { regionId, typeId } = useParams();
    const navigate = useNavigate();
    const activeTypeId = typeId ? Number(typeId) : DEFAULT_MARKET_TYPE_ID;

    const [categories, setCategories] = useState([])
    const [expandedCats, setExpandedCats] = useState([])
    const [searchTerm, setSearchTerm] = useState('')

    const filteredCategories = useMemo(() => {
        return filterTree(categories, searchTerm);
    }, [categories, searchTerm]);

    // Selected item state (URL과 categories로부터 유도된 상태로 관리하여 Cascading 렌더링 방지)
    const selectedItem = (() => {
        if (!activeTypeId) {
            return {
                id: null,
                name: 'Select an item',
                categoryPath: [],
                description: '',
                avgPrice: '0.00',
                change: '0%'
            };
        }
        if (categories.length === 0) {
            return activeTypeId === DEFAULT_MARKET_TYPE_ID
                ? DEFAULT_MARKET_ITEM
                : {
                    id: activeTypeId,
                    name: `Type ${activeTypeId}`,
                    categoryPath: [],
                    description: '',
                    avgPrice: '0.00',
                    change: '0%'
                };
        }
        const found = findTypeInTree(categories, activeTypeId);
        if (found) {
            return {
                id: found.type.id,
                name: found.type.nameEn || found.type.nameKo,
                categoryPath: found.categoryPath,
                description: '',
                avgPrice: '0.00',
                change: '0%'
            };
        }
        return activeTypeId === DEFAULT_MARKET_TYPE_ID
            ? DEFAULT_MARKET_ITEM
            : {
                id: activeTypeId,
                name: `Type ${activeTypeId}`,
                categoryPath: [],
                description: '',
                avgPrice: '0.00',
                change: '0%'
            };
    })();



    const [sellOrders, setSellOrders] = useState([])
    const [buyOrders, setBuyOrders] = useState([])
    const [regions, setRegions] = useState([])
    const [selectedRegion, setSelectedRegion] = useState(ALL_REGIONS_ID)
    const [sellSort, setSellSort] = useState({ key: 'price', direction: 'asc' })
    const [buySort, setBuySort] = useState({ key: 'price', direction: 'desc' })
    const sortedRegions = useMemo(() => sortMarketRegions(regions), [regions]);
    const sortedSellOrders = useMemo(() => sortOrders(sellOrders, sellSort), [sellOrders, sellSort]);
    const sortedBuyOrders = useMemo(() => sortOrders(buyOrders, buySort), [buyOrders, buySort]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [tree, regionList] = await Promise.all([
                    marketBrowserApi.getItemTree(),
                    marketBrowserApi.getRegions()
                ]);
                setCategories(tree);
                setRegions(regionList);
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitialData();
    }, [])

    // 1. URL 파라미터 변경 시 주문 데이터만 조회 (categories 의존성 제거)
    useEffect(() => {
        const fetchOrders = async () => {
            const requestedRegionId = regionId ? Number(regionId) : ALL_REGIONS_ID;
            const rId = regionIdForType(requestedRegionId, activeTypeId);
            setSelectedRegion(rId);
            if (requestedRegionId !== rId) {
                navigate(`/market/region/${rId}/type/${activeTypeId}`, { replace: true });
            }

            try {
                const response = await marketBrowserApi.getOrdersUnified(rId, activeTypeId);
                setSellOrders(response.sellOrders || []);
                setBuyOrders(response.buyOrders || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchOrders();
    }, [activeTypeId, navigate, regionId]);


    const toggleCat = (id) => {
        setExpandedCats(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSelectType = (type) => {
        const nextRegionId = regionIdForType(selectedRegion, type.id);
        navigate(`/market/region/${nextRegionId}/type/${type.id}`);
    }

    const handleSellSort = (key) => {
        setSellSort((currentSort) => nextOrderSort(currentSort, key, SELL_SORT_DEFAULTS[key] || 'asc'));
    };

    const handleBuySort = (key) => {
        setBuySort((currentSort) => nextOrderSort(currentSort, key, BUY_SORT_DEFAULTS[key] || 'asc'));
    };

    return (
        <div className="flex flex-col h-[850px] border border-border rounded-lg overflow-hidden bg-background">
            <div className="flex flex-1 min-h-0">
                {/* Sidebar: Categories */}
                <aside className="w-80 border-r border-border flex flex-col bg-muted/10">
                    <div className="flex items-center gap-5 px-3 pt-3 border-b border-border bg-background">
                        <button className="text-sm font-semibold border-b-2 border-foreground pb-1.5 text-foreground">Browse</button>
                        <button className="text-sm font-medium border-b-2 border-transparent pb-1.5 text-foreground-dim hover:text-foreground">Quickbar</button>
                    </div>
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-dim" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background border border-border rounded-sm pl-9 pr-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-1.5 space-y-px">
                    {filteredCategories.map(cat => (
                        <MarketGroupTree 
                            key={cat.id} 
                            group={cat} 
                            expandedCats={expandedCats} 
                            toggleCat={toggleCat}
                            onSelectType={handleSelectType}
                        />
                    ))}
                </div>
            </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-background">
                    {/* Item Header */}
                    <header className="px-5 pt-3 border-b border-border">
                        <div className="mb-2 flex items-center justify-between gap-4">
                            <div className="min-w-0 text-[11px] text-foreground-dim flex items-center gap-1.5 flex-wrap">
                                {selectedItem.categoryPath.length > 0 ? (
                                    selectedItem.categoryPath.map((catName, idx) => (
                                        <span key={idx} className="flex items-center gap-1.5">
                                            {idx > 0 && <span className="text-foreground-dim/40">/</span>}
                                            <span>{catName}</span>
                                        </span>
                                    ))
                                ) : (
                                    <span>Category</span>
                                )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[11px] font-medium text-foreground-dim">Region :</span>
                                <select
                                    className="bg-background border border-border rounded-md px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
                                    value={selectedRegion}
                                    onChange={(e) => {
                                        const requestedRegionId = Number(e.target.value);
                                        const newRegionId = regionIdForType(requestedRegionId, selectedItem.id);
                                        setSelectedRegion(newRegionId);
                                        if (selectedItem.id) {
                                            navigate(`/market/region/${newRegionId}/type/${selectedItem.id}`);
                                        }
                                    }}
                                >
                                    <option value={ALL_REGIONS_ID}>All Regions</option>
                                    {sortedRegions.map(r => (
                                        <option key={r.regionId} value={r.regionId}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 bg-foreground/5 rounded flex items-center justify-center border border-border overflow-hidden shrink-0">
                                    <ItemIcon key={selectedItem.id} typeId={selectedItem.id} name={selectedItem.name} />
                                </div>
                                <h2 className="text-2xl font-bold leading-none">{selectedItem.name}</h2>
                            </div>
                            <button className="px-2.5 py-1 hover:bg-foreground/5 rounded border border-border text-[11px] font-medium flex items-center gap-1 text-foreground-dim hover:text-foreground transition-colors">
                                <span className="text-base leading-none">+</span> Add To Quickbar
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-5 mt-4">
                            <button className="text-sm font-medium border-b-2 border-foreground pb-1.5 text-foreground">Market Data</button>
                            <button className="text-sm font-medium border-b-2 border-transparent pb-1.5 text-foreground-dim hover:text-foreground">Price History</button>
                        </div>
                    </header>

                    {/* Orders Tables */}
                    <div className="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-hidden p-6">
                        {/* Sell Orders */}
                        <section className="min-h-0 flex flex-col overflow-hidden">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h3 className="text-xl font-bold tracking-tight">Sellers</h3>
                                <span className="text-xs font-medium text-foreground-dim">{sortedSellOrders.length.toLocaleString()} orders</span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto border-t border-border">
                                <table className="w-full min-w-[720px] text-xs text-left">
                                    <thead className="sticky top-0 z-10 bg-background text-foreground-dim font-medium border-b border-border/50">
                                        <tr>
                                            <SortHeader label="Quantity" sortKey="quantity" sort={sellSort} onSort={handleSellSort} align="right" />
                                            <SortHeader label="Price" sortKey="price" sort={sellSort} onSort={handleSellSort} align="right" />
                                            <SortHeader label="Location" sortKey="location" sort={sellSort} onSort={handleSellSort} />
                                            <SortHeader label="Expires in" sortKey="expires" sort={sellSort} onSort={handleSellSort} />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-transparent">
                                        {sortedSellOrders.length === 0 ? (
                                            <tr><td colSpan="4" className="px-2 py-3 text-center text-foreground-dim">No sell orders found.</td></tr>
                                        ) : sortedSellOrders.map(order => (
                                            <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                                <td className="px-2 py-1 text-right font-mono text-foreground">{(order.volumeRemain || 0).toLocaleString()}</td>
                                                <td className="px-4 py-1 text-right font-mono text-foreground whitespace-nowrap">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} ISK</td>
                                                <td className="px-4 py-1 truncate max-w-[360px] text-foreground-dim group-hover:text-foreground">{order.locationName || order.locationId}</td>
                                                <td className="px-4 py-1 text-foreground-dim font-mono whitespace-nowrap">{formatExpiresIn(order.issued, order.duration)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Buy Orders */}
                        <section className="min-h-0 flex flex-col overflow-hidden">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h3 className="text-xl font-bold tracking-tight">Buyers</h3>
                                <span className="text-xs font-medium text-foreground-dim">{sortedBuyOrders.length.toLocaleString()} orders</span>
                            </div>
                            <div className="min-h-0 flex-1 overflow-auto border-t border-border">
                                <table className="w-full min-w-[920px] text-xs text-left">
                                    <thead className="sticky top-0 z-10 bg-background text-foreground-dim font-medium border-b border-border/50">
                                        <tr>
                                            <SortHeader label="Quantity" sortKey="quantity" sort={buySort} onSort={handleBuySort} align="right" />
                                            <SortHeader label="Price" sortKey="price" sort={buySort} onSort={handleBuySort} align="right" />
                                            <th className="px-4 py-1.5 text-left font-medium">Range</th>
                                            <SortHeader label="Location" sortKey="location" sort={buySort} onSort={handleBuySort} />
                                            <th className="px-4 py-1.5 text-right font-medium">Min Volume</th>
                                            <SortHeader label="Expires in" sortKey="expires" sort={buySort} onSort={handleBuySort} />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-transparent">
                                        {sortedBuyOrders.length === 0 ? (
                                            <tr><td colSpan="6" className="px-2 py-3 text-center text-foreground-dim">No buy orders found.</td></tr>
                                        ) : sortedBuyOrders.map(order => (
                                            <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                                <td className="px-2 py-1 text-right font-mono text-foreground">{(order.volumeRemain || 0).toLocaleString()}</td>
                                                <td className="px-4 py-1 text-right font-mono text-foreground whitespace-nowrap">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} ISK</td>
                                                <td className="px-4 py-1 text-foreground-dim">Region</td>
                                                <td className="px-4 py-1 truncate max-w-[320px] text-foreground-dim group-hover:text-foreground">{order.locationName || order.locationId}</td>
                                                <td className="px-4 py-1 text-right font-mono text-foreground">1</td>
                                                <td className="px-4 py-1 text-foreground-dim font-mono whitespace-nowrap">{formatExpiresIn(order.issued, order.duration)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    )
}
