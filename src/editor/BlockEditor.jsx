import { useEffect, useRef } from "react";
import {
    DndContext,
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

import { SortableBlock } from "./SortableBlock.jsx";
import { createId } from "../tree/utilities.js";

export function BlockEditor({ blocks, onChange }) {
    const textareaRefs = useRef({});
    const pendingFocus = useRef(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
    );

    useEffect(() => {
        const pending = pendingFocus.current;
        if (!pending) {
            return;
        }
        const element = textareaRefs.current[pending.id];
        if (element) {
            element.focus();
            const caret = pending.caret;
            element.setSelectionRange(caret, caret);
        }
        pendingFocus.current = null;
    });

    function registerRef(id, element) {
        if (element) {
            textareaRefs.current[id] = element;
        }
        else {
            delete textareaRefs.current[id];
        }
    }

    function handleDragEnd(event) {
        const active = event.active;
        const over = event.over;
        if (!over || active.id === over.id) {
            return;
        }
        const oldIndex = blocks.findIndex((block) => block.id === active.id);
        const newIndex = blocks.findIndex((block) => block.id === over.id);
        const nextBlocks = arrayMove(blocks, oldIndex, newIndex);
        onChange(nextBlocks);
    }

    function handleTextChange(id, text) {
        const nextBlocks = blocks.map((block) => {
            if (block.id === id) {
                return { ...block, text: text };
            }
            return block;
        });
        onChange(nextBlocks);
    }

    function handleTypeChange(id, nextType) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            const updatedBlock = { ...block, type: nextType };
            if (nextType !== "checklist") {
                delete updatedBlock.checked;
            }
            else if (typeof updatedBlock.checked !== "boolean") {
                updatedBlock.checked = false;
            }
            return updatedBlock;
        });
        onChange(nextBlocks);
    }

    function handleCheckChange(id, nextChecked) {
        const nextBlocks = blocks.map((block) => {
            if (block.id === id) {
                return { ...block, checked: nextChecked };
            }
            return block;
        });
        onChange(nextBlocks);
    }

    function getSplitChildType(currentType) {
        if (currentType === "h1" || currentType === "h2" || currentType === "h3" || currentType === "heading") {
            return "text";
        }
        if (currentType === "checklist") {
            return "checklist";
        }
        return "text";
    }

    function handleSplit(id, caretIndex) {
        const index = blocks.findIndex((block) => block.id === id);
        const currentBlock = blocks[index];
        const beforeText = currentBlock.text.slice(0, caretIndex);
        const afterText = currentBlock.text.slice(caretIndex);
        const newType = getSplitChildType(currentBlock.type);
        const newBlock = { id: createId("block"), type: newType, text: afterText };
        if (newType === "checklist") {
            newBlock.checked = false;
        }
        const nextBlocks = [...blocks];
        nextBlocks[index] = { ...currentBlock, text: beforeText };
        nextBlocks.splice(index + 1, 0, newBlock);
        pendingFocus.current = { id: newBlock.id, caret: 0 };
        onChange(nextBlocks);
    }

    function handleMergeBackward(id) {
        const index = blocks.findIndex((block) => block.id === id);
        if (index <= 0) {
            return;
        }
        const previousBlock = blocks[index - 1];
        const currentBlock = blocks[index];
        if (previousBlock.type === "divider") {
            const nextBlocks = [...blocks];
            nextBlocks.splice(index - 1, 1);
            pendingFocus.current = { id: currentBlock.id, caret: 0 };
            onChange(nextBlocks);
            return;
        }
        const mergedText = previousBlock.text + currentBlock.text;
        const caret = previousBlock.text.length;
        const nextBlocks = [...blocks];
        nextBlocks[index - 1] = { ...previousBlock, text: mergedText };
        nextBlocks.splice(index, 1);
        pendingFocus.current = { id: previousBlock.id, caret: caret };
        onChange(nextBlocks);
    }

    function handleAddBlockAfter(id, blockType) {
        const newType = blockType ? blockType : "text";
        const index = blocks.findIndex((block) => block.id === id);
        const newBlock = { id: createId("block"), type: newType, text: "" };
        if (newType === "checklist") {
            newBlock.checked = false;
        }
        const nextBlocks = [...blocks];
        nextBlocks.splice(index + 1, 0, newBlock);
        if (newType !== "divider") {
            pendingFocus.current = { id: newBlock.id, caret: 0 };
        }
        onChange(nextBlocks);
    }

    function handleDuplicateBlock(id) {
        const index = blocks.findIndex((block) => block.id === id);
        if (index < 0) {
            return;
        }
        const sourceBlock = blocks[index];
        const duplicateBlock = { ...sourceBlock, id: createId("block") };
        const nextBlocks = [...blocks];
        nextBlocks.splice(index + 1, 0, duplicateBlock);
        if (duplicateBlock.type !== "divider") {
            const caret = typeof duplicateBlock.text === "string" ? duplicateBlock.text.length : 0;
            pendingFocus.current = { id: duplicateBlock.id, caret: caret };
        }
        onChange(nextBlocks);
    }

    function handleColorChange(id, nextColor) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            if (nextColor === null) {
                const stripped = { ...block };
                delete stripped.color;
                return stripped;
            }
            return { ...block, color: nextColor };
        });
        onChange(nextBlocks);
    }

    function handleThicknessChange(id, nextThickness) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            return { ...block, thickness: nextThickness };
        });
        onChange(nextBlocks);
    }

    function handleLineStyleChange(id, nextLineStyle) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            return { ...block, lineStyle: nextLineStyle };
        });
        onChange(nextBlocks);
    }

    function handleLanguageChange(id, nextLanguage) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            if (!nextLanguage) {
                const stripped = { ...block };
                delete stripped.language;
                return stripped;
            }
            return { ...block, language: nextLanguage };
        });
        onChange(nextBlocks);
    }

    function handleAddBlockAtEnd() {
        const newBlock = { id: createId("block"), type: "text", text: "" };
        const nextBlocks = [...blocks, newBlock];
        pendingFocus.current = { id: newBlock.id, caret: 0 };
        onChange(nextBlocks);
    }

    function handleTailClick(event) {
        if (event.target !== event.currentTarget) {
            return;
        }
        handleAddBlockAtEnd();
    }

    function handleRemoveBlock(id) {
        const index = blocks.findIndex((block) => block.id === id);
        const nextBlocks = blocks.filter((block) => block.id !== id);
        if (nextBlocks.length === 0) {
            const replacement = { id: createId("block"), type: "text", text: "" };
            pendingFocus.current = { id: replacement.id, caret: 0 };
            onChange([replacement]);
            return;
        }
        const previousBlock = blocks[index - 1];
        const focusTarget = previousBlock ? previousBlock : nextBlocks[0];
        pendingFocus.current = { id: focusTarget.id, caret: focusTarget.text.length };
        onChange(nextBlocks);
    }

    const blockIds = blocks.map((block) => block.id);

    return (
        <div className="block-editor">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                    {blocks.map((block) => {
                        return (
                            <SortableBlock
                                key={block.id}
                                id={block.id}
                                type={block.type}
                                checked={block.checked}
                                color={block.color}
                                text={block.text}
                                thickness={block.thickness}
                                lineStyle={block.lineStyle}
                                language={block.language}
                                registerRef={registerRef}
                                onTextChange={handleTextChange}
                                onTypeChange={handleTypeChange}
                                onCheckChange={handleCheckChange}
                                onColorChange={handleColorChange}
                                onThicknessChange={handleThicknessChange}
                                onLineStyleChange={handleLineStyleChange}
                                onLanguageChange={handleLanguageChange}
                                onSplit={handleSplit}
                                onMergeBackward={handleMergeBackward}
                                onAddBlockAfter={handleAddBlockAfter}
                                onRemoveBlock={handleRemoveBlock}
                                onDuplicateBlock={handleDuplicateBlock}
                            />
                        );
                    })}
                </SortableContext>
            </DndContext>
            <div className="block-editor-tail" onClick={handleTailClick} />
        </div>
    );
}
