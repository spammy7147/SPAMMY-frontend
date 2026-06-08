import { useEffect, useState } from 'react'
import { formatISK } from '@/lib/utils'
import { useConfig } from '@/store/ConfigContext'
import { api } from '@/services/api'

export function AssetsTab() {
    const { iskAbbreviation } = useConfig()
    const [data, setData] = useState({ characterAssets: [] })
    const [loading, setLoading] = useState(true)
    
    // 아코디언 상태 관리
    const [expandedLocs, setExpandedLocs] = useState({})
    const [expandedCats, setExpandedCats] = useState({})
    const [expandedItems, setExpandedItems] = useState({})
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const result = await api.characters.assets()
                setData(result)
            } catch (error) {
                console.error('Assets fetch failed', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAssets()
    }, [])

    const toggleLoc = (id) => {
        setExpandedLocs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleCat = (id) => {
        setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleItem = (id) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING ASSETS...
        </div>
    )

    // Chevron SVG 컴포넌트
    const ChevronIcon = ({ isExpanded, className = "" }) => (
        <svg 
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${className}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={2.5}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded px-4 py-3 flex items-center gap-3">
                <span className="text-sm">🔍</span>
                <input 
                    type="text"
                    placeholder="Search by item or container name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-foreground text-sm w-full outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            <div className="flex flex-col gap-6">
                {data.characterAssets && data.characterAssets.length > 0 ? data.characterAssets.map((charGroup) => (
                    <div key={charGroup.characterName}>
                        <div className="flex items-center gap-2.5 mb-3">
                            <h3 className="m-0 text-[13px] font-extrabold text-primary tracking-[1px]">
                                {charGroup.characterName.toUpperCase()}
                            </h3>
                            <div className="flex-1 h-[1px] bg-border"></div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {charGroup.locations.map((loc, idx) => {
                                const locId = `${charGroup.characterName}-${loc.locationName}`;
                                const isLocExpanded = searchTerm ? true : !!expandedLocs[locId];
                                
                                // 검색 필터링 구현
                                const filteredCategoryGroups = loc.categoryGroups ? loc.categoryGroups.map(catGroup => {
                                    const filteredItems = catGroup.items.filter(item => {
                                        const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                        const contentsMatch = item.isContainer && item.contents && item.contents.some(subItem => 
                                            subItem.name.toLowerCase().includes(searchTerm.toLowerCase())
                                        );
                                        return itemMatches || contentsMatch;
                                    }).map(item => {
                                        if (item.isContainer && item.contents) {
                                            const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                            const filteredContents = item.contents.filter(subItem => 
                                                itemMatches || subItem.name.toLowerCase().includes(searchTerm.toLowerCase())
                                            );
                                            return { ...item, contents: filteredContents };
                                        }
                                        return item;
                                    });

                                    return { ...catGroup, items: filteredItems };
                                }).filter(catGroup => catGroup.items.length > 0) : [];

                                if (searchTerm && filteredCategoryGroups.length === 0) return null;

                                return (
                                    <div key={idx} className="bg-card border border-border rounded overflow-hidden">
                                        {/* 1단계: 위치(Location) 아코디언 헤더 */}
                                        <div 
                                            onClick={() => toggleLoc(locId)} 
                                            className="px-[15px] py-3 bg-muted cursor-pointer flex justify-between items-center hover:bg-border/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <ChevronIcon isExpanded={isLocExpanded} className="text-foreground-dim" />
                                                <span className="text-[13px] font-bold text-foreground">{loc.locationName}</span>
                                            </div>
                                            <span className="text-xs text-gold font-extrabold">{formatISK(loc.locationTotalValue, iskAbbreviation)} ISK</span>
                                        </div>

                                        {isLocExpanded && (
                                            <div className="bg-card border-t border-border/50 animate-in fade-in duration-200">
                                                {filteredCategoryGroups.map(catGroup => {
                                                    const catId = `${locId}-${catGroup.categoryId}`;
                                                    const isCatExpanded = searchTerm ? true : !!expandedCats[catId];
                                                    const catTotalValue = catGroup.items.reduce((sum, item) => sum + item.value, 0);

                                                    return (
                                                        <div key={catGroup.categoryId} className="border-b border-border/40 last:border-none">
                                                            {/* 2단계: 카테고리(Category) 아코디언 헤더 */}
                                                            <div 
                                                                onClick={() => toggleCat(catId)}
                                                                className="px-[30px] py-2 bg-muted/40 cursor-pointer flex justify-between items-center hover:bg-border/5 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <ChevronIcon isExpanded={isCatExpanded} className="text-foreground-dim/60 w-3 h-3" />
                                                                    <span className="text-xs font-semibold text-foreground-muted">{catGroup.categoryName}</span>
                                                                    <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary font-bold rounded-full">
                                                                        {catGroup.items.length}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] text-foreground-dim font-bold">{formatISK(catTotalValue, iskAbbreviation)} ISK</span>
                                                            </div>

                                                            {isCatExpanded && (
                                                                <div className="bg-card/50">
                                                                    {catGroup.items.map(item => {
                                                                        const isItemExpanded = searchTerm ? true : !!expandedItems[item.id];
                                                                        const showChevron = item.isContainer;
                                                                        const itemIcon = item.assetType === 'SHIP' ? '🛸' : item.assetType === 'CONTAINER' ? '📦' : null;

                                                                        return (
                                                                            <div key={item.id} className="border-b border-border/30 last:border-none">
                                                                                {/* 3단계: 자산 아이템(AssetItem) 아코디언 헤더 / 아이템 로우 */}
                                                                                <div 
                                                                                    onClick={() => showChevron && toggleItem(item.id)}
                                                                                    className={`flex items-center px-[45px] py-2.5 text-xs hover:bg-border/5 transition-colors ${showChevron ? 'cursor-pointer' : ''}`}
                                                                                >
                                                                                    <div className="flex-1 flex items-center gap-2">
                                                                                        {showChevron ? (
                                                                                            <ChevronIcon isExpanded={isItemExpanded} className="text-foreground-dim/40 w-2.5 h-2.5" />
                                                                                        ) : (
                                                                                            <span className="w-2.5 h-2.5" />
                                                                                        )}
                                                                                        {itemIcon && <span className="text-sm select-none">{itemIcon}</span>}
                                                                                        <span className={`font-medium ${item.assetType === 'SHIP' ? 'text-indigo-400 font-semibold' : 'text-foreground'}`}>
                                                                                            {item.name}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="w-[60px] text-right text-foreground-muted font-semibold">{item.qty}</span>
                                                                                    <span className="w-[120px] text-right text-primary font-bold">{formatISK(item.value, iskAbbreviation)}</span>
                                                                                </div>

                                                                                {/* 4단계: 컨테이너 내부 아이템(SubItem) */}
                                                                                {showChevron && isItemExpanded && (
                                                                                    <div className="bg-muted/10 border-t border-b border-border/20 py-0.5 animate-in fade-in duration-200">
                                                                                        {item.contents && item.contents.length > 0 ? (
                                                                                            item.contents.map(subItem => (
                                                                                                <div key={subItem.id} className="flex px-[70px] py-2 text-[11px] text-foreground-muted border-b border-border/20 last:border-none hover:bg-border/5">
                                                                                                    <span className="flex-1 font-medium text-foreground-dim">└ {subItem.name}</span>
                                                                                                    <span className="w-[60px] text-right">{subItem.qty}</span>
                                                                                                    <span className="w-[120px] text-right text-secondary font-semibold">{formatISK(subItem.value, iskAbbreviation)}</span>
                                                                                                </div>
                                                                                            ))
                                                                                        ) : (
                                                                                            <div className="px-[70px] py-2 text-[11px] text-foreground-dim/40 italic">
                                                                                                └ (내용물 없음)
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-foreground-dim">
                        NO ASSETS FOUND
                    </div>
                )}
            </div>
        </div>
    )
}
