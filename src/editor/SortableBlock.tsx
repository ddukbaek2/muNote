import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type CSSProperties,
    type KeyboardEvent,
} from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import hljs from "highlight.js/lib/common";

import { BlockMenu } from "./BlockMenu";
import type { BlockColor, BlockMenuItem, BlockType, LineStyle } from "../types";

const PLACEHOLDERS: Record<string, string> = {
    text: "내용을 입력하세요.",
    h1: "제목 1",
    h2: "제목 2",
    h3: "제목 3",
    checklist: "할 일을 입력하세요.",
    code: "코드를 입력하세요.",
};

const TYPE_ITEMS: BlockMenuItem[] = [
    { key: "text", label: "텍스트", icon: "T" },
    { key: "h1", label: "제목 1", icon: "H₁" },
    { key: "h2", label: "제목 2", icon: "H₂" },
    { key: "h3", label: "제목 3", icon: "H₃" },
    { key: "checklist", label: "체크리스트", icon: "☐" },
    { key: "code", label: "코드", icon: "</>" },
    { key: "divider", label: "수평선", icon: "─" },
];

interface ThicknessOption {
    value: number;
    label: string;
}

const THICKNESS_OPTIONS: ThicknessOption[] = [
    { value: 1, label: "1px" },
    { value: 2, label: "2px" },
    { value: 4, label: "4px" },
    { value: 6, label: "6px" },
];

interface LineStyleOption {
    value: LineStyle;
    label: string;
}

const LINE_STYLE_OPTIONS: LineStyleOption[] = [
    { value: "solid", label: "실선" },
    { value: "dashed", label: "파선" },
    { value: "dotted", label: "점선" },
    { value: "double", label: "이중선" },
];

interface LanguageOption {
    value: string;
    label: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
    { value: "plaintext", label: "Plain Text" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "html", label: "HTML" },
    { value: "xml", label: "XML" },
    { value: "css", label: "CSS" },
    { value: "json", label: "JSON" },
    { value: "bash", label: "Bash" },
    { value: "shell", label: "Shell" },
    { value: "sql", label: "SQL" },
    { value: "java", label: "Java" },
    { value: "csharp", label: "C#" },
    { value: "cpp", label: "C++" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "markdown", label: "Markdown" },
    { value: "yaml", label: "YAML" },
];

interface ColorOption {
    key: BlockColor | null;
    label: string;
}

const COLOR_OPTIONS: ColorOption[] = [
    { key: null, label: "기본" },
    { key: "gray", label: "회색" },
    { key: "brown", label: "갈색" },
    { key: "orange", label: "주황" },
    { key: "yellow", label: "노랑" },
    { key: "green", label: "녹색" },
    { key: "blue", label: "파랑" },
    { key: "purple", label: "보라" },
    { key: "pink", label: "분홍" },
    { key: "red", label: "빨강" },
];

function normalizeBlockType(type: BlockType | undefined): BlockType {
    if (type === "heading") {
        return "h2";
    }
    if (type) {
        return type;
    }
    return "text";
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function highlightCode(code: string, language: string): string {
    const safeCode = typeof code === "string" ? code : "";
    if (!language || language === "plaintext") {
        return escapeHtml(safeCode);
    }
    if (hljs.getLanguage(language)) {
        try {
            const result = hljs.highlight(safeCode, { language: language, ignoreIllegals: true });
            return result.value;
        }
        catch {
            return escapeHtml(safeCode);
        }
    }
    return escapeHtml(safeCode);
}

interface ColorPaletteProps {
    currentColor: BlockColor | null;
    onSelectColor: (color: BlockColor | null) => void;
}

function ColorPalette({ currentColor, onSelectColor }: ColorPaletteProps) {
    return (
        <div className="block-color-palette">
            {COLOR_OPTIONS.map((option) => {
                const isCurrent = (option.key || null) === (currentColor || null);
                const swatchClassNames = ["block-color-swatch"];
                if (isCurrent) {
                    swatchClassNames.push("is-current");
                }
                const swatchKey = option.key ? option.key : "default";
                return (
                    <button
                        key={swatchKey}
                        type="button"
                        className={swatchClassNames.join(" ")}
                        data-color={swatchKey}
                        aria-label={option.label}
                        title={option.label}
                        onClick={() => onSelectColor(option.key)}
                    >
                        A
                    </button>
                );
            })}
        </div>
    );
}

export interface SortableBlockProps {
    id: string;
    type?: BlockType;
    checked?: boolean;
    color?: BlockColor | null;
    text: string;
    thickness?: number;
    lineStyle?: LineStyle;
    language?: string;
    registerRef: (id: string, element: HTMLTextAreaElement | null) => void;
    onTextChange: (id: string, text: string) => void;
    onTypeChange: (id: string, type: string) => void;
    onCheckChange: (id: string, checked: boolean) => void;
    onColorChange: (id: string, color: BlockColor | null) => void;
    onThicknessChange: (id: string, thickness: number) => void;
    onLineStyleChange: (id: string, style: string) => void;
    onLanguageChange: (id: string, language: string) => void;
    onSplit: (id: string, caretIndex: number) => void;
    onMergeBackward: (id: string) => void;
    onAddBlockAfter: (id: string, type?: string) => void;
    onRemoveBlock: (id: string) => void;
    onDuplicateBlock: (id: string) => void;
}

export function SortableBlock(props: SortableBlockProps) {
    const {
        id,
        type,
        checked,
        color,
        text,
        thickness,
        lineStyle,
        language,
        registerRef,
        onTextChange,
        onTypeChange,
        onCheckChange,
        onColorChange,
        onThicknessChange,
        onLineStyleChange,
        onLanguageChange,
        onSplit,
        onMergeBackward,
        onAddBlockAfter,
        onRemoveBlock,
        onDuplicateBlock,
    } = props;

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id });

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const addButtonRef = useRef<HTMLButtonElement | null>(null);
    const handleButtonRef = useRef<HTMLButtonElement | null>(null);

    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [handleMenuOpen, setHandleMenuOpen] = useState(false);

    const blockType = normalizeBlockType(type);
    const isChecked = checked === true;
    const currentColor: BlockColor | null = color ? color : null;
    const placeholder = PLACEHOLDERS[blockType] || PLACEHOLDERS.text;
    const dividerThickness = typeof thickness === "number" ? thickness : 2;
    const dividerLineStyle: LineStyle = lineStyle ? lineStyle : "solid";
    const codeLanguage = language ? language : "plaintext";

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition: transition || undefined,
    };

    useLayoutEffect(() => {
        const element = textareaRef.current;
        if (!element) {
            return;
        }
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
    }, [text, blockType]);

    useEffect(() => {
        if (isDragging) {
            setAddMenuOpen(false);
            setHandleMenuOpen(false);
        }
    }, [isDragging]);

    const highlightedHtml = useMemo<string>(() => {
        if (blockType !== "code") {
            return "";
        }
        return highlightCode(text, codeLanguage);
    }, [blockType, text, codeLanguage]);

    function setTextareaRefs(element: HTMLTextAreaElement | null) {
        textareaRef.current = element;
        registerRef(id, element);
    }

    function setHandleRefs(element: HTMLButtonElement | null) {
        setActivatorNodeRef(element);
        handleButtonRef.current = element;
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (blockType === "code" && event.key === "Tab") {
            event.preventDefault();
            const element = event.currentTarget;
            const start = element.selectionStart;
            const end = element.selectionEnd;
            element.setRangeText("\t", start, end, "end");
            onTextChange(id, element.value);
            return;
        }
        if (event.key === "Enter" && !event.shiftKey) {
            if (blockType === "code") {
                return;
            }
            event.preventDefault();
            const caretIndex = event.currentTarget.selectionStart;
            onSplit(id, caretIndex);
            return;
        }
        if (event.key === "Backspace") {
            const element = event.currentTarget;
            if (element.selectionStart === 0 && element.selectionEnd === 0) {
                event.preventDefault();
                onMergeBackward(id);
            }
        }
    }

    function handleCheckboxChange(event: ChangeEvent<HTMLInputElement>) {
        onCheckChange(id, event.target.checked);
    }

    function handleAddMenuSelect(key: string) {
        onAddBlockAfter(id, key);
    }

    function handleHandleMenuSelect(key: string) {
        if (key === "remove") {
            onRemoveBlock(id);
            return;
        }
        if (key === "duplicate") {
            onDuplicateBlock(id);
            return;
        }
        if (key.startsWith("convert:")) {
            const nextType = key.slice("convert:".length);
            onTypeChange(id, nextType);
            return;
        }
        if (key.startsWith("thickness:")) {
            const value = parseInt(key.slice("thickness:".length), 10);
            onThicknessChange(id, value);
            return;
        }
        if (key.startsWith("lineStyle:")) {
            onLineStyleChange(id, key.slice("lineStyle:".length));
        }
    }

    function handleColorSelect(colorKey: BlockColor | null) {
        onColorChange(id, colorKey);
        setHandleMenuOpen(false);
    }

    function handleLanguageSelectChange(event: ChangeEvent<HTMLSelectElement>) {
        onLanguageChange(id, event.target.value);
    }

    function handleCopyCode() {
        const content = typeof text === "string" ? text : "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(content).catch(() => {});
        }
    }

    const addMenuItems: BlockMenuItem[] = [
        { header: "블록 추가" },
        ...TYPE_ITEMS,
    ];

    const convertMenuItems: BlockMenuItem[] = TYPE_ITEMS.map((item) => {
        return { key: `convert:${item.key}`, label: item.label, icon: item.icon };
    });

    let handleMenuItems: BlockMenuItem[];
    if (blockType === "divider") {
        const thicknessItems: BlockMenuItem[] = THICKNESS_OPTIONS.map((option) => {
            return {
                key: `thickness:${option.value}`,
                label: option.label,
                icon: option.value === dividerThickness ? "☑" : "☐",
            };
        });
        const lineStyleItems: BlockMenuItem[] = LINE_STYLE_OPTIONS.map((option) => {
            return {
                key: `lineStyle:${option.value}`,
                label: option.label,
                icon: option.value === dividerLineStyle ? "☑" : "☐",
            };
        });
        handleMenuItems = [
            { header: "전환" },
            ...convertMenuItems,
            { divider: true },
            { header: "선 두께" },
            ...thicknessItems,
            { divider: true },
            { header: "선 스타일" },
            ...lineStyleItems,
            { divider: true },
            { key: "duplicate", label: "복제", icon: "⎘" },
            { key: "remove", label: "삭제", icon: "×", danger: true },
        ];
    }
    else if (blockType === "code") {
        handleMenuItems = [
            { header: "전환" },
            ...convertMenuItems,
            { divider: true },
            { header: "텍스트 색" },
            {
                custom: (
                    <ColorPalette
                        currentColor={currentColor}
                        onSelectColor={handleColorSelect}
                    />
                ),
            },
            { divider: true },
            { key: "duplicate", label: "복제", icon: "⎘" },
            { key: "remove", label: "삭제", icon: "×", danger: true },
        ];
    }
    else {
        handleMenuItems = [
            { header: "전환" },
            ...convertMenuItems,
            { divider: true },
            { header: "텍스트 색" },
            {
                custom: (
                    <ColorPalette
                        currentColor={currentColor}
                        onSelectColor={handleColorSelect}
                    />
                ),
            },
            { divider: true },
            { key: "duplicate", label: "복제", icon: "⎘" },
            { key: "remove", label: "삭제", icon: "×", danger: true },
        ];
    }

    const wrapperClassNames = ["block-row"];
    if (isDragging) {
        wrapperClassNames.push("is-dragging");
    }

    let bodyContent;
    if (blockType === "divider") {
        const dividerInlineStyle: CSSProperties = {
            borderTopWidth: `${dividerThickness}px`,
            borderTopStyle: dividerLineStyle,
            borderTopColor: "var(--color-text-muted)",
        };
        bodyContent = <hr className="block-divider" style={dividerInlineStyle} />;
    }
    else if (blockType === "code") {
        const lineCount = typeof text === "string" ? text.split("\n").length : 1;
        bodyContent = (
            <div className="block-code-wrapper">
                <div className="block-code-toolbar">
                    <select
                        className="block-code-language"
                        value={codeLanguage}
                        onChange={handleLanguageSelectChange}
                        aria-label="코드 언어"
                    >
                        {LANGUAGE_OPTIONS.map((option) => {
                            return (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            );
                        })}
                    </select>
                    <button
                        type="button"
                        className="block-code-copy"
                        onClick={handleCopyCode}
                        aria-label="코드 복사"
                    >
                        복사
                    </button>
                </div>
                <div className="block-code-body">
                    <div className="block-code-line-numbers" aria-hidden="true">
                        {Array.from({ length: lineCount }).map((_, index) => {
                            return <span key={index}>{index + 1}</span>;
                        })}
                    </div>
                    <div className="block-code-input">
                        <pre
                            className="block-code-highlight hljs"
                            aria-hidden="true"
                        >
                            <code
                                className={`language-${codeLanguage}`}
                                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                            />
                        </pre>
                        <textarea
                            ref={setTextareaRefs}
                            className="block-textarea block-code-textarea"
                            rows={1}
                            value={text}
                            placeholder={placeholder}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoCorrect="off"
                            onChange={(event) => onTextChange(id, event.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                    </div>
                </div>
            </div>
        );
    }
    else if (blockType === "checklist") {
        bodyContent = (
            <>
                <input
                    type="checkbox"
                    className="block-checkbox"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    aria-label="완료 여부"
                />
                <textarea
                    ref={setTextareaRefs}
                    className="block-textarea"
                    rows={1}
                    value={text}
                    placeholder={placeholder}
                    onChange={(event) => onTextChange(id, event.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </>
        );
    }
    else {
        bodyContent = (
            <textarea
                ref={setTextareaRefs}
                className="block-textarea"
                rows={1}
                value={text}
                placeholder={placeholder}
                onChange={(event) => onTextChange(id, event.target.value)}
                onKeyDown={handleKeyDown}
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            className={wrapperClassNames.join(" ")}
            data-type={blockType}
            data-checked={isChecked ? "true" : "false"}
            data-color={currentColor ? currentColor : "default"}
            style={style}
        >
            <div className="block-gutter">
                <button
                    ref={addButtonRef}
                    type="button"
                    className="block-add"
                    aria-label="블록 추가 메뉴 열기"
                    aria-haspopup="menu"
                    aria-expanded={addMenuOpen}
                    onClick={() => setAddMenuOpen((open) => !open)}
                >
                    ＋
                </button>
                <button
                    ref={setHandleRefs}
                    type="button"
                    className="block-handle"
                    aria-label="블록 메뉴 열기 / 드래그"
                    aria-haspopup="menu"
                    aria-expanded={handleMenuOpen}
                    {...attributes}
                    {...listeners}
                    onClick={() => setHandleMenuOpen((open) => !open)}
                >
                    ⠿
                </button>
            </div>

            <div className="block-content">
                {bodyContent}
            </div>

            <button
                type="button"
                className="block-remove"
                aria-label="블록 삭제"
                onClick={() => onRemoveBlock(id)}
            >
                ×
            </button>

            {addMenuOpen
                ? (
                    <BlockMenu
                        anchorRef={addButtonRef}
                        items={addMenuItems}
                        onSelect={handleAddMenuSelect}
                        onClose={() => setAddMenuOpen(false)}
                    />
                )
                : null}

            {handleMenuOpen
                ? (
                    <BlockMenu
                        anchorRef={handleButtonRef}
                        items={handleMenuItems}
                        onSelect={handleHandleMenuSelect}
                        onClose={() => setHandleMenuOpen(false)}
                    />
                )
                : null}
        </div>
    );
}
