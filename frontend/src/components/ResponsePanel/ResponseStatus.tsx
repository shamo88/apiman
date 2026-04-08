import React from 'react';
import { getStatusColor } from '../../utils/ui';

interface ResponseStatusProps {
    statusCode: number;
    duration: number;
}

export const ResponseStatus: React.FC<ResponseStatusProps> = ({ statusCode, duration }) => {
    return (
        <div className="response-header">
            <span style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                background: getStatusColor(statusCode) + '20',
                color: getStatusColor(statusCode),
                border: `1px solid ${getStatusColor(statusCode)}40`
            }}>
                {statusCode}
            </span>
            <span className="duration">{duration}ms</span>
        </div>
    );
};