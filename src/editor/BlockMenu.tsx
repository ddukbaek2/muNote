import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type CSSProperties,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { BlockMenuItem } from "../types";

export interface BlockMenuProps {
    anchorRef: RefObject<HTMLElement | null>;
    items: BlockMenuItem[];
    onSelect: (key: string) => void;
    onClose: () => void;
}

interface MenuPosition {
    top: number;
    left: number;
}

export function BlockMenu({ anchorRef, items, onSelect, onClose }: BlockMenuProps) {
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<MenuPosition | null>(null);

    useLayoutEffect(() => {
        const anchorElement = anchorRef.current;
        if (!anchorElement) {
            return;
        }
        const rect = anchorElement.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 4,
            left: rect.left,
        });
    }, [anchorRef]);

    useEffect(() => {
        function handlePointerDown(event: MouseEvent) {
            const target = event.target as Node | null;
            const menuElement = menuRef.current;
            const anchorElement = anchorRef.current;
            if (menuElement && target && menuElement.contains(target)) {
                return;
            }
            if (anchorElement && target && anchorElement.contains(target)) {
                return;
            }
            onClose();
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [anchorRef, onClose]);

    if (!position) {
        return null;
    }

    const style: CSSProperties = {
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
    };

    const menu = (
        <div ref={menuRef} className="block-menu" style={style} role="menu">
            {items.map((item, index) => {
                if (item.divider) {
                    return <div key={`divider-${index}`} className="block-menu-divider" />;
                }
                if (item.header) {
                    return (
                        <div key={`header-${index}`} className="block-menu-header">
                            {item.header}
                        </div>
                    );
                }
                if (item.custom) {
                    return (
                        <div key={`custom-${index}`} className="block-menu-custom">
                            {item.custom}
                        </div>
                    );
                }
                const classNames = ["block-menu-item"];
                if (item.danger) {
                    classNames.push("is-danger");
                }
                return (
                    <button
                        key={item.key}
                        type="button"
                        className={classNames.join(" ")}
                        role="menuitem"
                        onClick={() => {
                            if (item.key) {
                                onSelect(item.key);
                            }
                            onClose();
                        }}
                    >
                        <span className="block-menu-icon">{item.icon}</span>
                        <span className="block-menu-label">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );

    return createPortal(menu, document.body);
}
