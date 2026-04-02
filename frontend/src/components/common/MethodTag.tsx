import React from 'react';

const METHOD_COLORS: Record<string, string> = {
    GET: '#61affe',
    POST: '#49cc90',
    PUT: '#fca130',
    DELETE: '#f93e3e',
    PATCH: '#50e3c2',
    OPTIONS: '#0d5aa7',
    HEAD: '#9012fe',
};

const METHOD_LABELS: Record<string, string> = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DEL',
    PATCH: 'PAT',
    OPTIONS: 'OPT',
    HEAD: 'HEAD',
};

interface MethodTagProps {
    method: string;
    label?: string;
    style?: React.CSSProperties;
}

export const MethodTag: React.FC<MethodTagProps> = ({ method, label, style }) => {
    const color = METHOD_COLORS[method.toUpperCase()] || '#999';
    const displayLabel = label || METHOD_LABELS[method.toUpperCase()] || method.substring(0, 7);

    return (
        <span
            style={{
                color,
                fontWeight: 600,
                fontSize: 10,
                ...style,
            }}
        >
            {displayLabel}
        </span>
    );
};

export const getMethodColor = (method: string): string => {
    return METHOD_COLORS[method.toUpperCase()] || '#999';
};

export const formatSidebarMethodLabel = (method: string): string => {
    return METHOD_LABELS[method.toUpperCase()] || method.substring(0, 7);
};
