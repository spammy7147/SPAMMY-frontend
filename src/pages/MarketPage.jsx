import { useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { JournalTab } from '../components/portfolio/JournalTab'
import { OrdersTab } from '../components/portfolio/OrdersTab'
import { MarketBrowser } from '../components/market/MarketBrowser'
import { cn } from '@/lib/utils'

export default function MarketPage() {
    const [activeTab, setActiveTab] = useState('browser')

    const tabs = [
        { id: 'browser', label: 'Market Browser' },
        { id: 'journal', label: 'Wallet Journal' },
        { id: 'orders', label: 'Market Orders' },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />
            <main className="max-w-[1440px] mx-auto p-8">
                <div className="flex gap-6 mb-8 border-b border-border">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "bg-none border-none border-b-2 py-3 px-1 text-sm font-bold cursor-pointer transition-all",
                                activeTab === tab.id 
                                    ? "border-secondary text-secondary" 
                                    : "border-transparent text-foreground-dim hover:text-foreground-muted"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                    {activeTab === 'browser' && <MarketBrowser />}
                    {activeTab === 'journal' && <JournalTab apiBase="" />}
                    {activeTab === 'orders' && <OrdersTab apiBase="" />}
                </div>
            </main>
        </div>
    )
}
