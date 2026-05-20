import { useState } from 'react'
import { Search, ChevronRight, ChevronDown, Info, ArrowUpRight, ArrowDownRight, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const categories = [
    { id: '1', name: 'Ammunition & Charges', sub: ['Hybrid Charges', 'Laser Crystals', 'Projectile Ammo'] },
    { id: '2', name: 'Ships', sub: ['Frigates', 'Cruisers', 'Battleships'] },
    { id: '3', name: 'Ship Equipment', sub: ['Armor', 'Shield', 'Propulsion'] },
    { id: '4', name: 'Drones', sub: ['Combat Drones', 'Mining Drones'] },
    { id: '5', name: 'Manufacture & Research', sub: ['Blueprints', 'Materials'] },
]

const mockOrders = {
    sell: [
        { id: 1, price: '1,245.00', quantity: '15,204', location: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant', expires: '89d' },
        { id: 2, price: '1,245.50', quantity: '2,500', location: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant', expires: '89d' },
        { id: 3, price: '1,246.00', quantity: '45,000', location: 'Perimeter - Tranquility Trading Tower', expires: '24d' },
        { id: 4, price: '1,248.00', quantity: '10,000', location: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant', expires: '90d' },
    ],
    buy: [
        { id: 1, price: '1,240.00', quantity: '100,000', location: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant', expires: '88d' },
        { id: 2, price: '1,238.50', quantity: '50,000', location: 'Perimeter - Tranquility Trading Tower', expires: '24d' },
        { id: 3, price: '1,235.00', quantity: '25,000', location: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant', expires: '87d' },
        { id: 4, price: '1,230.00', quantity: '250,000', location: 'Amarr VIII (Oris) - Emperor Family Academy', expires: '90d' },
    ]
}

export function MarketBrowser() {
    const [expandedCats, setExpandedCats] = useState(['1'])
    const [selectedItem, setSelectedItem] = useState({
        name: 'Antimatter Charge S',
        category: 'Ammunition & Charges > Hybrid Charges',
        description: 'A small hybrid charge. High damage, short range.',
        avgPrice: '1,242.50',
        change: '+2.4%'
    })

    const toggleCat = (id) => {
        setExpandedCats(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    return (
        <div className="flex h-[800px] border border-border rounded-lg overflow-hidden bg-background">
            {/* Sidebar: Categories */}
            <aside className="w-80 border-r border-border flex flex-col bg-muted/30">
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-dim" />
                        <input 
                            type="text" 
                            placeholder="Search market..." 
                            className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {categories.map(cat => (
                        <div key={cat.id}>
                            <button 
                                onClick={() => toggleCat(cat.id)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors text-foreground"
                            >
                                {expandedCats.includes(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <span>{cat.name}</span>
                            </button>
                            {expandedCats.includes(cat.id) && (
                                <div className="ml-6 mt-1 space-y-1">
                                    {cat.sub.map(sub => (
                                        <button 
                                            key={sub}
                                            className="w-full text-left px-2 py-1.5 text-xs text-foreground-dim hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Item Header */}
                <header className="p-6 border-b border-border">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-foreground/5 rounded-lg flex items-center justify-center border border-border">
                                <LayoutGrid className="w-8 h-8 text-foreground-dim" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{selectedItem.name}</h1>
                                <p className="text-sm text-foreground-dim">{selectedItem.category}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm font-medium bg-foreground/5 px-2 py-0.5 rounded border border-border flex items-center gap-1">
                                        Avg: {selectedItem.avgPrice} ISK
                                        <span className={cn(
                                            "flex items-center text-[10px]",
                                            selectedItem.change.startsWith('+') ? "text-green-500" : "text-red-500"
                                        )}>
                                            {selectedItem.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {selectedItem.change}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 hover:bg-foreground/5 rounded-md border border-border text-foreground-dim">
                                <Info className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Orders Tables */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Sell Orders */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Sellers
                            </h2>
                            <div className="text-xs text-foreground-dim">Showing lowest prices</div>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-foreground/5 text-foreground-dim font-medium border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3">Price (ISK)</th>
                                        <th className="px-4 py-3 text-right">Quantity</th>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3 text-right">Expires</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mockOrders.sell.map(order => (
                                        <tr key={order.id} className="hover:bg-foreground/5 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-red-400">{order.price}</td>
                                            <td className="px-4 py-3 text-right font-mono">{order.quantity}</td>
                                            <td className="px-4 py-3 truncate max-w-[300px] text-foreground-dim group-hover:text-foreground">{order.location}</td>
                                            <td className="px-4 py-3 text-right text-foreground-dim">{order.expires}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Buy Orders */}
                    <section>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Buyers
                            </h2>
                            <div className="text-xs text-foreground-dim">Showing highest bids</div>
                        </div>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-foreground/5 text-foreground-dim font-medium border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3">Price (ISK)</th>
                                        <th className="px-4 py-3 text-right">Quantity</th>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3 text-right">Expires</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {mockOrders.buy.map(order => (
                                        <tr key={order.id} className="hover:bg-foreground/5 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-green-400">{order.price}</td>
                                            <td className="px-4 py-3 text-right font-mono">{order.quantity}</td>
                                            <td className="px-4 py-3 truncate max-w-[300px] text-foreground-dim group-hover:text-foreground">{order.location}</td>
                                            <td className="px-4 py-3 text-right text-foreground-dim">{order.expires}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Placeholder for Charts */}
                    <section className="bg-foreground/5 rounded-lg p-12 border border-border border-dashed flex flex-col items-center justify-center text-foreground-dim">
                        <List className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm font-medium">Price History Chart Placeholder</p>
                        <p className="text-xs mt-1">Select an item to view trend data</p>
                    </section>
                </div>
            </main>
        </div>
    )
}
