import React, { useCallback } from 'react';
import { Checkbox, Input, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export interface KeyValueItem {
    key: string;
    value: string;
    enabled?: boolean;
}

interface KeyValueEditorProps {
    items: KeyValueItem[];
    onAdd: (initial?: { key: string; value: string }) => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void;
    renderKeyInput?: (index: number, value: string, onChange: (value: string) => void, onBlur?: () => void, onEnter?: () => void) => React.ReactNode;
    renderValueInput?: (index: number, value: string, onChange: (value: string) => void, onBlur?: () => void, onEnter?: () => void) => React.ReactNode;
    addButtonText?: string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
}

export const KeyValueEditor: React.FC<KeyValueEditorProps> = ({
    items,
    onAdd,
    onRemove,
    onUpdate,
    renderKeyInput,
    renderValueInput,
    addButtonText = '添加',
    keyPlaceholder = 'Key',
    valuePlaceholder = 'Value',
}) => {
    // Handle delete - if deleting the only row, just clear it instead
    const handleDelete = useCallback((index: number) => {
        if (items.length === 1) {
            // Only row - clear it instead of removing
            onUpdate(index, 'key', '');
            onUpdate(index, 'value', '');
        } else {
            onRemove(index);
        }
    }, [items.length, onRemove, onUpdate]);

    return (
        <div className="kv-editor">
            {items.map((item, index) => {
                // Regular row - never shadow row in the map
                // Handler for this row's key change
                const handleKeyChange = (value: string) => {
                    onUpdate(index, 'key', value);
                };

                const handleValueChange = (value: string) => {
                    onUpdate(index, 'value', value);
                };

                return (
                    <div key={index} className="kv-row kv-row-params">
                        <Checkbox
                            className="kv-param-enabled"
                            checked={item.enabled !== false}
                            onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
                            title="发送请求时包含该参数"
                        />
                        {renderKeyInput ? (
                            renderKeyInput(index, item.key, handleKeyChange)
                        ) : (
                            <Input
                                placeholder={keyPlaceholder}
                                value={item.key}
                                onChange={(e) => handleKeyChange(e.target.value)}
                            />
                        )}
                        {renderValueInput ? (
                            renderValueInput(index, item.value, handleValueChange)
                        ) : (
                            <Input
                                placeholder={valuePlaceholder}
                                value={item.value}
                                onChange={(e) => handleValueChange(e.target.value)}
                            />
                        )}
                        <Button type="text" danger onClick={() => handleDelete(index)}>
                            ×
                        </Button>
                    </div>
                );
            })}

            {/* Add button row */}
            <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={() => onAdd()}
                className="kv-add-button"
            >
                {addButtonText}
            </Button>
        </div>
    );
};