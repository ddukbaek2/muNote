import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
    DndContext,
    DragOverlay,
    MeasuringStrategy,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableTreeItem } from "./SortableTreeItem";
import { TreeItem } from "./TreeItem";
import {
    buildTree,
    flattenTree,
    getProjection,
    removeChildrenOf,
    setProperty,
} from "./utilities";
import type { FlattenedItem, TreeItem as TreeItemData } from "../types";

const measuringConfiguration = {
    droppable: {
        strategy: MeasuringStrategy.Always,
    },
};

export interface SortableTreeProps {
    items: TreeItemData[];
    onItemsChange: (nextItems: TreeItemData[]) => void;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onAddChild: (id: string) => void;
    onRemove: (id: string) => void;
    onRename: (id: string, nextLabel: string) => void;
    indentationWidth?: number;
}

export function SortableTree({
    items,
    onItemsChange,
    selectedId,
    onSelect,
    onAddChild,
    onRemove,
    onRename,
    indentationWidth = 24,
}: SortableTreeProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [offsetLeft, setOffsetLeft] = useState<number>(0);

    const flattenedItems = useMemo<FlattenedItem[]>(() => {
        const flattenedTree = flattenTree(items);
        const collapsedItems = flattenedTree.reduce<string[]>((accumulator, item) => {
            if (item.collapsed && item.childCount > 0) {
                return [...accumulator, item.id];
            }
            return accumulator;
        }, []);
        const idsToRemove = activeId !== null ? [activeId, ...collapsedItems] : collapsedItems;
        return removeChildrenOf(flattenedTree, idsToRemove);
    }, [activeId, items]);

    const projected = activeId !== null && overId !== null
        ? getProjection(flattenedItems, activeId, overId, offsetLeft, indentationWidth)
        : null;

    const sortedIds = useMemo(() => {
        return flattenedItems.map((item) => item.id);
    }, [flattenedItems]);

    const activeItem = activeId !== null
        ? flattenedItems.find((item) => item.id === activeId)
        : null;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
    );

    function resetState() {
        setOverId(null);
        setActiveId(null);
        setOffsetLeft(0);
        document.body.style.removeProperty("cursor");
    }

    function handleDragStart(event: DragStartEvent) {
        const activeDraggableId = String(event.active.id);
        setActiveId(activeDraggableId);
        setOverId(activeDraggableId);
        document.body.style.setProperty("cursor", "grabbing");
    }

    function handleDragMove(event: DragMoveEvent) {
        setOffsetLeft(event.delta.x);
    }

    function handleDragOver(event: DragOverEvent) {
        const nextOverId = event.over ? String(event.over.id) : null;
        setOverId(nextOverId);
    }

    function handleDragEnd(event: DragEndEvent) {
        const active = event.active;
        const over = event.over;
        resetState();
        if (!projected || !over) {
            return;
        }
        const depth = projected.depth;
        const parentId = projected.parentId;
        const clonedItems = flattenTree(items);
        const overIndex = clonedItems.findIndex((item) => item.id === String(over.id));
        const activeIndex = clonedItems.findIndex((item) => item.id === String(active.id));
        const activeTreeItem = clonedItems[activeIndex];
        clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };
        const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
        const newItems = buildTree(sortedItems);
        onItemsChange(newItems);
    }

    function handleDragCancel() {
        resetState();
    }

    function handleCollapse(id: string) {
        const nextItems = setProperty(items, id, "collapsed", (value) => {
            return !value;
        });
        onItemsChange(nextItems);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={measuringConfiguration}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
                <ul className="sortable-tree">
                    {flattenedItems.map((item) => {
                        const itemDepth = item.id === activeId && projected
                            ? projected.depth
                            : item.depth;
                        return (
                            <SortableTreeItem
                                key={item.id}
                                id={item.id}
                                label={item.label}
                                depth={itemDepth}
                                indentationWidth={indentationWidth}
                                hasChildren={item.childCount > 0}
                                collapsed={item.collapsed}
                                childCount={item.childCount}
                                selected={item.id === selectedId}
                                onCollapse={() => handleCollapse(item.id)}
                                onSelect={() => onSelect(item.id)}
                                onAddChild={() => onAddChild(item.id)}
                                onRemove={() => onRemove(item.id)}
                                onRename={(nextLabel) => onRename(item.id, nextLabel)}
                            />
                        );
                    })}
                </ul>
            </SortableContext>
            {createPortal(
                <DragOverlay>
                    {activeId !== null && activeItem
                        ? (
                            <TreeItem
                                clone
                                label={activeItem.label}
                                depth={activeItem.depth}
                                indentationWidth={indentationWidth}
                                hasChildren={activeItem.childCount > 0}
                                collapsed={activeItem.collapsed}
                            />
                        )
                        : null}
                </DragOverlay>,
                document.body,
            )}
        </DndContext>
    );
}
