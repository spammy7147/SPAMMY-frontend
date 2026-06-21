import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { industryApi } from '@/services/industryApi'

const decisions = [
    { label: '자동', value: 'AUTO' },
    { label: '생산', value: 'PRODUCE' },
    { label: '구매', value: 'PURCHASE' },
]

const facilityRows = [
    { id: 'manufacturing', label: 'Manufacturing', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
    { id: 'component', label: 'Component', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
    { id: 'reaction', label: 'Reaction', defaultBonus: '2.2', defaultCost: '', defaultTax: '10' },
    { id: 'fuel', label: 'Fuel', defaultBonus: '5.158', defaultCost: '3', defaultTax: '10' },
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
                structure: '',
                bonus: row.defaultBonus,
                cost: row.defaultCost,
                tax: row.defaultTax,
            },
        ]),
    )
}

function flattenBom(node, decisionsByNodeKey, parentNodeKey = null, nodeSettingsByNodeKey = {}) {
    if (!node) return []

    const decision = effectiveDecision(node, decisionsByNodeKey)
    const children = shouldExpandChildren(node, decisionsByNodeKey)
        ? (node.children || []).flatMap((child) => flattenBom(child, decisionsByNodeKey, node.nodeKey, nodeSettingsByNodeKey))
        : []
    const nodeSettings = nodeSettingsByNodeKey[node.nodeKey] || {}

    return [
        {
            nodeKey: node.nodeKey,
            parentNodeKey,
            typeId: node.typeId,
            typeName: node.typeName,
            quantity: node.quantity,
            runsPerJob: node.runsPerJob || 1,
            decision,
            facilityPresetId: null,
            materialEfficiency: parseOptionalInteger(nodeSettings.materialEfficiency),
            timeEfficiency: parseOptionalInteger(nodeSettings.timeEfficiency),
        },
        ...children,
    ]
}

function effectiveDecision(node, decisionsByNodeKey) {
    return decisionsByNodeKey[node.nodeKey] || node.decision || 'AUTO'
}

function shouldExpandChildren(node, decisionsByNodeKey) {
    return effectiveDecision(node, decisionsByNodeKey) !== 'PURCHASE'
}

function hasBuildableChildren(node) {
    return (node.children || []).length > 0
}

function displayRuns(node, decision) {
    if (!hasBuildableChildren(node) || decision === 'PURCHASE') return '-'
    return number(node.runsPerJob)
}

function parseOptionalInteger(value) {
    if (value === '' || value == null) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function collectNodeSettings(node, materialEfficiency, timeEfficiency, result = {}) {
    if (!node) return result
    result[node.nodeKey] = hasBuildableChildren(node)
        ? { materialEfficiency, timeEfficiency }
        : { materialEfficiency: '', timeEfficiency: '' }
    ;(node.children || []).forEach((child) => collectNodeSettings(child, materialEfficiency, timeEfficiency, result))
    return result
}

function buildTierLayout(node, decisionsByNodeKey) {
    const nodes = []
    const edges = []
    let row = 0
    let maxDepth = 0

    function walk(current, depth, parent = null) {
        const currentRow = row
        maxDepth = Math.max(maxDepth, depth)
        nodes.push({ node: current, depth, row: currentRow })

        if (parent) {
            edges.push({
                from: parent.nodeKey,
                to: current.nodeKey,
                decision: effectiveDecision(current, decisionsByNodeKey),
            })
        }

        const children = shouldExpandChildren(current, decisionsByNodeKey) ? current.children || [] : []
        if (children.length === 0) {
            row += 1
            return
        }

        children.forEach((child) => walk(child, depth + 1, current))
    }

    if (node) walk(node, 0)
    return {
        nodes,
        edges,
        columnCount: maxDepth + 1,
        rowCount: Math.max(row, 1),
    }
}

function aggregateRequiredMaterials(node, decisionsByNodeKey, result = new Map()) {
    if (!node) return result
    const children = node.children || []
    if (children.length === 0 || !shouldExpandChildren(node, decisionsByNodeKey)) {
        const current = result.get(node.typeId) || { typeId: node.typeId, typeName: node.typeName, quantity: 0 }
        current.quantity += Number(node.quantity || 0)
        result.set(node.typeId, current)
        return result
    }
    children.forEach((child) => aggregateRequiredMaterials(child, decisionsByNodeKey, result))
    return result
}

function number(value) {
    return Number(value || 0).toLocaleString()
}

function buildTemplatePayload(editor, bomTree, decisionsByNodeKey, nodeSettingsByNodeKey) {
    const nodes = flattenBom(bomTree, decisionsByNodeKey, null, nodeSettingsByNodeKey)
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

function facilityTypeLabel(type) {
    if (type === 'USER_STRUCTURE') return 'Structure'
    if (type === 'NPC_STATION') return 'NPC'
    return type || 'Facility'
}

function FacilitySettings({ facilities, facilityOptions, facilityLoading, hasSelectedSystem, onChange }) {
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
                                disabled={!hasSelectedSystem || facilityLoading}
                            >
                                <option value="">
                                    {!hasSelectedSystem
                                        ? 'Select system first'
                                        : facilityLoading
                                            ? 'Loading facilities...'
                                            : 'Select facility'}
                                </option>
                                {facilityOptions.map((facility) => (
                                    <option key={`${facility.facilityType}-${facility.facilityId}`} value={String(facility.facilityId)}>
                                        {facility.facilityName} [{facilityTypeLabel(facility.facilityType)}]
                                    </option>
                                ))}
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
                        'border text-[9px] px-1.5 py-0.5 rounded-[2px] cursor-pointer font-bold transition-colors',
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
                <div className="absolute z-20 mt-1 w-full max-h-[260px] overflow-y-auto bg-card border border-border rounded shadow-xl">
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
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function SystemSearchInput({ query, results, searching, open, onOpenChange, onQueryChange, onSelect }) {
    const showResults = open && results.length > 0

    return (
        <div className="relative">
            <div className="flex bg-background border border-border rounded-[3px] focus-within:border-secondary">
                <input
                    value={query}
                    onFocus={() => onOpenChange(true)}
                    onChange={(event) => {
                        onOpenChange(true)
                        onQueryChange(event.target.value)
                    }}
                    className="min-w-0 flex-1 bg-transparent border-none text-foreground text-[12px] px-3 py-2 outline-none"
                    placeholder="System"
                />
                <button
                    type="button"
                    onClick={() => onOpenChange(!open)}
                    className="w-8 border-none border-l border-border bg-transparent text-foreground-dim cursor-pointer hover:text-foreground"
                    aria-label="Toggle system dropdown"
                >
                    ▾
                </button>
            </div>
            {searching && (
                <div className="absolute right-10 top-2 text-[10px] text-foreground-dim font-bold">
                    SEARCH
                </div>
            )}
            {showResults && (
                <div className="absolute z-20 mt-1 w-full max-h-[260px] overflow-y-auto bg-card border border-border rounded shadow-xl">
                    {results.map((system) => (
                        <button
                            key={system.systemId}
                            type="button"
                            onClick={() => {
                                onSelect(system)
                                onOpenChange(false)
                            }}
                            className="w-full border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-b border-border last:border-b-0"
                        >
                            <div className="text-[12px] text-foreground font-bold">
                                {system.systemName}
                            </div>
                            {system.securityStatus != null && (
                                <div className="text-[10px] text-foreground-dim">
                                    Security {Number(system.securityStatus).toFixed(1)}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}
            {open && !searching && results.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded px-3 py-3 text-[11px] text-foreground-dim shadow-xl">
                    NO SYSTEMS
                </div>
            )}
        </div>
    )
}

function connectorClass(decision) {
    if (decision === 'PRODUCE') return 'stroke-emerald-400/55'
    if (decision === 'PURCHASE') return 'stroke-amber-300/55'
    return 'stroke-sky-400/55'
}

function BomCard({ node, decision, settings, onDecisionChange, onSettingsChange }) {
    const buildable = hasBuildableChildren(node)
    const settingsDisabled = !buildable || decision === 'PURCHASE'

    return (
        <div className={cn(
            'relative z-10 bg-card border rounded-[4px] overflow-hidden w-[330px] shadow-sm',
            decision === 'PRODUCE' && 'border-emerald-400/45 shadow-[inset_3px_0_0_rgba(52,211,153,0.4)]',
            decision === 'PURCHASE' && 'border-amber-400/45 shadow-[inset_3px_0_0_rgba(251,191,36,0.35)]',
            decision === 'AUTO' && 'border-sky-400/45 shadow-[inset_3px_0_0_rgba(56,189,248,0.35)]',
        )}>
            <div className="grid grid-cols-[minmax(0,1fr)_64px_54px] gap-2 items-start bg-muted px-2.5 py-1.5 border-b border-border">
                <div className="min-w-0">
                    <div className="text-[12px] text-foreground font-bold leading-snug break-words">
                        {node.typeName}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Need</div>
                    <div className="text-[11px] text-foreground font-bold font-mono truncate">{number(node.quantity)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Runs</div>
                    <div className="text-[11px] text-foreground-muted font-bold font-mono">{displayRuns(node, decision)}</div>
                </div>
            </div>
            <div className="grid grid-cols-[64px_64px_minmax(0,1fr)] gap-1.5 px-2.5 py-1.5">
                <label className="min-w-0">
                    <span className="block text-[9px] text-foreground-dim font-bold mb-0.5">ME</span>
                    <input
                        type="number"
                        value={settings.materialEfficiency}
                        onChange={(event) => onSettingsChange('materialEfficiency', event.target.value)}
                        disabled={settingsDisabled}
                        className="w-full bg-background border border-border text-foreground text-[11px] px-1.5 py-1 rounded-[3px] outline-none disabled:opacity-40"
                    />
                </label>
                <label className="min-w-0">
                    <span className="block text-[9px] text-foreground-dim font-bold mb-0.5">TE</span>
                    <input
                        type="number"
                        value={settings.timeEfficiency}
                        onChange={(event) => onSettingsChange('timeEfficiency', event.target.value)}
                        disabled={settingsDisabled}
                        className="w-full bg-background border border-border text-foreground text-[11px] px-1.5 py-1 rounded-[3px] outline-none disabled:opacity-40"
                    />
                </label>
                <DecisionButtons value={decision} onChange={onDecisionChange} />
            </div>
        </div>
    )
}

function BomTree({ bomTree, decisionsByNodeKey, nodeSettingsByNodeKey, onDecisionChange, onSettingsChange }) {
    const contentRef = useRef(null)
    const layout = useMemo(() => buildTierLayout(bomTree, decisionsByNodeKey), [bomTree, decisionsByNodeKey])
    const [connectors, setConnectors] = useState({ width: 0, height: 0, paths: [] })
    const rowHeight = 132

    useLayoutEffect(() => {
        const content = contentRef.current
        if (!content) return undefined

        const drawConnectors = () => {
            const paths = layout.edges.flatMap((edge) => {
                const from = content.querySelector(`[data-node-key="${CSS.escape(edge.from)}"]`)
                const to = content.querySelector(`[data-node-key="${CSS.escape(edge.to)}"]`)
                if (!from || !to) return []

                const startX = from.offsetLeft + from.offsetWidth
                const startY = from.offsetTop + from.offsetHeight / 2
                const endX = to.offsetLeft
                const endY = to.offsetTop + to.offsetHeight / 2
                const midX = startX + Math.max(8, (endX - startX) / 2)

                return [{
                    key: `${edge.from}-${edge.to}`,
                    decision: edge.decision,
                    d: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`,
                }]
            })

            setConnectors({
                width: content.scrollWidth,
                height: content.scrollHeight,
                paths,
            })
        }

        drawConnectors()
        const resizeObserver = new ResizeObserver(drawConnectors)
        resizeObserver.observe(content)
        content.querySelectorAll('[data-node-key]').forEach((element) => resizeObserver.observe(element))
        window.addEventListener('resize', drawConnectors)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener('resize', drawConnectors)
        }
    }, [layout])

    if (!bomTree) {
        return (
            <div className="bg-card border border-border rounded p-12 text-center text-foreground-dim">
                NO CALCULATION
            </div>
        )
    }

    return (
        <div className="bg-background/40 border border-border rounded overflow-x-auto">
            <div
                ref={contentRef}
                className="relative grid gap-x-4 gap-y-2 p-3 min-w-max"
                style={{
                    gridTemplateColumns: `repeat(${layout.columnCount}, 330px)`,
                    gridTemplateRows: `28px repeat(${layout.rowCount}, ${rowHeight}px)`,
                }}
            >
                <svg
                    className="absolute inset-0 z-0 pointer-events-none"
                    width={connectors.width}
                    height={connectors.height}
                    viewBox={`0 0 ${connectors.width || 1} ${connectors.height || 1}`}
                    aria-hidden="true"
                >
                    {connectors.paths.map((path) => (
                        <path
                            key={path.key}
                            d={path.d}
                            className={cn('fill-none stroke-2', connectorClass(path.decision))}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    ))}
                </svg>
                {Array.from({ length: layout.columnCount }, (_, depth) => (
                    <div
                        key={depth}
                        className="text-[9px] text-foreground-dim uppercase tracking-wider font-bold px-1"
                        style={{ gridColumn: depth + 1, gridRow: 1 }}
                    >
                        Tier {depth}
                    </div>
                ))}
                {layout.nodes.map(({ node, depth, row }) => (
                    <div
                        key={node.nodeKey}
                        data-node-key={node.nodeKey}
                        className="self-center"
                        style={{ gridColumn: depth + 1, gridRow: row + 2 }}
                    >
                        <BomCard
                            node={node}
                            decision={effectiveDecision(node, decisionsByNodeKey)}
                            settings={nodeSettingsByNodeKey[node.nodeKey] || { materialEfficiency: '', timeEfficiency: '' }}
                            onDecisionChange={(decision) => onDecisionChange(node.nodeKey, decision)}
                            onSettingsChange={(field, value) => onSettingsChange(node.nodeKey, field, value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}

function MaterialsSummary({ bomTree, decisionsByNodeKey }) {
    const materials = useMemo(
        () => Array.from(aggregateRequiredMaterials(bomTree, decisionsByNodeKey).values()),
        [bomTree, decisionsByNodeKey],
    )

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
        te: '20',
        system: '',
        defaultDecision: 'AUTO',
    })
    const [facilities, setFacilities] = useState(initialFacilityState)
    const [bomTree, setBomTree] = useState(null)
    const [decisionsByNodeKey, setDecisionsByNodeKey] = useState({})
    const [blueprintResults, setBlueprintResults] = useState([])
    const [selectedBlueprint, setSelectedBlueprint] = useState(null)
    const [blueprintSearching, setBlueprintSearching] = useState(false)
    const [systemResults, setSystemResults] = useState([])
    const [systemCache, setSystemCache] = useState(null)
    const [selectedSystem, setSelectedSystem] = useState(null)
    const [systemSearching, setSystemSearching] = useState(false)
    const [systemDropdownOpen, setSystemDropdownOpen] = useState(false)
    const [facilityOptions, setFacilityOptions] = useState([])
    const [facilityLoading, setFacilityLoading] = useState(false)
    const [nodeSettingsByNodeKey, setNodeSettingsByNodeKey] = useState({})
    const [calculating, setCalculating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const updateEditor = (field) => (event) => {
        setEditor((current) => ({ ...current, [field]: event.target.value }))
    }

    useEffect(() => {
        const query = editor.blueprintQuery.trim()
        if (selectedBlueprint && query === selectedBlueprint.productTypeName) {
            setBlueprintResults([])
            setBlueprintSearching(false)
            return undefined
        }
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
    }, [editor.blueprintQuery, selectedBlueprint])

    useEffect(() => {
        if (!systemDropdownOpen) {
            setSystemResults([])
            setSystemSearching(false)
            return undefined
        }

        if (systemCache) {
            const query = editor.system.trim().toLowerCase()
            const filteredSystems = query
                ? systemCache.filter((system) => system.systemName.toLowerCase().includes(query))
                : systemCache
            setSystemResults(filteredSystems)
            setSystemSearching(false)
            return undefined
        }

        let mounted = true
        setSystemSearching(true)
        industryApi.systems('', 10000)
            .then((results) => {
                if (!mounted) return
                const systems = results || []
                setSystemCache(systems)
                setSystemResults(systems)
            })
            .catch(() => {
                if (mounted) setSystemResults([])
            })
            .finally(() => {
                if (mounted) setSystemSearching(false)
            })

        return () => {
            mounted = false
        }
    }, [editor.system, systemCache, systemDropdownOpen])

    useEffect(() => {
        if (!selectedSystem?.systemId) {
            setFacilityOptions([])
            return undefined
        }

        let mounted = true
        setFacilityLoading(true)
        industryApi.facilities(selectedSystem.systemId)
            .then((facilities) => {
                if (mounted) setFacilityOptions(facilities || [])
            })
            .catch(() => {
                if (mounted) setFacilityOptions([])
            })
            .finally(() => {
                if (mounted) setFacilityLoading(false)
            })

        return () => {
            mounted = false
        }
    }, [selectedSystem])

    const updateBlueprintQuery = (query) => {
        setSelectedBlueprint(null)
        setBomTree(null)
        setDecisionsByNodeKey({})
        setNodeSettingsByNodeKey({})
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

    const updateSystemQuery = (query) => {
        setSelectedSystem(null)
        setFacilityOptions([])
        setFacilities((current) =>
            Object.fromEntries(
                Object.entries(current).map(([key, value]) => [key, { ...value, structure: '' }]),
            ),
        )
        setEditor((current) => ({ ...current, system: query }))
    }

    const selectSystem = (system) => {
        setSelectedSystem(system)
        setSystemResults([])
        setFacilities((current) =>
            Object.fromEntries(
                Object.entries(current).map(([key, value]) => [key, { ...value, structure: '' }]),
            ),
        )
        setEditor((current) => ({ ...current, system: system.systemName }))
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
            setNodeSettingsByNodeKey(collectNodeSettings(tree, editor.me, editor.te))
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
            const payload = buildTemplatePayload(editor, bomTree, decisionsByNodeKey, nodeSettingsByNodeKey)
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

    const setNodeSetting = (nodeKey, field, value) => {
        setNodeSettingsByNodeKey((current) => ({
            ...current,
            [nodeKey]: {
                materialEfficiency: '',
                timeEfficiency: '',
                ...(current[nodeKey] || {}),
                [field]: value,
            },
        }))
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={calculate} className="bg-card border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[90px_minmax(220px,1fr)_90px_90px_90px_minmax(140px,1fr)_160px] gap-2 items-start px-3 py-2 bg-muted border-b border-border max-xl:grid-cols-2">
                    <div className="text-sm text-foreground font-extrabold text-right max-xl:text-left">Product</div>
                    <BlueprintSearchInput
                        query={editor.blueprintQuery}
                        results={blueprintResults}
                        searching={blueprintSearching}
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
                    <label className="flex items-center gap-1">
                        <span className="text-foreground text-[12px] font-bold">TE</span>
                        <input
                            type="number"
                            value={editor.te}
                            onChange={updateEditor('te')}
                            className="w-full bg-background border border-border text-foreground text-[12px] px-2 py-2 rounded-[3px] outline-none"
                        />
                    </label>
                    <SystemSearchInput
                        query={editor.system}
                        results={systemResults}
                        searching={systemSearching}
                        open={systemDropdownOpen}
                        onOpenChange={setSystemDropdownOpen}
                        onQueryChange={updateSystemQuery}
                        onSelect={selectSystem}
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
                <FacilitySettings
                    facilities={facilities}
                    facilityOptions={facilityOptions}
                    facilityLoading={facilityLoading}
                    hasSelectedSystem={Boolean(selectedSystem)}
                    onChange={updateFacility}
                />
            </form>

            {error && (
                <div className="bg-card border border-destructive/50 rounded px-4 py-3 text-destructive text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-4 max-xl:grid-cols-1">
                <MaterialsSummary bomTree={bomTree} decisionsByNodeKey={decisionsByNodeKey} />
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
                        nodeSettingsByNodeKey={nodeSettingsByNodeKey}
                        onDecisionChange={setNodeDecision}
                        onSettingsChange={setNodeSetting}
                    />
                </div>
            </div>

            <TemplatesList templates={templates} />
        </div>
    )
}
