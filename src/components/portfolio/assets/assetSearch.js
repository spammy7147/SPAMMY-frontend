const normalize = (value) => (value || '').toLowerCase();

const itemMatches = (item, searchTerm) => normalize(item.name).includes(searchTerm);

const contentsMatch = (item, searchTerm) =>
    item.isContainer &&
    item.contents &&
    item.contents.some((innerCat) =>
        innerCat.items.some((subItem) => itemMatches(subItem, searchTerm))
    );

const filterContainerContents = (item, searchTerm) => {
    if (!item.isContainer || !item.contents) {
        return item;
    }

    const itemMatched = itemMatches(item, searchTerm);
    const contents = item.contents
        .map((innerCat) => ({
            ...innerCat,
            items: innerCat.items.filter((subItem) => itemMatched || itemMatches(subItem, searchTerm)),
        }))
        .filter((innerCat) => innerCat.items.length > 0);

    return { ...item, contents };
};

export function filterLocationAssets(location, rawSearchTerm) {
    const searchTerm = normalize(rawSearchTerm);

    if (!searchTerm) {
        return {
            categoryGroups: location.categoryGroups || [],
            containers: location.containers || [],
        };
    }

    const categoryGroups = (location.categoryGroups || [])
        .map((catGroup) => ({
            ...catGroup,
            items: catGroup.items
                .filter((item) => itemMatches(item, searchTerm) || contentsMatch(item, searchTerm))
                .map((item) => filterContainerContents(item, searchTerm)),
        }))
        .filter((catGroup) => catGroup.items.length > 0);

    const containers = (location.containers || [])
        .filter((item) => itemMatches(item, searchTerm) || contentsMatch(item, searchTerm))
        .map((item) => filterContainerContents(item, searchTerm));

    return { categoryGroups, containers };
}

export function hasVisibleAssets(filteredAssets) {
    return filteredAssets.categoryGroups.length > 0 || filteredAssets.containers.length > 0;
}
