function number(value) {
    return Number(value || 0).toLocaleString()
}

export function MaterialsTab({ run }) {
    if (!run) {
        return (
            <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                Select a production run first.
            </div>
        )
    }

    const materials = run.materials || []

    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                    <tr className="bg-muted border-b border-border">
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Item</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Required</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Available in scope</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Owned elsewhere</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Missing</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Volume</th>
                    </tr>
                </thead>
                <tbody>
                    {materials.length > 0 ? materials.map((material) => (
                        <tr key={material.typeId} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                            <td className="px-3 py-2.5 text-foreground font-semibold">{material.typeName}</td>
                            <td className="px-3 py-2.5 text-right text-foreground-muted font-mono">{number(material.requiredQuantity)}</td>
                            <td className="px-3 py-2.5 text-right text-success font-mono">{number(material.availableQuantity)}</td>
                            <td className="px-3 py-2.5 text-right text-foreground-dim font-mono">{number(material.elsewhereQuantity)}</td>
                            <td className="px-3 py-2.5 text-right text-destructive font-mono font-bold">{number(material.missingQuantity)}</td>
                            <td className="px-3 py-2.5 text-right text-foreground-dim font-mono">
                                {material.totalVolume == null ? '-' : number(material.totalVolume)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="6" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                NO REQUIRED MATERIALS
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
