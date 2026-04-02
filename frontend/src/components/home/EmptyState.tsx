import React from 'react';
import { ApiOutlined } from '@ant-design/icons';

interface EmptyStateProps {
    icon?: React.ReactNode;
    text: string;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, text, className = '' }) => {
    return (
        <div className={`empty-state ${className}`}>
            {icon || <ApiOutlined className="empty-state-icon" />}
            <div>{text}</div>
        </div>
    );
};
