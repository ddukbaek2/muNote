import {
    useEffect,
    useRef,
    type MouseEvent,
} from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableBlock } from "./SortableBlock";
import { createId } from "../tree/utilities";
import type { Block, BlockColor, BlockType } from "../types";

interface PendingFocus {
    id: string;
    caret: number;
}

export interface BlockEditorProps {
    blocks: Block[];
    onChange: (nextBlocks: Block[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
    const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({});
    const pendingFocus = useRef<PendingFocus | null>(null);

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

    function registerRef(id: string, element: HTMLTextAreaElement | null) {
        if (element) {
            textareaRefs.current[id] = element;
        }
        else {
            delete textareaRefs.current[id];
        }
    }

    function handleDragEnd(event: DragEndEvent) {
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

    function handleTextChange(id: string, text: string) {
        const nextBlocks = blocks.map((block) => {
            if (block.id === id) {
                return { ...block, text: text };
            }
            return block;
        });
        onChange(nextBlocks);
    }

    function handleTypeChange(id: string, nextType: string) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            const updatedBlock: Block = { ...block, type: nextType as BlockType };
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

    function handleCheckChange(id: string, nextChecked: boolean) {
        const nextBlocks = blocks.map((block) => {
            if (block.id === id) {
                return { ...block, checked: nextChecked };
            }
            return block;
        });
        onChange(nextBlocks);
    }

    function getSplitChildType(currentType: BlockType | undefined): BlockType {
        if (currentType === "h1" || currentType === "h2" || currentType === "h3" || currentType === "heading") {
            return "text";
        }
        if (currentType === "checklist") {
            return "checklist";
        }
        return "text";
    }

    function handleSplit(id: string, caretIndex: number) {
        const index = blocks.findIndex((block) => block.id === id);
        const currentBlock = blocks[index];
        const beforeText = currentBlock.text.slice(0, caretIndex);
        const afterText = currentBlock.text.slice(caretIndex);
        const newType = getSplitChildType(currentBlock.type);
        const newBlock: Block = { id: createId("block"), type: newType, text: afterText };
        if (newType === "checklist") {
            newBlock.checked = false;
        }
        const nextBlocks = [...blocks];
        nextBlocks[index] = { ...currentBlock, text: beforeText };
        nextBlocks.splice(index + 1, 0, newBlock);
        pendingFocus.current = { id: newBlock.id, caret: 0 };
        onChange(nextBlocks);
    }

    function handleMergeBackward(id: string) {
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

    function handleAddBlockAfter(id: string, blockType?: string) {
        const newType = (blockType ? blockType : "text") as BlockType;
        const index = blocks.findIndex((block) => block.id === id);
        const newBlock: Block = { id: createId("block"), type: newType, text: "" };
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

    function handleDuplicateBlock(id: string) {
        const index = blocks.findIndex((block) => block.id === id);
        if (index < 0) {
            return;
        }
        const sourceBlock = blocks[index];
        const duplicateBlock: Block = { ...sourceBlock, id: createId("block") };
        const nextBlocks = [...blocks];
        nextBlocks.splice(index + 1, 0, duplicateBlock);
        if (duplicateBlock.type !== "divider") {
            const caret = typeof duplicateBlock.text === "string" ? duplicateBlock.text.length : 0;
            pendingFocus.current = { id: duplicateBlock.id, caret: caret };
        }
        onChange(nextBlocks);
    }

    function handleColorChange(id: string, nextColor: BlockColor | null) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            if (nextColor === null) {
                const stripped: Block = { ...block };
                delete stripped.color;
                return stripped;
            }
            return { ...block, color: nextColor };
        });
        onChange(nextBlocks);
    }

    function handleThicknessChange(id: string, nextThickness: number) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            return { ...block, thickness: nextThickness };
        });
        onChange(nextBlocks);
    }

    function handleLineStyleChange(id: string, nextLineStyle: string) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            return { ...block, lineStyle: nextLineStyle as Block["lineStyle"] };
        });
        onChange(nextBlocks);
    }

    function handleLanguageChange(id: string, nextLanguage: string) {
        const nextBlocks = blocks.map((block) => {
            if (block.id !== id) {
                return block;
            }
            if (!nextLanguage) {
                const stripped: Block = { ...block };
                delete stripped.language;
                return stripped;
            }
            return { ...block, language: nextLanguage };
        });
        onChange(nextBlocks);
    }

    function handleAddBlockAtEnd() {
        const newBlock: Block = { id: createId("block"), type: "text", text: "" };
        const nextBlocks = [...blocks, newBlock];
        pendingFocus.current = { id: newBlock.id, caret: 0 };
        onChange(nextBlocks);
    }

    function handleTailClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target !== event.currentTarget) {
            return;
        }
        handleAddBlockAtEnd();
    }

    function handleRemoveBlock(id: string) {
        const index = blocks.findIndex((block) => block.id === id);
        const nextBlocks = blocks.filter((block) => block.id !== id);
        if (nextBlocks.length === 0) {
            const replacement: Block = { id: createId("block"), type: "text", text: "" };
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
