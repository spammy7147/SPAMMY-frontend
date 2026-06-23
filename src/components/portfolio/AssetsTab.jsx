import { useEffect, useMemo, useState } from 'react'
import { useConfig } from '@/store/ConfigContext'
import { api } from '@/services/api'
import { AssetTree } from './assets/AssetTree'

const toggleBooleanByKey = (key) => (prev) => ({ ...prev, [key]: !prev[key] })
const toggleDefaultExpandedByKey = (key) => (prev) => ({ ...prev, [key]: prev[key] === false ? true : false })

export function AssetsTab() {
    const { iskAbbreviation } = useConfig()
    const [data, setData] = useState({ characterAssets: [] })
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedLocs, setExpandedLocs] = useState({})
    const [expandedCats, setExpandedCats] = useState({})
    const [expandedItems, setExpandedItems] = useState({})
    const [expandedInnerCats, setExpandedInnerCats] = useState({})
    const [expandedChars, setExpandedChars] = useState({})

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const result = await api.characters.assets()
                setData(result)
            } catch (error) {
                console.error('Assets fetch failed', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAssets()
    }, [])

    const expansion = useMemo(() => ({
        expandedLocs,
        expandedCats,
        expandedItems,
        expandedInnerCats,
        expandedChars,
    }), [expandedLocs, expandedCats, expandedItems, expandedInnerCats, expandedChars])

    const handlers = useMemo(() => ({
        onToggleLoc: (id) => setExpandedLocs(toggleBooleanByKey(id)),
        onToggleCat: (id) => setExpandedCats(toggleBooleanByKey(id)),
        onToggleItem: (id) => setExpandedItems(toggleBooleanByKey(id)),
        onToggleInnerCat: (id) => setExpandedInnerCats(toggleDefaultExpandedByKey(id)),
        onToggleChar: (name) => setExpandedChars(toggleDefaultExpandedByKey(name)),
    }), [])

    if (loading) {
        return (
            <div className="text-center py-12 text-foreground-dim tracking-[2px]">
                LOADING ASSETS...
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded px-4 py-3 flex items-center gap-3">
                <span className="text-sm" aria-hidden="true">🔍</span>
                <input
                    type="text"
                    placeholder="Search by item or container name..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="bg-transparent border-none text-foreground text-sm w-full outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            <AssetTree
                characterAssets={data.characterAssets}
                searchTerm={searchTerm}
                expansion={expansion}
                handlers={handlers}
                iskAbbreviation={iskAbbreviation}
            />
        </div>
    )
}
