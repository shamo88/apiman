import React, { useState } from 'react';
import { Modal, Button, Input, Space } from 'antd';

interface EnvironmentImportModalProps {
    visible: boolean;
    onClose: () => void;
    onImport: (jsonData: string) => Promise<void>;
}

interface ParsedEnvironment {
    name: string;
    variables: Record<string, string>;
}

export const EnvironmentImportModal: React.FC<EnvironmentImportModalProps> = ({
    visible,
    onClose,
    onImport,
}) => {
    const [jsonInput, setJsonInput] = useState('');
    const [importing, setImporting] = useState(false);
    const [parsedEnvs, setParsedEnvs] = useState<ParsedEnvironment[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);

    const handleJsonChange = (value: string) => {
        setJsonInput(value);
        setParseError(null);

        if (!value.trim()) {
            setParsedEnvs([]);
            return;
        }

        try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
                setParseError('JSON 格式错误：期望一个环境数组');
                setParsedEnvs([]);
                return;
            }

            const envs: ParsedEnvironment[] = [];
            for (const item of parsed) {
                if (typeof item !== 'object' || !item.name) {
                    setParseError('JSON 格式错误：每个环境对象必须包含 name 字段');
                    setParsedEnvs([]);
                    return;
                }
                envs.push({
                    name: item.name,
                    variables: item.variables || {},
                });
            }
            setParsedEnvs(envs);
        } catch (e) {
            setParseError('JSON 解析失败');
            setParsedEnvs([]);
        }
    };

    const handleImport = async () => {
        if (!jsonInput.trim()) return;

        setImporting(true);
        try {
            await onImport(jsonInput);
            handleClose();
        } catch (error: any) {
            // Error is handled in parent
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setJsonInput('');
        setParsedEnvs([]);
        setParseError(null);
        onClose();
    };

    return (
        <Modal
            title="导入环境"
            open={visible}
            onCancel={handleClose}
            footer={
                <Space>
                    <Button onClick={handleClose}>取消</Button>
                    <Button
                        type="primary"
                        onClick={handleImport}
                        loading={importing}
                        disabled={parsedEnvs.length === 0}
                    >
                        导入
                    </Button>
                </Space>
            }
            width={600}
            destroyOnClose
        >
            <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    请粘贴环境 JSON 数据。导入时会跳过已存在的同名环境。
                </p>
                <Input.TextArea
                    value={jsonInput}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={'[\n  {\n    "name": "环境名称",\n    "variables": {\n      "key": "value"\n    }\n  }\n]'}
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                />
                {parseError && (
                    <div style={{ color: '#f93e3e', fontSize: 12, marginTop: 4 }}>{parseError}</div>
                )}
            </div>

            {parsedEnvs.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>
                        预览（将导入 {parsedEnvs.length} 个环境）：
                    </div>
                    {parsedEnvs.map((env, index) => (
                        <div
                            key={index}
                            style={{
                                background: 'var(--bg-tertiary)',
                                padding: '8px 12px',
                                borderRadius: 4,
                                marginBottom: 8,
                                fontSize: 12,
                            }}
                        >
                            <div style={{ fontWeight: 500 }}>{env.name}</div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                                {Object.keys(env.variables).length} 个变量
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};
