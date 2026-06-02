import type { ReactNode } from "react";

export type Theme = "light" | "dark";

export type BlockType = "text" | "h1" | "h2" | "h3" | "checklist" | "code" | "divider" | "heading";
export type BlockColor = "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";
export type LineStyle = "solid" | "dashed" | "dotted" | "double";

export interface Block {
    id: string;
    type?: BlockType;
    text: string;
    checked?: boolean;
    color?: BlockColor | null;
    thickness?: number;
    lineStyle?: LineStyle;
    language?: string;
}

export interface ItemSettings {
    showTitle?: boolean;
    showBreadcrumb?: boolean;
    distinguishBlockArea?: boolean;
}

export interface TreeItem {
    id: string;
    label: string;
    blocks: Block[];
    collapsed: boolean;
    children: TreeItem[];
    settings?: ItemSettings;
}

export interface FlattenedItem {
    id: string;
    label: string;
    blocks: Block[];
    settings?: ItemSettings;
    collapsed: boolean;
    childCount: number;
    parentId: string | null;
    depth: number;
    index: number;
}

export interface ItemPathEntry {
    id: string;
    label: string;
}

export interface ProjectionResult {
    depth: number;
    maxDepth: number;
    minDepth: number;
    parentId: string | null;
}

export interface BlockMenuItem {
    key?: string;
    label?: string;
    icon?: string;
    danger?: boolean;
    header?: string;
    divider?: boolean;
    custom?: ReactNode;
}

export type SetterFn<T> = (value: T) => T;
