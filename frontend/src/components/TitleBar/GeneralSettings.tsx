import React from 'react';
import { Form, Radio, Switch, Divider, Button } from 'antd';
import { GeneralSettingsProps } from './SettingsModal';

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ form, theme, onSave, onCancel }) => {
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

        <Form.Item
          name={['ui', 'theme']}
          label="主题"
          style={{ marginTop: '16px' }}
        >
          <Radio.Group style={{ textAlign: 'left' }}>
            <Radio value="light" style={{ marginRight: 16, color: theme === 'dark' ? 'var(--text-secondary)' : '#333' }}>浅色</Radio>
            <Radio value="dark" style={{ color: theme === 'dark' ? 'var(--text-secondary)' : '#333' }}>深色</Radio>
          </Radio.Group>
        </Form.Item>

        <Divider style={{ marginTop: 24, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={onCancel} style={{ background: theme === 'dark' ? '#303030' : undefined, color: theme === 'dark' ? '#e8e8e8' : undefined, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : undefined }}>
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
