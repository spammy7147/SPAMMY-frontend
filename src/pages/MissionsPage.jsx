import { useState } from 'react'
import { MissionTab } from '../components/portfolio/MissionTab'
import { StandingTab } from '../components/portfolio/StandingTab'
import { LPTab } from '../components/portfolio/LPTab'
import { cn } from '@/lib/utils'

export default function MissionsPage() {
    const [activeTab, setActiveTab] = useState('missions')

    const tabs = [
        { id: 'missions', label: 'Mission Rewards' },
        { id: 'standings', label: 'Standings' },
        { id: 'lp', label: 'Loyalty Points' },
    ]

    return (
        <>
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
                {activeTab === 'missions' && <MissionTab apiBase="" />}
                {activeTab === 'standings' && <StandingTab apiBase="" />}
                {activeTab === 'lp' && <LPTab apiBase="" />}
            </div>
        </>
    )
}
