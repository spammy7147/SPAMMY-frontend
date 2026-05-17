import { useEffect, useState } from 'react'
import { formatISK } from '../../lib/utils'
import { cn } from '@/lib/utils'

export function TransactionsTab({ apiBase }) {
    const [data, setData] = useState({ entries: [], typeSummary: {} })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedChar, setSelectedChar] = useState('ALL CHARACTERS')

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const res = await fetch(`${apiBase}/api/characters/transactions`, { credentials: 'include' })
                if (res.ok) {
                    const result = await res.json()
                    setData(result)
                }
            } catch (error) {
                console.error('Transactions fetch failed', error)
            } finally {
                setLoading(false)
            }
        }

        fetchTransactions()
    }, [apiBase])

    const filteredEntries = (data.entries || []).filter(entry => {
        const matchChar = selectedChar === 'ALL CHARACTERS' || entry.charName === selectedChar;
        const typeName = entry.typeName || '';
        const clientName = entry.clientName || '';
        const locationName = entry.locationName || '';
        const matchSearch = typeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           locationName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchChar && matchSearch;
    });

    const uniqueChars = [...new Set((data.entries || []).map(e => e.charName))];

    if (loading) return (
        <div className="text-center py-12 text-foreground-dim tracking-[2px]">
            LOADING TRANSACTIONS...
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
                </div>
                <input 
                    placeholder="Search items, clients..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="bg-muted border border-border text-foreground text-[11px] px-3 py-1 rounded-[3px] w-[200px] outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            <div className="bg-card border border-border rounded overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-muted border-b border-border">
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Date</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Character</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Type</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Item</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Qty</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Price</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.length > 0 ? (
                            filteredEntries.map((entry, i) => (
                                <tr key={i} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                    <td className="px-3 py-2.5 text-foreground-dim text-[11px]">{new Date(entry.date).toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-foreground-muted text-[12px]">{entry.charName}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-[2px] border font-bold",
                                            entry.isBuy ? "border-destructive text-destructive" : "border-success text-success"
                                        )}>
                                            {entry.isBuy ? 'BUY' : 'SELL'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="text-foreground font-semibold">{entry.typeName}</div>
                                        <div className="text-[10px] text-foreground-dim">{entry.locationName}</div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-foreground-muted">{entry.quantity.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-right text-foreground-muted">{formatISK(entry.unitPrice)}</td>
                                    <td className={cn(
                                        "px-3 py-2.5 text-right font-bold",
                                        entry.isBuy ? "text-destructive" : "text-success"
                                    )}>
                                        {entry.isBuy ? '-' : '+'}{formatISK(entry.totalPrice)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                    NO TRANSACTIONS FOUND
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
