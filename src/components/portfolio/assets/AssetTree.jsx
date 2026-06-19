import { formatISK } from '@/lib/utils'
import { filterLocationAssets, hasVisibleAssets } from './assetSearch'
import { ChevronIcon, HighlightText, LocationName } from './AssetDisplay'

function InnerCategoryList({
    item,
    indentClass,
    searchTerm,
    expandedInnerCats,
    onToggleInnerCat,
    iskAbbreviation,
}) {
    if (!item.contents || item.contents.length === 0) {
        return (
            <div className={`${indentClass.empty} py-2 text-[11px] text-foreground-dim/40 italic`}>
                └ (Empty)
            </div>
        )
    }

    return item.contents.map((innerCat) => {
        const innerCatId = `${item.id}-${innerCat.categoryId}`
        const isInnerCatExpanded = searchTerm ? true : expandedInnerCats[innerCatId] !== false

        return (
            <div key={innerCat.categoryId} className="mb-2 last:mb-0">
                <button
                    type="button"
                    onClick={() => onToggleInnerCat(innerCatId)}
                    className={`${indentClass.header} py-0.5 text-[10px] text-primary/70 font-extrabold uppercase tracking-[0.5px] flex items-center gap-1 select-none hover:text-primary transition-colors w-full text-left`}
                    aria-expanded={isInnerCatExpanded}
                >
                    <ChevronIcon isExpanded={isInnerCatExpanded} className="w-2.5 h-2.5" />
                    <span>{innerCat.categoryName} ({innerCat.items.length})</span>
                </button>
                {isInnerCatExpanded && innerCat.items.map((subItem) => (
                    <div
                        key={subItem.id}
                        className={`flex ${indentClass.row} py-1.5 text-[11px] text-foreground-muted border-b border-border/10 last:border-none hover:bg-border/5`}
                    >
                        <span className="flex-1 font-medium text-foreground-dim">
                            └ <HighlightText text={subItem.name} searchTerm={searchTerm} />
                        </span>
                        <span className="w-[60px] text-right">{subItem.qty}</span>
                        <span className="w-[120px] text-right text-secondary font-semibold">
                            {formatISK(subItem.value, iskAbbreviation)}
                        </span>
                    </div>
                ))}
            </div>
        )
    })
}

function AssetItemRow({
    item,
    searchTerm,
    expandedItems,
    expandedInnerCats,
    onToggleItem,
    onToggleInnerCat,
    iskAbbreviation,
    variant = 'category',
}) {
    const isItemExpanded = searchTerm ? true : !!expandedItems[item.id]
    const showChevron = item.isContainer
    const isShip = item.assetType === 'SHIP'
    const icon = variant === 'container' ? '📦' : isShip ? '🛸' : null
    const itemIndent = variant === 'container' ? 'px-[30px]' : 'px-[45px]'
    const innerIndent =
        variant === 'container'
            ? { header: 'px-[45px]', row: 'px-[60px]', empty: 'px-[50px]' }
            : { header: 'px-[60px]', row: 'px-[75px]', empty: 'px-[65px]' }
    const rowBg = variant === 'container' ? 'bg-muted/20' : ''
    const itemTextClass = isShip ? 'text-indigo-400 font-semibold' : 'text-foreground'

    return (
        <div className="border-b border-border/30 last:border-none">
            <button
                type="button"
                onClick={() => showChevron && onToggleItem(item.id)}
                className={`flex items-center ${itemIndent} py-2.5 text-xs hover:bg-border/5 transition-colors w-full text-left ${rowBg} ${showChevron ? 'cursor-pointer' : 'cursor-default'}`}
                aria-expanded={showChevron ? isItemExpanded : undefined}
            >
                <span className="flex-1 flex items-center gap-2">
                    {showChevron ? (
                        <ChevronIcon isExpanded={isItemExpanded} className="text-foreground-dim/40 w-2.5 h-2.5" />
                    ) : (
                        <span className="w-2.5 h-2.5" />
                    )}
                    {icon && <span className="text-sm select-none">{icon}</span>}
                    <span className={`font-medium ${itemTextClass}`}>
                        <HighlightText text={item.name} searchTerm={searchTerm} />
                    </span>
                </span>
                <span className="w-[60px] text-right text-foreground-muted font-semibold">{item.qty}</span>
                <span className="w-[120px] text-right text-primary font-bold">
                    {formatISK(item.value, iskAbbreviation)}
                </span>
            </button>

            {showChevron && isItemExpanded && (
                <div className="bg-muted/10 border-t border-b border-border/20 py-1 animate-in fade-in duration-200">
                    <InnerCategoryList
                        item={item}
                        indentClass={innerIndent}
                        searchTerm={searchTerm}
                        expandedInnerCats={expandedInnerCats}
                        onToggleInnerCat={onToggleInnerCat}
                        iskAbbreviation={iskAbbreviation}
                    />
                </div>
            )}
        </div>
    )
}

function CategoryGroupSection({
    catGroup,
    catId,
    isExpanded,
    searchTerm,
    expandedItems,
    expandedInnerCats,
    onToggleCat,
    onToggleItem,
    onToggleInnerCat,
    iskAbbreviation,
}) {
    const catTotalValue = catGroup.items.reduce((sum, item) => sum + item.value, 0)

    return (
        <div className="border-b border-border/40 last:border-none">
            <button
                type="button"
                onClick={() => onToggleCat(catId)}
                className="px-[30px] py-2 bg-muted/40 cursor-pointer flex justify-between items-center hover:bg-border/5 transition-colors w-full text-left"
                aria-expanded={isExpanded}
            >
                <span className="flex items-center gap-2">
                    <ChevronIcon isExpanded={isExpanded} className="text-foreground-dim/60 w-3 h-3" />
                    <span className="text-xs font-semibold text-foreground-muted">{catGroup.categoryName}</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary font-bold rounded-full">
                        {catGroup.items.length}
                    </span>
                </span>
                <span className="text-[11px] text-foreground-dim font-bold">
                    {formatISK(catTotalValue, iskAbbreviation)} ISK
                </span>
            </button>

            {isExpanded && (
                <div className="bg-card/50">
                    {catGroup.items.map((item) => (
                        <AssetItemRow
                            key={item.id}
                            item={item}
                            searchTerm={searchTerm}
                            expandedItems={expandedItems}
                            expandedInnerCats={expandedInnerCats}
                            onToggleItem={onToggleItem}
                            onToggleInnerCat={onToggleInnerCat}
                            iskAbbreviation={iskAbbreviation}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function LocationGroupSection({
    charName,
    loc,
    index,
    searchTerm,
    expansion,
    handlers,
    iskAbbreviation,
}) {
    const locId = `${charName}-${loc.locationName}`
    const isLocExpanded = searchTerm ? true : !!expansion.expandedLocs[locId]
    const filteredAssets = filterLocationAssets(loc, searchTerm)

    if (searchTerm && !hasVisibleAssets(filteredAssets)) {
        return null
    }

    return (
        <div key={index} className="bg-card border border-border rounded overflow-hidden">
            <button
                type="button"
                onClick={() => handlers.onToggleLoc(locId)}
                className="px-[15px] py-3 bg-muted cursor-pointer flex justify-between items-center hover:bg-border/10 transition-colors w-full text-left"
                aria-expanded={isLocExpanded}
            >
                <span className="flex items-center gap-2.5">
                    <ChevronIcon isExpanded={isLocExpanded} className="text-foreground-dim" />
                    <LocationName locationName={loc.locationName} />
                </span>
                <span className="text-xs text-gold font-extrabold">
                    {formatISK(loc.locationTotalValue, iskAbbreviation)} ISK
                </span>
            </button>

            {isLocExpanded && (
                <div className="bg-card border-t border-border/50 animate-in fade-in duration-200">
                    {filteredAssets.containers.map((item) => (
                        <AssetItemRow
                            key={item.id}
                            item={item}
                            searchTerm={searchTerm}
                            expandedItems={expansion.expandedItems}
                            expandedInnerCats={expansion.expandedInnerCats}
                            onToggleItem={handlers.onToggleItem}
                            onToggleInnerCat={handlers.onToggleInnerCat}
                            iskAbbreviation={iskAbbreviation}
                            variant="container"
                        />
                    ))}

                    {filteredAssets.categoryGroups.map((catGroup) => {
                        const catId = `${locId}-${catGroup.categoryId}`
                        const isCatExpanded = searchTerm ? true : !!expansion.expandedCats[catId]
                        return (
                            <CategoryGroupSection
                                key={catGroup.categoryId}
                                catGroup={catGroup}
                                catId={catId}
                                isExpanded={isCatExpanded}
                                searchTerm={searchTerm}
                                expandedItems={expansion.expandedItems}
                                expandedInnerCats={expansion.expandedInnerCats}
                                onToggleCat={handlers.onToggleCat}
                                onToggleItem={handlers.onToggleItem}
                                onToggleInnerCat={handlers.onToggleInnerCat}
                                iskAbbreviation={iskAbbreviation}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function CharacterAssetsGroup({ charGroup, searchTerm, expansion, handlers, iskAbbreviation }) {
    const isCharExpanded = searchTerm ? true : expansion.expandedChars[charGroup.characterName] !== false

    return (
        <div>
            <button
                type="button"
                onClick={() => handlers.onToggleChar(charGroup.characterName)}
                className="flex items-center gap-2.5 mb-3 cursor-pointer select-none hover:opacity-80 transition-opacity w-full text-left"
                aria-expanded={isCharExpanded}
            >
                <ChevronIcon isExpanded={isCharExpanded} className="text-primary w-3.5 h-3.5" />
                <h3 className="m-0 text-[13px] font-extrabold text-primary tracking-[1px]">
                    {charGroup.characterName.toUpperCase()}
                </h3>
                <span className="flex-1 h-[1px] bg-border/50" />
            </button>

            {isCharExpanded && (
                <div className="flex flex-col gap-2">
                    {charGroup.locations.map((loc, index) => (
                        <LocationGroupSection
                            key={`${charGroup.characterName}-${loc.locationName}-${index}`}
                            charName={charGroup.characterName}
                            loc={loc}
                            index={index}
                            searchTerm={searchTerm}
                            expansion={expansion}
                            handlers={handlers}
                            iskAbbreviation={iskAbbreviation}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export function AssetTree({ characterAssets, searchTerm, expansion, handlers, iskAbbreviation }) {
    if (!characterAssets || characterAssets.length === 0) {
        return (
            <div className="text-center py-12 text-foreground-dim">
                NO ASSETS FOUND
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6">
            {characterAssets.map((charGroup) => (
                <CharacterAssetsGroup
                    key={charGroup.characterName}
                    charGroup={charGroup}
                    searchTerm={searchTerm}
                    expansion={expansion}
                    handlers={handlers}
                    iskAbbreviation={iskAbbreviation}
                />
            ))}
        </div>
    )
}
