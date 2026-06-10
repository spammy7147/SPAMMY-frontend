import { useState, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, Info, ArrowUpRight, ArrowDownRight, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { marketBrowserApi } from '@/services/marketBrowserApi'

function MarketGroupTree({ group, expandedCats, toggleCat, onSelectType }) {
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        toggleCat(group.id);
        if (!expandedCats.includes(group.id) && children.length === 0 && !group.hasTypes) {
            setIsLoading(true);
            try {
                const subGroups = await marketBrowserApi.getSubGroups(group.id);
                setChildren(subGroups);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        
        // If it has types, we might want to select it to view types (for simplicity, we assume we fetch types elsewhere or let the user click)
        // Here we just trigger an onSelect if it's a leaf node. (Simplified for now)
        if (group.hasTypes) {
            onSelectType(group);
        }
    };

    return (
        <div className="ml-2 mt-1">
            <button 
                onClick={handleToggle}
                className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-foreground/5 rounded-md transition-colors text-foreground",
                    group.hasTypes ? "text-foreground-dim font-normal" : ""
                )}
            >
                {!group.hasTypes && (expandedCats.includes(group.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                {group.hasTypes && <span className="w-4 h-4"></span>}
                <span>{group.nameKo || group.nameEn}</span>
            </button>
            {expandedCats.includes(group.id) && !group.hasTypes && (
                <div className="pl-4">
                    {isLoading && <div className="text-xs text-foreground-dim pl-2">Loading...</div>}
                    {children.map(child => (
                        <MarketGroupTree key={child.id} group={child} expandedCats={expandedCats} toggleCat={toggleCat} onSelectType={onSelectType} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function MarketBrowser() {
    const [categories, setCategories] = useState([])
    const [expandedCats, setExpandedCats] = useState([])
    
    // In EveMarketBrowser, clicking a leaf category usually loads the types, and then clicking a type loads the orders.
    // For this prototype, if `onSelectType` is called, we pretend we got the typeId.
    // Since we don't have a Type API yet, we will just use a hardcoded typeId like 34 (Tritanium) for now when any group is clicked.
    const [selectedItem, setSelectedItem] = useState({
        id: 34,
        name: 'Tritanium',
        category: 'Minerals',
        description: 'Tritanium is a very common mineral...',
        avgPrice: '4.50',
        change: '+1.2%'
    })

    const [sellOrders, setSellOrders] = useState([])
    const [buyOrders, setBuyOrders] = useState([])

    useEffect(() => {
        const fetchRoots = async () => {
            try {
                const roots = await marketBrowserApi.getRootGroups();
                setCategories(roots);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoots();
    }, [])

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                if (!selectedItem.id) return;
                const sells = await marketBrowserApi.getOrders(selectedItem.id, false, 10000002, 0, 10);
                const buys = await marketBrowserApi.getOrders(selectedItem.id, true, 10000002, 0, 10);
                setSellOrders(sells.content || []);
                setBuyOrders(buys.content || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchOrders();
    }, [selectedItem.id])

    const toggleCat = (id) => {
        setExpandedCats(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleSelectType = (group) => {
        // Ideally we'd fetch types for this group and let the user pick a type.
        // For demonstration, we'll just mock selecting Tritanium or some other type.
        console.log("Selected group with types:", group.nameEn);
        // setSelectedItem({ ...selectedItem, category: group.nameEn });
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
                        <MarketGroupTree 
                            key={cat.id} 
                            group={cat} 
                            expandedCats={expandedCats} 
                            toggleCat={toggleCat}
                            onSelectType={handleSelectType}
                        />
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
                                        <th className="px-4 py-3">Location ID</th>
                                        <th className="px-4 py-3 text-right">Duration (days)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {sellOrders.length === 0 ? (
                                        <tr><td colSpan="4" className="px-4 py-4 text-center text-foreground-dim">No sell orders found or data syncing.</td></tr>
                                    ) : sellOrders.map(order => (
                                        <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-red-400">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-4 py-3 text-right font-mono">{(order.volumeRemain || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 truncate max-w-[300px] text-foreground-dim group-hover:text-foreground">{order.locationId}</td>
                                            <td className="px-4 py-3 text-right text-foreground-dim">{order.duration}d</td>
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
                                        <th className="px-4 py-3">Location ID</th>
                                        <th className="px-4 py-3 text-right">Duration (days)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {buyOrders.length === 0 ? (
                                        <tr><td colSpan="4" className="px-4 py-4 text-center text-foreground-dim">No buy orders found or data syncing.</td></tr>
                                    ) : buyOrders.map(order => (
                                        <tr key={order.orderId} className="hover:bg-foreground/5 transition-colors group">
                                            <td className="px-4 py-3 font-mono text-green-400">{(order.price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="px-4 py-3 text-right font-mono">{(order.volumeRemain || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3 truncate max-w-[300px] text-foreground-dim group-hover:text-foreground">{order.locationId}</td>
                                            <td className="px-4 py-3 text-right text-foreground-dim">{order.duration}d</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

