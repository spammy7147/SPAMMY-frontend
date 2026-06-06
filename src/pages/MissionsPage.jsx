import { useState } from 'react'
import { MissionTab } from '../components/portfolio/MissionTab'
import { StandingTab } from '../components/portfolio/StandingTab'
import { LPTab } from '../components/portfolio/LPTab'
import { Tabs } from '@/components/ui/Tabs'

export default function MissionsPage() {
    const [activeTab, setActiveTab] = useState('missions')

    const tabs = [
        { id: 'missions', label: 'Mission Rewards' },
        { id: 'standings', label: 'Standings' },
        { id: 'lp', label: 'Loyalty Points' },
    ]

    return (
        <>
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                {activeTab === 'missions' && <MissionTab apiBase="" />}
                {activeTab === 'standings' && <StandingTab apiBase="" />}
                {activeTab === 'lp' && <LPTab apiBase="" />}
            </div>
        </>
    )
}
