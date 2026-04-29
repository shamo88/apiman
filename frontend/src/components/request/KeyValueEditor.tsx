import React, { useCallback, useRef } from 'react';
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
    // Refs to track pending values and debounce timers for auto-add
    const pendingKeyRef = useRef<string>('');
    const pendingValueRef = useRef<string>('');
    const pendingKeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingValueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearPendingKey = () => {
        if (pendingKeyTimerRef.current) {
            clearTimeout(pendingKeyTimerRef.current);
            pendingKeyTimerRef.current = null;
        }
    };

    const clearPendingValue = () => {
        if (pendingValueTimerRef.current) {
            clearTimeout(pendingValueTimerRef.current);
            pendingValueTimerRef.current = null;
        }
    };
    // Determine if the last actual item has content (key or value)
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const lastItemHasContent = lastItem && (lastItem.key.trim() !== '' || lastItem.value.trim() !== '');

    // Always render shadow row when items exist (never unmount - that destroys focus)
    const showShadowRow = items.length > 0;

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
                        renderKeyInput(items.length, pendingKeyRef.current, (value) => {
                            // Always use ref directly in timer callback - ref is always current
                            pendingKeyRef.current = value;
                            clearPendingKey();
                            pendingKeyTimerRef.current = setTimeout(() => {
                                if (pendingKeyRef.current.trim() !== '') {
                                    onAdd({ key: pendingKeyRef.current, value: '' });
                                }
                                pendingKeyRef.current = '';
                            }, 500);
                        })
                    ) : (
                        <Input
                            placeholder={keyPlaceholder}
                            value={pendingKeyRef.current}
                            onChange={(e) => {
                                pendingKeyRef.current = e.target.value;
                                clearPendingKey();
                                pendingKeyTimerRef.current = setTimeout(() => {
                                    if (pendingKeyRef.current.trim() !== '') {
                                        onAdd({ key: pendingKeyRef.current, value: '' });
                                    }
                                    pendingKeyRef.current = '';
                                }, 500);
                            }}
                        />
                    )}
                    {renderValueInput ? (
                        renderValueInput(items.length, pendingValueRef.current, (value) => {
                            pendingValueRef.current = value;
                            clearPendingValue();
                            pendingValueTimerRef.current = setTimeout(() => {
                                if (pendingValueRef.current.trim() !== '') {
                                    onAdd({ key: '', value: pendingValueRef.current });
                                }
                                pendingValueRef.current = '';
                            }, 500);
                        })
                    ) : (
                        <Input
                            placeholder={valuePlaceholder}
                            value={pendingValueRef.current}
                            onChange={(e) => {
                                pendingValueRef.current = e.target.value;
                                clearPendingValue();
                                pendingValueTimerRef.current = setTimeout(() => {
                                    if (pendingValueRef.current.trim() !== '') {
                                        onAdd({ key: '', value: pendingValueRef.current });
                                    }
                                    pendingValueRef.current = '';
                                }, 500);
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
                            pendingKeyRef.current = value;
                            clearPendingKey();
                            pendingKeyTimerRef.current = setTimeout(() => {
                                if (pendingKeyRef.current.trim() !== '') {
                                    onAdd({ key: pendingKeyRef.current, value: '' });
                                }
                                pendingKeyRef.current = '';
                            }, 500);
                        })
                    ) : (
                        <Input
                            placeholder={keyPlaceholder}
                            value={''}
                            onChange={(e) => {
                                pendingKeyRef.current = e.target.value;
                                clearPendingKey();
                                pendingKeyTimerRef.current = setTimeout(() => {
                                    if (pendingKeyRef.current.trim() !== '') {
                                        onAdd({ key: pendingKeyRef.current, value: '' });
                                    }
                                    pendingKeyRef.current = '';
                                }, 500);
                            }}
                        />
                    )}
                    {renderValueInput ? (
                        renderValueInput(0, '', (value) => {
                            pendingValueRef.current = value;
                            clearPendingValue();
                            pendingValueTimerRef.current = setTimeout(() => {
                                if (pendingValueRef.current.trim() !== '') {
                                    onAdd({ key: '', value: pendingValueRef.current });
                                }
                                pendingValueRef.current = '';
                            }, 500);
                        })
                    ) : (
                        <Input
                            placeholder={valuePlaceholder}
                            value={''}
                            onChange={(e) => {
                                pendingValueRef.current = e.target.value;
                                clearPendingValue();
                                pendingValueTimerRef.current = setTimeout(() => {
                                    if (pendingValueRef.current.trim() !== '') {
                                        onAdd({ key: '', value: pendingValueRef.current });
                                    }
                                    pendingValueRef.current = '';
                                }, 500);
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
            <Button type="link" icon={<PlusOutlined />} onClick={() => onAdd()} style={{ display: 'none' }}>
                {addButtonText}
            </Button>
        </div>
    );
};