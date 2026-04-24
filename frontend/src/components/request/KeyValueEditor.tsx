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
    onAdd: () => void;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => void;
    renderKeyInput?: (index: number, value: string, onChange: (value: string) => void) => React.ReactNode;
    renderValueInput?: (index: number, value: string, onChange: (value: string) => void) => React.ReactNode;
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
    // Determine if the last actual item has content (key or value)
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const lastItemHasContent = lastItem && (lastItem.key.trim() !== '' || lastItem.value.trim() !== '');

    // Should we show a "shadow" empty row after the last item?
    // Yes if: we have items AND the last item has content
    const showShadowRow = items.length > 0 && lastItemHasContent;

    // Should we show a placeholder empty row when items is empty?
    const showEmptyRow = items.length === 0;

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

            {/* Show shadow empty row when last item has content */}
            {showShadowRow && (
                <div className="kv-row kv-row-params">
                    <Checkbox className="kv-param-enabled" checked={false} onChange={() => {}} />
                    {renderKeyInput ? (
                        renderKeyInput(items.length, '', (value) => {
                            if (value.trim() !== '') {
                                const newItemIndex = items.length;
                                onAdd();
                                onUpdate(newItemIndex, 'key', value);
                            }
                        })
                    ) : (
                        <Input
                            placeholder={keyPlaceholder}
                            value={''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.trim() !== '') {
                                    const newItemIndex = items.length;
                                    onAdd();
                                    onUpdate(newItemIndex, 'key', value);
                                }
                            }}
                        />
                    )}
                    {renderValueInput ? (
                        renderValueInput(items.length, '', (value) => {
                            if (value.trim() !== '') {
                                const newItemIndex = items.length;
                                onAdd();
                                onUpdate(newItemIndex, 'value', value);
                            }
                        })
                    ) : (
                        <Input
                            placeholder={valuePlaceholder}
                            value={''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.trim() !== '') {
                                    const newItemIndex = items.length;
                                    onAdd();
                                    onUpdate(newItemIndex, 'value', value);
                                }
                            }}
                        />
                    )}
                    <Button type="text" danger style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                        ×
                    </Button>
                </div>
            )}

            {/* Show placeholder row when no items */}
            {showEmptyRow && (
                <div className="kv-row kv-row-params">
                    <Checkbox className="kv-param-enabled" checked={false} onChange={(e) => onUpdate(0, 'enabled', e.target.checked)} />
                    {renderKeyInput ? (
                        renderKeyInput(0, '', (value) => {
                            if (value.trim() !== '') {
                                const newItemIndex = items.length;
                                onAdd();
                                onUpdate(newItemIndex, 'key', value);
                            }
                        })
                    ) : (
                        <Input
                            placeholder={keyPlaceholder}
                            value={''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.trim() !== '') {
                                    const newItemIndex = items.length;
                                    onAdd();
                                    onUpdate(newItemIndex, 'key', value);
                                }
                            }}
                        />
                    )}
                    {renderValueInput ? (
                        renderValueInput(0, '', (value) => {
                            if (value.trim() !== '') {
                                const newItemIndex = items.length;
                                onAdd();
                                onUpdate(newItemIndex, 'value', value);
                            }
                        })
                    ) : (
                        <Input
                            placeholder={valuePlaceholder}
                            value={''}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value.trim() !== '') {
                                    const newItemIndex = items.length;
                                    onAdd();
                                    onUpdate(newItemIndex, 'value', value);
                                }
                            }}
                        />
                    )}
                    <Button type="text" danger onClick={() => {
                        onUpdate(0, 'key', '');
                        onUpdate(0, 'value', '');
                    }}>
                        ×
                    </Button>
                </div>
            )}

            {/* Hidden add button - kept for backward compatibility */}
            <Button type="link" icon={<PlusOutlined />} onClick={onAdd} style={{ display: 'none' }}>
                {addButtonText}
            </Button>
        </div>
    );
};