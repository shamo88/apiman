import React from 'react';
import { Button, Input, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { VariableEditableInput } from '../VariableInput';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface ParamsEditorProps {
  params: KeyValuePair[];
  onChange: (params: KeyValuePair[]) => void;
  environmentVariables: Record<string, string>;
}

export const ParamsEditor: React.FC<ParamsEditorProps> = ({
  params,
  onChange,
  environmentVariables,
}) => {
  const addParam = () => {
    onChange([...params, { key: '', value: '', enabled: true }]);
  };

  const updateParam = (index: number, updates: Partial<KeyValuePair>) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], ...updates };
    onChange(newParams);
  };

  const removeParam = (index: number) => {
    onChange(params.filter((_, i) => i !== index));
  };

  return (
    <div className="params-editor">
      {params.map((param, index) => (
        <div key={index} className="kv-row">
          <Switch
            checked={param.enabled}
            onChange={(checked) => updateParam(index, { enabled: checked })}
            size="small"
          />
          <VariableEditableInput
            value={param.key}
            onChange={(key) => updateParam(index, { key })}
            placeholder="Key"
            environmentVariables={environmentVariables}
            style={{ flex: 1 }}
          />
          <VariableEditableInput
            value={param.value}
            onChange={(value) => updateParam(index, { value })}
            placeholder="Value"
            environmentVariables={environmentVariables}
            style={{ flex: 1 }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeParam(index)}
          />
        </div>
      ))}
      <Button type="dashed" onClick={addParam} icon={<PlusOutlined />} block>
        添加参数
      </Button>
    </div>
  );
};
