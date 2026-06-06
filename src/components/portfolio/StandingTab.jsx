import { useEffect, useState } from 'react'
import { api } from '@/services/api'

export function StandingTab() {
    const [data, setData] = useState({ standings: [] })
    const [loading, setLoading] = useState(true)

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

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING STANDINGS...
        </div>
    )

    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <div className="p-3.5 px-5 border-b border-border bg-muted flex justify-between">
                <span className="text-xs font-extrabold tracking-widest text-foreground-muted uppercase">
                    Standings & Relations
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="border-b border-border bg-muted">
                            {['Entity', 'Type', 'Character', 'Standing (-10 to +10)'].map(h => (
                                <th key={h} className="p-3 text-left text-[9px] text-foreground-dim uppercase tracking-wider font-bold">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.standings && data.standings.length > 0 ? data.standings.map((s, i) => (
                            <tr key={i} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                <td className="p-3 text-foreground font-bold">{s.name}</td>
                                <td className="p-3">
                                    <span className="text-[10px] text-foreground-muted border border-border px-1.5 py-0.5 rounded-[2px] font-semibold">
                                        {s.type}
                                    </span>
                                </td>
                                <td className="p-3 text-foreground-muted text-xs">{s.charName}</td>
                                <td className="p-3 w-[300px]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
                                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border z-10"></div>
                                            <div 
                                                className={`absolute h-full ${getBarColorClass(s.value)} transition-all duration-500`}
                                                style={{ 
                                                    left: s.value >= 0 ? '50%' : `${50 + s.value * 5}%`, 
                                                    width: `${Math.abs(s.value) * 5}%` 
                                                }}
                                            ></div>
                                        </div>
                                        <span className={`text-xs font-extrabold w-11 text-right ${getTextColorClass(s.value)}`}>
                                            {s.value > 0 ? '+' : ''}{s.value.toFixed(2)}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="text-center py-12 text-foreground-dim">
                                    NO STANDINGS FOUND
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
