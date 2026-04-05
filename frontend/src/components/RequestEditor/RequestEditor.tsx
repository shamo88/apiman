import React, { useState } from 'react';
import { Select, Tabs, Button, message, Spin } from 'antd';
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { VariableEditableInput } from '../VariableInput';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { ScriptsEditor } from './ScriptsEditor';
import { CurlEditor } from './CurlEditor';
import { ApiConfig } from '../../constants/defaults';
import { getMethodColor } from '../../constants/httpMethods';
import { buildCurlCommand, parseCurlToApiConfig } from '../../utils/curlUtils';
import './RequestEditor.css';

interface RequestEditorProps {
  apiConfig: ApiConfig;
  onApiConfigChange: (config: ApiConfig) => void;
  executing: boolean;
  onExecute: () => void;
  onSave: () => void;
  environmentVariables: Record<string, string>;
  projectScripts: Array<{ id: string; name: string }>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

export const RequestEditor: React.FC<RequestEditorProps> = ({
  apiConfig,
  onApiConfigChange,
  executing,
  onExecute,
  onSave,
  environmentVariables,
  projectScripts,
}) => {
  const [activeTab, setActiveTab] = useState('params');
  const [curlPreview, setCurlPreview] = useState('');

  const updateConfig = (updates: Partial<ApiConfig>) => {
    onApiConfigChange({ ...apiConfig, ...updates });
  };

  const handleMethodChange = (method: string) => {
    updateConfig({ method });
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
    <div className="request-editor">
      <div className="request-editor-toolbar">
        <Select
          value={apiConfig.method}
          onChange={handleMethodChange}
          style={{ width: 100 }}
          className="method-select"
        >
          {HTTP_METHODS.map((m) => (
            <Select.Option key={m} value={m}>
              <span style={{ color: getMethodColor(m), fontWeight: 600 }}>{m}</span>
            </Select.Option>
          ))}
        </Select>
        <div className="url-input-wrapper">
          <VariableEditableInput
            value={apiConfig.url}
            onChange={handleUrlChange}
            placeholder="输入请求 URL"
            environmentVariables={environmentVariables}
            style={{ flex: 1 }}
          />
        </div>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onExecute}
          loading={executing}
          className="execute-btn"
        >
          发送
        </Button>
        <Button icon={<SaveOutlined />} onClick={onSave}>
          保存
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="request-editor-tabs"
        items={[
          {
            key: 'params',
            label: 'Params',
            children: (
              <ParamsEditor
                params={apiConfig.params}
                onChange={(params) => updateConfig({ params })}
                environmentVariables={environmentVariables}
              />
            ),
          },
          {
            key: 'headers',
            label: 'Headers',
            children: (
              <HeadersEditor
                headers={apiConfig.headers}
                onChange={(headers) => updateConfig({ headers })}
                environmentVariables={environmentVariables}
              />
            ),
          },
          {
            key: 'body',
            label: 'Body',
            children: (
              <BodyEditor
                body={apiConfig.body}
                bodyType={apiConfig.bodyType}
                formData={apiConfig.formData}
                urlencoded={apiConfig.urlencoded}
                onChange={(body, bodyType, formData, urlencoded) =>
                  updateConfig({ body, bodyType, formData, urlencoded })
                }
                environmentVariables={environmentVariables}
              />
            ),
          },
          {
            key: 'scripts',
            label: 'Scripts',
            children: (
              <ScriptsEditor
                preScripts={apiConfig.preScripts}
                postScripts={apiConfig.postScripts}
                onChange={(preScripts, postScripts) => updateConfig({ preScripts, postScripts })}
                projectScripts={projectScripts}
              />
            ),
          },
          {
            key: 'curl',
            label: 'Curl',
            children: (
              <CurlEditor
                curl={curlPreview || buildCurlCommand(apiConfig)}
                onParse={handleParseCurl}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
