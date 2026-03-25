import React from 'react';
import { Tabs } from 'antd';
import { MinusOutlined, CloseOutlined, AppstoreOutlined } from '@ant-design/icons';
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';

interface TitleBarProps {
    title?: string;
    activeTab?: string;
    onTabChange?: (key: string) => void;
    onTabEdit?: (targetKey: React.MouseEvent | React.KeyboardEvent | string, action: 'add' | 'remove') => void;
    tabItems?: any[];
}

export const TitleBar: React.FC<TitleBarProps> = ({
    title = 'Apiman',
    activeTab,
    onTabChange,
    onTabEdit,
    tabItems
}) => {
    const handleMinimize = async () => {
        try {
            await WindowMinimise();
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    };

    const handleMaximize = async () => {
        try {
            await WindowToggleMaximise();
        } catch (error) {
            console.error('Failed to maximize/unmaximize window:', error);
        }
    };

    const handleClose = async () => {
        try {
            await Quit();
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    };

    return (
        <div className="title-bar">
            <div className="title-bar-left">
                <img
                    src="/logo.png"
                    alt="Apiman"
                    className="title-bar-logo-img"
                    style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
                />

                {tabItems && onTabChange && (
                    <Tabs
                        activeKey={activeTab}
                        onChange={onTabChange}
                        type="editable-card"
                        hideAdd
                        onEdit={onTabEdit}
                        items={tabItems}
                        size="small"
                        className="title-bar-tabs"
                    />
                )}
            </div>

            <div className="title-bar-controls">
                <button
                    className="title-bar-button minimize"
                    onClick={handleMinimize}
                    title="最小化"
                    style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
                >
                    <MinusOutlined />
                </button>
                <button
                    className="title-bar-button maximize"
                    onClick={handleMaximize}
                    title="最大化"
                    style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
                >
                    <AppstoreOutlined />
                </button>
                <button
                    className="title-bar-button close"
                    onClick={handleClose}
                    title="关闭"
                    style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
                >
                    <CloseOutlined />
                </button>
            </div>
        </div>
    );
};
