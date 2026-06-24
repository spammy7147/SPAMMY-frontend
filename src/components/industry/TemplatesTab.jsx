import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { industryApi } from '@/services/industryApi'

const decisions = [
    { label: '자동', value: 'AUTO' },
    { label: '생산', value: 'PRODUCE' },
    { label: '구매', value: 'PURCHASE' },
]

function parseBonus(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function formatBonus(value) {
    return Number(value.toFixed(3)).toString()
}

function resolveTotalBonus(structureBonus, rigBonus) {
    return formatBonus(parseBonus(structureBonus) + parseBonus(rigBonus))
}

function findStructureRig(structureRigOptions, value) {
    return structureRigOptions.find((rig) => String(rig.typeId) === value)
}

function countNodes(template) {
    return (template.nodes || []).length
}

function createFacilitySetting(id) {
    return {
        id,
        index: '0.14',
        systemQuery: '',
        selectedSystem: null,
        systemDropdownOpen: false,
        facilityOptions: [],
        facilityLoading: false,
        structure: '',
        rig: '',
        structureRigQuery: '',
        structureRigDropdownOpen: false,
        bonus: '0',
        tax: '10',
    }
}

function nextFacilitySettingId() {
    return `facility-${Date.now()}-${Math.random().toString(36).slice(2)}`
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

function displayOutputQuantity(node) {
    return node.outputQuantity ? number(node.outputQuantity) : '-'
}

function displaySdeClassification(node) {
    const category = node.categoryName || 'Unknown Category'
    const group = node.groupName || 'Unknown Group'
    return `${category} > ${group}`
}

function displayRigFamily(family) {
    if (family === 'ENGINEERING') return 'Engineering'
    if (family === 'RESOURCE_PROCESSING') return 'Resource Processing'
    return 'Other'
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

function collectBuildableNodeKeysByTier(node, depth = 0, result = new Map()) {
    if (!node) return result
    if (hasBuildableChildren(node)) {
        const nodeKeys = result.get(depth) || []
        nodeKeys.push(node.nodeKey)
        result.set(depth, nodeKeys)
    }
    ;(node.children || []).forEach((child) => collectBuildableNodeKeysByTier(child, depth + 1, result))
    return result
}

function buildTierLayout(node, decisionsByNodeKey) {
    const nodes = []
    const edges = []
    const rowByDepth = new Map()
    let maxDepth = 0
    let maxRow = 0

    function walk(current, depth, parent = null) {
        const currentRow = rowByDepth.get(depth) || 0
        rowByDepth.set(depth, currentRow + 1)
        maxDepth = Math.max(maxDepth, depth)
        maxRow = Math.max(maxRow, currentRow + 1)
        nodes.push({ node: current, depth, row: currentRow })

        if (parent) {
            edges.push({
                from: parent.nodeKey,
                to: current.nodeKey,
                decision: effectiveDecision(current, decisionsByNodeKey),
                buildable: hasBuildableChildren(current),
            })
        }

        const children = shouldExpandChildren(current, decisionsByNodeKey) ? current.children || [] : []
        children.forEach((child) => walk(child, depth + 1, current))
    }

    if (node) walk(node, 0)
    return {
        nodes,
        edges,
        columnCount: maxDepth + 1,
        rowCount: Math.max(maxRow, 1),
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

function parseOptionalLong(value) {
    if (value === '' || value == null) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function buildFacilitySettingsPayload(facilitySettings, structureRigOptions) {
    return facilitySettings
        .filter((settings) => settings.selectedSystem?.systemId)
        .map((settings, index) => {
            const facility = settings.facilityOptions.find(
                (option) => String(option.facilityId) === settings.structure,
            )
            const rig = findStructureRig(structureRigOptions, settings.rig)

            return {
                sortOrder: index,
                systemId: settings.selectedSystem.systemId,
                systemName: settings.selectedSystem.systemName,
                facilityId: parseOptionalLong(settings.structure),
                facilityName: facility?.facilityName || null,
                facilityType: facility?.facilityType || null,
                structureRigTypeId: rig?.typeId || null,
                structureRigName: rig?.typeName || (settings.rig === 'custom' ? settings.structureRigQuery : null),
                structureRigFamily: rig?.rigFamily || null,
                industryIndex: settings.index || null,
                bonus: settings.bonus || null,
                tax: settings.tax || null,
            }
        })
}

function buildTemplatePayload(editor, bomTree, decisionsByNodeKey, nodeSettingsByNodeKey, facilitySettings, structureRigOptions) {
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
        facilitySettings: buildFacilitySettingsPayload(facilitySettings, structureRigOptions),
    }
}

function facilityTypeLabel(type) {
    if (type === 'USER_STRUCTURE') return 'Structure'
    if (type === 'NPC_STATION') return 'NPC'
    return type || 'Facility'
}

function FacilitySettings({
    settings,
    systemResults,
    systemSearching,
    structureRigOptions,
    structureRigLoading,
    structureRigError,
    canRemove,
    onSystemOpenChange,
    onSystemQueryChange,
    onSystemSelect,
    onStructureRigOpenChange,
    onStructureRigQueryChange,
    onChange,
    onRemove,
}) {
    const bonusReadOnly = settings.rig !== 'custom'
    const hasSelectedSystem = Boolean(settings.selectedSystem)

    return (
        <div className="bg-card border border-border rounded">
            <div className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(180px,1.15fr)_minmax(220px,1fr)_110px_90px_36px] gap-2 items-end px-3 py-2 text-[12px] max-xl:grid-cols-3 max-lg:grid-cols-1">
                <div className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">System</span>
                    <SystemSearchInput
                        query={settings.systemQuery}
                        results={systemResults}
                        searching={systemSearching}
                        open={settings.systemDropdownOpen}
                        onOpenChange={onSystemOpenChange}
                        onQueryChange={onSystemQueryChange}
                        onSelect={onSystemSelect}
                    />
                </div>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Index</span>
                    <input
                        value={settings.index}
                        onChange={(event) => onChange('index', event.target.value)}
                        className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-2 rounded-[3px] outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Structure</span>
                    <select
                        value={settings.structure}
                        onChange={(event) => {
                            const facility = settings.facilityOptions.find(
                                (option) => String(option.facilityId) === event.target.value,
                            )
                            const rig = findStructureRig(structureRigOptions, settings.rig)
                            onChange('structure', event.target.value)
                            if (settings.rig !== 'custom') {
                                onChange('bonus', resolveTotalBonus(facility?.structureBonus, rig?.bonus))
                            }
                        }}
                        className="w-full bg-muted border border-border text-foreground px-2 py-2 rounded-[3px] outline-none"
                        disabled={!hasSelectedSystem || settings.facilityLoading}
                    >
                        <option value="">
                            {!hasSelectedSystem
                                ? 'Select system first'
                                : settings.facilityLoading
                                    ? 'Loading facilities...'
                                    : 'Select facility'}
                        </option>
                        {settings.facilityOptions.map((facility) => (
                            <option key={`${facility.facilityType}-${facility.facilityId}`} value={String(facility.facilityId)}>
                                {facility.facilityName} [{facilityTypeLabel(facility.facilityType)}]
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Rig</span>
                    <StructureRigSearchInput
                        query={settings.structureRigQuery}
                        results={structureRigOptions}
                        searching={structureRigLoading}
                        error={structureRigError}
                        open={settings.structureRigDropdownOpen}
                        onOpenChange={onStructureRigOpenChange}
                        onQueryChange={(query) => {
                            const facility = settings.facilityOptions.find(
                                (option) => String(option.facilityId) === settings.structure,
                            )
                            onStructureRigQueryChange(query)
                            onChange('rig', '')
                            onChange('bonus', resolveTotalBonus(facility?.structureBonus, 0))
                        }}
                        onSelect={(rig) => {
                            const facility = settings.facilityOptions.find(
                                (option) => String(option.facilityId) === settings.structure,
                            )
                            onStructureRigQueryChange(rig.typeName)
                            onChange('rig', String(rig.typeId))
                            onChange('bonus', resolveTotalBonus(facility?.structureBonus, rig?.bonus))
                        }}
                        onNoRig={() => {
                            const facility = settings.facilityOptions.find(
                                (option) => String(option.facilityId) === settings.structure,
                            )
                            onStructureRigQueryChange('')
                            onChange('rig', '')
                            onChange('bonus', resolveTotalBonus(facility?.structureBonus, 0))
                        }}
                        onCustom={() => {
                            onStructureRigQueryChange('Custom / manual bonus')
                            onChange('rig', 'custom')
                        }}
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Bonus</span>
                    <input
                        value={settings.bonus}
                        onChange={(event) => onChange('bonus', event.target.value)}
                        readOnly={bonusReadOnly}
                        className={cn(
                            'w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-2 rounded-[3px] outline-none',
                            bonusReadOnly && 'cursor-default',
                        )}
                    />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Tax</span>
                    <input
                        value={settings.tax}
                        onChange={(event) => onChange('tax', event.target.value)}
                        className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-2 rounded-[3px] outline-none"
                    />
                </label>
                <div className="flex gap-1">
                    {canRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="h-[34px] w-9 inline-flex items-center justify-center bg-muted border border-border text-foreground-dim rounded-[3px] cursor-pointer hover:text-foreground"
                            aria-label="Remove facility setting"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function StructureRigSearchInput({
    query,
    results,
    searching,
    error,
    open,
    onOpenChange,
    onQueryChange,
    onSelect,
    onNoRig,
    onCustom,
}) {
    const normalizedQuery = query.trim().toLowerCase()
    const filteredResults = normalizedQuery
        ? results.filter((rig) => {
            const searchableText = [
                rig.typeName,
                rig.groupName,
                displayRigFamily(rig.rigFamily),
            ].join(' ').toLowerCase()
            return searchableText.includes(normalizedQuery)
        })
        : results
    const groupedResults = filteredResults.reduce((groups, rig) => {
        const family = rig.rigFamily || 'UNKNOWN'
        if (!groups.has(family)) groups.set(family, [])
        groups.get(family).push(rig)
        return groups
    }, new Map())
    const familyOrder = ['ENGINEERING', 'RESOURCE_PROCESSING', 'UNKNOWN']
    const orderedFamilies = familyOrder.filter((family) => groupedResults.has(family))
    const showResults = open && !error

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
                    placeholder={error ? 'Rig load failed' : 'No rig'}
                    disabled={searching}
                />
                <button
                    type="button"
                    onClick={() => onOpenChange(!open)}
                    className="w-8 border-none border-l border-border bg-transparent text-foreground-dim cursor-pointer hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Toggle rig dropdown"
                    disabled={searching}
                >
                    ▾
                </button>
            </div>
            {searching && (
                <div className="absolute right-10 top-2 text-[10px] text-foreground-dim font-bold">
                    LOAD
                </div>
            )}
            {error && (
                <span className="mt-1 block text-destructive text-[10px] font-semibold">{error}</span>
            )}
            {showResults && (
                <div className="absolute z-20 mt-1 w-full max-h-[320px] overflow-y-auto bg-card border border-border rounded shadow-xl">
                    <button
                        type="button"
                        onClick={() => {
                            onNoRig()
                            onOpenChange(false)
                        }}
                        className="w-full border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-b border-border"
                    >
                        <div className="text-[12px] text-foreground font-bold">No rig</div>
                    </button>
                    {orderedFamilies.map((family) => (
                        <div key={family}>
                            <div className="sticky top-0 bg-muted border-b border-border px-3 py-1 text-[10px] text-foreground-dim font-bold uppercase tracking-wide">
                                {displayRigFamily(family)}
                            </div>
                            {groupedResults.get(family).map((rig) => (
                                <button
                                    key={rig.typeId}
                                    type="button"
                                    onClick={() => {
                                        onSelect(rig)
                                        onOpenChange(false)
                                    }}
                                    className="w-full border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-b border-border last:border-b-0"
                                >
                                    <div className="text-[12px] text-foreground font-bold leading-snug">
                                        {rig.typeName}
                                    </div>
                                    <div className="text-[10px] text-foreground-dim leading-snug">
                                        {rig.groupName}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => {
                            onCustom()
                            onOpenChange(false)
                        }}
                        className="w-full border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-t border-border"
                    >
                        <div className="text-[12px] text-foreground font-bold">Custom / manual bonus</div>
                    </button>
                </div>
            )}
            {open && !searching && !error && filteredResults.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded px-3 py-3 text-[11px] text-foreground-dim shadow-xl">
                    NO RIGS
                </div>
            )}
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

function TierBulkControls({ bomTree, onTierDecisionChange }) {
    const tiers = useMemo(
        () => Array.from(collectBuildableNodeKeysByTier(bomTree).entries()).sort(([left], [right]) => left - right),
        [bomTree],
    )

    if (!bomTree || tiers.length === 0) return null

    return (
        <div className="bg-card border border-border rounded overflow-hidden">
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 items-center px-3 py-2 bg-muted border-b border-border max-xl:grid-cols-1">
                <div className="text-[10px] text-foreground-dim uppercase tracking-wider font-bold">
                    Tier Bulk
                </div>
                <div className="flex flex-wrap gap-2">
                    {tiers.map(([tier, nodeKeys]) => (
                        <div
                            key={tier}
                            className="flex flex-col rounded-[3px] border border-border bg-background/50 overflow-hidden"
                        >
                            <div className="px-2 py-1 text-center text-[10px] text-foreground-muted font-bold leading-none border-b border-border bg-muted/40">
                                T{tier}
                            </div>
                            <div className="px-2 py-1">
                                <DecisionButtons
                                    value=""
                                    onChange={(decision) => onTierDecisionChange(nodeKeys, decision)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
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
                placeholder="Enter the item you want to produce"
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
    if (decision === 'MATERIAL') return 'stroke-slate-400/40'
    if (decision === 'PRODUCE') return 'stroke-emerald-400/55'
    if (decision === 'PURCHASE') return 'stroke-amber-300/55'
    return 'stroke-sky-400/55'
}

function nodeBorderClass(decision, buildable) {
    if (!buildable) return 'border-border shadow-[inset_3px_0_0_rgba(148,163,184,0.32)]'
    if (decision === 'PRODUCE') return 'border-emerald-400/45 shadow-[inset_3px_0_0_rgba(52,211,153,0.4)]'
    if (decision === 'PURCHASE') return 'border-amber-400/45 shadow-[inset_3px_0_0_rgba(251,191,36,0.35)]'
    return 'border-sky-400/45 shadow-[inset_3px_0_0_rgba(56,189,248,0.35)]'
}

function BomCard({ node, decision, settings, onDecisionChange, onSettingsChange }) {
    const buildable = hasBuildableChildren(node)
    const settingsDisabled = !buildable || decision === 'PURCHASE'

    return (
        <div className={cn(
            'relative z-10 bg-card border rounded-[4px] overflow-hidden w-[380px] shadow-sm',
            nodeBorderClass(decision, buildable),
        )}>
            <div className="grid grid-cols-[minmax(0,1fr)_58px_48px_58px] gap-1.5 items-center bg-muted px-2 py-0.5 border-b border-border">
                <div className="min-w-0">
                    <div className="text-[11px] text-foreground font-bold leading-snug truncate" title={node.typeName}>
                        {node.typeName}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Need</div>
                    <div className="text-[10px] text-foreground font-bold font-mono truncate">{number(node.quantity)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Runs</div>
                    <div className="text-[10px] text-foreground-muted font-bold font-mono">{displayRuns(node, decision)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Out/run</div>
                    <div className="text-[10px] text-foreground-muted font-bold font-mono">{displayOutputQuantity(node)}</div>
                </div>
            </div>
            <div className="grid grid-cols-[20px_58px_20px_58px_minmax(0,1fr)] gap-1.5 items-center px-2 py-1">
                {buildable ? (
                    <>
                        <span className="text-[9px] text-foreground-dim font-bold">ME</span>
                        <label className="min-w-0">
                            <input
                                type="number"
                                value={settings.materialEfficiency}
                                onChange={(event) => onSettingsChange('materialEfficiency', event.target.value)}
                                disabled={settingsDisabled}
                                className="w-full bg-background border border-border text-foreground text-[10px] px-1.5 py-0.5 rounded-[3px] outline-none disabled:opacity-40"
                            />
                        </label>
                        <span className="text-[9px] text-foreground-dim font-bold">TE</span>
                        <label className="min-w-0">
                            <input
                                type="number"
                                value={settings.timeEfficiency}
                                onChange={(event) => onSettingsChange('timeEfficiency', event.target.value)}
                                disabled={settingsDisabled}
                                className="w-full bg-background border border-border text-foreground text-[10px] px-1.5 py-0.5 rounded-[3px] outline-none disabled:opacity-40"
                            />
                        </label>
                        <DecisionButtons value={decision} onChange={onDecisionChange} />
                    </>
                ) : (
                    <div className="col-span-5 min-w-0">
                        <div
                            className="text-[10px] text-foreground-muted font-semibold truncate"
                            title={displaySdeClassification(node)}
                        >
                            {displaySdeClassification(node)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function BomTree({ bomTree, decisionsByNodeKey, nodeSettingsByNodeKey, onDecisionChange, onSettingsChange }) {
    const contentRef = useRef(null)
    const layout = useMemo(() => buildTierLayout(bomTree, decisionsByNodeKey), [bomTree, decisionsByNodeKey])
    const [connectors, setConnectors] = useState({ width: 0, height: 0, paths: [] })
    const columnWidth = 380
    const rowHeight = 72

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
                    decision: edge.buildable ? edge.decision : 'MATERIAL',
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
                className="relative grid gap-x-3 gap-y-0 p-2 min-w-max"
                style={{
                    gridTemplateColumns: `repeat(${layout.columnCount}, ${columnWidth}px)`,
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

function MaterialsSummary({ bomTree, decisionsByNodeKey, maxHeightClass = 'max-h-[520px]' }) {
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
            <div className={cn(maxHeightClass, 'overflow-y-auto')}>
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
        defaultDecision: 'AUTO',
    })
    const [facilitySettings, setFacilitySettings] = useState(() => [createFacilitySetting('facility-1')])
    const [bomTree, setBomTree] = useState(null)
    const [decisionsByNodeKey, setDecisionsByNodeKey] = useState({})
    const [blueprintResults, setBlueprintResults] = useState([])
    const [selectedBlueprint, setSelectedBlueprint] = useState(null)
    const [blueprintSearching, setBlueprintSearching] = useState(false)
    const [systemCache, setSystemCache] = useState(null)
    const [systemSearching, setSystemSearching] = useState(false)
    const [shouldLoadSystems, setShouldLoadSystems] = useState(false)
    const [structureRigOptions, setStructureRigOptions] = useState([])
    const [structureRigLoading, setStructureRigLoading] = useState(false)
    const [structureRigError, setStructureRigError] = useState(null)
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
        if (!shouldLoadSystems || systemCache) {
            return undefined
        }

        let mounted = true
        setSystemSearching(true)
        industryApi.systems('', 10000)
            .then((results) => {
                if (mounted) setSystemCache(results || [])
            })
            .catch(() => {
                if (mounted) setSystemCache([])
            })
            .finally(() => {
                if (mounted) setSystemSearching(false)
            })

        return () => {
            mounted = false
        }
    }, [shouldLoadSystems, systemCache])

    useEffect(() => {
        let mounted = true
        setStructureRigLoading(true)
        setStructureRigError(null)
        industryApi.structureRigs()
            .then((rigs) => {
                if (mounted) setStructureRigOptions(rigs || [])
            })
            .catch((err) => {
                if (!mounted) return
                setStructureRigOptions([])
                setStructureRigError(err.message || 'Failed to load rigs')
            })
            .finally(() => {
                if (mounted) setStructureRigLoading(false)
            })

        return () => {
            mounted = false
        }
    }, [])

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

    const updateFacilitySetting = (settingId, field, value) => {
        setFacilitySettings((current) => current.map((settings) => (
            settings.id === settingId ? { ...settings, [field]: value } : settings
        )))
    }

    const patchFacilitySetting = (settingId, patch) => {
        setFacilitySettings((current) => current.map((settings) => (
            settings.id === settingId ? { ...settings, ...patch } : settings
        )))
    }

    const addFacilitySetting = () => {
        setFacilitySettings((current) => [...current, createFacilitySetting(nextFacilitySettingId())])
    }

    const removeFacilitySetting = (settingId) => {
        setFacilitySettings((current) => {
            if (current.length <= 1) return current
            return current.filter((settings) => settings.id !== settingId)
        })
    }

    const updateFacilitySystemQuery = (settingId, query) => {
        patchFacilitySetting(settingId, {
            systemQuery: query,
            selectedSystem: null,
            structure: '',
            facilityOptions: [],
            facilityLoading: false,
        })
    }

    const selectFacilitySystem = (settingId, system) => {
        patchFacilitySetting(settingId, {
            systemQuery: system.systemName,
            selectedSystem: system,
            systemDropdownOpen: false,
            structure: '',
            facilityOptions: [],
            facilityLoading: true,
        })

        industryApi.facilities(system.systemId)
            .then((facilities) => {
                setFacilitySettings((current) => current.map((settings) => (
                    settings.id === settingId && settings.selectedSystem?.systemId === system.systemId
                        ? { ...settings, facilityOptions: facilities || [], facilityLoading: false }
                        : settings
                )))
            })
            .catch(() => {
                setFacilitySettings((current) => current.map((settings) => (
                    settings.id === settingId && settings.selectedSystem?.systemId === system.systemId
                        ? { ...settings, facilityOptions: [], facilityLoading: false }
                        : settings
                )))
            })
    }

    const setFacilitySystemOpen = (settingId, open) => {
        if (open) setShouldLoadSystems(true)
        patchFacilitySetting(settingId, { systemDropdownOpen: open })
    }

    const setFacilityRigOpen = (settingId, open) => {
        patchFacilitySetting(settingId, { structureRigDropdownOpen: open })
    }

    const updateFacilityRigQuery = (settingId, query) => {
        updateFacilitySetting(settingId, 'structureRigQuery', query)
    }

    const filteredSystems = (query) => {
        const systems = systemCache || []
        const normalizedQuery = query.trim().toLowerCase()
        return normalizedQuery
            ? systems.filter((system) => system.systemName.toLowerCase().includes(normalizedQuery))
            : systems
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
            const payload = buildTemplatePayload(
                editor,
                bomTree,
                decisionsByNodeKey,
                nodeSettingsByNodeKey,
                facilitySettings,
                structureRigOptions,
            )
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

    const setTierDecision = (nodeKeys, decision) => {
        setDecisionsByNodeKey((current) => ({
            ...current,
            ...Object.fromEntries(nodeKeys.map((nodeKey) => [nodeKey, decision])),
        }))
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
            <form onSubmit={calculate} className="bg-card border border-border rounded">
                <div className="grid grid-cols-[90px_minmax(220px,1fr)_90px_90px_90px_160px] gap-2 items-center px-3 py-2 bg-muted border-b border-border max-xl:grid-cols-2">
                    <div className="flex items-center justify-center text-center text-sm text-foreground font-extrabold">Product</div>
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
                    <button
                        type="submit"
                        disabled={!canCalculate || calculating}
                        className="bg-primary border border-primary text-background px-4 py-2 rounded text-sm font-extrabold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {calculating ? 'Calculating...' : 'Calculate'}
                    </button>
                </div>
                <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 items-center px-3 py-2 border-b border-border max-xl:grid-cols-1">
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
                </div>
                <div className="border-b border-border">
                    <div className="flex items-center justify-between gap-3 px-3 py-2 bg-card border-b border-border">
                        <div className="text-[11px] text-foreground-dim font-extrabold uppercase tracking-wide">
                            Facility Settings
                        </div>
                        <button
                            type="button"
                            onClick={addFacilitySetting}
                            className="h-8 inline-flex items-center gap-1.5 bg-secondary/20 border border-secondary text-secondary rounded-[3px] px-3 text-[11px] font-extrabold cursor-pointer hover:bg-secondary/30"
                            aria-label="Add facility setting"
                        >
                            <Plus className="h-4 w-4" />
                            Add
                        </button>
                    </div>
                    <div className="flex flex-col gap-1">
                        {facilitySettings.map((settings) => (
                            <FacilitySettings
                                key={settings.id}
                                settings={settings}
                                systemResults={filteredSystems(settings.systemQuery)}
                                systemSearching={systemSearching}
                                structureRigOptions={structureRigOptions}
                                structureRigLoading={structureRigLoading}
                                structureRigError={structureRigError}
                                canRemove={facilitySettings.length > 1}
                                onSystemOpenChange={(open) => setFacilitySystemOpen(settings.id, open)}
                                onSystemQueryChange={(query) => updateFacilitySystemQuery(settings.id, query)}
                                onSystemSelect={(system) => selectFacilitySystem(settings.id, system)}
                                onStructureRigOpenChange={(open) => setFacilityRigOpen(settings.id, open)}
                                onStructureRigQueryChange={(query) => updateFacilityRigQuery(settings.id, query)}
                                onChange={(field, value) => updateFacilitySetting(settings.id, field, value)}
                                onRemove={() => removeFacilitySetting(settings.id)}
                            />
                        ))}
                    </div>
                </div>
            </form>

            {error && (
                <div className="bg-card border border-destructive/50 rounded px-4 py-3 text-destructive text-sm">
                    {error}
                </div>
            )}

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
                <TierBulkControls bomTree={bomTree} onTierDecisionChange={setTierDecision} />
                <BomTree
                    bomTree={bomTree}
                    decisionsByNodeKey={decisionsByNodeKey}
                    nodeSettingsByNodeKey={nodeSettingsByNodeKey}
                    onDecisionChange={setNodeDecision}
                    onSettingsChange={setNodeSetting}
                />
            </div>

            <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4 items-start max-xl:grid-cols-1">
                <MaterialsSummary
                    bomTree={bomTree}
                    decisionsByNodeKey={decisionsByNodeKey}
                    maxHeightClass="max-h-[520px]"
                />
                <TemplatesList templates={templates} />
            </div>
        </div>
    )
}
