import { useEffect, useState } from 'react'
import { formatISK } from '../../lib/utils'
import { cn } from '@/lib/utils'
import { useConfig } from '../../store/ConfigContext'

export function AssetsTab({ apiBase }) {
    const { iskAbbreviation } = useConfig()
    const [data, setData] = useState({ characterAssets: [] })
    const [loading, setLoading] = useState(true)
    const [expandedLocs, setExpandedLocs] = useState({})
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const res = await fetch(`${apiBase}/api/characters/assets`, { credentials: 'include' })
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (error) {
                console.error('Assets fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchAssets()
    }, [apiBase])

    const toggleLoc = (id) => {
        setExpandedLocs(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING ASSETS...
        </div>
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
                                const isExpanded = searchTerm ? true : expandedLocs[locId];
                                
                                // 간단한 검색 필터링 (아이템 이름 또는 컨테이너 이름)
                                const filteredItems = loc.items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
                                const filteredContainers = loc.containers.filter(c => 
                                    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    c.contents.some(ci => ci.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                );

                                if (searchTerm && filteredItems.length === 0 && filteredContainers.length === 0) return null;

                                return (
                                    <div key={idx} className="bg-card border border-border rounded overflow-hidden">
                                        <div 
                                        onClick={() => toggleLoc(locId)} 
                                        className="px-[15px] py-3 bg-muted cursor-pointer flex justify-between items-center hover:bg-border/10 transition-colors"
                                        >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-[10px] text-foreground-dim w-3">
                                                {isExpanded ? '▼' : '▶'}
                                            </span>
                                            <span className="text-[13px] font-bold text-foreground">{loc.locationName}</span>
                                        </div>
                                        <span className="text-xs text-gold font-extrabold">{formatISK(loc.locationTotalValue, iskAbbreviation)} ISK</span>
                                        </div>
                                        {isExpanded && (
                                        <div className="bg-card animate-in fade-in duration-200">
                                            {filteredItems.map(item => (
                                                <div key={item.id} className="flex px-10 py-2.5 text-xs border-b border-border hover:bg-border/5">
                                                    <span className="flex-1 text-foreground font-medium">{item.name}</span>
                                                    <span className="w-[60px] text-right text-foreground-muted font-semibold">{item.qty}</span>
                                                    <span className="w-[120px] text-right text-primary font-bold">{formatISK(item.value, iskAbbreviation)}</span>
                                                </div>
                                            ))}
                                            {filteredContainers.map((cont, cIdx) => (
                                                <div key={cIdx}>
                                                    <div className="flex px-10 py-2 text-xs bg-muted text-foreground border-b border-border">
                                                        <span className="flex-1 font-extrabold">📦 {cont.name}</span>
                                                        <span className="w-[120px] text-right font-bold">
                                                            {formatISK(cont.totalValue, iskAbbreviation)}
                                                        </span>
                                                    </div>
                                                    {cont.contents.map(si => (
                                                        <div key={si.id} className="flex px-[60px] py-2 text-[11px] text-foreground-muted border-b border-border hover:bg-border/5">
                                                            <span className="flex-1 font-medium">└ {si.name}</span>
                                                            <span className="w-[60px] text-right">{si.qty}</span>
                                                            <span className="w-[120px] text-right text-secondary font-semibold">{formatISK(si.value, iskAbbreviation)}</span>
                                                        </div>
                                                    ))}

                                                    </div>
                                                ))}
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
