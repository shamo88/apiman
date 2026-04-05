import React from 'react';
import { Form, Input, Switch, Divider, Button } from 'antd';
import { GeneralSettingsProps } from './SettingsModal';

export const GitSyncSettings: React.FC<GeneralSettingsProps> = ({ form, theme, onSave, onCancel }) => {
  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          gitSync: {
            enabled: false,
            remoteUrl: '',
            branch: 'main',
            password: '',
          }
        }}
      >
        <Form.Item
          name={['gitSync', 'enabled']}
          valuePropName="checked"
          label="启用 Git 同步"
          style={{ marginTop: '16px' }}
        >
          <Switch />
        </Form.Item>

        <Divider style={{ margin: '16px 0', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 12, color: theme === 'dark' ? '#e8e8e8' : '#333' }}>仓库配置</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, width: 80, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>仓库地址</td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['gitSync', 'remoteUrl']} style={{ marginBottom: 0 }}>
                    <Input placeholder="https://gitee.com/username/repo.git" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>分支</td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['gitSync', 'branch']} style={{ marginBottom: 0 }}>
                    <Input placeholder="main" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>Access Token</td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['gitSync', 'password']} style={{ marginBottom: 0 }}>
                    <Input type="password" placeholder="粘贴你的 Access Token" />
                  </Form.Item>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Divider style={{ marginTop: 32, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

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
