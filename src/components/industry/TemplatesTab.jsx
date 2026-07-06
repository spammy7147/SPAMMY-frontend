import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { industryApi } from '@/services/industryApi'

const decisions = [
    { label: '자동', value: 'AUTO' },
    { label: '생산', value: 'PRODUCE' },
    { label: '구매', value: 'PURCHASE' },
]

const bomTreeColumnWidth = 480
const bomTreeColumnGap = 12
const bomTreeContentPadding = 8

function parseBonus(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function formatBonus(value) {
    return Number(value.toFixed(3)).toString()
}

function formatPercent(value) {
    return `${formatBonus(parseBonus(value))}%`
}

function formatIndex(value) {
    if (value === '' || value == null) return ''
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') : ''
}

function reductionMultiplier(bonus) {
    const reduction = Math.max(0, parseBonus(bonus)) / 100
    return Math.max(0, 1 - reduction)
}

function combineReductionBonuses(bonuses) {
    const multiplier = bonuses.reduce((current, bonus) => {
        const reduction = Math.max(0, parseBonus(bonus)) / 100
        return current * (1 - reduction)
    }, 1)
    return formatBonus((1 - multiplier) * 100)
}

function combinedMultiplier(bonuses) {
    return bonuses.reduce((current, bonus) => current * reductionMultiplier(bonus), 1)
}

function securityEffectValue(effect, securityBand) {
    if (!effect) return 0
    if (securityBand === 'LOWSEC') return parseBonus(effect.lowsecBonus)
    if (securityBand === 'NULLSEC') return parseBonus(effect.nullsecBonus)
    if (securityBand === 'WORMHOLE') return parseBonus(effect.wormholeBonus)
    return parseBonus(effect.highsecBonus)
}

function resolveRigEffectBonus(rig, facility, manufacturingTarget = null, effectType = 'MATERIAL_EFFICIENCY') {
    if (!rig) return 0
    const effects = (rig.effects || []).filter((effect) => (
        effect.effectType === effectType
        && (!manufacturingTarget || effect.target === manufacturingTarget || effect.target === 'UNKNOWN')
    ))
    if (manufacturingTarget && (rig.effects || []).length > 0 && effects.length === 0) return 0
    if (effects.length === 0) return effectType === 'MATERIAL_EFFICIENCY' ? parseBonus(rig.bonus) : 0
    return Math.max(...effects.map((effect) => securityEffectValue(effect, facility?.securityBand)))
}

function resolveRigMaterialBonus(rig, facility, manufacturingTarget = null) {
    return resolveRigEffectBonus(rig, facility, manufacturingTarget, 'MATERIAL_EFFICIENCY')
}

function resolveRigTimeBonus(rig, facility, manufacturingTarget = null) {
    return resolveRigEffectBonus(rig, facility, manufacturingTarget, 'TIME_EFFICIENCY')
}

function resolveTotalFacilityBonus(facility, rigs, manufacturingTarget = null) {
    const rigBonuses = rigs.map((rig) => resolveRigMaterialBonus(rig, facility, manufacturingTarget))
    return combineReductionBonuses([facility?.structureBonus, ...rigBonuses])
}

function findStructureRig(structureRigOptions, value, query = '') {
    const rigById = structureRigOptions.find((rig) => String(rig.typeId) === value)
    if (rigById) return rigById
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return undefined
    return structureRigOptions.find((rig) => rig.typeName?.toLowerCase() === normalizedQuery)
}

function rigFitsFacility(rig, facility) {
    if (!rig || !facility?.structureSize) return true
    return rig.size === facility.structureSize
}

function filterRigsForFacility(structureRigOptions, facility) {
    if (!facility?.structureSize) return structureRigOptions
    return structureRigOptions.filter((rig) => rigFitsFacility(rig, facility))
}

function countNodes(template) {
    return (template.nodes || []).length
}

function createFacilitySetting(id) {
    return {
        id,
        index: '',
        systemQuery: '',
        selectedSystem: null,
        systemDropdownOpen: false,
        facilityOptions: [],
        facilityLoading: false,
        structure: '',
        rig: '',
        rig2: '',
        rig3: '',
        structureRigQuery: '',
        structureRigQuery2: '',
        structureRigQuery3: '',
        structureRigDropdownOpen: false,
        structureRigDropdownOpen2: false,
        structureRigDropdownOpen3: false,
        bonus: '0',
        tax: '10',
    }
}

function blueprintItemLabel(blueprint) {
    const kind = blueprint.runs === -1 ? 'BPO' : `BPC ${blueprint.runs ?? '-'} runs`
    const owner = blueprint.characterName ? ` / ${blueprint.characterName}` : ''
    return `${kind} ME ${blueprint.materialEfficiency ?? 0} / TE ${blueprint.timeEfficiency ?? 0}${owner}`
}

function nextFacilitySettingId() {
    return `facility-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function preferredOwnedBlueprint(ownedBlueprints) {
    return ownedBlueprints?.[0] || null
}

function blueprintSettings(blueprint, fallbackMaterialEfficiency, fallbackTimeEfficiency) {
    if (!blueprint) {
        return {
            blueprintItemId: '',
            materialEfficiency: fallbackMaterialEfficiency,
            timeEfficiency: fallbackTimeEfficiency,
            facilityPresetId: '',
        }
    }
    return {
        blueprintItemId: String(blueprint.itemId),
        materialEfficiency: String(blueprint.materialEfficiency ?? fallbackMaterialEfficiency),
        timeEfficiency: String(blueprint.timeEfficiency ?? fallbackTimeEfficiency),
        facilityPresetId: '',
    }
}

function groupOwnedBlueprintsByTypeId(blueprints) {
    return (blueprints || []).reduce((result, blueprint) => {
        const key = String(blueprint.blueprintTypeId)
        result[key] = [...(result[key] || []), blueprint]
        return result
    }, {})
}

function collectBuildableBlueprintTypeIds(node, result = new Set()) {
    if (!node) return result
    if (hasBuildableChildren(node) && node.blueprintTypeId) {
        result.add(node.blueprintTypeId)
    }
    ;(node.children || []).forEach((child) => collectBuildableBlueprintTypeIds(child, result))
    return result
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
            facilityPresetId: parseOptionalLong(nodeSettings.facilityPresetId),
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

function collectNodeSettings(node, materialEfficiency, timeEfficiency, ownedBlueprintOptionsByTypeId = {}, result = {}) {
    if (!node) return result
    const ownedBlueprints = ownedBlueprintOptionsByTypeId[String(node.blueprintTypeId)] || []
    result[node.nodeKey] = hasBuildableChildren(node)
        ? blueprintSettings(preferredOwnedBlueprint(ownedBlueprints), materialEfficiency, timeEfficiency)
        : { blueprintItemId: '', materialEfficiency: '', timeEfficiency: '', facilityPresetId: '' }
    ;(node.children || []).forEach((child) => (
        collectNodeSettings(child, materialEfficiency, timeEfficiency, ownedBlueprintOptionsByTypeId, result)
    ))
    return result
}

function buildTierLayout(node, decisionsByNodeKey, estimateNodeHeight = () => 58) {
    const verticalGap = 10
    let maxDepth = 0

    function walk(current, depth) {
        const children = shouldExpandChildren(current, decisionsByNodeKey) ? current.children || [] : []
        const childLayouts = children.map((child) => ({ child, layout: walk(child, depth + 1) }))
        const ownHeight = estimateNodeHeight(current)
        const childrenHeight = childLayouts.length > 0
            ? childLayouts.reduce((total, { layout }) => total + layout.height, 0)
                + ((childLayouts.length - 1) * verticalGap)
            : 0
        const height = Math.max(ownHeight, childrenHeight)
        const centerY = height / 2
        const nodes = [{ node: current, depth, y: centerY, height: ownHeight }]
        const edges = []
        let childTop = (height - childrenHeight) / 2

        childLayouts.forEach(({ child, layout }) => {
            nodes.push(...layout.nodes.map((layoutNode) => ({
                ...layoutNode,
                y: layoutNode.y + childTop,
            })))
            edges.push(...layout.edges)
            edges.push({
                from: current.nodeKey,
                to: child.nodeKey,
                decision: effectiveDecision(child, decisionsByNodeKey),
                buildable: hasBuildableChildren(child),
            })
            childTop += layout.height + verticalGap
        })
        maxDepth = Math.max(maxDepth, depth)

        return {
            nodes,
            edges,
            height,
        }
    }

    const layout = node ? walk(node, 0) : { nodes: [], edges: [], height: 0 }
    return {
        nodes: layout.nodes,
        edges: layout.edges,
        columnCount: maxDepth + 1,
        height: layout.height,
    }
}

function collectBuildableNodeKeysByTier(layout) {
    return layout.nodes.reduce((result, { node, depth }) => {
        if (hasBuildableChildren(node)) {
            const nodeKeys = result.get(depth) || []
            nodeKeys.push(node.nodeKey)
            result.set(depth, nodeKeys)
        }
        return result
    }, new Map())
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

function availableFacilitySettings(facilitySettings) {
    return facilitySettings.filter((settings) => settings.selectedSystem?.systemId && settings.structure)
}

function selectedFacilityRigs(settings, structureRigOptions) {
    return [
        [settings.rig, settings.structureRigQuery],
        [settings.rig2, settings.structureRigQuery2],
        [settings.rig3, settings.structureRigQuery3],
    ]
        .map(([value, query]) => findStructureRig(structureRigOptions, value, query))
        .filter(Boolean)
}

function selectedFacility(settings) {
    return settings.facilityOptions.find((option) => String(option.facilityId) === settings.structure)
}

function selectedFacilitySettingByFacilityId(facilitySettings, facilityId) {
    if (!facilityId) return null
    return availableFacilitySettings(facilitySettings).find((settings) => String(settings.structure) === String(facilityId)) || null
}

function resolveNodeFacilitySetting(node, nodeSettings, facilitySettings, structureRigOptions) {
    return selectedFacilitySettingByFacilityId(facilitySettings, nodeSettings.facilityPresetId)
        || recommendedFacilitySetting(facilitySettings, structureRigOptions, node.manufacturingTarget)
        || null
}

function skillBonusPerLevel(level, bonusPerLevel) {
    const parsed = Number(level)
    if (!Number.isFinite(parsed)) return 0
    return Math.min(5, Math.max(0, parsed)) * bonusPerLevel
}

function calculationLine(parts) {
    return parts
        .filter((part) => parseBonus(part.value) > 0)
        .map((part) => `${part.label} ${formatPercent(part.value)}`)
        .join(' x ')
}

function formatDuration(seconds) {
    const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}

function resolveJobCalculation(node, nodeSettings, facilitySettings, structureRigOptions, skills, runs) {
    if (!hasBuildableChildren(node) || node.activityType !== 'MANUFACTURING') {
        return null
    }

    const facilitySetting = resolveNodeFacilitySetting(node, nodeSettings, facilitySettings, structureRigOptions)
    const facility = facilitySetting ? selectedFacility(facilitySetting) : null
    const rigs = facilitySetting ? selectedFacilityRigs(facilitySetting, structureRigOptions) : []
    const rigMaterialBonuses = rigs.map((rig, index) => ({
        label: `Rig ${index + 1} ME`,
        value: resolveRigMaterialBonus(rig, facility, node.manufacturingTarget),
    }))
    const rigTimeBonuses = rigs.map((rig, index) => ({
        label: `Rig ${index + 1} TE`,
        value: resolveRigTimeBonus(rig, facility, node.manufacturingTarget),
    }))
    const materialParts = [
        { label: 'BP ME', value: nodeSettings.materialEfficiency },
        { label: 'Structure ME', value: facility?.structureBonus },
        ...rigMaterialBonuses,
    ]
    const timeParts = [
        { label: 'BP TE', value: nodeSettings.timeEfficiency },
        { label: 'Industry', value: skillBonusPerLevel(skills.industrySkill, 4) },
        { label: 'Advanced Industry', value: skillBonusPerLevel(skills.advancedIndustrySkill, 3) },
        { label: 'Structure TE', value: facility?.structureTimeBonus },
        ...rigTimeBonuses,
    ]
    const materialFactor = combinedMultiplier(materialParts.map((part) => part.value))
    const timeFactor = combinedMultiplier(timeParts.map((part) => part.value))
    const baseTimeSeconds = Number(node.baseTimeSeconds || 0)
    const jobTimeSeconds = baseTimeSeconds > 0 ? Math.ceil(baseTimeSeconds * runs * timeFactor) : null

    return {
        facilitySettingId: facilitySetting?.id || null,
        materialFactor,
        timeFactor,
        jobTimeSeconds,
        materialFormula: calculationLine(materialParts) || 'No ME modifiers',
        timeFormula: calculationLine(timeParts) || 'No TE modifiers',
    }
}

function calculateRequiredMaterial(baseQuantity, runs, materialFactor, activityType) {
    const base = Number(baseQuantity || 0)
    if (base <= 0 || runs <= 0) return 0
    if (activityType !== 'MANUFACTURING') return base * runs
    const adjusted = Math.ceil((base * runs * materialFactor) - Number.EPSILON)
    return Math.max(runs, adjusted)
}

function recalculateBomTree(node, decisionsByNodeKey, nodeSettingsByNodeKey, facilitySettings, structureRigOptions, skills) {
    if (!node) return null

    function walk(current, requiredQuantity) {
        const buildable = hasBuildableChildren(current)
        const outputQuantity = Number(current.outputQuantity || 1)
        const runs = buildable ? Math.max(1, Math.ceil(requiredQuantity / outputQuantity)) : (current.runsPerJob || 1)
        const nodeSettings = nodeSettingsByNodeKey[current.nodeKey] || {}
        const calculation = resolveJobCalculation(
            current,
            nodeSettings,
            facilitySettings,
            structureRigOptions,
            skills,
            runs,
        )
        const children = shouldExpandChildren(current, decisionsByNodeKey) ? (current.children || []).map((child) => {
            const fallbackBaseQuantity = runs > 0 ? Number(child.quantity || 0) / runs : Number(child.quantity || 0)
            const baseQuantity = child.baseQuantity ?? fallbackBaseQuantity
            const childQuantity = buildable
                ? calculateRequiredMaterial(baseQuantity, runs, calculation?.materialFactor ?? 1, current.activityType)
                : Number(child.quantity || 0)
            return walk(child, childQuantity)
        }) : (current.children || [])

        return {
            ...current,
            quantity: requiredQuantity,
            runsPerJob: runs,
            calculation,
            children,
        }
    }

    return walk(node, Number(node.quantity || 0))
}

function recommendedFacilitySetting(facilitySettings, structureRigOptions, manufacturingTarget = null) {
    return [...availableFacilitySettings(facilitySettings)]
        .sort((left, right) => (
            parseBonus(resolveTotalFacilityBonus(
                selectedFacility(right),
                selectedFacilityRigs(right, structureRigOptions),
                manufacturingTarget,
            ))
            - parseBonus(resolveTotalFacilityBonus(
                selectedFacility(left),
                selectedFacilityRigs(left, structureRigOptions),
                manufacturingTarget,
            ))
        ))[0]
}

function buildFacilitySettingsPayload(facilitySettings, structureRigOptions) {
    return facilitySettings
        .filter((settings) => settings.selectedSystem?.systemId)
        .map((settings, index) => {
            const facility = settings.facilityOptions.find(
                (option) => String(option.facilityId) === settings.structure,
            )
            const rig = findStructureRig(structureRigOptions, settings.rig, settings.structureRigQuery)
            const rig2 = findStructureRig(structureRigOptions, settings.rig2, settings.structureRigQuery2)
            const rig3 = findStructureRig(structureRigOptions, settings.rig3, settings.structureRigQuery3)
            const selectedRigs = [rig, rig2, rig3].filter(Boolean)
            const calculatedBonus = resolveTotalFacilityBonus(facility, selectedRigs)

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
                structureRigTypeId2: rig2?.typeId || null,
                structureRigName2: rig2?.typeName || (settings.rig2 === 'custom' ? settings.structureRigQuery2 : null),
                structureRigFamily2: rig2?.rigFamily || null,
                structureRigTypeId3: rig3?.typeId || null,
                structureRigName3: rig3?.typeName || (settings.rig3 === 'custom' ? settings.structureRigQuery3 : null),
                structureRigFamily3: rig3?.rigFamily || null,
                industryIndex: settings.index || null,
                bonus: calculatedBonus || null,
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
    onChange,
    onPatch,
    onRemove,
}) {
    const hasSelectedSystem = Boolean(settings.selectedSystem)
    const selectedFacility = settings.facilityOptions.find(
        (option) => String(option.facilityId) === settings.structure,
    )
    const rigSlots = [
        { label: 'Rig 1', valueField: 'rig', queryField: 'structureRigQuery', openField: 'structureRigDropdownOpen' },
        { label: 'Rig 2', valueField: 'rig2', queryField: 'structureRigQuery2', openField: 'structureRigDropdownOpen2' },
        { label: 'Rig 3', valueField: 'rig3', queryField: 'structureRigQuery3', openField: 'structureRigDropdownOpen3' },
    ]
    const selectedRigs = rigSlots.map((slot) => (
        findStructureRig(structureRigOptions, settings[slot.valueField], settings[slot.queryField])
    ))
    const availableRigOptions = filterRigsForFacility(structureRigOptions, selectedFacility)
    const calculatedBonus = resolveTotalFacilityBonus(selectedFacility, selectedRigs.filter(Boolean))
    const clearRigSlot = (slot) => {
        onPatch({ [slot.queryField]: '', [slot.valueField]: '' })
    }

    return (
        <div className="bg-card border border-border rounded">
            <div className="grid grid-cols-[minmax(160px,1fr)_90px_minmax(180px,1.15fr)_minmax(260px,1.4fr)_110px_90px_36px] gap-2 items-end px-3 py-2 text-[12px] max-xl:grid-cols-3 max-lg:grid-cols-1">
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
                        type="number"
                        min="0"
                        step="0.000001"
                        value={settings.index}
                        onChange={(event) => onChange('index', event.target.value)}
                        placeholder="Manual"
                        className="w-full bg-muted border border-border text-foreground px-2 py-2 rounded-[3px] outline-none"
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
                            const patch = { structure: event.target.value }
                            selectedRigs.forEach((rig, index) => {
                                if (!facility || (rig && !rigFitsFacility(rig, facility))) {
                                    const slot = rigSlots[index]
                                    patch[slot.queryField] = ''
                                    patch[slot.valueField] = ''
                                }
                            })
                            onPatch(patch)
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
                <div className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Rigs</span>
                    <div className="grid grid-cols-3 gap-1 max-lg:grid-cols-1">
                        {rigSlots.map((slot) => (
                            <StructureRigSearchInput
                                key={slot.valueField}
                                query={settings[slot.queryField]}
                                results={availableRigOptions}
                                structureSize={selectedFacility?.structureSize}
                                searching={structureRigLoading}
                                error={structureRigError}
                                open={settings[slot.openField]}
                                onOpenChange={(open) => onChange(slot.openField, open)}
                                onQueryChange={(query) => {
                                    onPatch({ [slot.queryField]: query, [slot.valueField]: '' })
                                }}
                                onSelect={(rig) => {
                                    onPatch({ [slot.queryField]: rig.typeName, [slot.valueField]: String(rig.typeId) })
                                }}
                                onNoRig={() => {
                                    clearRigSlot(slot)
                                }}
                                placeholder={slot.label}
                            />
                        ))}
                    </div>
                </div>
                <label className="flex flex-col gap-1">
                    <span className="text-foreground-dim text-[10px] font-bold">Bonus</span>
                    <input
                        value={calculatedBonus}
                        readOnly
                        className="w-full bg-emerald-400/20 border border-emerald-400/40 text-foreground px-2 py-2 rounded-[3px] outline-none cursor-default"
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
    placeholder = 'No rig',
    structureSize,
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
                    placeholder={error ? 'Rig load failed' : placeholder}
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
                <div className="absolute z-20 mt-1 min-w-full w-max max-w-[calc(100vw-48px)] max-h-[320px] overflow-auto bg-card border border-border rounded shadow-xl">
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
                    {filteredResults.map((rig) => (
                        <button
                            key={rig.typeId}
                            type="button"
                            onClick={() => {
                                onSelect(rig)
                                onOpenChange(false)
                            }}
                            className="flex w-full items-center gap-2 border-none bg-card hover:bg-border/10 text-left px-3 py-2 cursor-pointer border-b border-border last:border-b-0"
                        >
                            <span className="shrink-0 whitespace-nowrap text-[12px] text-foreground font-bold leading-snug">
                                {rig.typeName}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {open && !searching && !error && filteredResults.length === 0 && (
                <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded px-3 py-3 text-[11px] text-foreground-dim shadow-xl">
                    {structureSize ? `NO ${structureSize} RIGS` : 'NO RIGS'}
                </div>
            )}
        </div>
    )
}

function DecisionButtons({ value, onChange }) {
    return (
        <div className="grid grid-cols-3 gap-0.5">
            {decisions.map((decision) => (
                <button
                    key={decision.value}
                    type="button"
                    onClick={() => onChange(decision.value)}
                    className={cn(
                        'border text-[9px] px-1 py-1 rounded-[2px] cursor-pointer font-bold leading-none transition-colors',
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

function TierBulkControls({ bomTree, decisionsByNodeKey, onTierDecisionChange }) {
    const layout = useMemo(
        () => buildTierLayout(bomTree, decisionsByNodeKey),
        [bomTree, decisionsByNodeKey],
    )
    const tiers = useMemo(
        () => Array.from(collectBuildableNodeKeysByTier(layout).entries()).sort(([left], [right]) => left - right),
        [layout],
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
                                    {system.manufacturingIndex != null
                                        ? ` / MFG ${formatIndex(system.manufacturingIndex)}`
                                        : ''}
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

function estimateBomCardHeight(node, ownedBlueprintOptionsByTypeId) {
    if (!hasBuildableChildren(node)) return 60

    let height = 98
    const ownedBlueprintOptions = ownedBlueprintOptionsByTypeId[String(node.blueprintTypeId)] || []
    if (ownedBlueprintOptions.length > 0) height += 32
    return height
}

function heightMapChanged(previous, next) {
    const previousKeys = Object.keys(previous)
    const nextKeys = Object.keys(next)
    if (previousKeys.length !== nextKeys.length) return true
    return nextKeys.some((key) => Math.abs((previous[key] || 0) - next[key]) > 1)
}

function BomCard({
    node,
    decision,
    settings,
    facilitySettings,
    structureRigOptions,
    ownedBlueprintOptionsByTypeId,
    onDecisionChange,
    onSettingsChange,
    onSettingsPatch,
}) {
    const buildable = hasBuildableChildren(node)
    const settingsDisabled = !buildable || decision === 'PURCHASE'
    const facilityOptions = availableFacilitySettings(facilitySettings)
    const recommendedFacility = recommendedFacilitySetting(
        facilitySettings,
        structureRigOptions,
        node.manufacturingTarget,
    )
    const selectedFacilityId = settings.facilityPresetId || (recommendedFacility?.structure || '')
    const ownedBlueprintOptions = ownedBlueprintOptionsByTypeId[String(node.blueprintTypeId)] || []
    const calculation = node.calculation
    const jobDuration = calculation?.jobTimeSeconds != null ? formatDuration(calculation.jobTimeSeconds) : '-'

    return (
        <div className={cn(
            'relative z-10 bg-card border rounded-[4px] overflow-hidden shadow-sm',
            nodeBorderClass(decision, buildable),
        )} style={{ width: bomTreeColumnWidth }}>
            <div className="grid grid-cols-[minmax(0,1fr)_68px_68px_68px_68px] gap-1.5 items-center bg-muted px-2 py-[2px] border-b border-border">
                <div className="min-w-0">
                    <div className="text-[11px] text-foreground font-bold leading-snug truncate" title={node.typeName}>
                        {node.typeName}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Time</div>
                    <div className="text-[10px] text-foreground-muted font-bold font-mono whitespace-nowrap">{jobDuration}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Need</div>
                    <div className="text-[10px] text-foreground font-bold font-mono whitespace-nowrap">{number(node.quantity)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Runs</div>
                    <div className="text-[10px] text-foreground-muted font-bold font-mono whitespace-nowrap">{displayRuns(node, decision)}</div>
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-foreground-dim">Out/run</div>
                    <div className="text-[10px] text-foreground-muted font-bold font-mono whitespace-nowrap">{displayOutputQuantity(node)}</div>
                </div>
            </div>
            <div className="grid grid-cols-[20px_58px_20px_58px_minmax(0,1fr)] gap-1.5 items-center px-2 py-[2px]">
                {buildable ? (
                    <>
                        <span className="text-[9px] text-foreground-dim font-bold">ME</span>
                        <label className="min-w-0">
                            <input
                                type="number"
                                value={settings.materialEfficiency}
                                onChange={(event) => onSettingsPatch({
                                    blueprintItemId: '',
                                    materialEfficiency: event.target.value,
                                })}
                                disabled={settingsDisabled}
                                className="h-5 w-full bg-background border border-border text-foreground text-[10px] px-1.5 py-0 rounded-[3px] outline-none disabled:opacity-40"
                            />
                        </label>
                        <span className="text-[9px] text-foreground-dim font-bold">TE</span>
                        <label className="min-w-0">
                            <input
                                type="number"
                                value={settings.timeEfficiency}
                                onChange={(event) => onSettingsPatch({
                                    blueprintItemId: '',
                                    timeEfficiency: event.target.value,
                                })}
                                disabled={settingsDisabled}
                                className="h-5 w-full bg-background border border-border text-foreground text-[10px] px-1.5 py-0 rounded-[3px] outline-none disabled:opacity-40"
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
            {buildable && ownedBlueprintOptions.length > 0 && (
                <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-1.5 items-center px-2 pb-2">
                    <span className="text-[9px] text-foreground-dim font-bold">BP</span>
                    <select
                        value={settings.blueprintItemId || ''}
                        onChange={(event) => {
                            const blueprint = ownedBlueprintOptions.find(
                                (option) => String(option.itemId) === event.target.value,
                            )
                            if (!blueprint) {
                                onSettingsPatch({ blueprintItemId: '' })
                                return
                            }
                            onSettingsPatch({
                                blueprintItemId: String(blueprint.itemId),
                                materialEfficiency: String(blueprint.materialEfficiency ?? ''),
                                timeEfficiency: String(blueprint.timeEfficiency ?? ''),
                            })
                        }}
                        disabled={settingsDisabled}
                        className="h-6 min-w-0 bg-background border border-border text-foreground text-[10px] px-1.5 py-0 rounded-[3px] outline-none disabled:opacity-40"
                    >
                        <option value="">Manual ME/TE</option>
                        {ownedBlueprintOptions.map((blueprint) => (
                            <option key={blueprint.itemId} value={String(blueprint.itemId)}>
                                {blueprintItemLabel(blueprint)}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {buildable && (
                <div className="grid grid-cols-[44px_minmax(0,1fr)_58px] gap-1.5 items-center px-2 pb-2">
                    <span className="text-[9px] text-foreground-dim font-bold">Facility</span>
                    <select
                        value={selectedFacilityId}
                        onChange={(event) => onSettingsChange('facilityPresetId', event.target.value)}
                        disabled={settingsDisabled || facilityOptions.length === 0}
                        className="h-6 min-w-0 bg-background border border-border text-foreground text-[10px] px-1.5 py-0 rounded-[3px] outline-none disabled:opacity-40"
                    >
                        <option value="">
                            {facilityOptions.length === 0 ? 'No facility' : 'Auto best facility'}
                        </option>
                        {facilityOptions.map((facility) => (
                            <option key={facility.id} value={facility.structure}>
                                {facility.facilityOptions.find((option) => String(option.facilityId) === facility.structure)?.facilityName || facility.systemName}
                            </option>
                        ))}
                    </select>
                    <div className="text-right text-[9px] text-foreground-dim font-bold">
                        {selectedFacilityId && !settings.facilityPresetId ? 'AUTO' : settings.facilityPresetId ? 'MANUAL' : ''}
                    </div>
                </div>
            )}
        </div>
    )
}

function BomTree({
    bomTree,
    decisionsByNodeKey,
    nodeSettingsByNodeKey,
    facilitySettings,
    structureRigOptions,
    ownedBlueprintOptionsByTypeId,
    onDecisionChange,
    onSettingsChange,
    onSettingsPatch,
}) {
    const contentRef = useRef(null)
    const [nodeHeightsByKey, setNodeHeightsByKey] = useState({})
    const layout = useMemo(
        () => buildTierLayout(
            bomTree,
            decisionsByNodeKey,
            (node) => nodeHeightsByKey[node.nodeKey] || estimateBomCardHeight(node, ownedBlueprintOptionsByTypeId),
        ),
        [bomTree, decisionsByNodeKey, nodeHeightsByKey, ownedBlueprintOptionsByTypeId],
    )
    const [connectors, setConnectors] = useState({ width: 0, height: 0, paths: [] })
    const tierHeaderHeight = 28
    const gridWidth = (bomTreeContentPadding * 2)
        + (layout.columnCount * bomTreeColumnWidth)
        + (Math.max(layout.columnCount - 1, 0) * bomTreeColumnGap)
    const gridHeight = (bomTreeContentPadding * 2) + tierHeaderHeight + layout.height

    useLayoutEffect(() => {
        const content = contentRef.current
        if (!content) return undefined

        const drawConnectors = () => {
            const contentRect = content.getBoundingClientRect()
            const nextNodeHeights = {}
            content.querySelectorAll('[data-node-key]').forEach((element) => {
                const nodeKey = element.getAttribute('data-node-key')
                if (nodeKey) nextNodeHeights[nodeKey] = Math.ceil(element.getBoundingClientRect().height)
            })
            if (heightMapChanged(nodeHeightsByKey, nextNodeHeights)) {
                setNodeHeightsByKey(nextNodeHeights)
            }

            const paths = layout.edges.flatMap((edge) => {
                const from = content.querySelector(`[data-node-key="${CSS.escape(edge.from)}"]`)
                const to = content.querySelector(`[data-node-key="${CSS.escape(edge.to)}"]`)
                if (!from || !to) return []

                const fromRect = from.getBoundingClientRect()
                const toRect = to.getBoundingClientRect()
                const startX = fromRect.right - contentRect.left
                const startY = fromRect.top - contentRect.top + (fromRect.height / 2)
                const endX = toRect.left - contentRect.left
                const endY = toRect.top - contentRect.top + (toRect.height / 2)
                const midX = startX + Math.max(8, (endX - startX) / 2)

                return [{
                    key: `${edge.from}-${edge.to}`,
                    decision: edge.buildable ? edge.decision : 'MATERIAL',
                    d: `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`,
                }]
            })

            setConnectors({
                width: gridWidth,
                height: gridHeight,
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
    }, [gridHeight, gridWidth, layout, nodeHeightsByKey])

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
                className="relative min-w-max"
                style={{
                    width: gridWidth,
                    height: gridHeight,
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
                        className="absolute text-[9px] text-foreground-dim uppercase tracking-wider font-bold px-1"
                        style={{
                            left: bomTreeContentPadding + (depth * (bomTreeColumnWidth + bomTreeColumnGap)),
                            top: bomTreeContentPadding,
                            width: bomTreeColumnWidth,
                        }}
                    >
                        Tier {depth}
                    </div>
                ))}
                {layout.nodes.map(({ node, depth, y }) => (
                    <div
                        key={node.nodeKey}
                        data-node-key={node.nodeKey}
                        className="absolute"
                        style={{
                            left: bomTreeContentPadding + (depth * (bomTreeColumnWidth + bomTreeColumnGap)),
                            top: bomTreeContentPadding + tierHeaderHeight + y,
                            transform: 'translateY(-50%)',
                        }}
                    >
                        <BomCard
                            node={node}
                            decision={effectiveDecision(node, decisionsByNodeKey)}
                            settings={nodeSettingsByNodeKey[node.nodeKey] || { blueprintItemId: '', materialEfficiency: '', timeEfficiency: '', facilityPresetId: '' }}
                            facilitySettings={facilitySettings}
                            structureRigOptions={structureRigOptions}
                            ownedBlueprintOptionsByTypeId={ownedBlueprintOptionsByTypeId}
                            onDecisionChange={(decision) => onDecisionChange(node.nodeKey, decision)}
                            onSettingsChange={(field, value) => onSettingsChange(node.nodeKey, field, value)}
                            onSettingsPatch={(patch) => onSettingsPatch(node.nodeKey, patch)}
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
        industrySkill: '5',
        advancedIndustrySkill: '5',
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
    const [ownedBlueprintOptionsByTypeId, setOwnedBlueprintOptionsByTypeId] = useState({})
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
        setOwnedBlueprintOptionsByTypeId({})
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
            index: '',
            structure: '',
            rig: '',
            rig2: '',
            rig3: '',
            structureRigQuery: '',
            structureRigQuery2: '',
            structureRigQuery3: '',
            facilityOptions: [],
            facilityLoading: false,
            bonus: '0',
        })
    }

    const selectFacilitySystem = (settingId, system) => {
        patchFacilitySetting(settingId, {
            systemQuery: system.systemName,
            selectedSystem: system,
            index: formatIndex(system.manufacturingIndex),
            systemDropdownOpen: false,
            structure: '',
            rig: '',
            rig2: '',
            rig3: '',
            structureRigQuery: '',
            structureRigQuery2: '',
            structureRigQuery3: '',
            facilityOptions: [],
            facilityLoading: true,
            bonus: '0',
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

    const filteredSystems = (query) => {
        const systems = systemCache || []
        const normalizedQuery = query.trim().toLowerCase()
        return normalizedQuery
            ? systems.filter((system) => system.systemName.toLowerCase().includes(normalizedQuery))
            : systems
    }

    const canCalculate = Number(editor.typeId) > 0 && Number(editor.quantity) > 0
    const canSave = bomTree && editor.name.trim() && editor.typeName.trim()
    const calculatedBomTree = useMemo(
        () => recalculateBomTree(
            bomTree,
            decisionsByNodeKey,
            nodeSettingsByNodeKey,
            facilitySettings,
            structureRigOptions,
            {
                industrySkill: editor.industrySkill,
                advancedIndustrySkill: editor.advancedIndustrySkill,
            },
        ),
        [
            bomTree,
            decisionsByNodeKey,
            nodeSettingsByNodeKey,
            facilitySettings,
            structureRigOptions,
            editor.industrySkill,
            editor.advancedIndustrySkill,
        ],
    )

    const calculate = async (event) => {
        event.preventDefault()
        if (!canCalculate || calculating) return

        setCalculating(true)
        setError(null)
        try {
            const tree = await industryApi.manufacturingBom(Number(editor.typeId), Number(editor.quantity))
            const blueprintTypeIds = Array.from(collectBuildableBlueprintTypeIds(tree))
            let ownedBlueprintOptions = {}
            if (blueprintTypeIds.length > 0) {
                try {
                    const ownedBlueprints = await industryApi.ownedBlueprints(blueprintTypeIds)
                    ownedBlueprintOptions = groupOwnedBlueprintsByTypeId(ownedBlueprints)
                } catch {
                    ownedBlueprintOptions = {}
                }
            }
            setBomTree(tree)
            setOwnedBlueprintOptionsByTypeId(ownedBlueprintOptions)
            setEditor((current) => ({ ...current, typeName: current.typeName || tree.typeName }))
            setDecisionsByNodeKey(
                Object.fromEntries(flattenBom(tree, {}).map((node) => [node.nodeKey, editor.defaultDecision])),
            )
            setNodeSettingsByNodeKey(collectNodeSettings(tree, editor.me, editor.te, ownedBlueprintOptions))
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
                calculatedBomTree,
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
                blueprintItemId: '',
                materialEfficiency: '',
                timeEfficiency: '',
                ...(current[nodeKey] || {}),
                [field]: value,
            },
        }))
    }

    const patchNodeSetting = (nodeKey, patch) => {
        setNodeSettingsByNodeKey((current) => ({
            ...current,
            [nodeKey]: {
                blueprintItemId: '',
                materialEfficiency: '',
                timeEfficiency: '',
                ...(current[nodeKey] || {}),
                ...patch,
            },
        }))
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={calculate} className="bg-card border border-border rounded">
                <div className="grid grid-cols-[90px_minmax(220px,1fr)_76px_76px_76px_96px_82px_150px] gap-2 items-center px-3 py-2 bg-muted border-b border-border max-xl:grid-cols-2">
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
                    <label className="flex items-center gap-1">
                        <span className="text-foreground text-[11px] font-bold">Industry</span>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            value={editor.industrySkill}
                            onChange={updateEditor('industrySkill')}
                            className="w-full bg-background border border-border text-foreground text-[12px] px-2 py-2 rounded-[3px] outline-none"
                        />
                    </label>
                    <label className="flex items-center gap-1">
                        <span className="text-foreground text-[11px] font-bold">Adv</span>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            value={editor.advancedIndustrySkill}
                            onChange={updateEditor('advancedIndustrySkill')}
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
                                onChange={(field, value) => updateFacilitySetting(settings.id, field, value)}
                                onPatch={(patch) => patchFacilitySetting(settings.id, patch)}
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
                <TierBulkControls
                    bomTree={bomTree}
                    decisionsByNodeKey={decisionsByNodeKey}
                    onTierDecisionChange={setTierDecision}
                />
                <BomTree
                    bomTree={calculatedBomTree}
                    decisionsByNodeKey={decisionsByNodeKey}
                    nodeSettingsByNodeKey={nodeSettingsByNodeKey}
                    facilitySettings={facilitySettings}
                    structureRigOptions={structureRigOptions}
                    ownedBlueprintOptionsByTypeId={ownedBlueprintOptionsByTypeId}
                    onDecisionChange={setNodeDecision}
                    onSettingsChange={setNodeSetting}
                    onSettingsPatch={patchNodeSetting}
                />
            </div>

            <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-4 items-start max-xl:grid-cols-1">
                <MaterialsSummary
                    bomTree={calculatedBomTree}
                    decisionsByNodeKey={decisionsByNodeKey}
                    maxHeightClass="max-h-[520px]"
                />
                <TemplatesList templates={templates} />
            </div>
        </div>
    )
}
