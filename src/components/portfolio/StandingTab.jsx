import { useEffect, useState } from 'react'
import { api } from '@/services/api'

// 헬퍼 함수들
const getBarColorClass = (val) => {
    if (val >= 5) return 'bg-success';
    if (val >= 0) return 'bg-primary';
    return 'bg-destructive';
}

const getTextColorClass = (val) => {
    if (val >= 5) return 'text-success';
    if (val >= 0) return 'text-primary';
    return 'text-destructive';
}

// Chevron SVG 아이콘 컴포넌트
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

// 스탠딩 Progress Bar 컴포넌트
const StandingBar = ({ value }) => {
    if (value === null || value === undefined) {
        return <span className="text-[11px] text-foreground-dim/40 italic select-none">No direct standing</span>;
    }
    return (
        <div className="flex items-center gap-2.5 w-[200px] md:w-[250px] shrink-0">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border z-10"></div>
                <div 
                    className={`absolute h-full ${getBarColorClass(value)} transition-all duration-500`}
                    style={{ 
                        left: value >= 0 ? '50%' : `${50 + value * 5}%`, 
                        width: `${Math.abs(value) * 5}%` 
                    }}
                ></div>
            </div>
            <span className={`text-xs font-extrabold w-11 text-right ${getTextColorClass(value)}`}>
                {value > 0 ? '+' : ''}{value.toFixed(2)}
            </span>
        </div>
    );
};

export function StandingTab() {
    const [data, setData] = useState({ characterStandings: [] })
    const [loading, setLoading] = useState(true)

    // 아코디언 상태 관리
    const [expandedChars, setExpandedChars] = useState({})
    const [expandedFactions, setExpandedFactions] = useState({})
    const [expandedCorps, setExpandedCorps] = useState({})

    const toggleChar = (name) => {
        setExpandedChars(prev => ({ ...prev, [name]: prev[name] === false }));
    };

    const toggleFaction = (key) => {
        setExpandedFactions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleCorp = (key) => {
        setExpandedCorps(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        const fetchStandings = async () => {
            try {
                const result = await api.characters.standings()
                setData(result)
            } catch (error) {
                console.error('Standings fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStandings()
    }, [])









    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING STANDINGS...
        </div>
    )

    return (
        <div className="flex flex-col gap-6">
            {data.characterStandings && data.characterStandings.length > 0 ? data.characterStandings.map((charGroup) => {
                const isCharExpanded = expandedChars[charGroup.characterName] !== false;
                return (
                    <div key={charGroup.characterName} className="flex flex-col">
                        {/* 1단계: 캐릭터 아코디언 헤더 */}
                        <div 
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleChar(charGroup.characterName)} 
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleChar(charGroup.characterName);
                                }
                            }}
                            aria-expanded={isCharExpanded}
                            className="flex items-center gap-2.5 mb-3 cursor-pointer select-none hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-[2px]"
                        >
                            <ChevronIcon isExpanded={isCharExpanded} className="text-primary w-3.5 h-3.5" />
                            <h3 className="m-0 text-[13px] font-extrabold text-primary tracking-[1px]">
                                {charGroup.characterName.toUpperCase()}
                            </h3>
                            <div className="flex-1 h-[1px] bg-border/50"></div>
                        </div>

                        {isCharExpanded && (
                            <div className="flex flex-col gap-3">
                                {charGroup.factions && charGroup.factions.length > 0 ? charGroup.factions.map((faction) => {
                                    const factionKey = `${charGroup.characterName}-${faction.id}`;
                                    const isFactionExpanded = !!expandedFactions[factionKey];

                                    return (
                                        <div key={faction.id} className="bg-card border border-border rounded overflow-hidden">
                                            {/* 2단계: Faction 아코디언 헤더 */}
                                            <div 
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => toggleFaction(factionKey)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        toggleFaction(factionKey);
                                                    }
                                                }}
                                                aria-expanded={isFactionExpanded}
                                                className="px-[15px] py-3 bg-muted cursor-pointer flex justify-between items-center hover:bg-border/10 transition-colors select-none focus:outline-none focus-visible:bg-border/10 focus-visible:ring-1 focus-visible:ring-primary"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <ChevronIcon isExpanded={isFactionExpanded} className="text-foreground-dim w-3 h-3" />
                                                    <span className="text-[13px] font-bold text-foreground">{faction.name}</span>
                                                    <span className="text-[10px] text-foreground-muted border border-border px-1.5 py-0.5 rounded-[2px] font-semibold tracking-wide uppercase scale-90 origin-left">
                                                        Faction
                                                    </span>
                                                </div>
                                                <StandingBar value={faction.value} />
                                            </div>

                                            {isFactionExpanded && (
                                                <div className="bg-card border-t border-border/50 animate-in fade-in duration-200">
                                                    {faction.corporations && faction.corporations.length > 0 ? faction.corporations.map((corp) => {
                                                        const corpKey = `${charGroup.characterName}-${corp.id}`;
                                                        const isCorpExpanded = !!expandedCorps[corpKey];

                                                        return (
                                                            <div key={corp.id} className="border-b border-border/30 last:border-none">
                                                                {/* 3단계: Corporation 아코디언 헤더 */}
                                                                <div 
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => toggleCorp(corpKey)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                                            e.preventDefault();
                                                                            toggleCorp(corpKey);
                                                                        }
                                                                    }}
                                                                    aria-expanded={isCorpExpanded}
                                                                    className="pl-[35px] pr-[15px] py-2.5 bg-muted/40 cursor-pointer flex justify-between items-center hover:bg-border/5 transition-colors select-none focus:outline-none focus-visible:bg-border/5 focus-visible:ring-1 focus-visible:ring-primary"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <ChevronIcon isExpanded={isCorpExpanded} className="text-foreground-dim/60 w-2.5 h-2.5" />
                                                                        <span className="text-xs font-semibold text-foreground-muted">{corp.name}</span>
                                                                        <span className="text-[9px] text-foreground-dim/70 border border-border/70 px-1 py-0.2 rounded-[2px] font-semibold scale-90 origin-left">
                                                                            Corp
                                                                        </span>
                                                                    </div>
                                                                    <StandingBar value={corp.value} />
                                                                </div>

                                                                {/* 4단계: Agent 플랫 리스트 */}
                                                                {isCorpExpanded && (
                                                                    <div className="bg-muted/5 border-t border-border/20 py-1">
                                                                        {corp.agents && corp.agents.length > 0 ? corp.agents.map((agent) => (
                                                                            <div 
                                                                                key={agent.id} 
                                                                                className="flex pl-[55px] pr-[15px] py-2 text-[11px] text-foreground-muted justify-between items-center border-b border-border/10 last:border-none hover:bg-border/5"
                                                                            >
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-foreground-dim">└ {agent.name}</span>
                                                                                    <span className="text-[9px] text-foreground-dim/50 border border-border/30 px-1 py-0.1 rounded-[2px] font-medium scale-90 origin-left">
                                                                                        Agent
                                                                                    </span>
                                                                                </div>
                                                                                <StandingBar value={agent.value} />
                                                                            </div>
                                                                        )) : (
                                                                            <div className="pl-[55px] py-2 text-[11px] text-foreground-dim/40 italic select-none">
                                                                                └ No active agents found
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }) : (
                                                        <div className="px-5 py-4 text-center text-xs text-foreground-dim/40 italic select-none">
                                                            No corporations associated
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="bg-card border border-border rounded p-6 text-center text-foreground-dim">
                                        NO STANDINGS RECORDED FOR THIS CHARACTER
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            }) : (
                <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                    NO STANDINGS FOUND
                </div>
            )}
        </div>
    )
}
