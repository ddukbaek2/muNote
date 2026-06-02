import {
    forwardRef,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type KeyboardEvent,
    type LegacyRef,
    type MouseEvent,
} from "react";

export interface TreeItemProps extends HTMLAttributes<HTMLLIElement> {
    label: string;
    depth: number;
    indentationWidth: number;
    hasChildren: boolean;
    collapsed: boolean;
    childCount?: number;
    selected?: boolean;
    clone?: boolean;
    ghost?: boolean;
    disableInteraction?: boolean;
    style?: CSSProperties;
    wrapperRef?: LegacyRef<HTMLLIElement> | ((node: HTMLLIElement | null) => void);
    handleProps?: Record<string, unknown>;
    onCollapse?: () => void;
    onSelect?: () => void;
    onAddChild?: () => void;
    onRemove?: () => void;
    onRename?: (nextLabel: string) => void;
}

export const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(function TreeItem(props, ref) {
    const {
        label,
        depth,
        indentationWidth,
        hasChildren,
        collapsed,
        selected,
        clone,
        ghost,
        disableInteraction,
        style,
        wrapperRef,
        handleProps,
        onCollapse,
        onSelect,
        onAddChild,
        onRemove,
        onRename,
        childCount: _childCount,
        ...wrapperProps
    } = props;

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState<string>(label || "");
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!isEditing) {
            setDraft(label || "");
        }
    }, [label, isEditing]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            const inputElement = inputRef.current;
            inputElement.focus();
            inputElement.select();
        }
    }, [isEditing]);

    function startEditing() {
        if (clone || disableInteraction) {
            return;
        }
        setDraft(label || "");
        setIsEditing(true);
    }

    function commitEditing() {
        if (onRename) {
            onRename(draft);
        }
        setIsEditing(false);
    }

    function cancelEditing() {
        setDraft(label || "");
        setIsEditing(false);
    }

    function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            event.preventDefault();
            commitEditing();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            cancelEditing();
        }
    }

    const spacing = indentationWidth * depth;
    const wrapperClassNames = ["tree-item-wrapper"];
    if (clone) {
        wrapperClassNames.push("is-clone");
    }
    if (ghost) {
        wrapperClassNames.push("is-ghost");
    }
    if (disableInteraction) {
        wrapperClassNames.push("disable-interaction");
    }

    const rowClassNames = ["tree-item-row"];
    if (selected) {
        rowClassNames.push("is-selected");
    }
    if (isEditing) {
        rowClassNames.push("is-editing");
    }

    return (
        <li
            ref={wrapperRef as LegacyRef<HTMLLIElement>}
            className={wrapperClassNames.join(" ")}
            style={{ paddingLeft: `${spacing}px` }}
            {...wrapperProps}
        >
            <div ref={ref} className={rowClassNames.join(" ")} style={style}>
                <button
                    type="button"
                    className={`tree-item-collapse ${hasChildren ? "" : "is-hidden"}`}
                    aria-label={collapsed ? "펼치기" : "접기"}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        if (onCollapse) {
                            onCollapse();
                        }
                    }}
                >
                    <span className={`tree-item-chevron ${collapsed ? "" : "is-open"}`}>{collapsed ? "▶" : "▼"}</span>
                </button>

                <button
                    type="button"
                    className="tree-item-handle"
                    aria-label="이동 핸들"
                    {...handleProps}
                >
                    ⠿
                </button>

                {isEditing
                    ? (
                        <input
                            ref={inputRef}
                            className="tree-item-edit"
                            type="text"
                            value={draft}
                            placeholder="제목 없음"
                            onChange={(event) => setDraft(event.target.value)}
                            onBlur={commitEditing}
                            onKeyDown={handleInputKeyDown}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                        />
                    )
                    : (
                        <span
                            className="tree-item-label"
                            onClick={() => {
                                if (onSelect) {
                                    onSelect();
                                }
                            }}
                            onDoubleClick={startEditing}
                        >
                            {label
                                ? label
                                : <span className="tree-item-label-empty">제목 없음</span>}
                        </span>
                    )}

                {clone || isEditing
                    ? null
                    : (
                        <div className="tree-item-actions">
                            <button
                                type="button"
                                className="tree-item-action"
                                aria-label="이름 바꾸기"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    startEditing();
                                }}
                            >
                                ✎
                            </button>
                            <button
                                type="button"
                                className="tree-item-action"
                                aria-label="하위 아이템 추가"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (onAddChild) {
                                        onAddChild();
                                    }
                                }}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                className="tree-item-action tree-item-action-remove"
                                aria-label="아이템 삭제"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (onRemove) {
                                        onRemove();
                                    }
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}
            </div>
        </li>
    );
});
