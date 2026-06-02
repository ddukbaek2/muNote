import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function BlockMenu({ anchorRef, items, onSelect, onClose }) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState(null);

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
        function handlePointerDown(event) {
            const menuElement = menuRef.current;
            const anchorElement = anchorRef.current;
            if (menuElement && menuElement.contains(event.target)) {
                return;
            }
            if (anchorElement && anchorElement.contains(event.target)) {
                return;
            }
            onClose();
        }
        function handleKeyDown(event) {
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

    const style = {
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
                            onSelect(item.key);
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
