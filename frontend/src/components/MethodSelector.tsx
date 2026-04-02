import React from 'react';
import { Select } from 'antd';

const HTTP_METHODS = [
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'OPTIONS', label: 'OPTIONS' },
    { value: 'HEAD', label: 'HEAD' },
];

interface MethodSelectorProps {
    value: string;
    onChange: (method: string) => void;
    style?: React.CSSProperties;
}

export const MethodSelector: React.FC<MethodSelectorProps> = ({ value, onChange, style }) => {
    return (
        <Select
            value={value}
            onChange={onChange}
            style={{ width: 100, ...style }}
            options={HTTP_METHODS}
        />
    );
};
