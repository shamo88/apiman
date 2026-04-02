import React from 'react';
import { Input, Button } from 'antd';

interface EnvironmentVariableRow {
    id: string;
    key: string;
    value: string;
}

interface EnvironmentVarEditorProps {
    variables: EnvironmentVariableRow[];
    onUpdate: (id: string, field: 'key' | 'value', value: string) => void;
    onRemove: (id: string) => void;
    onAdd: () => void;
}

export const EnvironmentVarEditor: React.FC<EnvironmentVarEditorProps> = ({
    variables,
    onUpdate,
    onRemove,
    onAdd,
}) => {
    return (
        <div className="environment-vars-list">
            {variables.map((item) => (
                <div className="environment-var-row" key={item.id}>
                    <Input
                        placeholder="变量名"
                        value={item.key}
                        onChange={(e) => onUpdate(item.id, 'key', e.target.value)}
                    />
                    <Input
                        placeholder="变量值"
                        value={item.value}
                        onChange={(e) => onUpdate(item.id, 'value', e.target.value)}
                    />
                    <Button
                        type="text"
                        danger
                        onClick={() => onRemove(item.id)}
                    >
                        ×
                    </Button>
                </div>
            ))}
        </div>
    );
};
