import React, { useState } from 'react';
import { Tabs, Button, Input } from 'antd';
import { ApiRequestBar, KeyValueEditor, BodyTypeSelector, ScriptBindingList, VariableEditableInput } from '../request';
import { ApiConfig } from '../../constants/defaults';
import { buildCurlCommand, parseCurlToApiConfig } from '../../utils/curlUtils';
import './RequestPanel.css';

interface RequestPanelProps {
  apiConfig: ApiConfig;
  onApiConfigChange: (config: ApiConfig) => void;
  executing: boolean;
  onExecute: () => void;
  onCancel: () => void;
  onSave: () => void;
  environmentVariables: Record<string, string>;
  projectScripts: Array<{ id: string; name: string }>;
}

// 动态键值对接口，支持通过变量访问属性
interface KeyValue {
  key: string;
  value: string;
  enabled?: boolean;
  [prop: string]: string | boolean | undefined;
}

export const RequestPanel: React.FC<RequestPanelProps> = ({
  apiConfig,
  onApiConfigChange,
  executing,
  onExecute,
  onCancel,
  onSave,
  environmentVariables,
  projectScripts,
}) => {
  const [activeTab, setActiveTab] = useState('params');
  const [curlPreview, setCurlPreview] = useState('');

  const updateConfig = (updates: Partial<ApiConfig>) => {
    onApiConfigChange({ ...apiConfig, ...updates });
  };

  const handleUrlChange = (url: string) => {
    updateConfig({ url });
    setCurlPreview(buildCurlCommand({ ...apiConfig, url }));
  };

  const handleParseCurl = (curl: string) => {
    const parsed = parseCurlToApiConfig(curl);
    onApiConfigChange({ ...apiConfig, ...parsed });
  };

  return (
    <div className="request-panel">
      <ApiRequestBar
        method={apiConfig.method}
        url={apiConfig.url}
        executing={executing}
        environmentVariables={environmentVariables}
        onMethodChange={(value) => updateConfig({ method: value })}
        onUrlChange={handleUrlChange}
        onSend={onExecute}
        onCancel={onCancel}
        onSave={onSave}
      />

      <div className="api-config-section">
        <Tabs
          defaultActiveKey="params"
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'params',
              label: 'Params',
              children: (
                <KeyValueEditor
                  items={apiConfig.params}
                  onAdd={() => updateConfig({ params: [...apiConfig.params, { key: '', value: '', enabled: true }] })}
                  onRemove={(index) => updateConfig({ params: apiConfig.params.filter((_, i) => i !== index) })}
                  onUpdate={(index, field, value) => {
                    const newParams = [...apiConfig.params];
                    if (field === 'enabled') {
                      newParams[index].enabled = value as boolean;
                    } else {
                      (newParams[index] as KeyValue)[field] = value as string;
                    }
                    updateConfig({ params: newParams });
                  }}
                  renderValueInput={(index, value, onChange) => (
                    <VariableEditableInput
                      value={value}
                      onChange={onChange}
                      placeholder="Value"
                      environmentVariables={environmentVariables}
                      style={{ flex: 1 }}
                    />
                  )}
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
                  onAdd={() => updateConfig({ headers: [...apiConfig.headers, { key: '', value: '', enabled: true }] })}
                  onRemove={(index) => updateConfig({ headers: apiConfig.headers.filter((_, i) => i !== index) })}
                  onUpdate={(index, field, value) => {
                    const newHeaders = [...apiConfig.headers];
                    if (field === 'enabled') {
                      newHeaders[index].enabled = value as boolean;
                    } else {
                      (newHeaders[index] as KeyValue)[field] = value as string;
                    }
                    updateConfig({ headers: newHeaders });
                  }}
                  renderValueInput={(index, value, onChange) => (
                    <VariableEditableInput
                      value={value}
                      onChange={onChange}
                      placeholder="Value"
                      environmentVariables={environmentVariables}
                      style={{ flex: 1 }}
                    />
                  )}
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
                      onChange={(type) => updateConfig({ bodyType: type })}
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
                        if (field === 'enabled') {
                          newData[index].enabled = value as boolean;
                        } else {
                          (newData[index] as KeyValue)[field] = value as string;
                        }
                        updateConfig(apiConfig.bodyType === 'form-data'
                          ? { ...apiConfig, formData: newData }
                          : { ...apiConfig, urlencoded: newData });
                      }}
                      renderKeyInput={(index, value, onChange) => (
                        <VariableEditableInput
                          value={value}
                          onChange={onChange}
                          placeholder="Key"
                          environmentVariables={environmentVariables}
                          style={{ flex: 1 }}
                        />
                      )}
                      renderValueInput={(index, value, onChange) => (
                        <VariableEditableInput
                          value={value}
                          onChange={onChange}
                          placeholder="Value"
                          environmentVariables={environmentVariables}
                          style={{ flex: 1 }}
                        />
                      )}
                      addButtonText="添加字段"
                    />
                  )}
                  {(apiConfig.bodyType === 'json' || apiConfig.bodyType === 'xml' || apiConfig.bodyType === 'raw') && (
                    <div className="body-raw-editor">
                      <VariableEditableInput
                        value={apiConfig.body}
                        onChange={(value) => updateConfig({ body: value })}
                        placeholder={
                          apiConfig.bodyType === 'json'
                            ? '{\n  "key": "value"\n}'
                            : apiConfig.bodyType === 'xml'
                              ? '<root>\n  <key>value</key>\n</root>'
                              : 'Raw body content'
                        }
                        environmentVariables={environmentVariables}
                        multiline
                        style={{ fontFamily: 'monospace', minHeight: 150, marginTop: 12 }}
                      />
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
                    onAdd={(scriptId) => updateConfig({ preScripts: [...apiConfig.preScripts, scriptId] })}
                    onRemove={(scriptId) => updateConfig({ preScripts: apiConfig.preScripts.filter(id => id !== scriptId) })}
                    onMoveUp={(index) => {
                      if (index > 0) {
                        const newScripts = [...apiConfig.preScripts];
                        [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
                        updateConfig({ preScripts: newScripts });
                      }
                    }}
                    onMoveDown={(index) => {
                      if (index < apiConfig.preScripts.length - 1) {
                        const newScripts = [...apiConfig.preScripts];
                        [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
                        updateConfig({ preScripts: newScripts });
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
                    onAdd={(scriptId) => updateConfig({ postScripts: [...apiConfig.postScripts, scriptId] })}
                    onRemove={(scriptId) => updateConfig({ postScripts: apiConfig.postScripts.filter(id => id !== scriptId) })}
                    onMoveUp={(index) => {
                      if (index > 0) {
                        const newScripts = [...apiConfig.postScripts];
                        [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
                        updateConfig({ postScripts: newScripts });
                      }
                    }}
                    onMoveDown={(index) => {
                      if (index < apiConfig.postScripts.length - 1) {
                        const newScripts = [...apiConfig.postScripts];
                        [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
                        updateConfig({ postScripts: newScripts });
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
                  <VariableEditableInput
                    value={curlPreview || buildCurlCommand(apiConfig)}
                    onChange={(value) => setCurlPreview(value)}
                    placeholder="curl 命令将显示在这里..."
                    environmentVariables={environmentVariables}
                    multiline
                    style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 200, marginTop: 0 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      const parsed = parseCurlToApiConfig(curlPreview);
                      // 合并headers
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
                      // 合并params
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
          ]}
        />
      </div>
    </div>
  );
};