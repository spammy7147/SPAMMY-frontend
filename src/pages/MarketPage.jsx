import { useState } from 'react'
import { JournalTab } from '../components/portfolio/JournalTab'
import { OrdersTab } from '../components/portfolio/OrdersTab'
import { MarketBrowser } from '../components/market/MarketBrowser'
import { Tabs } from '@/components/ui/Tabs'

export default function MarketPage() {
    const [activeTab, setActiveTab] = useState('browser')

    const tabs = [
        { id: 'browser', label: 'Market Browser' },
        { id: 'journal', label: 'Wallet Journal' },
        { id: 'orders', label: 'Market Orders' },
    ]

    return (
        <>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                {activeTab === 'browser' && <MarketBrowser />}
                {activeTab === 'journal' && <JournalTab apiBase="" />}
                {activeTab === 'orders' && <OrdersTab apiBase="" />}
            </div>
        </>
    )
}
