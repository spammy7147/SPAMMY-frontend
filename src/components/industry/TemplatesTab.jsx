import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { industryApi } from '@/services/industryApi'

const decisions = [
    { label: '자동', value: 'AUTO' },
    { label: '생산', value: 'PRODUCE' },
    { label: '구매', value: 'PURCHASE' },
]

const facilityRows = [
    { id: 'manufacturing', label: 'Manufacturing', defaultStructure: 'Raitaru I', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
    { id: 'component', label: 'Component', defaultStructure: 'Raitaru I', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
    { id: 'reaction', label: 'Reaction', defaultStructure: 'Refinery I', defaultBonus: '2.2', defaultCost: '', defaultTax: '10' },
    { id: 'fuel', label: 'Fuel', defaultStructure: 'Raitaru I', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
]

function countNodes(template) {
    return (template.nodes || []).length
}

function initialFacilityState() {
    return Object.fromEntries(
        facilityRows.map((row) => [
            row.id,
            {
                index: '0.14',
                structure: row.defaultStructure,
                bonus: row.defaultBonus,
                cost: row.defaultCost,
                tax: row.defaultTax,
            },
        ]),
    )
}

function flattenBom(node, decisionsByNodeKey, parentNodeKey = null) {
    if (!node) return []

    return [
        {
            nodeKey: node.nodeKey,
            parentNodeKey,
            typeId: node.typeId,
            typeName: node.typeName,
            quantity: node.quantity,
            runsPerJob: node.runsPerJob || 1,
            decision: decisionsByNodeKey[node.nodeKey] || node.decision || 'AUTO',
            facilityPresetId: null,
            materialEfficiency: null,
            timeEfficiency: null,
        },
        ...(node.children || []).flatMap((child) => flattenBom(child, decisionsByNodeKey, node.nodeKey)),
    ]
}

function groupByDepth(node, depth = 0, columns = []) {
    if (!node) return columns
    if (!columns[depth]) columns[depth] = []
    columns[depth].push(node)
    ;(node.children || []).forEach((child) => groupByDepth(child, depth + 1, columns))
    return columns
}

function aggregateLeaves(node, result = new Map()) {
    if (!node) return result
    const children = node.children || []
    if (children.length === 0) {
        const current = result.get(node.typeId) || { typeId: node.typeId, typeName: node.typeName, quantity: 0 }
        current.quantity += Number(node.quantity || 0)
        result.set(node.typeId, current)
        return result
    }
    children.forEach((child) => aggregateLeaves(child, result))
    return result
}

function number(value) {
    return Number(value || 0).toLocaleString()
}

function buildTemplatePayload(editor, bomTree, decisionsByNodeKey) {
    const nodes = flattenBom(bomTree, decisionsByNodeKey)
    const target = nodes[0]

    return {
        name: editor.name.trim(),
        description: editor.description.trim() || null,
        targets: [
            {
                typeId: target.typeId,
                typeName: target.typeName,
                quantity: target.quantity,
            },
        ],
        nodes,
    }
}

function FacilitySettings({ facilities, onChange }) {
    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            {facilityRows.map((row) => {
                const values = facilities[row.id]
                return (
                    <div key={row.id} className="grid grid-cols-[120px_90px_minmax(120px,1fr)_110px_90px_90px] gap-2 items-center px-3 py-2 border-b border-border last:border-b-0 text-[12px] max-xl:grid-cols-2">
                        <div className="text-foreground font-extrabold">{row.label}</div>
                        <label className="flex items-center gap-1">
                            <span className="text-foreground-dim text-[10px]">Index</span>
                            <input
                                value={values.index}
                                onChange={(event) => onChange(row.id, 'index', event.target.value)}
                                className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-1 rounded-[3px] outline-none"
                            />
                        </label>
                        <label className="flex items-center gap-1">
                            <span className="text-foreground-dim text-[10px]">Structure</span>
                            <select
                                value={values.structure}
                                onChange={(event) => onChange(row.id, 'structure', event.target.value)}
                                className="w-full bg-muted border border-border text-foreground px-2 py-1 rounded-[3px] outline-none"
                            >
                                <option>Raitaru I</option>
                                <option>Azbel I</option>
                                <option>Sotiyo I</option>
                                <option>Refinery I</option>
                                <option>NPC Station</option>
                            </select>
                        </label>
                        <label className="flex items-center gap-1">
                            <span className="text-foreground-dim text-[10px]">Bonus</span>
                            <input
                                value={values.bonus}
                                onChange={(event) => onChange(row.id, 'bonus', event.target.value)}
                                className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-1 rounded-[3px] outline-none"
                            />
                        </label>
                        <label className="flex items-center gap-1">
                            <span className="text-foreground-dim text-[10px]">Cost</span>
                            <input
                                value={values.cost}
                                onChange={(event) => onChange(row.id, 'cost', event.target.value)}
                                className="w-full bg-foreground-dim/20 border border-border text-foreground px-2 py-1 rounded-[3px] outline-none"
                            />
                        </label>
                        <label className="flex items-center gap-1">
                            <span className="text-foreground-dim text-[10px]">Tax</span>
                            <input
                                value={values.tax}
                                onChange={(event) => onChange(row.id, 'tax', event.target.value)}
                                className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-1 rounded-[3px] outline-none"
                            />
                        </label>
                    </div>
                )
            })}
        </div>
    )
}

function DecisionButtons({ value, onChange }) {
    return (
        <div className="grid grid-cols-3 gap-1">
            {decisions.map((decision) => (
                <button
                    key={decision.value}
                    type="button"
                    onClick={() => onChange(decision.value)}
                    className={cn(
                        'border text-[10px] px-1.5 py-1 rounded-[2px] cursor-pointer font-bold transition-colors',
                        value === decision.value
                            ? 'bg-secondary/20 border-secondary text-secondary'
                            : 'bg-transparent border-border text-foreground-dim hover:text-foreground-muted',
                    )}
                >
                    {decision.label}
                </button>
            ))}
        </div>
    )
}

function BlueprintSearchInput({
    query,
    results,
    searching,
    selectedBlueprint,
    onQueryChange,
    onSelect,
}) {
    const showResults = query.trim().length >= 2 && results.length > 0

    return (
        <div className="relative">
            <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-full bg-background border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                placeholder="Jackdaw"
            />
            {searching && (
                <div className="absolute right-2 top-2 text-[10px] text-foreground-dim font-bold">
                    SEARCH
                </div>
            )}
            {showResults && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded overflow-hidden shadow-xl">
                    {results.map((blueprint) => (
                        <button
                            key={`${blueprint.blueprintTypeId}-${blueprint.productTypeId}`}
                            type="button"
                            onClick={() => onSelect(blueprint)}
                            className="w-full border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-b border-border last:border-b-0"
                        >
                            <div className="text-[12px] text-foreground font-bold">
                                {blueprint.productTypeName}
                            </div>
                            <div className="text-[10px] text-foreground-dim">
                                type {blueprint.productTypeId}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            {selectedBlueprint && (
                <div className="mt-1 text-[10px] text-secondary font-bold">
                    Selected: {selectedBlueprint.productTypeName}
                </div>
            )}
        </div>
    )
}

function BomCard({ node, decision, onDecisionChange }) {
    return (
        <div className="bg-card border border-border rounded-[4px] overflow-hidden min-w-[190px]">
            <div className="bg-muted px-3 py-2 border-b border-border">
                <div className="text-[12px] text-foreground font-bold truncate">{node.typeName}</div>
                <div className="text-[10px] text-foreground-dim font-mono">type {node.typeId}</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                        <div className="text-foreground-dim">Qty</div>
                        <div className="text-foreground font-bold font-mono">{number(node.quantity)}</div>
                    </div>
                    <div>
                        <div className="text-foreground-dim">Runs</div>
                        <div className="text-foreground-muted font-bold font-mono">{number(node.runsPerJob)}</div>
                    </div>
                </div>
                <DecisionButtons value={decision} onChange={onDecisionChange} />
            </div>
        </div>
    )
}

function BomTree({ bomTree, decisionsByNodeKey, onDecisionChange }) {
    if (!bomTree) {
        return (
            <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                NO CALCULATION
            </div>
        )
    }

    const columns = groupByDepth(bomTree)

    return (
        <div className="bg-background/40 border border-border rounded overflow-x-auto">
            <div className="flex gap-2 p-3 min-w-max">
                {columns.map((nodes, depth) => (
                    <div key={depth} className="flex flex-col gap-2 w-[220px]">
                        <div className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold px-1">
                            Tier {depth}
                        </div>
                        {nodes.map((node) => (
                            <BomCard
                                key={node.nodeKey}
                                node={node}
                                decision={decisionsByNodeKey[node.nodeKey] || node.decision || 'AUTO'}
                                onDecisionChange={(decision) => onDecisionChange(node.nodeKey, decision)}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

function MaterialsSummary({ bomTree }) {
    const materials = useMemo(() => Array.from(aggregateLeaves(bomTree).values()), [bomTree])

    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                <div className="text-[11px] text-foreground-dim uppercase tracking-wider font-bold">Materials</div>
                <div className="text-[11px] text-foreground-muted font-bold">{materials.length} items</div>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
                {materials.length > 0 ? materials.map((material) => (
                    <div key={material.typeId} className="grid grid-cols-[minmax(0,1fr)_90px] gap-2 px-3 py-2 border-b border-border last:border-b-0 text-[12px]">
                        <div className="text-foreground-muted truncate">{material.typeName}</div>
                        <div className="text-right text-foreground font-mono font-bold">{number(material.quantity)}</div>
                    </div>
                )) : (
                    <div className="p-8 text-center text-foreground-dim text-[12px]">NO MATERIALS</div>
                )}
            </div>
        </div>
    )
}

function TemplatesList({ templates }) {
    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
                <thead>
                    <tr className="bg-muted border-b border-border">
                        <th className="px-3 py-2.5 text-left text-[9px] text-foreground-dim uppercase tracking-wider">Template</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Targets</th>
                        <th className="px-3 py-2.5 text-right text-[9px] text-foreground-dim uppercase tracking-wider">Nodes</th>
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
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="3" className="text-center py-14 text-foreground-dim font-mono tracking-[2px]">
                                NO INDUSTRY TEMPLATES
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

export function TemplatesTab({ templates, onTemplateCreated }) {
    const [editor, setEditor] = useState({
        name: '',
        description: '',
        blueprintQuery: '',
        typeId: '',
        typeName: '',
        quantity: '1',
        me: '10',
        system: '',
        defaultDecision: 'AUTO',
    })
    const [facilities, setFacilities] = useState(initialFacilityState)
    const [bomTree, setBomTree] = useState(null)
    const [decisionsByNodeKey, setDecisionsByNodeKey] = useState({})
    const [blueprintResults, setBlueprintResults] = useState([])
    const [selectedBlueprint, setSelectedBlueprint] = useState(null)
    const [blueprintSearching, setBlueprintSearching] = useState(false)
    const [calculating, setCalculating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const updateEditor = (field) => (event) => {
        setEditor((current) => ({ ...current, [field]: event.target.value }))
    }

    useEffect(() => {
        const query = editor.blueprintQuery.trim()
        if (query.length < 2) {
            setBlueprintResults([])
            setBlueprintSearching(false)
            return undefined
        }

        let mounted = true
        const timer = setTimeout(() => {
            setBlueprintSearching(true)
            industryApi.manufacturingBlueprints(query)
                .then((results) => {
                    if (mounted) setBlueprintResults(results || [])
                })
                .catch(() => {
                    if (mounted) setBlueprintResults([])
                })
                .finally(() => {
                    if (mounted) setBlueprintSearching(false)
                })
        }, 250)

        return () => {
            mounted = false
            clearTimeout(timer)
        }
    }, [editor.blueprintQuery])

    const updateBlueprintQuery = (query) => {
        setSelectedBlueprint(null)
        setBomTree(null)
        setDecisionsByNodeKey({})
        setEditor((current) => ({
            ...current,
            blueprintQuery: query,
            typeId: '',
            typeName: '',
        }))
    }

    const selectBlueprint = (blueprint) => {
        setSelectedBlueprint(blueprint)
        setBlueprintResults([])
        setEditor((current) => ({
            ...current,
            blueprintQuery: blueprint.productTypeName,
            typeId: String(blueprint.productTypeId),
            typeName: blueprint.productTypeName,
            name: current.name || `${blueprint.productTypeName} ${current.quantity} runs`,
        }))
    }

    const updateFacility = (section, field, value) => {
        setFacilities((current) => ({
            ...current,
            [section]: {
                ...current[section],
                [field]: value,
            },
        }))
    }

    const canCalculate = Number(editor.typeId) > 0 && Number(editor.quantity) > 0
    const canSave = bomTree && editor.name.trim() && editor.typeName.trim()

    const calculate = async (event) => {
        event.preventDefault()
        if (!canCalculate || calculating) return

        setCalculating(true)
        setError(null)
        try {
            const tree = await industryApi.manufacturingBom(Number(editor.typeId), Number(editor.quantity))
            setBomTree(tree)
            setEditor((current) => ({ ...current, typeName: current.typeName || tree.typeName }))
            setDecisionsByNodeKey(
                Object.fromEntries(flattenBom(tree, {}).map((node) => [node.nodeKey, editor.defaultDecision])),
            )
        } catch (err) {
            setError(err.message)
        } finally {
            setCalculating(false)
        }
    }

    const saveTemplate = async () => {
        if (!canSave || saving) return

        setSaving(true)
        setError(null)
        try {
            const payload = buildTemplatePayload(editor, bomTree, decisionsByNodeKey)
            const created = await industryApi.createTemplate(payload)
            onTemplateCreated(created)
            setEditor((current) => ({ ...current, name: '', description: '' }))
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const setNodeDecision = (nodeKey, decision) => {
        setDecisionsByNodeKey((current) => ({ ...current, [nodeKey]: decision }))
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={calculate} className="bg-card border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[90px_minmax(220px,1fr)_90px_90px_minmax(140px,1fr)_160px] gap-2 items-start px-3 py-2 bg-muted border-b border-border max-xl:grid-cols-2">
                    <div className="text-sm text-foreground font-extrabold text-right max-xl:text-left">Product</div>
                    <BlueprintSearchInput
                        query={editor.blueprintQuery}
                        results={blueprintResults}
                        searching={blueprintSearching}
                        selectedBlueprint={selectedBlueprint}
                        onQueryChange={updateBlueprintQuery}
                        onSelect={selectBlueprint}
                    />
                    <label className="flex items-center gap-1">
                        <span className="text-foreground text-[12px] font-bold">Run</span>
                        <input
                            type="number"
                            min="1"
                            value={editor.quantity}
                            onChange={updateEditor('quantity')}
                            className="w-full bg-background border border-border text-foreground text-[12px] px-2 py-2 rounded-[3px] outline-none"
                        />
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="text-foreground text-[12px] font-bold">ME</span>
                        <input
                            type="number"
                            value={editor.me}
                            onChange={updateEditor('me')}
                            className="w-full bg-background border border-border text-foreground text-[12px] px-2 py-2 rounded-[3px] outline-none"
                        />
                    </label>
                    <input
                        value={editor.system}
                        onChange={updateEditor('system')}
                        className="bg-background border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                        placeholder="System"
                    />
                    <button
                        type="submit"
                        disabled={!canCalculate || calculating}
                        className="bg-primary border border-primary text-background px-4 py-2 rounded text-sm font-extrabold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {calculating ? 'Calculating...' : 'Calculate'}
                    </button>
                </div>
                <div className="grid grid-cols-[140px_minmax(0,1fr)_220px] gap-3 items-center px-3 py-2 border-b border-border max-xl:grid-cols-1">
                    <input
                        value={editor.name}
                        onChange={updateEditor('name')}
                        className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                        placeholder="Template name"
                    />
                    <input
                        value={editor.description}
                        onChange={updateEditor('description')}
                        className="bg-muted border border-border text-foreground text-[12px] px-3 py-2 rounded-[3px] outline-none"
                        placeholder="Description"
                    />
                    <DecisionButtons
                        value={editor.defaultDecision}
                        onChange={(decision) => setEditor((current) => ({ ...current, defaultDecision: decision }))}
                    />
                </div>
                <FacilitySettings facilities={facilities} onChange={updateFacility} />
            </form>

            {error && (
                <div className="bg-card border border-destructive/50 rounded px-4 py-3 text-destructive text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4 max-xl:grid-cols-1">
                <MaterialsSummary bomTree={bomTree} />
                <div className="flex flex-col gap-3">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={saveTemplate}
                            disabled={!canSave || saving}
                            className="bg-secondary border border-secondary text-background px-4 py-2 rounded text-xs font-extrabold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                    <BomTree
                        bomTree={bomTree}
                        decisionsByNodeKey={decisionsByNodeKey}
                        onDecisionChange={setNodeDecision}
                    />
                </div>
            </div>

            <TemplatesList templates={templates} />
        </div>
    )
}
