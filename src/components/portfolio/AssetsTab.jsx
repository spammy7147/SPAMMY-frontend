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
    const [expandedInnerCats, setExpandedInnerCats] = useState({}) // 내부 카테고리 상태 추가
    const [searchTerm, setSearchTerm] = useState('')
    
    // 캐릭터 아코디언 상태 관리
    const [expandedChars, setExpandedChars] = useState({})

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

    // 내부 카테고리 토글 함수
    const toggleInnerCat = (id) => {
        setExpandedInnerCats(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
    };

    // 캐릭터 토글 함수
    const toggleChar = (name) => {
        setExpandedChars(prev => ({ ...prev, [name]: prev[name] === false ? true : false }));
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
                {data.characterAssets && data.characterAssets.length > 0 ? data.characterAssets.map((charGroup) => {
                    const isCharExpanded = searchTerm ? true : expandedChars[charGroup.characterName] !== false;
                    return (
                        <div key={charGroup.characterName}>
                            {/* 캐릭터 아코디언 헤더 */}
                            <div 
                                onClick={() => toggleChar(charGroup.characterName)} 
                                className="flex items-center gap-2.5 mb-3 cursor-pointer select-none hover:opacity-80 transition-opacity"
                            >
                                <ChevronIcon isExpanded={isCharExpanded} className="text-primary w-3.5 h-3.5" />
                                <h3 className="m-0 text-[13px] font-extrabold text-primary tracking-[1px]">
                                    {charGroup.characterName.toUpperCase()}
                                </h3>
                                <div className="flex-1 h-[1px] bg-border/50"></div>
                            </div>
                            {isCharExpanded && (
                                <div className="flex flex-col gap-2">
                                    {charGroup.locations.map((loc, idx) => {
                                        const locId = `${charGroup.characterName}-${loc.locationName}`;
                                        const isLocExpanded = searchTerm ? true : !!expandedLocs[locId];
                                        
                                        // 검색 필터링 구현 (카테고리 그룹 내 아이템 탐색)
                                        const filteredCategoryGroups = loc.categoryGroups ? loc.categoryGroups.map(catGroup => {
                                            const filteredItems = catGroup.items.filter(item => {
                                                const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                const contentsMatch = item.isContainer && item.contents && item.contents.some(innerCat => 
                                                    innerCat.items.some(subItem => subItem.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                );
                                                return itemMatches || contentsMatch;
                                            }).map(item => {
                                                if (item.isContainer && item.contents) {
                                                    const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                    const filteredContents = item.contents.map(innerCat => {
                                                        const filteredSubItems = innerCat.items.filter(subItem => 
                                                            itemMatches || subItem.name.toLowerCase().includes(searchTerm.toLowerCase())
                                                        );
                                                        return { ...innerCat, items: filteredSubItems };
                                                    }).filter(innerCat => innerCat.items.length > 0);
                                                    return { ...item, contents: filteredContents };
                                                }
                                                return item;
                                            });

                                            return { ...catGroup, items: filteredItems };
                                        }).filter(catGroup => catGroup.items.length > 0) : [];

                                        // 검색 필터링 구현 (컨테이너 리스트 탐색)
                                        const filteredContainers = loc.containers ? loc.containers.filter(item => {
                                            const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                            const contentsMatch = item.isContainer && item.contents && item.contents.some(innerCat => 
                                                innerCat.items.some(subItem => subItem.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            );
                                            return itemMatches || contentsMatch;
                                        }).map(item => {
                                            if (item.isContainer && item.contents) {
                                                const itemMatches = item.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                const filteredContents = item.contents.map(innerCat => {
                                                    const filteredSubItems = innerCat.items.filter(subItem => 
                                                        itemMatches || subItem.name.toLowerCase().includes(searchTerm.toLowerCase())
                                                    );
                                                    return { ...innerCat, items: filteredSubItems };
                                                }).filter(innerCat => innerCat.items.length > 0);
                                                return { ...item, contents: filteredContents };
                                            }
                                            return item;
                                        }) : [];

                                        if (searchTerm && filteredCategoryGroups.length === 0 && filteredContainers.length === 0) return null;

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
                                                        
                                                        {/* 독립 노출 컨테이너 렌더링 */}
                                                        {filteredContainers.map(item => {
                                                            const isItemExpanded = searchTerm ? true : !!expandedItems[item.id];
                                                            const showChevron = item.isContainer;
                                                            const itemIcon = '📦';

                                                            return (
                                                                <div key={item.id} className="border-b border-border/40 last:border-none">
                                                                    <div 
                                                                        onClick={() => showChevron && toggleItem(item.id)}
                                                                        className={`flex items-center px-[30px] py-2.5 text-xs bg-muted/20 hover:bg-border/5 transition-colors ${showChevron ? 'cursor-pointer' : ''}`}
                                                                    >
                                                                        <div className="flex-1 flex items-center gap-2">
                                                                            {showChevron ? (
                                                                                <ChevronIcon isExpanded={isItemExpanded} className="text-foreground-dim/40 w-2.5 h-2.5" />
                                                                            ) : (
                                                                                <span className="w-2.5 h-2.5" />
                                                                            )}
                                                                            <span className="text-sm select-none">{itemIcon}</span>
                                                                            <span className="font-bold text-foreground">
                                                                                {item.name}
                                                                            </span>
                                                                        </div>
                                                                        <span className="w-[60px] text-right text-foreground-muted font-semibold">{item.qty}</span>
                                                                        <span className="w-[120px] text-right text-primary font-bold">{formatISK(item.value, iskAbbreviation)}</span>
                                                                    </div>

                                                                    {/* 컨테이너 내부 적재물 (카테고리별 분할 표시) */}
                                                                    {showChevron && isItemExpanded && (
                                                                        <div className="bg-muted/10 border-t border-b border-border/20 py-1 animate-in fade-in duration-200">
                                                                            {item.contents && item.contents.length > 0 ? (
                                                                                item.contents.map(innerCat => {
                                                                                    const innerCatId = `${item.id}-${innerCat.categoryId}`;
                                                                                    const isInnerCatExpanded = searchTerm ? true : expandedInnerCats[innerCatId] !== false;
                                                                                    return (
                                                                                        <div key={innerCat.categoryId} className="mb-2 last:mb-0">
                                                                                            {/* 내부 카테고리 구분선/헤더 */}
                                                                                            <div 
                                                                                                onClick={() => toggleInnerCat(innerCatId)}
                                                                                                className="px-[45px] py-0.5 text-[10px] text-primary/70 font-extrabold uppercase tracking-[0.5px] cursor-pointer flex items-center gap-1 select-none hover:text-primary transition-colors"
                                                                                            >
                                                                                                <ChevronIcon isExpanded={isInnerCatExpanded} className="w-2.5 h-2.5" />
                                                                                                <span>{innerCat.categoryName} ({innerCat.items.length})</span>
                                                                                            </div>
                                                                                            {isInnerCatExpanded && innerCat.items.map(subItem => (
                                                                                                <div key={subItem.id} className="flex px-[60px] py-1.5 text-[11px] text-foreground-muted border-b border-border/10 last:border-none hover:bg-border/5">
                                                                                                    <span className="flex-1 font-medium text-foreground-dim">└ {subItem.name}</span>
                                                                                                    <span className="w-[60px] text-right">{subItem.qty}</span>
                                                                                                    <span className="w-[120px] text-right text-secondary font-semibold">{formatISK(subItem.value, iskAbbreviation)}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    );
                                                                                })
                                                                            ) : (
                                                                                <div className="px-[50px] py-2 text-[11px] text-foreground-dim/40 italic">
                                                                                    └ (Empty)
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}

                                                        {/* 일반 카테고리 그룹 렌더링 (함선 카테고리 포함) */}
                                                        {filteredCategoryGroups.map(catGroup => {
                                                            const catId = `${locId}-${catGroup.categoryId}`;
                                                            const isCatExpanded = searchTerm ? true : !!expandedCats[catId];
                                                            const catTotalValue = catGroup.items.reduce((sum, item) => sum + item.value, 0);

                                                            return (
                                                                <div key={catGroup.categoryId} className="border-b border-border/40 last:border-none">
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
                                                                                const itemIcon = item.assetType === 'SHIP' ? '🛸' : null;

                                                                                return (
                                                                                    <div key={item.id} className="border-b border-border/30 last:border-none">
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

                                                                                        {/* 함선 내부 적재물 (카테고리별 분할 표시) */}
                                                                                        {showChevron && isItemExpanded && (
                                                                                            <div className="bg-muted/10 border-t border-b border-border/20 py-1 animate-in fade-in duration-200">
                                                                                                {item.contents && item.contents.length > 0 ? (
                                                                                                    item.contents.map(innerCat => {
                                                                                                        const innerCatId = `${item.id}-${innerCat.categoryId}`;
                                                                                                        const isInnerCatExpanded = searchTerm ? true : expandedInnerCats[innerCatId] !== false;
                                                                                                        return (
                                                                                                            <div key={innerCat.categoryId} className="mb-2 last:mb-0">
                                                                                                                {/* 내부 카테고리 구분선/헤더 */}
                                                                                                                <div 
                                                                                                                    onClick={() => toggleInnerCat(innerCatId)}
                                                                                                                    className="px-[60px] py-0.5 text-[10px] text-primary/70 font-extrabold uppercase tracking-[0.5px] cursor-pointer flex items-center gap-1 select-none hover:text-primary transition-colors"
                                                                                                                >
                                                                                                                    <ChevronIcon isExpanded={isInnerCatExpanded} className="w-2.5 h-2.5" />
                                                                                                                    <span>{innerCat.categoryName} ({innerCat.items.length})</span>
                                                                                                                </div>
                                                                                                                {isInnerCatExpanded && innerCat.items.map(subItem => (
                                                                                                                    <div key={subItem.id} className="flex px-[75px] py-1.5 text-[11px] text-foreground-muted border-b border-border/10 last:border-none hover:bg-border/5">
                                                                                                                        <span className="flex-1 font-medium text-foreground-dim">└ {subItem.name}</span>
                                                                                                                        <span className="w-[60px] text-right">{subItem.qty}</span>
                                                                                                                        <span className="w-[120px] text-right text-secondary font-semibold">{formatISK(subItem.value, iskAbbreviation)}</span>
                                                                                                                    </div>
                                                                                                                ))}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })
                                                                                                ) : (
                                                                                                    <div className="px-[65px] py-2 text-[11px] text-foreground-dim/40 italic">
                                                                                                        └ (Empty)
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
                            )}
                        </div>
                    );
                }) : (
                    <div className="text-center py-12 text-foreground-dim">
                        NO ASSETS FOUND
                    </div>
                )}
            </div>
        </div>
    )
}
