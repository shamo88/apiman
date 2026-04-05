import React from 'react';
import { Radio, Input, Button, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { VariableEditableInput } from '../VariableInput';
import { ApiConfig } from '../../constants/defaults';

interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

interface BodyEditorProps {
  body: string;
  bodyType: ApiConfig['bodyType'];
  formData: KeyValuePair[];
  urlencoded: KeyValuePair[];
  onChange: (body: string, bodyType: ApiConfig['bodyType'], formData: KeyValuePair[], urlencoded: KeyValuePair[]) => void;
  environmentVariables: Record<string, string>;
}

export const BodyEditor: React.FC<BodyEditorProps> = ({
  body,
  bodyType,
  formData,
  urlencoded,
  onChange,
  environmentVariables,
}) => {
  const addFormData = () => {
    onChange(body, bodyType, [...formData, { key: '', value: '', enabled: true }], urlencoded);
  };

  const updateFormData = (index: number, updates: Partial<KeyValuePair>) => {
    const newFormData = [...formData];
    newFormData[index] = { ...newFormData[index], ...updates };
    onChange(body, bodyType, newFormData, urlencoded);
  };

  const removeFormData = (index: number) => {
    onChange(body, bodyType, formData.filter((_, i) => i !== index), urlencoded);
  };

  const addUrlencoded = () => {
    onChange(body, bodyType, formData, [...urlencoded, { key: '', value: '', enabled: true }]);
  };

  const updateUrlencoded = (index: number, updates: Partial<KeyValuePair>) => {
    const newUrlencoded = [...urlencoded];
    newUrlencoded[index] = { ...newUrlencoded[index], ...updates };
    onChange(body, bodyType, formData, newUrlencoded);
  };

  const removeUrlencoded = (index: number) => {
    onChange(body, bodyType, formData, urlencoded.filter((_, i) => i !== index));
  };

  return (
    <div className="body-editor">
      <Radio.Group
        value={bodyType}
        onChange={(e) => onChange(body, e.target.value, formData, urlencoded)}
        className="body-type-radio"
      >
        <Radio value="none">none</Radio>
        <Radio value="form-data">form-data</Radio>
        <Radio value="x-www-form-urlencoded">x-www-form-urlencoded</Radio>
        <Radio value="json">JSON</Radio>
        <Radio value="xml">XML</Radio>
        <Radio value="raw">raw</Radio>
      </Radio.Group>

      {bodyType === 'none' && (
        <div className="body-empty-hint">此请求没有 body</div>
      )}

      {(bodyType === 'json' || bodyType === 'xml' || bodyType === 'raw') && (
        <div className="body-raw-editor">
          <VariableEditableInput
            value={body}
            onChange={(value) => onChange(value, bodyType, formData, urlencoded)}
            placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter body content'}
            environmentVariables={environmentVariables}
            multiline={true}
            style={{ minHeight: 200 }}
          />
        </div>
      )}

      {bodyType === 'form-data' && (
        <div className="body-form-data">
          {formData.map((item, index) => (
            <div key={index} className="kv-row">
              <Switch
                checked={item.enabled}
                onChange={(checked) => updateFormData(index, { enabled: checked })}
                size="small"
              />
              <VariableEditableInput
                value={item.key}
                onChange={(key) => updateFormData(index, { key })}
                placeholder="Key"
                environmentVariables={environmentVariables}
                style={{ flex: 1 }}
              />
              <VariableEditableInput
                value={item.value}
                onChange={(value) => updateFormData(index, { value })}
                placeholder="Value"
                environmentVariables={environmentVariables}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFormData(index)}
              />
            </div>
          ))}
          <Button type="dashed" onClick={addFormData} icon={<PlusOutlined />} block>
            添加字段
          </Button>
        </div>
      )}

      {bodyType === 'x-www-form-urlencoded' && (
        <div className="body-urlencoded">
          {urlencoded.map((item, index) => (
            <div key={index} className="kv-row">
              <Switch
                checked={item.enabled}
                onChange={(checked) => updateUrlencoded(index, { enabled: checked })}
                size="small"
              />
              <VariableEditableInput
                value={item.key}
                onChange={(key) => updateUrlencoded(index, { key })}
                placeholder="Key"
                environmentVariables={environmentVariables}
                style={{ flex: 1 }}
              />
              <VariableEditableInput
                value={item.value}
                onChange={(value) => updateUrlencoded(index, { value })}
                placeholder="Value"
                environmentVariables={environmentVariables}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeUrlencoded(index)}
              />
            </div>
          ))}
          <Button type="dashed" onClick={addUrlencoded} icon={<PlusOutlined />} block>
            添加字段
          </Button>
        </div>
      )}
    </div>
  );
};
