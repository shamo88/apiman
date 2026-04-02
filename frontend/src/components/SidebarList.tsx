import React from 'react';
import { Spin } from 'antd';
import { EnvironmentOutlined, CodeOutlined } from '@ant-design/icons';

interface SidebarListItem {
    id: string;
    name: string;
}

interface SidebarListProps<T extends SidebarListItem> {
    items: T[];
    activeId: string | null;
    type: 'environment' | 'script';
    loading: boolean;
    onSelect: (item: T) => void;
    emptyText: string;
}

export function SidebarList<T extends SidebarListItem>({
    items,
    activeId,
    type,
    loading,
    onSelect,
    emptyText,
}: SidebarListProps<T>): React.ReactElement {
    const Icon = type === 'environment' ? EnvironmentOutlined : CodeOutlined;

    return (
        <div className="sidebar-content environment-sidebar-content">
            <Spin spinning={loading}>
                <div className="environment-list">
                    {items.map(item => (
                        <button
                            key={item.id}
                            className={`environment-list-item ${activeId === item.id ? 'active' : ''}`}
                            onClick={() => onSelect(item)}
                        >
                            <span className="environment-list-item-icon">
                                <Icon />
                            </span>
                            <span className="environment-list-item-name">{item.name}</span>
                        </button>
                    ))}
                    {items.length === 0 && (
                        <div className="empty-sidebar">{emptyText}</div>
                    )}
                </div>
            </Spin>
        </div>
    );
}
