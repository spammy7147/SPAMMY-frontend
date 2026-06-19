import { useMemo, useState } from 'react'

export function ShoppingTab({ run }) {
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState(null)

    const shoppingText = useMemo(() => {
        if (!run) return ''
        return (run.materials || [])
            .filter((material) => Number(material.missingQuantity || 0) > 0)
            .map((material) => `${material.typeName} ${Number(material.missingQuantity || 0)}`)
            .join('\n')
    }, [run])

    if (!run) {
        return (
            <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                Select a production run first.
            </div>
        )
    }

    const copy = async () => {
        setCopied(false)
        setError(null)
        try {
            await navigator.clipboard.writeText(shoppingText)
            setCopied(true)
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm text-foreground font-bold">Shopping list</div>
                    <div className="text-[11px] text-foreground-dim">Missing materials only, one item per line.</div>
                </div>
                <button
                    type="button"
                    onClick={copy}
                    disabled={!shoppingText}
                    className="bg-muted border border-border text-foreground-muted px-3 py-1.5 rounded text-xs font-bold cursor-pointer hover:bg-border/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Copy
                </button>
            </div>
            <textarea
                readOnly
                value={shoppingText}
                className="min-h-[360px] bg-card border border-border rounded p-4 text-foreground font-mono text-[12px] resize-y outline-none"
                placeholder="No missing materials."
            />
            {copied && <div className="text-success text-[11px] font-bold">Copied to clipboard.</div>}
            {error && <div className="text-destructive text-[11px] font-bold">{error}</div>}
        </div>
    )
}
