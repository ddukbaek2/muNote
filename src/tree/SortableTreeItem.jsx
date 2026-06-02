import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { TreeItem } from "./TreeItem.jsx";

const animateLayoutChanges = (args) => {
    const { isSorting, wasDragging } = args;
    if (isSorting || wasDragging) {
        return false;
    }
    return true;
};

export function SortableTreeItem(props) {
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
        transition: transition,
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
