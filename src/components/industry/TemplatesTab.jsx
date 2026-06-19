import { useState } from 'react'
import { industryApi } from '@/services/industryApi'

const decisions = [
    { label: '자동', value: 'AUTO' },
    { label: '생산', value: 'PRODUCE' },
    { label: '구매', value: 'PURCHASE' },
]

function countNodes(template) {
    return (template.targets || []).reduce((total, target) => total + (target.nodes || []).length, 0)
}

function buildTemplatePayload(form) {
    const typeId = Number(form.typeId)
    const quantity = Number(form.quantity)
    const nodeKey = `target-${typeId}`

    return {
        name: form.name.trim(),
        description: form.description.trim() || null,
        targets: [
            {
                typeId,
                typeName: form.typeName.trim(),
                quantity,
            },
        ],
        nodes: [
            {
                nodeKey,
                parentNodeKey: null,
                typeId,
                typeName: form.typeName.trim(),
                quantity,
                runsPerJob: 1,
                decision: form.decision,
                facilityPresetId: null,
                materialEfficiency: null,
                timeEfficiency: null,
            },
        ],
    }
}

export function TemplatesTab({ templates, onTemplateCreated }) {
    const [form, setForm] = useState({
        name: '',
        description: '',
        typeId: '',
        typeName: '',
        quantity: '1',
        decision: 'AUTO',
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const updateField = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }))
    }

    const isValid =
        form.name.trim() &&
        form.typeName.trim() &&
        Number(form.typeId) > 0 &&
        Number(form.quantity) > 0

    const createTemplate = async (event) => {
        event.preventDefault()
        if (!isValid || saving) return

        setSaving(true)
        setError(null)

        try {
            const created = await industryApi.createTemplate(buildTemplatePayload(form))
            onTemplateCreated(created)
            setForm({
                name: '',
                description: '',
                typeId: '',
                typeName: '',
                quantity: '1',
                decision: 'AUTO',
            })
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

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

            <form onSubmit={createTemplate} className="bg-card border border-border rounded overflow-hidden">
                <div className="p-4 bg-muted border-b border-border">
                    <div className="text-[11px] text-foreground-dim uppercase tracking-wider font-bold">New Template</div>
                    <div className="text-sm text-foreground font-bold mt-1">기본 생산 설계 생성</div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Name</span>
                        <input
                            value={form.name}
                            onChange={updateField('name')}
                            className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                            placeholder="예: Vargur 10 runs"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Description</span>
                        <textarea
                            value={form.description}
                            onChange={updateField('description')}
                            className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none min-h-[72px] resize-y"
                            placeholder="용도나 생산 기준을 적어둡니다."
                        />
                    </label>
                    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Type ID</span>
                            <input
                                type="number"
                                min="1"
                                value={form.typeId}
                                onChange={updateField('typeId')}
                                className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                                placeholder="17738"
                            />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Target</span>
                            <input
                                value={form.typeName}
                                onChange={updateField('typeName')}
                                className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                                placeholder="Vargur"
                            />
                        </label>
                    </div>
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Runs / Quantity</span>
                        <input
                            type="number"
                            min="1"
                            value={form.quantity}
                            onChange={updateField('quantity')}
                            className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                        />
                    </label>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">Default Decision</span>
                        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded">
                            {decisions.map((decision) => (
                                <button
                                    key={decision.value}
                                    type="button"
                                    onClick={() => setForm((current) => ({ ...current, decision: decision.value }))}
                                    className={`border-none text-[11px] px-2 py-1.5 rounded-[3px] cursor-pointer font-bold transition-all ${
                                        form.decision === decision.value
                                            ? 'bg-border-hover text-foreground'
                                            : 'bg-transparent text-foreground-dim hover:text-foreground-muted'
                                    }`}
                                >
                                    {decision.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {decisions.map((decision) => (
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
                    </div>
                    {error && (
                        <div className="text-destructive text-[11px] leading-relaxed font-bold">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={!isValid || saving}
                        className="bg-primary border border-primary text-background px-3 py-2 rounded text-xs font-extrabold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Create Template'}
                    </button>
                    <div className="text-[11px] text-foreground-dim leading-relaxed">
                        생성 시 최종 생산품을 루트 노드로 저장합니다. 세부 BOM 결정값 편집은 다음 단계에서 확장합니다.
                    </div>
                </div>
            </form>
        </div>
    )
}
