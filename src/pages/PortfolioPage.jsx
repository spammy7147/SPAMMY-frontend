import { useEffect, useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { Overview } from '../components/portfolio/Overview'
import { CharacterCard } from '../components/portfolio/CharacterCard'

const API_BASE = ''

export default function PortfolioPage() {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/characters/summary`, { credentials: 'include' })
            if (res.ok) {
                const data = await res.json()
                setSummary(data)
            }
        } catch (error) {
            console.error('Summary fetch failed', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateOmega = async (charId, newDate) => {
        try {
            const res = await fetch(`${API_BASE}/api/characters/${charId}/omega`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ omegaExpiresAt: newDate }),
                credentials: 'include'
            })
            if (res.ok) fetchSummary()
        } catch (error) {
            console.error('Omega update failed', error)
        }
    };

    useEffect(() => {
        fetchSummary()
    }, [])

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="w-11 h-11 border-2 border-border border-t-primary rounded-full animate-spin-fast"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Navbar />

            <main className="max-w-[1440px] mx-auto p-8">
                <Overview totalBalance={summary?.totalBalance} />

                <div className="flex items-center gap-3 my-12 mb-6">
                    <span className="text-[12px] tracking-[2px] text-secondary uppercase font-extrabold">
                        Linked Characters
                    </span>
                    <div className="flex-1 h-[1px] bg-border-hover opacity-30"></div>
                </div>

                <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
                    {summary?.characters.map(char => (
                        <CharacterCard 
                            key={char.characterId} 
                            char={char} 
                            onUpdateOmega={handleUpdateOmega}
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}
