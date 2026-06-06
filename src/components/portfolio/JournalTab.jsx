import { useEffect, useState } from 'react'
import { formatISK, formatDate, cn } from '@/lib/utils'
import { useConfig } from '@/store/ConfigContext'
import { api } from '@/services/api'

export function JournalTab() {
    const { iskAbbreviation, timezone } = useConfig()
    const [data, setData] = useState({ entries: [], typeSummary: {} })
    const [loading, setLoading] = useState(true)
    const [viewMode, setViewMode] = useState('list')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedChar, setSelectedChar] = useState('ALL CHARACTERS')
    const [selectedType, setSelectedType] = useState('ALL TYPES')

    useEffect(() => {
        const fetchJournal = async () => {
            try {
                const result = await api.characters.journal()
                setData(result)
            } catch (error) {
                console.error('Journal fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchJournal()
    }, [])

    const filteredEntries = data.entries.filter(entry => {
        const matchChar = selectedChar === 'ALL CHARACTERS' || entry.charName === selectedChar;
        const matchType = selectedType === 'ALL TYPES' || entry.type === selectedType;
        const matchSearch = (entry.desc && entry.desc.toLowerCase().includes(searchTerm.toLowerCase())) || 
                           entry.type.toLowerCase().includes(searchTerm.toLowerCase());
        return matchChar && matchType && matchSearch;
    });

    // 만약 필터링된 상태에서의 요약이 필요하다면 여기서 다시 계산
    const currentTypeSummary = (selectedChar === 'ALL CHARACTERS' && selectedType === 'ALL TYPES' && !searchTerm) 
        ? data.typeSummary 
        : filteredEntries.reduce((acc, entry) => {
            if (!acc[entry.type]) acc[entry.type] = { count: 0, total: 0 };
            acc[entry.type].count += 1;
            acc[entry.type].total += entry.amount;
            return acc;
        }, {});

    const getTagClasses = (type) => {
        const classes = {
            MARKET: 'border-magenta text-magenta',
            BOUNTY: 'border-primary text-primary',
            MISSION: 'border-success text-success',
            BONUS: 'border-gold text-gold',
            TAX: 'border-destructive text-destructive',
        }
        return classes[type] || 'border-foreground-dim text-foreground-dim';
    }

    const uniqueChars = [...new Set(data.entries.map(e => e.charName))];
    const uniqueTypes = [...new Set(data.entries.map(e => e.type))];

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING JOURNAL...
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-3 items-center">
                    <div className="flex gap-1 bg-muted p-1 rounded">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={cn(
                                "border-none text-[10px] px-3 py-1 rounded-[3px] cursor-pointer font-bold transition-all",
                                viewMode === 'list' 
                                    ? "bg-border-hover text-foreground" 
                                    : "bg-transparent text-foreground-dim hover:text-foreground-muted"
                            )}
                        >
                            ALL LOGS
                        </button>
                        <button 
                            onClick={() => setViewMode('summary')} 
                            className={cn(
                                "border-none text-[10px] px-3 py-1 rounded-[3px] cursor-pointer font-bold transition-all",
                                viewMode === 'summary' 
                                    ? "bg-border-hover text-foreground" 
                                    : "bg-transparent text-foreground-dim hover:text-foreground-muted"
                            )}
                        >
                            BY TYPE
                        </button>
                    </div>
                    <select 
                        value={selectedChar} 
                        onChange={(e) => setSelectedChar(e.target.value)} 
                        className="bg-muted border border-border text-foreground-muted text-[11px] px-3 py-1 rounded-[3px] outline-none"
                    >
                        <option>ALL CHARACTERS</option>
                        {uniqueChars.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)} 
                        className="bg-muted border border-border text-foreground-muted text-[11px] px-3 py-1 rounded-[3px] outline-none"
                    >
                        <option>ALL TYPES</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <input 
                    placeholder="Search..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="bg-muted border border-border text-foreground text-[11px] px-3 py-1 rounded-[3px] w-[150px] outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            {viewMode === 'list' ? (
                <div className="bg-card border border-border rounded overflow-hidden">
                    <table className="w-full border-collapse text-[13px]">
                        <thead>
                            <tr className="bg-muted border-b border-border">
                                <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Date</th>
                                <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Type</th>
                                <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Description</th>
                                <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntries.map((entry, i) => (
                                <tr key={i} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                    <td className="px-3 py-2.5 text-foreground-dim text-[11px]">{formatDate(entry.date, timezone)}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-[2px] border font-bold",
                                            getTagClasses(entry.type)
                                        )}>
                                            {entry.type}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-foreground-muted text-sm">{entry.desc}</td>
                                    <td className={cn(
                                        "px-3 py-2.5 text-right font-semibold",
                                        entry.amount > 0 ? "text-success" : "text-destructive"
                                    )}>
                                        {formatISK(entry.amount, iskAbbreviation)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                    {Object.entries(currentTypeSummary).map(([type, data], i) => (
                        <div key={i} className="bg-card border border-border rounded p-5">
                            <div className="flex justify-between items-start mb-4">
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-[2px] border font-extrabold",
                                    getTagClasses(type)
                                )}>
                                    {type}
                                </span>
                                <span className="text-[11px] text-foreground-dim">{data.count} Entries</span>
                            </div>
                            <div className={cn(
                                "text-xl font-bold",
                                data.total >= 0 ? "text-success" : "text-destructive"
                            )}>
                                {data.total > 0 ? '+' : ''}{formatISK(data.total, iskAbbreviation)}
                            </div>
                            <div className="text-[10px] text-foreground-dim mt-1 tracking-wider uppercase font-semibold">
                                TOTAL ACCUMULATED
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
