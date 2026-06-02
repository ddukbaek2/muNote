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
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableTreeItem } from "./SortableTreeItem.jsx";
import { TreeItem } from "./TreeItem.jsx";
import {
    buildTree,
    flattenTree,
    getProjection,
    removeChildrenOf,
    setProperty,
} from "./utilities.js";

const measuringConfiguration = {
    droppable: {
        strategy: MeasuringStrategy.Always,
    },
};

export function SortableTree({
    items,
    onItemsChange,
    selectedId,
    onSelect,
    onAddChild,
    onRemove,
    onRename,
    indentationWidth = 24,
}) {
    const [activeId, setActiveId] = useState(null);
    const [overId, setOverId] = useState(null);
    const [offsetLeft, setOffsetLeft] = useState(0);

    const flattenedItems = useMemo(() => {
        const flattenedTree = flattenTree(items);
        const collapsedItems = flattenedTree.reduce((accumulator, item) => {
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

    function handleDragStart(event) {
        const activeDraggableId = event.active.id;
        setActiveId(activeDraggableId);
        setOverId(activeDraggableId);
        document.body.style.setProperty("cursor", "grabbing");
    }

    function handleDragMove(event) {
        setOffsetLeft(event.delta.x);
    }

    function handleDragOver(event) {
        const nextOverId = event.over ? event.over.id : null;
        setOverId(nextOverId);
    }

    function handleDragEnd(event) {
        const active = event.active;
        const over = event.over;
        resetState();
        if (!projected || !over) {
            return;
        }
        const depth = projected.depth;
        const parentId = projected.parentId;
        const clonedItems = flattenTree(items);
        const overIndex = clonedItems.findIndex((item) => item.id === over.id);
        const activeIndex = clonedItems.findIndex((item) => item.id === active.id);
        const activeTreeItem = clonedItems[activeIndex];
        clonedItems[activeIndex] = { ...activeTreeItem, depth, parentId };
        const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
        const newItems = buildTree(sortedItems);
        onItemsChange(newItems);
    }

    function handleDragCancel() {
        resetState();
    }

    function handleCollapse(id) {
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
