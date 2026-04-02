import React from 'react';
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
    return (
        <div className="kv-editor">
            {items.map((item, index) => (
                <div key={index} className="kv-row kv-row-params">
                    <Checkbox
                        className="kv-param-enabled"
                        checked={item.enabled !== false}
                        onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
                        title="发送请求时包含该参数"
                    />
                    {renderKeyInput ? (
                        renderKeyInput(index, item.key, (value) => onUpdate(index, 'key', value))
                    ) : (
                        <Input
                            placeholder={keyPlaceholder}
                            value={item.key}
                            onChange={(e) => onUpdate(index, 'key', e.target.value)}
                        />
                    )}
                    {renderValueInput ? (
                        renderValueInput(index, item.value, (value) => onUpdate(index, 'value', value))
                    ) : (
                        <Input
                            placeholder={valuePlaceholder}
                            value={item.value}
                            onChange={(e) => onUpdate(index, 'value', e.target.value)}
                        />
                    )}
                    <Button
                        type="text"
                        danger
                        onClick={() => onRemove(index)}
                    >
                        ×
                    </Button>
                </div>
            ))}
            <Button
                type="link"
                icon={<PlusOutlined />}
                onClick={onAdd}
            >
                {addButtonText}
            </Button>
        </div>
    );
};
