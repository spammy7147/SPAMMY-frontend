import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, ChevronRight, ChevronDown, Info, ArrowUpRight, ArrowDownRight, LayoutGrid, List } from 'lucide-react'
import { marketBrowserApi } from '@/services/marketBrowserApi'

function MarketGroupTree({ group, expandedCats, toggleCat, onSelectType }) {
    const handleToggle = () => {
        toggleCat(group.id);
    };

    const children = [
        ...(group.subGroups || []),
        ...(group.types || []).map(t => ({ ...t, isType: true }))
    ];

    return (
        <div className="ml-2 mt-1">
            <button 
                onClick={handleToggle}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal hover:bg-foreground/5 rounded-md transition-colors text-foreground text-left"
            >
                {expandedCats.includes(group.id) ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                <span className="truncate">{group.nameEn || group.nameKo}</span>
            </button>
            {expandedCats.includes(group.id) && (
                <div className="pl-4">
                    {children.map(child => (
                        child.isType ? (
                            <button 
                                key={`type-${child.id}`}
                                onClick={() => onSelectType(child, group.nameEn || group.nameKo)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-normal text-foreground hover:bg-foreground/5 rounded-md transition-colors text-left"
                            >
                                <img
                                    src={`https://images.evetech.net/types/${child.id}/icon?size=32`}
                                    alt=""
                                    className="w-5 h-5 shrink-0 rounded bg-muted/20 object-contain"
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

export function MarketBrowser() {
    const { regionId, typeId } = useParams();
    const navigate = useNavigate();

    const [categories, setCategories] = useState([])
    const [expandedCats, setExpandedCats] = useState([])
    const [imgError, setImgError] = useState(false)
    const [prevId, setPrevId] = useState(null)

    // Selected item state (URL과 categories로부터 유도된 상태로 관리하여 Cascading 렌더링 방지)
    const selectedItem = (() => {
        if (!typeId || categories.length === 0) {
            return {
                id: null,
                name: 'Select an item',
                categoryPath: [],
                description: '',
                avgPrice: '0.00',
                change: '0%'
            };
        }
        const found = findTypeInTree(categories, Number(typeId));
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
        return {
            id: null,
            name: 'Select an item',
            categoryPath: [],
            description: '',
            avgPrice: '0.00',
            change: '0%'
        };
    })();

    if (selectedItem.id !== prevId) {
        setPrevId(selectedItem.id)
        setImgError(false)
    }

    const [sellOrders, setSellOrders] = useState([])
    const [buyOrders, setBuyOrders] = useState([])
    const [regions, setRegions] = useState([])
    const [selectedRegion, setSelectedRegion] = useState(10000002)

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
            if (!typeId) return;
            const rId = regionId ? Number(regionId) : 10000002;
            setSelectedRegion(rId);

            try {
                const response = await marketBrowserApi.getOrdersUnified(rId, Number(typeId));
                setSellOrders(response.sellOrders || []);
                setBuyOrders(response.buyOrders || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchOrders();
    }, [regionId, typeId]);


    const toggleCat = (id) => {
        setExpandedCats(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSelectType = (type) => {
        navigate(`/market/region/${selectedRegion}/type/${type.id}`);
    }

    return (
        <div className="flex flex-col h-[850px] border border-border rounded-lg overflow-hidden bg-background">
            {/* Global Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-bold tracking-wide flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5" />
                        EVE Market Browser
                    </h1>
                    <button className="text-sm font-medium text-foreground-dim hover:text-foreground">About</button>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground-dim">Region :</span>
                    <select 
                        className="bg-background border border-border rounded-md px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-secondary cursor-pointer"
                        value={selectedRegion}
                        onChange={(e) => {
                            const newRegionId = Number(e.target.value);
                            setSelectedRegion(newRegionId);
                            if (selectedItem.id) {
                                navigate(`/market/region/${newRegionId}/type/${selectedItem.id}`);
                            }
                        }}
                    >
                        {regions.map(r => (
                            <option key={r.regionId} value={r.regionId}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Sidebar: Categories */}
                <aside className="w-80 border-r border-border flex flex-col bg-muted/10">
                    <div className="flex items-center gap-6 px-4 pt-4 border-b border-border bg-background">
                        <button className="text-sm font-semibold border-b-2 border-foreground pb-2 text-foreground">Browse</button>
                        <button className="text-sm font-medium border-b-2 border-transparent pb-2 text-foreground-dim hover:text-foreground">Quickbar</button>
                    </div>
                    <div className="p-3 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-dim" />
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                className="w-full bg-background border border-border rounded-sm pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {categories.map(cat => (
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
                    <header className="px-6 pt-6 border-b border-border">
                        <div className="text-xs text-foreground-dim mb-3 flex items-center gap-2 flex-wrap">
                            {selectedItem.categoryPath.length > 0 ? (
                                selectedItem.categoryPath.map((catName, idx) => (
                                    <span key={idx} className="flex items-center gap-2">
                                        {idx > 0 && <span className="text-foreground-dim/40">/</span>}
                                        <span>{catName}</span>
                                    </span>
                                ))
                            ) : (
                                <span>Category</span>
                            )}
                        </div>
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4 items-center">
                                <div className="w-14 h-14 bg-foreground/5 rounded flex items-center justify-center border border-border overflow-hidden shrink-0">
                                    {selectedItem.id && !imgError ? (
                                        <img 
                                            src={`https://images.evetech.net/types/${selectedItem.id}/icon?size=64`}
                                            alt={selectedItem.name}
                                            className="w-full h-full object-contain"
                                            onError={() => setImgError(true)}
                                        />
                                    ) : (
                                        <LayoutGrid className="w-7 h-7 text-foreground-dim" />
                                    )}
                                </div>
                                <h2 className="text-3xl font-bold">{selectedItem.name}</h2>
                            </div>
                            <button className="px-3 py-1.5 hover:bg-foreground/5 rounded border border-border text-xs font-medium flex items-center gap-1.5 text-foreground-dim hover:text-foreground transition-colors">
                                <span className="text-lg leading-none">+</span> Add To Quickbar
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-6 mt-8">
                            <button className="text-sm font-medium border-b-2 border-foreground pb-2 text-foreground">Market Data</button>
                            <button className="text-sm font-medium border-b-2 border-transparent pb-2 text-foreground-dim hover:text-foreground">Price History</button>
                        </div>
                    </header>

                    {/* Orders Tables */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Sell Orders */}
                        <section>
                            <h3 className="text-xl font-bold mb-3 tracking-tight">Sellers</h3>
                            <div className="border-t border-border pt-2">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-foreground-dim font-medium border-b border-border/50">
                                        <tr>
                                            <th className="px-2 py-2 text-right">Quantity</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2">Location</th>
                                            <th className="px-4 py-2">Expires in</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-transparent">
                                        {sellOrders.length === 0 ? (
                                            <tr><td colSpan="4" className="px-2 py-4 text-center text-foreground-dim">No sell orders found.</td></tr>
                                        ) : sellOrders.map(order => (
                                            <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                                <td className="px-2 py-1.5 text-right font-mono text-foreground">{(order.volumeRemain || 0).toLocaleString()}</td>
                                                <td className="px-4 py-1.5 text-right font-mono text-foreground">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} ISK</td>
                                                <td className="px-4 py-1.5 truncate max-w-[300px] text-foreground-dim group-hover:text-foreground">{order.locationName || order.locationId}</td>
                                                <td className="px-4 py-1.5 text-foreground-dim font-mono">{formatExpiresIn(order.issued, order.duration)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Buy Orders */}
                        <section>
                            <h3 className="text-xl font-bold mb-3 tracking-tight">Buyers</h3>
                            <div className="border-t border-border pt-2">
                                <table className="w-full text-xs text-left">
                                    <thead className="text-foreground-dim font-medium border-b border-border/50">
                                        <tr>
                                            <th className="px-2 py-2 text-right">Quantity</th>
                                            <th className="px-4 py-2 text-right">Price</th>
                                            <th className="px-4 py-2">Range</th>
                                            <th className="px-4 py-2">Location</th>
                                            <th className="px-4 py-2 text-right">Min Volume</th>
                                            <th className="px-4 py-2">Expires in</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-transparent">
                                        {buyOrders.length === 0 ? (
                                            <tr><td colSpan="6" className="px-2 py-4 text-center text-foreground-dim">No buy orders found.</td></tr>
                                        ) : buyOrders.map(order => (
                                            <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                                <td className="px-2 py-1.5 text-right font-mono text-foreground">{(order.volumeRemain || 0).toLocaleString()}</td>
                                                <td className="px-4 py-1.5 text-right font-mono text-foreground">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})} ISK</td>
                                                <td className="px-4 py-1.5 text-foreground-dim">Region</td>
                                                <td className="px-4 py-1.5 truncate max-w-[250px] text-foreground-dim group-hover:text-foreground">{order.locationName || order.locationId}</td>
                                                <td className="px-4 py-1.5 text-right font-mono text-foreground">1</td>
                                                <td className="px-4 py-1.5 text-foreground-dim font-mono">{formatExpiresIn(order.issued, order.duration)}</td>
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

