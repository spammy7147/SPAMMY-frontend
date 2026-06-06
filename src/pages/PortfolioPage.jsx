import { useEffect, useState } from 'react'
import { Overview } from '../components/portfolio/Overview'
import { CharacterCard } from '../components/portfolio/CharacterCard'
import { api } from '@/services/api'

export default function PortfolioPage() {
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchSummary = async () => {
        try {
            const data = await api.characters.summary()
            setSummary(data)
        } catch (error) {
            console.error('Summary fetch failed', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateOmega = async (charId, newDate) => {
        try {
            await api.characters.updateOmega(charId, newDate)
            fetchSummary()
        } catch (error) {
            console.error('Omega update failed', error)
        }
    };

    useEffect(() => {
        fetchSummary()
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <div className="w-11 h-11 border-2 border-border border-t-primary rounded-full animate-spin-fast"></div>
        </div>
    )

    return (
        <>
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
        </>
    )
}
