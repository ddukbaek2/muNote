import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type PointerEvent as ReactPointerEvent,
} from "react";

import { SortableTree } from "./tree/SortableTree";
import { BlockEditor } from "./editor/BlockEditor";
import { BlockMenu } from "./editor/BlockMenu";
import {
    createId,
    findItemDeep,
    getChildCount,
    getItemPath,
    insertChild,
    removeItem,
    setProperty,
} from "./tree/utilities";
import type { BlockMenuItem, ItemSettings, Theme, TreeItem } from "./types";
import "./tree/SortableTree.css";
import "./editor/BlockEditor.css";
import "./App.css";

const initialItems: TreeItem[] = [
    {
        id: "welcome",
        label: "환영합니다",
        blocks: [
            { id: "welcome-h1", type: "h1", text: "muNote 에 오신 것을 환영합니다" },
            { id: "welcome-t1", type: "text", text: "이 문서는 사용 가능한 블록 타입을 한눈에 보여주는 기본 샘플입니다. 좌측의 + 새 문서 로 새 문서를 만들고, 각 블록의 ⠿ 핸들 메뉴로 변환·색·복제·삭제할 수 있습니다." },
            { id: "welcome-div1", type: "divider", thickness: 2, lineStyle: "solid" },
            { id: "welcome-h2", type: "h2", color: "blue", text: "텍스트 블록" },
            { id: "welcome-t2", type: "text", text: "기본 단락 블록입니다. Enter 로 새 블록을 만들고, Shift+Enter 로 줄바꿈합니다." },
            { id: "welcome-t3", type: "text", color: "gray", text: "회색 강조 단락 — 핸들 메뉴 → 텍스트 색 에서 9가지 색을 적용할 수 있습니다." },
            { id: "welcome-t4", type: "text", color: "red", text: "빨강 강조 — 중요한 항목을 표시할 때 사용하세요." },
            { id: "welcome-h3a", type: "h3", text: "제목 단계 (H1 / H2 / H3)" },
            { id: "welcome-t5", type: "text", text: "위에서 H1, H2, H3 를 각각 보실 수 있습니다." },
            { id: "welcome-div2", type: "divider", thickness: 1, lineStyle: "dashed" },
            { id: "welcome-h2b", type: "h2", color: "green", text: "체크리스트" },
            { id: "welcome-c1", type: "checklist", checked: true, color: "green", text: "좌측 « 버튼으로 사이드바 토글" },
            { id: "welcome-c2", type: "checklist", checked: true, text: "콘텐트 우상단 ⋯ 로 제목·경로·문서영역 토글" },
            { id: "welcome-c3", type: "checklist", checked: false, color: "orange", text: "블록을 핸들로 드래그해 순서 바꿔보기" },
            { id: "welcome-c4", type: "checklist", checked: false, color: "purple", text: "코드 블록의 언어를 바꿔 하이라이트 확인" },
            { id: "welcome-div3", type: "divider", thickness: 1, lineStyle: "dotted" },
            { id: "welcome-h2c", type: "h2", color: "purple", text: "코드 블록" },
            { id: "welcome-t6", type: "text", text: "언어를 선택하면 자동 하이라이트됩니다. Tab 입력 가능, 우상단 복사 버튼으로 클립보드 복사." },
            {
                id: "welcome-code-js",
                type: "code",
                language: "javascript",
                text: "function fibonacci(n) {\n    if (n < 2) {\n        return n;\n    }\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nconsole.log(fibonacci(10)); // 55",
            },
            { id: "welcome-h3b", type: "h3", text: "TypeScript 예시" },
            {
                id: "welcome-code-ts",
                type: "code",
                language: "typescript",
                text: "interface User {\n    id: string;\n    name: string;\n    email?: string;\n}\n\nfunction greet(user: User): string {\n    return `Hello, ${user.name}!`;\n}",
            },
            { id: "welcome-h3c", type: "h3", text: "Python 예시" },
            {
                id: "welcome-code-py",
                type: "code",
                language: "python",
                text: "def fizzbuzz(n: int) -> None:\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            print(\"FizzBuzz\")\n        elif i % 3 == 0:\n            print(\"Fizz\")\n        elif i % 5 == 0:\n            print(\"Buzz\")\n        else:\n            print(i)\n\nfizzbuzz(20)",
            },
            { id: "welcome-div4", type: "divider", thickness: 4, lineStyle: "double" },
            { id: "welcome-h2d", type: "h2", color: "brown", text: "수평선" },
            { id: "welcome-t7", type: "text", text: "위 굵은 이중선처럼 핸들 메뉴에서 두께(1/2/4/6px) 와 스타일(실선/파선/점선/이중선) 을 조합할 수 있습니다." },
            { id: "welcome-div5", type: "divider", thickness: 6, lineStyle: "solid" },
            { id: "welcome-t8", type: "text", color: "pink", text: "이 문서는 언제든 자유롭게 편집하거나 + 새 문서 로 새 문서를 시작하세요." },
        ],
        collapsed: false,
        children: [],
    },
];

function createEmptyItem(): TreeItem {
    return {
        id: createId("item"),
        label: "새 아이템",
        blocks: [
            { id: createId("block"), type: "text", text: "" },
        ],
        collapsed: false,
        children: [],
    };
}

function getInitialTheme(): Theme {
    const stored = window.localStorage.getItem("react-study-theme");
    if (stored === "dark" || stored === "light") {
        return stored;
    }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    }
    return "light";
}

const TREE_PANE_MIN_WIDTH = 200;
const TREE_PANE_MAX_WIDTH = 600;
const TREE_PANE_DEFAULT_WIDTH = 280;

function getInitialTreePaneWidth(): number {
    const stored = window.localStorage.getItem("react-study-tree-pane-width");
    const parsed = stored ? parseInt(stored, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= TREE_PANE_MIN_WIDTH && parsed <= TREE_PANE_MAX_WIDTH) {
        return parsed;
    }
    return TREE_PANE_DEFAULT_WIDTH;
}

function clampTreePaneWidth(value: number): number {
    if (value < TREE_PANE_MIN_WIDTH) {
        return TREE_PANE_MIN_WIDTH;
    }
    if (value > TREE_PANE_MAX_WIDTH) {
        return TREE_PANE_MAX_WIDTH;
    }
    return value;
}

function getInitialTreePaneOpen(): boolean {
    const stored = window.localStorage.getItem("react-study-tree-pane-open");
    if (stored === "false") {
        return false;
    }
    return true;
}

const STORAGE_KEY_ITEMS = "react-study-items";
const STORAGE_KEY_SELECTED_ID = "react-study-selected-id";

function getInitialItems(): TreeItem[] {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY_ITEMS);
        if (!raw) {
            return initialItems;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as TreeItem[];
        }
        return initialItems;
    }
    catch {
        return initialItems;
    }
}

function getInitialSelectedId(): string | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY_SELECTED_ID);
        if (typeof raw === "string" && raw.length > 0) {
            return raw;
        }
        return "welcome";
    }
    catch {
        return "welcome";
    }
}

function App() {
    const [items, setItems] = useState<TreeItem[]>(getInitialItems);
    const [selectedId, setSelectedId] = useState<string | null>(getInitialSelectedId);
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [treePaneWidth, setTreePaneWidth] = useState<number>(getInitialTreePaneWidth);
    const [treePaneOpen, setTreePaneOpen] = useState<boolean>(getInitialTreePaneOpen);
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
    const [contentMenuOpen, setContentMenuOpen] = useState(false);
    const isResizingRef = useRef<boolean>(false);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const contentSettingsButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem("react-study-theme", theme);
    }, [theme]);

    useEffect(() => {
        function handleContextMenu(event: MouseEvent) {
            event.preventDefault();
        }
        function handleDragStart(event: DragEvent) {
            event.preventDefault();
        }
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("dragstart", handleDragStart);
        return () => {
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("dragstart", handleDragStart);
        };
    }, []);

    useEffect(() => {
        window.localStorage.setItem("react-study-tree-pane-width", String(treePaneWidth));
    }, [treePaneWidth]);

    useEffect(() => {
        window.localStorage.setItem("react-study-tree-pane-open", treePaneOpen ? "true" : "false");
    }, [treePaneOpen]);

    function handleToggleTreePane() {
        setTreePaneOpen((open) => !open);
    }

    function persistItems(nextItems: TreeItem[]) {
        try {
            window.localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(nextItems));
        }
        catch (error) {
            console.warn("[react-study] items 저장 실패", error);
        }
    }

    function persistSelectedId(nextId: string | null) {
        try {
            if (nextId === null) {
                window.localStorage.removeItem(STORAGE_KEY_SELECTED_ID);
                return;
            }
            window.localStorage.setItem(STORAGE_KEY_SELECTED_ID, nextId);
        }
        catch (error) {
            console.warn("[react-study] selectedId 저장 실패", error);
        }
    }

    function commitItems(nextItems: TreeItem[]) {
        setItems(nextItems);
        persistItems(nextItems);
    }

    function commitSelectedId(nextId: string | null) {
        setSelectedId(nextId);
        persistSelectedId(nextId);
    }

    function exportAllData() {
        const payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            items: items,
            selectedId: selectedId,
            theme: theme,
            treePaneWidth: treePaneWidth,
        };
        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const dateLabel = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `react-study-${dateLabel}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function importAllData() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = async (changeEvent) => {
            const target = changeEvent.target as HTMLInputElement;
            const file = target.files && target.files[0];
            if (!file) {
                return;
            }
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (!Array.isArray(data.items)) {
                    throw new Error("items 필드가 없습니다.");
                }
                commitItems(data.items);
                if (typeof data.selectedId === "string") {
                    commitSelectedId(data.selectedId);
                }
                else if (data.selectedId === null) {
                    commitSelectedId(null);
                }
                if (data.theme === "dark" || data.theme === "light") {
                    setTheme(data.theme);
                }
                if (Number.isFinite(data.treePaneWidth)) {
                    setTreePaneWidth(clampTreePaneWidth(data.treePaneWidth));
                }
            }
            catch (error) {
                console.error("[react-study] import 실패", error);
                window.alert("파일 형식이 올바르지 않습니다.");
            }
        };
        input.click();
    }

    function clearAllData() {
        const confirmed = window.confirm("모든 트리와 콘텐트를 삭제합니다. (테마/패널 폭 등 설정은 유지됩니다.) 계속할까요?");
        if (!confirmed) {
            return;
        }
        window.localStorage.removeItem(STORAGE_KEY_ITEMS);
        window.localStorage.removeItem(STORAGE_KEY_SELECTED_ID);
        commitItems([]);
        commitSelectedId(null);
    }

    function handleSettingsMenuSelect(key: string) {
        if (key === "toggle-theme") {
            handleToggleTheme();
            return;
        }
        if (key === "export") {
            exportAllData();
            return;
        }
        if (key === "import") {
            importAllData();
            return;
        }
        if (key === "clear") {
            clearAllData();
        }
    }

    function handleResizerPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
        event.preventDefault();
        isResizingRef.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        function handlePointerMove(moveEvent: PointerEvent) {
            if (!isResizingRef.current) {
                return;
            }
            const nextWidth = clampTreePaneWidth(moveEvent.clientX);
            setTreePaneWidth(nextWidth);
        }

        function handlePointerUp() {
            isResizingRef.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
    }

    function handleToggleTheme() {
        setTheme((previous) => {
            return previous === "dark" ? "light" : "dark";
        });
    }

    function handleItemsChange(nextItems: TreeItem[]) {
        commitItems(nextItems);
    }

    function handleSelect(id: string) {
        commitSelectedId(id);
    }

    function handleAddChild(parentId: string) {
        const newItem = createEmptyItem();
        const nextItems = insertChild(items, parentId, newItem);
        commitItems(nextItems);
        commitSelectedId(newItem.id);
    }

    function handleAddRoot() {
        const newItem = createEmptyItem();
        const nextItems = [...items, newItem];
        commitItems(nextItems);
        commitSelectedId(newItem.id);
    }

    function handleRemove(id: string) {
        const targetItem = findItemDeep(items, id);
        if (!targetItem) {
            return;
        }
        const itemLabel = targetItem.label ? targetItem.label : "제목 없음";
        const directChildCount = targetItem.children.length;
        let message;
        if (directChildCount > 0) {
            const descendantCount = getChildCount(items, id);
            message = `'${itemLabel}' 아래의 하위 아이템 ${descendantCount}개도 함께 삭제됩니다. 계속할까요?`;
        }
        else {
            message = `'${itemLabel}' 을(를) 삭제할까요?`;
        }
        const confirmed = window.confirm(message);
        if (!confirmed) {
            return;
        }
        const nextItems = removeItem(items, id);
        commitItems(nextItems);
        const stillExists = findItemDeep(nextItems, selectedId);
        if (!stillExists) {
            commitSelectedId(null);
        }
    }

    function renameItem(id: string | null, nextLabel: string) {
        if (id === null) {
            return;
        }
        const nextItems = setProperty(items, id, "label", () => {
            return nextLabel;
        });
        commitItems(nextItems);
    }

    function handleRenameSelected(event: ChangeEvent<HTMLInputElement>) {
        renameItem(selectedId, event.target.value);
    }

    function handleBlocksChange(nextBlocks: TreeItem["blocks"]) {
        if (selectedId === null) {
            return;
        }
        const nextItems = setProperty(items, selectedId, "blocks", () => {
            return nextBlocks;
        });
        commitItems(nextItems);
    }

    const selectedItem = selectedId !== null ? findItemDeep(items, selectedId) : null;
    const selectedPath = selectedId !== null ? getItemPath(items, selectedId) : [];
    const selectedSettings: ItemSettings = (selectedItem && selectedItem.settings) ? selectedItem.settings : {};
    const showTitle = selectedSettings.showTitle !== false;
    const showBreadcrumb = selectedSettings.showBreadcrumb === true;
    const distinguishBlockArea = selectedSettings.distinguishBlockArea !== false;

    function handleContentMenuSelect(key: string) {
        if (selectedId === null || !selectedItem) {
            return;
        }
        const currentSettings: ItemSettings = selectedItem.settings ? selectedItem.settings : {};
        let nextSettings: ItemSettings;
        if (key === "toggle-title") {
            nextSettings = { ...currentSettings, showTitle: !showTitle };
        }
        else if (key === "toggle-breadcrumb") {
            nextSettings = { ...currentSettings, showBreadcrumb: !showBreadcrumb };
        }
        else if (key === "toggle-block-area") {
            nextSettings = { ...currentSettings, distinguishBlockArea: !distinguishBlockArea };
        }
        else {
            return;
        }
        const nextItems = setProperty(items, selectedId, "settings", () => {
            return nextSettings;
        });
        commitItems(nextItems);
    }

    const contentMenuItems: BlockMenuItem[] = [
        { header: "콘텐트 설정" },
        {
            key: "toggle-title",
            label: "제목 표시",
            icon: showTitle ? "☑" : "☐",
        },
        {
            key: "toggle-breadcrumb",
            label: "문서 경로 표시",
            icon: showBreadcrumb ? "☑" : "☐",
        },
        {
            key: "toggle-block-area",
            label: "문서 영역 표시",
            icon: distinguishBlockArea ? "☑" : "☐",
        },
    ];

    const settingsMenuItems: BlockMenuItem[] = [
        { header: "테마" },
        {
            key: "toggle-theme",
            label: theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환",
            icon: "◐",
        },
        { divider: true },
        { header: "데이터" },
        { key: "export", label: "전체 내보내기", icon: "↓" },
        { key: "import", label: "전체 가져오기", icon: "↑" },
        { divider: true },
        { key: "clear", label: "전체 제거하기", icon: "×", danger: true },
    ];

    return (
        <div className="app">
            <aside
                className="tree-pane"
                style={{
                    flex: treePaneOpen ? `0 0 ${treePaneWidth}px` : "0 0 0px",
                    width: treePaneOpen ? `${treePaneWidth}px` : "0px",
                }}
            >
                <div className="tree-pane-header">
                    <span className="tree-pane-title">muNote</span>
                    <div className="tree-pane-header-actions">
                        <button
                            type="button"
                            className="tree-pane-add-root"
                            onClick={handleAddRoot}
                        >
                            + 새 문서
                        </button>
                        <button
                            ref={settingsButtonRef}
                            type="button"
                            className="settings-button"
                            onClick={() => setSettingsMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={settingsMenuOpen}
                        >
                            설정
                        </button>
                        <button
                            type="button"
                            className="settings-button"
                            onClick={handleToggleTreePane}
                            aria-label="사이드바 닫기"
                        >
                            «
                        </button>
                    </div>
                </div>
                <div className="tree-scroll">
                    <SortableTree
                        items={items}
                        onItemsChange={handleItemsChange}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        onAddChild={handleAddChild}
                        onRemove={handleRemove}
                        onRename={renameItem}
                    />
                </div>
            </aside>

            {treePaneOpen
                ? (
                    <div
                        className="pane-resizer"
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="패널 크기 조절"
                        onPointerDown={handleResizerPointerDown}
                    />
                )
                : null}

            <main className="detail-pane">
                {!treePaneOpen
                    ? (
                        <button
                            type="button"
                            className="tree-pane-open-toggle"
                            onClick={handleToggleTreePane}
                            aria-label="사이드바 열기"
                        >
                            »
                        </button>
                    )
                    : null}
                {selectedItem
                    ? (
                        <div
                            className="detail-content"
                            data-distinguish-block-area={distinguishBlockArea ? "true" : "false"}
                        >
                            <div className="detail-top-bar">
                                {showBreadcrumb
                                    ? (
                                        <nav className="detail-breadcrumb" aria-label="계층 경로">
                                            {selectedPath.map((entry, index) => {
                                                const entryClassNames = ["detail-breadcrumb-entry"];
                                                if (entry.id === selectedId) {
                                                    entryClassNames.push("is-current");
                                                }
                                                return (
                                                    <span key={entry.id} className="detail-breadcrumb-segment">
                                                        {index > 0
                                                            ? <span className="detail-breadcrumb-separator" aria-hidden="true">{">"}</span>
                                                            : null}
                                                        <button
                                                            type="button"
                                                            className={entryClassNames.join(" ")}
                                                            onClick={() => handleSelect(entry.id)}
                                                        >
                                                            {entry.label ? entry.label : "제목 없음"}
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </nav>
                                    )
                                    : null}
                                <button
                                    ref={contentSettingsButtonRef}
                                    type="button"
                                    className="content-settings-button"
                                    aria-label="콘텐트 설정"
                                    aria-haspopup="menu"
                                    aria-expanded={contentMenuOpen}
                                    onClick={() => setContentMenuOpen((open) => !open)}
                                >
                                    ⋯
                                </button>
                            </div>

                            {showTitle
                                ? (
                                    <input
                                        className="detail-title-input"
                                        type="text"
                                        value={selectedItem.label || ""}
                                        placeholder="제목 없음"
                                        onChange={handleRenameSelected}
                                    />
                                )
                                : null}

                            <BlockEditor
                                blocks={selectedItem.blocks}
                                onChange={handleBlocksChange}
                            />
                        </div>
                    )
                    : (
                        <div className="detail-empty">
                            <p>좌측에서 아이템을 선택하세요.</p>
                        </div>
                    )}
            </main>

            {settingsMenuOpen
                ? (
                    <BlockMenu
                        anchorRef={settingsButtonRef}
                        items={settingsMenuItems}
                        onSelect={handleSettingsMenuSelect}
                        onClose={() => setSettingsMenuOpen(false)}
                    />
                )
                : null}

            {contentMenuOpen && selectedItem
                ? (
                    <BlockMenu
                        anchorRef={contentSettingsButtonRef}
                        items={contentMenuItems}
                        onSelect={handleContentMenuSelect}
                        onClose={() => setContentMenuOpen(false)}
                    />
                )
                : null}
        </div>
    );
}

export default App;
