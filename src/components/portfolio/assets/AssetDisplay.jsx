export function ChevronIcon({ isExpanded, className = '' }) {
    return (
        <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${className}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    )
}

export function LocationName({ locationName, className = 'text-[13px] font-bold text-foreground' }) {
    if (!locationName) return null

    const match = locationName.match(/^([+-]?\d+\.\d+)\s+(.*)$/)
    if (!match) {
        return <span className={className}>{locationName}</span>
    }

    const sec = parseFloat(match[1])
    let colorClass = 'text-foreground-dim'

    if (sec >= 0.5) {
        colorClass = 'text-emerald-500 font-bold'
    } else if (sec > 0.0) {
        colorClass = 'text-amber-500 font-bold'
    } else {
        colorClass = 'text-rose-500 font-bold'
    }

    return (
        <span className={className}>
            <span className={colorClass}>{match[1]}</span> {match[2]}
        </span>
    )
}

export function HighlightText({ text, searchTerm }) {
    if (!searchTerm) return text

    const escapedSearch = searchTerm.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'))

    return (
        <span>
            {parts.map((part, index) =>
                part.toLowerCase() === searchTerm.toLowerCase() ? (
                    <mark key={`${part}-${index}`} className="bg-gold/20 text-gold font-semibold px-0.5 rounded">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </span>
    )
}
