import React from 'react';
import { Form, Switch, Divider, Button } from 'antd';
import { GeneralSettingsProps } from './SettingsModal';

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ form, onSave, onCancel }) => {
  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ui: {
            enableListAnimation: false,
          }
        }}
      >
        <Form.Item
          name={['ui', 'enableListAnimation']}
          valuePropName="checked"
          label="动画"
          style={{ marginTop: '16px' }}
        >
          <Switch />
        </Form.Item>

        <Divider style={{ marginTop: 24, borderColor: '#f0f0f0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onCancel}>
            取消
          </Button>
          <Button type="primary" onClick={onSave}>
            保存
          </Button>
        </div>
      </Form>
    </div>
  );
};
