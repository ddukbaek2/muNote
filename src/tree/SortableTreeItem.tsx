import { useSortable, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TreeItem, type TreeItemProps } from "./TreeItem";

const animateLayoutChanges: AnimateLayoutChanges = (args) => {
    const { isSorting, wasDragging } = args;
    if (isSorting || wasDragging) {
        return false;
    }
    return true;
};

export interface SortableTreeItemProps extends Omit<TreeItemProps, "wrapperRef" | "handleProps" | "ghost" | "disableInteraction" | "style"> {
    id: string;
}

export function SortableTreeItem(props: SortableTreeItemProps) {
    const {
        id,
        depth,
        ...rest
    } = props;

    const {
        attributes,
        isDragging,
        isSorting,
        listeners,
        setDraggableNodeRef,
        setDroppableNodeRef,
        transform,
        transition,
    } = useSortable({
        id: id,
        animateLayoutChanges: animateLayoutChanges,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: transition || undefined,
    };

    return (
        <TreeItem
            ref={setDraggableNodeRef}
            wrapperRef={setDroppableNodeRef}
            style={style}
            depth={depth}
            ghost={isDragging}
            disableInteraction={isSorting}
            handleProps={{ ...attributes, ...listeners }}
            {...rest}
        />
    );
}
