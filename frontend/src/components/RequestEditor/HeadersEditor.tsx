import React from 'react';
import { Button, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { VariableEditableInput } from '../VariableInput';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface HeadersEditorProps {
  headers: KeyValuePair[];
  onChange: (headers: KeyValuePair[]) => void;
  environmentVariables: Record<string, string>;
}

export const HeadersEditor: React.FC<HeadersEditorProps> = ({
  headers,
  onChange,
  environmentVariables,
}) => {
  const addHeader = () => {
    onChange([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, updates: Partial<KeyValuePair>) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    onChange(newHeaders);
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="headers-editor">
      {headers.map((header, index) => (
        <div key={index} className="kv-row">
          <Switch
            checked={header.enabled}
            onChange={(checked) => updateHeader(index, { enabled: checked })}
            size="small"
          />
          <VariableEditableInput
            value={header.key}
            onChange={(key) => updateHeader(index, { key })}
            placeholder="Header Name"
            environmentVariables={environmentVariables}
            style={{ flex: 1 }}
          />
          <VariableEditableInput
            value={header.value}
            onChange={(value) => updateHeader(index, { value })}
            placeholder="Header Value"
            environmentVariables={environmentVariables}
            style={{ flex: 1 }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeHeader(index)}
          />
        </div>
      ))}
      <Button type="dashed" onClick={addHeader} icon={<PlusOutlined />} block>
        添加请求头
      </Button>
    </div>
  );
};
