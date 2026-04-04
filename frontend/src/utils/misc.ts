/** Trim trailing spaces */
export const trimRightSpaces = (value: string): string => value.replace(/\s+$/g, '');

/** Get primary name (remove copy suffix) */
export const getPrimaryName = (value: string): string => value.replace(/-副本\d*$/u, '');
