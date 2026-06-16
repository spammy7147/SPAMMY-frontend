# Assets List Virtualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize the EVE asset inventory list in `AssetsTab.jsx` to render thousands of items smoothly using `@tanstack/react-virtual`.

**Architecture:** Flatten the hierarchical accordion tree (Character -> Location -> Category/Container -> Sub-item) into a single flat array of visible nodes based on active accordion expansion states. Pass this flat list to the virtualizer to only mount DOM nodes for elements visible in the viewport.

**Tech Stack:** React 19, @tanstack/react-virtual v3

---

### Task 1: Create Flat List Builder Helper

**Files:**
- Create: `src/components/portfolio/assetsHelper.js`
- Test: `src/components/portfolio/assetsHelper.test.js` (We will write a scratch node script to verify this helper since frontend test runner is not configured)

- [ ] **Step 1: Write flat list builder helper function**

Write a utility that takes the raw character assets data, the search term, and expansion states, and returns a flat array of currently visible rows with indentation levels and row type information.

Create file `src/components/portfolio/assetsHelper.js`:
```javascript
export function buildFlatList(characterAssets, expandedStates, searchTerm) {
    if (!characterAssets) return [];
    
    const flatList = [];
    const term = searchTerm ? searchTerm.toLowerCase() : '';

    characterAssets.forEach(charGroup => {
        const charName = charGroup.characterName;
        // Characters are always visible, or auto-expanded if searching
        const isCharExpanded = term ? true : expandedStates[`char-${charName}`] !== false;
        
        flatList.push({
            id: `char-${charName}`,
            type: 'character',
            name: charName,
            level: 0,
            isExpanded: isCharExpanded
        });

        if (!isCharExpanded) return;

        charGroup.locations.forEach((loc, locIdx) => {
            const locId = `loc-${charName}-${locIdx}-${loc.locationName}`;
            const isLocExpanded = term ? true : !!expandedStates[locId];

            // Filter child categories and containers based on search term
            const filteredContainers = (loc.containers || []).filter(item => {
                const itemMatches = item.name.toLowerCase().includes(term);
                const contentsMatch = item.isContainer && item.contents && item.contents.some(innerCat => 
                    innerCat.items.some(subItem => subItem.name.toLowerCase().includes(term))
                );
                return itemMatches || contentsMatch;
            }).map(item => {
                if (item.isContainer && item.contents) {
                    const itemMatches = item.name.toLowerCase().includes(term);
                    const filteredContents = item.contents.map(innerCat => {
                        const filteredSubItems = innerCat.items.filter(subItem => 
                            itemMatches || subItem.name.toLowerCase().includes(term)
                        );
                        return { ...innerCat, items: filteredSubItems };
                    }).filter(innerCat => innerCat.items.length > 0);
                    return { ...item, contents: filteredContents };
                }
                return item;
            });

            const filteredCategoryGroups = (loc.categoryGroups || []).map(catGroup => {
                const filteredItems = catGroup.items.filter(item => {
                    const itemMatches = item.name.toLowerCase().includes(term);
                    const contentsMatch = item.isContainer && item.contents && item.contents.some(innerCat => 
                        innerCat.items.some(subItem => subItem.name.toLowerCase().includes(term))
                    );
                    return itemMatches || contentsMatch;
                }).map(item => {
                    if (item.isContainer && item.contents) {
                        const itemMatches = item.name.toLowerCase().includes(term);
                        const filteredContents = item.contents.map(innerCat => {
                            const filteredSubItems = innerCat.items.filter(subItem => 
                                itemMatches || subItem.name.toLowerCase().includes(term)
                            );
                            return { ...innerCat, items: filteredSubItems };
                        }).filter(innerCat => innerCat.items.length > 0);
                        return { ...item, contents: filteredContents };
                    }
                    return item;
                });
                return { ...catGroup, items: filteredItems };
            }).filter(catGroup => catGroup.items.length > 0);

            // Skip location row if search term is active but no items match
            if (term && filteredContainers.length === 0 && filteredCategoryGroups.length === 0) return;

            flatList.push({
                id: locId,
                type: 'location',
                name: loc.locationName,
                totalValue: loc.locationTotalValue,
                level: 1,
                isExpanded: isLocExpanded
            });

            if (!isLocExpanded) return;

            // Render Containers
            filteredContainers.forEach(item => {
                const itemId = `item-${locId}-${item.id}`;
                const isItemExpanded = term ? true : !!expandedStates[itemId];
                
                flatList.push({
                    id: itemId,
                    type: 'container',
                    name: item.name,
                    qty: item.qty,
                    value: item.value,
                    level: 2,
                    isContainer: item.isContainer,
                    isExpanded: isItemExpanded
                });

                if (item.isContainer && isItemExpanded) {
                    if (item.contents && item.contents.length > 0) {
                        item.contents.forEach(innerCat => {
                            const innerCatId = `inner-${itemId}-${innerCat.categoryId}`;
                            const isInnerCatExpanded = term ? true : expandedStates[innerCatId] !== false;

                            flatList.push({
                                id: innerCatId,
                                type: 'innerCategory',
                                name: innerCat.categoryName,
                                count: innerCat.items.length,
                                level: 3,
                                isExpanded: isInnerCatExpanded
                            });

                            if (isInnerCatExpanded) {
                                innerCat.items.forEach(subItem => {
                                    flatList.push({
                                        id: `sub-${innerCatId}-${subItem.id}`,
                                        type: 'subItem',
                                        name: subItem.name,
                                        qty: subItem.qty,
                                        value: subItem.value,
                                        level: 4
                                    });
                                });
                            }
                        });
                    } else {
                        flatList.push({
                            id: `empty-${itemId}`,
                            type: 'empty',
                            name: '└ (Empty)',
                            level: 3
                        });
                    }
                }
            });

            // Render Category Groups
            filteredCategoryGroups.forEach(catGroup => {
                const catGroupId = `cat-${locId}-${catGroup.categoryId}`;
                const isCatExpanded = term ? true : !!expandedStates[catGroupId];
                const catTotalValue = catGroup.items.reduce((sum, i) => sum + i.value, 0);

                flatList.push({
                    id: catGroupId,
                    type: 'category',
                    name: catGroup.categoryName,
                    count: catGroup.items.length,
                    totalValue: catTotalValue,
                    level: 2,
                    isExpanded: isCatExpanded
                });

                if (!isCatExpanded) return;

                catGroup.items.forEach(item => {
                    const itemId = `item-${catGroupId}-${item.id}`;
                    const isItemExpanded = term ? true : !!expandedStates[itemId];

                    flatList.push({
                        id: itemId,
                        type: 'item',
                        assetType: item.assetType,
                        name: item.name,
                        qty: item.qty,
                        value: item.value,
                        level: 3,
                        isContainer: item.isContainer,
                        isExpanded: isItemExpanded
                    });

                    if (item.isContainer && isItemExpanded) {
                        if (item.contents && item.contents.length > 0) {
                            item.contents.forEach(innerCat => {
                                const innerCatId = `inner-${itemId}-${innerCat.categoryId}`;
                                const isInnerCatExpanded = term ? true : expandedStates[innerCatId] !== false;

                                flatList.push({
                                    id: innerCatId,
                                    type: 'innerCategory',
                                    name: innerCat.categoryName,
                                    count: innerCat.items.length,
                                    level: 4,
                                    isExpanded: isInnerCatExpanded
                                });

                                if (isInnerCatExpanded) {
                                    innerCat.items.forEach(subItem => {
                                        flatList.push({
                                            id: `sub-${innerCatId}-${subItem.id}`,
                                            type: 'subItem',
                                            name: subItem.name,
                                            qty: subItem.qty,
                                            value: subItem.value,
                                            level: 5
                                        });
                                    });
                                }
                            });
                        } else {
                            flatList.push({
                                id: `empty-${itemId}`,
                                type: 'empty',
                                name: '└ (Empty)',
                                level: 4
                            });
                        }
                    }
                });
            });
        });
    });

    return flatList;
}
```

- [ ] **Step 2: Write verification scratch script**

Create a scratch node script to verify `buildFlatList` with sample data.

Create file `scratch/test_helper.js`:
```javascript
import { buildFlatList } from '../src/components/portfolio/assetsHelper.js';

const sampleData = [
  {
    characterName: 'SPAMHAPPY',
    locations: [
      {
        locationName: 'Jita IV',
        locationTotalValue: 1000,
        containers: [
          {
            id: 101,
            name: 'Cargo Container',
            qty: 1,
            value: 200,
            isContainer: true,
            contents: [
              {
                categoryId: 2,
                categoryName: 'Ammunition',
                items: [{ id: 501, name: 'Missile', qty: 10, value: 50 }]
              }
            ]
          }
        ],
        categoryGroups: []
      }
    ]
  }
];

const expanded = {
  'char-SPAMHAPPY': true,
  'loc-SPAMHAPPY-0-Jita IV': true,
  'item-loc-SPAMHAPPY-0-Jita IV-101': true,
  'inner-item-loc-SPAMHAPPY-0-Jita IV-101-2': true
};

const flat = buildFlatList(sampleData, expanded, '');
console.log('Flat items count:', flat.length);
flat.forEach(item => {
  console.log(`[Level ${item.level}] [Type: ${item.type}] - ${item.name}`);
});

if (flat.length === 5) {
  console.log('Test PASSED!');
} else {
  console.error('Test FAILED!');
}
```

Run command: `node scratch/test_helper.js`
Expected output:
```text
Flat items count: 5
[Level 0] [Type: character] - SPAMHAPPY
[Level 1] [Type: location] - Jita IV
[Level 2] [Type: container] - Cargo Container
[Level 3] [Type: innerCategory] - Ammunition
[Level 4] [Type: subItem] - Missile
Test PASSED!
```

---

### Task 2: Refactor AssetsTab.jsx to use Virtual Scroll

**Files:**
- Modify: `src/components/portfolio/AssetsTab.jsx`

- [ ] **Step 1: Refactor component state and import useVirtualizer**

Import `useVirtualizer` and the flat list helper. Maintain state for expanded rows by combining the individual accordion states into a single unified `expandedRows` state.

```javascript
import { useRef, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { buildFlatList } from './assetsHelper'
```

Replace the state declarations in `AssetsTab.jsx`:
```javascript
    const [expandedRows, setExpandedRows] = useState({});
    const [searchTerm, setSearchTerm] = useState('')
```

Replace target toggle handlers with a single generic toggle function:
```javascript
    const toggleRow = (rowId, defaultState = false) => {
        setExpandedRows(prev => {
            const currentVal = prev[rowId];
            const nextVal = currentVal === undefined ? !defaultState : !currentVal;
            return { ...prev, [rowId]: nextVal };
        });
    };
```

- [ ] **Step 2: Flatten data and configure the virtualizer**

Compute the flat list using `useMemo` based on assets data, `expandedRows`, and `searchTerm`. Set up `useVirtualizer` with a reference to the scrollable container.

```javascript
    const parentRef = useRef(null);

    const visibleRows = useMemo(() => {
        return buildFlatList(data.characterAssets, expandedRows, searchTerm);
    }, [data.characterAssets, expandedRows, searchTerm]);

    const rowVirtualizer = useVirtualizer({
        count: visibleRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 36, // average height of a row in pixels
        overscan: 10
    });
```

- [ ] **Step 3: Render Virtualized Rows**

Wrap the scroll container with `ref={parentRef}` and render only the virtualized items inside a absolute-positioned viewport. Ensure each type of row is styled exactly as in the original component.

```javascript
    return (
        <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded px-4 py-3 flex items-center gap-3">
                <span className="text-sm">🔍</span>
                <input 
                    type="text"
                    placeholder="Search by item or container name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-foreground text-sm w-full outline-none placeholder:text-foreground-dim/50"
                />
            </div>

            <div 
                ref={parentRef}
                className="h-[650px] overflow-y-auto border border-border rounded bg-background/50 p-2"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = visibleRows[virtualRow.index];
                        return (
                            <div
                                key={item.id}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                className="flex items-center"
                            >
                                {renderVirtualizedRow(item, toggleRow, highlightText, formatISK, iskAbbreviation, ChevronIcon)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
```

Configure `renderVirtualizedRow` helper inside `AssetsTab.jsx` to select styles based on `item.type` and render the character, location, container, inner category, item, sub-item, or empty rows matching the original styles.

- [ ] **Step 4: Verify Compilation & Linting**

Run command: `npm run lint`
Expected: SUCCESS

Run command: `npm run build`
Expected: SUCCESS
