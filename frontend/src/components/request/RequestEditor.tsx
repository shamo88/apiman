import React from 'react';
import { Tabs, Button, Input } from 'antd';
import type { ApiConfig } from '../../utils/apiConfig';
import type { ProjectScript } from '../../types';
import { KeyValueEditor, ApiRequestBar, BodyTypeSelector, ScriptBindingList } from './index';
import { VariableEditableInput } from './VariableEditableInput';

interface RequestEditorProps {
    // Request state
    apiConfig: ApiConfig;
    executing: boolean;
    requestCases: { id: string; name: string }[];
    activeCaseId: string;
    requestEditorSurface: 'plain' | 'interface' | 'case';
    curlPreview: string;
    // Environment
    environmentVariables: Record<string, string>;
    // Scripts
    projectScripts: ProjectScript[];
    // UI
    animationEnabled: boolean;
    forceListAnimation: boolean;
    // Callbacks
    onMethodChange: (method: string) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
    onConfigChange: (config: ApiConfig | ((prev: ApiConfig) => ApiConfig)) => void;
    onCurlPreviewChange: (curl: string) => void;
    renderVariableAwareInput: (
        value: string,
        onChange: (value: string) => void,
        placeholder: string,
        style?: any,
        isTextarea?: boolean
    ) => React.ReactNode;
    parseCurlToApiConfig: (curl: string) => Partial<ApiConfig>;
}

export const RequestEditor: React.FC<RequestEditorProps> = ({
    apiConfig,
    executing,
    requestCases,
    activeCaseId,
    requestEditorSurface,
    curlPreview,
    environmentVariables,
    projectScripts,
    animationEnabled,
    forceListAnimation,
    onMethodChange,
    onUrlChange,
    onSend,
    onSave,
    onConfigChange,
    onCurlPreviewChange,
    renderVariableAwareInput,
    parseCurlToApiConfig,
}) => {
    const updateConfig = (updater: ApiConfig | ((prev: ApiConfig) => ApiConfig)) => {
        onConfigChange(updater);
    };

    const tabsItems = [
        {
            key: 'params',
            label: 'Params',
            children: (
                <KeyValueEditor
                    items={apiConfig.params}
                    onAdd={() => updateConfig(prev => ({ ...prev, params: [...prev.params, { key: '', value: '', enabled: true }] }))}
                    onRemove={(index) => updateConfig(prev => ({ ...prev, params: prev.params.filter((_, i) => i !== index) }))}
                    onUpdate={(index, field, value) => {
                        const newParams = [...apiConfig.params];
                        (newParams[index] as any)[field] = value;
                        updateConfig(prev => ({ ...prev, params: newParams }));
                    }}
                    renderValueInput={(index, value, onChange) => renderVariableAwareInput(value, onChange, 'Value', { flex: 1 })}
                    addButtonText="添加参数"
                />
            ),
        },
        {
            key: 'headers',
            label: 'Headers',
            children: (
                <KeyValueEditor
                    items={apiConfig.headers}
                    onAdd={() => updateConfig(prev => ({ ...prev, headers: [...prev.headers, { key: '', value: '', enabled: true }] }))}
                    onRemove={(index) => updateConfig(prev => ({ ...prev, headers: prev.headers.filter((_, i) => i !== index) }))}
                    onUpdate={(index, field, value) => {
                        const newHeaders = [...apiConfig.headers];
                        (newHeaders[index] as any)[field] = value;
                        updateConfig(prev => ({ ...prev, headers: newHeaders }));
                    }}
                    renderValueInput={(index, value, onChange) => renderVariableAwareInput(value, onChange, 'Value', { flex: 1 })}
                    addButtonText="添加请求头"
                />
            ),
        },
        {
            key: 'body',
            label: 'Body',
            children: (
                <div className="body-editor">
                    <div className="body-type-selector">
                        <BodyTypeSelector
                            value={apiConfig.bodyType || 'none'}
                            onChange={(type) => updateConfig(prev => ({ ...prev, bodyType: type }))}
                        />
                    </div>
                    {apiConfig.bodyType === 'none' && (
                        <div className="body-empty">This request does not have a body</div>
                    )}
                    {(apiConfig.bodyType === 'form-data' || apiConfig.bodyType === 'x-www-form-urlencoded') && (
                        <KeyValueEditor
                            items={apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded}
                            onAdd={() => {
                                const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded), { key: '', value: '', enabled: true }];
                                updateConfig(apiConfig.bodyType === 'form-data'
                                    ? { ...apiConfig, formData: newData }
                                    : { ...apiConfig, urlencoded: newData });
                            }}
                            onRemove={(index) => {
                                const newData = (apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded).filter((_, i) => i !== index);
                                updateConfig(apiConfig.bodyType === 'form-data'
                                    ? { ...apiConfig, formData: newData }
                                    : { ...apiConfig, urlencoded: newData });
                            }}
                            onUpdate={(index, field, value) => {
                                const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                (newData[index] as any)[field] = value;
                                updateConfig(apiConfig.bodyType === 'form-data'
                                    ? { ...apiConfig, formData: newData }
                                    : { ...apiConfig, urlencoded: newData });
                            }}
                            renderKeyInput={(index, value, onChange) => renderVariableAwareInput(value, onChange, 'Key', { flex: 1 })}
                            renderValueInput={(index, value, onChange) => renderVariableAwareInput(value, onChange, 'Value', { flex: 1 })}
                            addButtonText="添加字段"
                        />
                    )}
                    {(apiConfig.bodyType === 'json' || apiConfig.bodyType === 'xml' || apiConfig.bodyType === 'raw') && (
                        <div className="body-raw-editor">
                            {renderVariableAwareInput(
                                apiConfig.body,
                                (value) => updateConfig(prev => ({ ...prev, body: value })),
                                apiConfig.bodyType === 'json'
                                    ? '{\n  "key": "value"\n}'
                                    : apiConfig.bodyType === 'xml'
                                        ? '<root>\n  <key>value</key>\n</root>'
                                        : 'Raw body content',
                                { fontFamily: 'monospace', minHeight: 150, marginTop: 12 },
                                true
                            )}
                        </div>
                    )}
                    {apiConfig.bodyType === 'binary' && (
                        <div className="body-binary">
                            <Input type="file" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'pre-script',
            label: '前置脚本',
            children: (
                <div className="script-binding-panel">
                    <ScriptBindingList
                        scripts={apiConfig.preScripts}
                        projectScripts={projectScripts}
                        onAdd={(scriptId) => updateConfig(prev => ({ ...prev, preScripts: [...prev.preScripts, scriptId] }))}
                        onRemove={(scriptId) => updateConfig(prev => ({ ...prev, preScripts: prev.preScripts.filter(id => id !== scriptId) }))}
                        onMoveUp={(index) => {
                            if (index > 0) {
                                const newScripts = [...apiConfig.preScripts];
                                [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
                                updateConfig(prev => ({ ...prev, preScripts: newScripts }));
                            }
                        }}
                        onMoveDown={(index) => {
                            if (index < apiConfig.preScripts.length - 1) {
                                const newScripts = [...apiConfig.preScripts];
                                [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
                                updateConfig(prev => ({ ...prev, preScripts: newScripts }));
                            }
                        }}
                        emptyText="暂无前置脚本"
                    />
                </div>
            ),
        },
        {
            key: 'post-script',
            label: '后置脚本',
            children: (
                <div className="script-binding-panel">
                    <ScriptBindingList
                        scripts={apiConfig.postScripts}
                        projectScripts={projectScripts}
                        onAdd={(scriptId) => updateConfig(prev => ({ ...prev, postScripts: [...prev.postScripts, scriptId] }))}
                        onRemove={(scriptId) => updateConfig(prev => ({ ...prev, postScripts: prev.postScripts.filter(id => id !== scriptId) }))}
                        onMoveUp={(index) => {
                            if (index > 0) {
                                const newScripts = [...apiConfig.postScripts];
                                [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
                                updateConfig(prev => ({ ...prev, postScripts: newScripts }));
                            }
                        }}
                        onMoveDown={(index) => {
                            if (index < apiConfig.postScripts.length - 1) {
                                const newScripts = [...apiConfig.postScripts];
                                [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
                                updateConfig(prev => ({ ...prev, postScripts: newScripts }));
                            }
                        }}
                        emptyText="暂无后置脚本"
                    />
                </div>
            ),
        },
        {
            key: 'curl',
            label: 'Curl',
            children: (
                <div style={{ padding: '12px 0' }}>
                    {renderVariableAwareInput(
                        curlPreview,
                        onCurlPreviewChange,
                        'curl 命令将显示在这里...',
                        { fontFamily: 'monospace', fontSize: 12, minHeight: 200, marginTop: 0 },
                        true
                    )}
                    <Button
                        type="primary"
                        onClick={() => {
                            const parsed = parseCurlToApiConfig(curlPreview);
                            const mergedHeaders = [...apiConfig.headers];
                            if (parsed.headers && parsed.headers.length > 0) {
                                for (const parsedHeader of parsed.headers) {
                                    const idx = mergedHeaders.findIndex(h => h.key.toLowerCase() === parsedHeader.key.toLowerCase());
                                    if (idx >= 0) {
                                        mergedHeaders[idx] = { ...mergedHeaders[idx], key: parsedHeader.key, value: parsedHeader.value };
                                    } else {
                                        mergedHeaders.push(parsedHeader);
                                    }
                                }
                            }
                            const mergedParams = [...apiConfig.params];
                            if (parsed.params && parsed.params.length > 0) {
                                for (const parsedParam of parsed.params) {
                                    const idx = mergedParams.findIndex(p => p.key.toLowerCase() === parsedParam.key.toLowerCase());
                                    if (idx >= 0) {
                                        mergedParams[idx] = { ...mergedParams[idx], key: parsedParam.key, value: parsedParam.value };
                                    } else {
                                        mergedParams.push(parsedParam);
                                    }
                                }
                            }
                            updateConfig({
                                ...apiConfig,
                                method: parsed.method || apiConfig.method,
                                url: parsed.url || apiConfig.url,
                                headers: mergedHeaders,
                                params: mergedParams,
                                body: parsed.body !== undefined ? parsed.body : apiConfig.body,
                                bodyType: parsed.bodyType || apiConfig.bodyType,
                                formData: parsed.formData || apiConfig.formData,
                                urlencoded: parsed.urlencoded || apiConfig.urlencoded,
                            });
                        }}
                        style={{ marginTop: 12 }}
                    >
                        保存Curl
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="request-panel">
            {requestCases.length > 0 && (
                <div className="request-active-case-hint">
                    {requestEditorSurface === 'interface'
                        ? ''
                        : `当前用例：${requestCases.find((c) => c.id === activeCaseId)?.name ?? '—'}`}
                </div>
            )}
            <ApiRequestBar
                method={apiConfig.method}
                url={apiConfig.url}
                executing={executing}
                environmentVariables={environmentVariables}
                onMethodChange={onMethodChange}
                onUrlChange={onUrlChange}
                onSend={onSend}
                onSave={onSave}
            />
            <div className="api-config-section">
                <Tabs
                    defaultActiveKey="params"
                    items={tabsItems}
                    animated={(animationEnabled || forceListAnimation)}
                />
            </div>
        </div>
    );
};
