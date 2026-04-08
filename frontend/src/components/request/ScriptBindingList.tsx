import React from 'react';
import { Button, Select } from 'antd';

interface ProjectScript {
    id: string;
    name: string;
}

interface ScriptBindingListProps {
    scripts: string[];
    projectScripts: ProjectScript[];
    onAdd: (scriptId: string) => void;
    onRemove: (scriptId: string) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    emptyText: string;
}

export const ScriptBindingList: React.FC<ScriptBindingListProps> = ({
    scripts,
    projectScripts,
    onAdd,
    onRemove,
    onMoveUp,
    onMoveDown,
    emptyText,
}) => {
    return (
        <div className="script-list-container">
            {scripts.length === 0 && (
                <div className="script-list-empty">{emptyText}</div>
            )}
            {scripts.map((scriptId, index) => {
                const script = projectScripts.find(s => s.id === scriptId);
                return (
                    <div key={scriptId} className="script-list-item">
                        <span className="script-list-index">{index + 1}</span>
                        <span className="script-list-name">{script?.name || '未知脚本'}</span>
                        <div className="script-list-actions">
                            <Button
                                type="text"
                                size="small"
                                disabled={index === 0}
                                onClick={() => onMoveUp(index)}
                            >↑</Button>
                            <Button
                                type="text"
                                size="small"
                                disabled={index === scripts.length - 1}
                                onClick={() => onMoveDown(index)}
                            >↓</Button>
                            <Button
                                type="text"
                                danger
                                size="small"
                                onClick={() => onRemove(scriptId)}
                            >×</Button>
                        </div>
                    </div>
                );
            })}
            <Select
                placeholder="+ 添加脚本"
                value=""
                onChange={(value: string) => {
                    if (value && !scripts.includes(value)) {
                        onAdd(value);
                    }
                }}
                style={{ width: '100%', marginTop: 8 }}
                options={[
                    { label: '+ 添加脚本', value: '' },
                    ...projectScripts
                        .filter(s => !scripts.includes(s.id))
                        .map(s => ({ label: s.name, value: s.id }))
                ]}
            />
        </div>
    );
};