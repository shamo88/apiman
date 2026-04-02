import React from 'react';
import { Button } from 'antd';
import { MethodSelector } from './MethodSelector';
import { VariableEditableInput } from './VariableEditableInput';

interface ApiRequestBarProps {
    method: string;
    url: string;
    executing: boolean;
    environmentVariables: Record<string, string>;
    onMethodChange: (method: string) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
}

export const ApiRequestBar: React.FC<ApiRequestBarProps> = ({
    method,
    url,
    executing,
    environmentVariables,
    onMethodChange,
    onUrlChange,
    onSend,
    onSave,
}) => {
    return (
        <div className="api-request-bar">
            <MethodSelector
                value={method}
                onChange={onMethodChange}
            />
            <VariableEditableInput
                value={url}
                onChange={onUrlChange}
                placeholder="输入请求 URL"
                style={{ flex: 1 }}
                environmentVariables={environmentVariables}
            />
            <Button type="primary" onClick={onSend} loading={executing}>
                发送
            </Button>
            <Button onClick={onSave}>
                保存
            </Button>
        </div>
    );
};
