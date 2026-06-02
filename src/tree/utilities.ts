import { arrayMove } from "@dnd-kit/sortable";

import type {
    FlattenedItem,
    ItemPathEntry,
    ProjectionResult,
    SetterFn,
    TreeItem,
} from "../types";

export function createId(prefix: string = "item"): string {
    const globalCrypto = globalThis.crypto;
    if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
        const uuid = globalCrypto.randomUUID();
        return `${prefix}-${uuid}`;
    }
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000000);
    return `${prefix}-${timestamp}-${randomPart}`;
}

function getDragDepth(offset: number, indentationWidth: number): number {
    return Math.round(offset / indentationWidth);
}

function getMaxDepth(previousItem: FlattenedItem | undefined): number {
    if (previousItem) {
        return previousItem.depth + 1;
    }
    return 0;
}

function getMinDepth(nextItem: FlattenedItem | undefined): number {
    if (nextItem) {
        return nextItem.depth;
    }
    return 0;
}

export function getProjection(
    flattenedItems: FlattenedItem[],
    activeId: string,
    overId: string,
    dragOffset: number,
    indentationWidth: number,
): ProjectionResult {
    const overItemIndex = flattenedItems.findIndex((item) => item.id === overId);
    const activeItemIndex = flattenedItems.findIndex((item) => item.id === activeId);
    const activeItem = flattenedItems[activeItemIndex];
    const movedItems = arrayMove(flattenedItems, activeItemIndex, overItemIndex);
    const previousItem = movedItems[overItemIndex - 1];
    const nextItem = movedItems[overItemIndex + 1];
    const dragDepth = getDragDepth(dragOffset, indentationWidth);
    const projectedDepth = activeItem.depth + dragDepth;
    const maxDepth = getMaxDepth(previousItem);
    const minDepth = getMinDepth(nextItem);

    let depth = projectedDepth;
    if (projectedDepth >= maxDepth) {
        depth = maxDepth;
    }
    else if (projectedDepth < minDepth) {
        depth = minDepth;
    }

    function getParentId(): string | null {
        if (depth === 0 || !previousItem) {
            return null;
        }
        if (depth === previousItem.depth) {
            return previousItem.parentId;
        }
        if (depth > previousItem.depth) {
            return previousItem.id;
        }
        const reversedItems = movedItems.slice(0, overItemIndex).reverse();
        const candidate = reversedItems.find((item) => item.depth === depth);
        if (candidate) {
            return candidate.parentId;
        }
        return null;
    }

    const parentId = getParentId();
    return { depth, maxDepth, minDepth, parentId };
}

function flatten(items: TreeItem[], parentId: string | null, depth: number): FlattenedItem[] {
    const result: FlattenedItem[] = [];
    items.forEach((item, index) => {
        const flattenedItem: FlattenedItem = {
            id: item.id,
            label: item.label,
            blocks: item.blocks,
            settings: item.settings,
            collapsed: item.collapsed === true,
            childCount: item.children.length,
            parentId: parentId,
            depth: depth,
            index: index,
        };
        result.push(flattenedItem);
        const flattenedChildren = flatten(item.children, item.id, depth + 1);
        flattenedChildren.forEach((child) => {
            result.push(child);
        });
    });
    return result;
}

export function flattenTree(items: TreeItem[]): FlattenedItem[] {
    return flatten(items, null, 0);
}

export function buildTree(flattenedItems: FlattenedItem[]): TreeItem[] {
    const rootNode: TreeItem = { id: "root", label: "", blocks: [], collapsed: false, children: [] };
    const nodeMap: Record<string, TreeItem> = { root: rootNode };
    const items: TreeItem[] = flattenedItems.map((flattenedItem) => {
        const item: TreeItem = {
            id: flattenedItem.id,
            label: flattenedItem.label,
            blocks: flattenedItem.blocks,
            collapsed: flattenedItem.collapsed === true,
            children: [],
        };
        if (flattenedItem.settings) {
            item.settings = flattenedItem.settings;
        }
        return item;
    });

    items.forEach((item) => {
        nodeMap[item.id] = item;
    });

    flattenedItems.forEach((flattenedItem, itemIndex) => {
        const item = items[itemIndex];
        const parentId = flattenedItem.parentId === null ? "root" : flattenedItem.parentId;
        const parentNode = nodeMap[parentId];
        if (parentNode) {
            parentNode.children.push(item);
        }
        else {
            rootNode.children.push(item);
        }
    });

    return rootNode.children;
}

export function findItemDeep(items: TreeItem[], itemId: string | null): TreeItem | undefined {
    if (itemId === null) {
        return undefined;
    }
    for (const item of items) {
        if (item.id === itemId) {
            return item;
        }
        if (item.children.length > 0) {
            const found = findItemDeep(item.children, itemId);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}

export function removeItem(items: TreeItem[], id: string): TreeItem[] {
    const result: TreeItem[] = [];
    for (const item of items) {
        if (item.id === id) {
            continue;
        }
        if (item.children.length > 0) {
            const filteredChildren = removeItem(item.children, id);
            const nextItem: TreeItem = { ...item, children: filteredChildren };
            result.push(nextItem);
        }
        else {
            result.push(item);
        }
    }
    return result;
}

export function setProperty<K extends keyof TreeItem>(
    items: TreeItem[],
    id: string,
    property: K,
    setter: SetterFn<TreeItem[K]>,
): TreeItem[] {
    return items.map((item) => {
        if (item.id === id) {
            const nextValue = setter(item[property]);
            return { ...item, [property]: nextValue };
        }
        if (item.children.length > 0) {
            const nextChildren = setProperty(item.children, id, property, setter);
            return { ...item, children: nextChildren };
        }
        return item;
    });
}

export function insertChild(items: TreeItem[], parentId: string | null, newItem: TreeItem): TreeItem[] {
    if (parentId === null) {
        return [...items, newItem];
    }
    return items.map((item) => {
        if (item.id === parentId) {
            const nextChildren = [...item.children, newItem];
            return { ...item, collapsed: false, children: nextChildren };
        }
        if (item.children.length > 0) {
            const nextChildren = insertChild(item.children, parentId, newItem);
            return { ...item, children: nextChildren };
        }
        return item;
    });
}

function countChildren(items: TreeItem[]): number {
    return items.reduce((accumulator, item) => {
        const selfCount = 1;
        const descendantCount = countChildren(item.children);
        return accumulator + selfCount + descendantCount;
    }, 0);
}

export function getChildCount(items: TreeItem[], id: string | null): number {
    const item = findItemDeep(items, id);
    if (!item) {
        return 0;
    }
    return countChildren(item.children);
}

export function getDirectChildCount(items: TreeItem[], id: string | null): number {
    const item = findItemDeep(items, id);
    if (!item) {
        return 0;
    }
    return item.children.length;
}

export function getItemPath(items: TreeItem[], id: string | null): ItemPathEntry[] {
    const path: ItemPathEntry[] = [];
    if (id === null) {
        return path;
    }

    function search(currentItems: TreeItem[], currentTrail: ItemPathEntry[]): boolean {
        for (const item of currentItems) {
            const entry: ItemPathEntry = { id: item.id, label: item.label };
            const nextTrail = [...currentTrail, entry];
            if (item.id === id) {
                nextTrail.forEach((pathEntry) => {
                    path.push(pathEntry);
                });
                return true;
            }
            if (item.children.length > 0) {
                const found = search(item.children, nextTrail);
                if (found) {
                    return true;
                }
            }
        }
        return false;
    }

    search(items, []);
    return path;
}

export function removeChildrenOf(flattenedItems: FlattenedItem[], ids: string[]): FlattenedItem[] {
    const excludeParentIds = [...ids];
    return flattenedItems.filter((item) => {
        if (item.parentId !== null && excludeParentIds.includes(item.parentId)) {
            if (item.childCount > 0) {
                excludeParentIds.push(item.id);
            }
            return false;
        }
        return true;
    });
}
