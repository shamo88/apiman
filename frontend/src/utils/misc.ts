import { METHOD_COLORS } from "./ui";

/** HTTP method colors */
export const getMethodColor = (method: string): string => {
    const colors: Record<string, string> = METHOD_COLORS
    return colors[method.toUpperCase()] || '#999';
};

/** Sidebar method label text (DELETE->DEL, PATCH->PAT, others max 7 chars) */
export const formatSidebarMethodLabel = (method: string): string => {
    const m = (method || 'GET').toUpperCase();
    if (m === 'DELETE') return 'DEL';
    if (m === 'PATCH') return 'PAT';
    if (m === 'OPTIONS') return 'OPT';
    return m.substring(0, 7);
};

/** Trim trailing spaces */
export const trimRightSpaces = (value: string): string => value.replace(/\s+$/g, '');

/** Get primary name (remove copy suffix) */
export const getPrimaryName = (value: string): string => value.replace(/-副本\d*$/u, '');
