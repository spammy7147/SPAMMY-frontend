import { useEffect, useState } from 'react'
import { formatISK, formatDate, cn } from '@/lib/utils'
import { useConfig } from '../../store/ConfigContext'
import { api } from '@/services/api'

export function OrdersTab() {
    const { iskAbbreviation, timezone } = useConfig();
    const [data, setData] = useState({ entries: [] })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedChar, setSelectedChar] = useState('ALL CHARACTERS')
    const [statusFilter, setStatusFilter] = useState('active')

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const result = await api.characters.orders()
                setData(result)
            } catch (error) {
                console.error('Orders fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, [])

    const filteredEntries = (data.entries || []).filter(entry => {
        const matchChar = selectedChar === 'ALL CHARACTERS' || entry.charName === selectedChar;
        const matchStatus = statusFilter === 'ALL' || entry.state === statusFilter;
        const typeName = entry.typeName || '';
        const matchSearch = typeName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchChar && matchStatus && matchSearch;
    });

    const uniqueChars = [...new Set((data.entries || []).map(e => e.charName))];

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING ORDERS...
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex gap-3 items-center">
                    <select 
                        value={selectedChar} 
                        onChange={(e) => setSelectedChar(e.target.value)} 
                        className="bg-muted border border-border text-foreground-muted text-[11px] px-3 py-1 rounded-[3px] outline-none"
                    >
                        <option>ALL CHARACTERS</option>
                        {uniqueChars.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-1 bg-muted p-1 rounded">
                        {['active', 'filled', 'cancelled', 'expired', 'ALL'].map(status => (
                            <button 
                                key={status}
                                onClick={() => setStatusFilter(status)} 
                                className={cn(
                                    "border-none text-[10px] px-3 py-1 rounded-[3px] cursor-pointer font-bold transition-all uppercase",
                                    statusFilter === status 
                                        ? "bg-border-hover text-foreground" 
                                        : "bg-transparent text-foreground-dim hover:text-foreground-muted"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
                <input 
                    placeholder="Search items..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="bg-muted border border-border text-foreground text-[11px] px-3 py-1 rounded-[3px] w-[200px] outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            <div className="bg-card border border-border rounded overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-muted border-b border-border">
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Issued</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Character</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Item</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Volume</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Price</th>
                            <th className="px-3 py-2.5 text-center text-[9px] text-foreground-dim uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.length > 0 ? (
                            filteredEntries.map((entry, i) => (
                                <tr key={i} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                    <td className="px-3 py-2.5 text-foreground-dim text-[11px]">{formatDate(entry.issued, timezone)}</td>
                                    <td className="px-3 py-2.5 text-foreground-muted text-[12px]">{entry.charName}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-[2px] border font-bold",
                                            entry.isBuyOrder ? "border-destructive text-destructive" : "border-success text-success"
                                        )}>
                                            {entry.isBuyOrder ? 'BUY' : 'SELL'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-foreground font-semibold">{entry.typeName}</div>
                                        <div className="text-[10px] text-foreground-dim">{entry.locationName}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-foreground-muted">
                                        <span className="font-bold text-foreground">{entry.volumeRemain.toLocaleString()}</span>
                                        <span className="text-foreground-dim ml-1">/ {entry.volumeTotal.toLocaleString()}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-mono text-foreground-muted">{formatISK(entry.price, iskAbbreviation)}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-[2px] border font-bold uppercase",
                                            entry.state === 'active' ? "border-primary text-primary" :
                                            entry.state === 'filled' ? "border-success text-success" :
                                            "border-foreground-dim text-foreground-dim"
                                        )}>
                                            {entry.state}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                    NO ORDERS FOUND
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
