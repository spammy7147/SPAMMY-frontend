function countNodes(template) {
    return (template.targets || []).reduce((total, target) => total + (target.nodes || []).length, 0)
}

export function TemplatesTab({ templates }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4 max-xl:grid-cols-1">
            <div className="bg-card border border-border rounded overflow-hidden">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="bg-muted border-b border-border">
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Template</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Targets</th>
                            <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Nodes</th>
                            <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {templates.length > 0 ? templates.map((template) => (
                            <tr key={template.id} className="border-b border-border bg-card hover:bg-border/5 transition-colors">
                                <td className="px-3 py-2.5">
                                    <div className="text-foreground font-semibold">{template.name}</div>
                                    {template.description && (
                                        <div className="text-[10px] text-foreground-dim mt-0.5 truncate max-w-[520px]">
                                            {template.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-2.5 text-right text-foreground font-bold">
                                    {(template.targets || []).length.toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-right text-foreground-muted">
                                    {countNodes(template).toLocaleString()}
                                </td>
                                <td className="px-3 py-2.5 text-foreground-dim text-[11px]">
                                    {template.updatedAt || '-'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" className="text-center py-20 text-foreground-dim font-mono tracking-[2px]">
                                    NO INDUSTRY TEMPLATES
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-card border border-border rounded overflow-hidden opacity-70">
                <div className="p-4 bg-muted border-b border-border">
                    <div className="text-[11px] text-foreground-dim uppercase tracking-wider font-bold">Decision Palette</div>
                    <div className="text-sm text-foreground font-bold mt-1">Template editor preview</div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    {[
                        { label: '자동', value: 'AUTO' },
                        { label: '생산', value: 'PRODUCE' },
                        { label: '구매', value: 'PURCHASE' },
                    ].map((decision) => (
                        <button
                            key={decision.value}
                            type="button"
                            disabled
                            className="flex items-center justify-between bg-muted border border-border rounded-[3px] px-3 py-2 text-left cursor-not-allowed"
                        >
                            <span className="text-sm text-foreground-muted font-bold">{decision.label}</span>
                            <span className="text-[10px] text-foreground-dim font-mono">{decision.value}</span>
                        </button>
                    ))}
                    <div className="text-[11px] text-foreground-dim leading-relaxed mt-1">
                        저장된 생산 트리의 각 노드는 자동, 생산, 구매 중 하나의 결정값을 갖습니다.
                    </div>
                </div>
            </div>
        </div>
    )
}
