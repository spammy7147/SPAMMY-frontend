import { useEffect, useState } from 'react'
import { formatISK } from '@/lib/utils'
import { useConfig } from '@/store/ConfigContext'
import { api } from '@/services/api'

export function LPTab() {
    const { iskAbbreviation } = useConfig()
    const [data, setData] = useState({ characterLps: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLP = async () => {
            try {
                const result = await api.characters.lp()
                setData(result)
            } catch (error) {
                console.error('LP fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchLP()
    }, [])

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING LP DATA...
        </div>
    )

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(400px,1fr))] gap-4">
            {data.characterLps && data.characterLps.length > 0 ? data.characterLps.map((charLp, i) => (
                <div key={i} className="bg-card border border-border rounded overflow-hidden">
                    <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-6 rounded bg-background border border-border-hover"></div>
                            <span className="text-[15px] font-bold text-foreground">{charLp.charName}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] text-foreground-dim font-semibold">{charLp.totalLp.toLocaleString()} LP</div>
                            <div className="text-[13px] text-gold font-extrabold">
                                ≈ {formatISK(charLp.totalIskValue, iskAbbreviation)} ISK
                            </div>
                        </div>
                    </div>
                    <div>
                        {charLp.factions.map((f, j) => (
                            <div key={j} className="p-3 px-4 border-b border-border last:border-b-0 flex justify-between items-center hover:bg-border/5 transition-colors">
                                <div>
                                    <div className="text-[13px] text-foreground font-semibold">{f.name}</div>
                                    <div className="text-[10px] text-foreground-dim font-medium">{f.rate.toLocaleString()} ISK/LP</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[13px] text-gold font-bold">{f.lp.toLocaleString()} LP</div>
                                    <div className="text-[11px] text-primary font-semibold">{formatISK(f.value, iskAbbreviation)} ISK</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )) : (
                <div className="text-center py-12 text-foreground-dim col-span-full">
                    NO LP DATA FOUND
                </div>
            )}
        </div>
    )
}
