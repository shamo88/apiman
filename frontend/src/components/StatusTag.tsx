import React from 'react';

export const getStatusColor = (status: number | undefined): string => {
    if (!status) return '#999';
    if (status >= 200 && status < 300) return '#49cc90'; // Success - green
    if (status >= 300 && status < 400) return '#61affe'; // Redirect - blue
    if (status >= 400 && status < 500) return '#fca130'; // Client Error - orange
    if (status >= 500) return '#f93e3e'; // Server Error - red
    return '#999';
};

interface StatusTagProps {
    status: number | undefined;
    style?: React.CSSProperties;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, style }) => {
    return (
        <span style={{ color: getStatusColor(status), fontWeight: 500, ...style }}>
            {status || '-'}
        </span>
    );
};
