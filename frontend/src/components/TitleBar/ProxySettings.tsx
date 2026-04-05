import React from 'react';
import { Form, Input, InputNumber, Switch, Divider, Button } from 'antd';
import { GeneralSettingsProps } from './SettingsModal';

export const ProxySettings: React.FC<GeneralSettingsProps> = ({ form, theme, onSave, onCancel }) => {
  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          proxy: {
            enabled: false,
            httpHost: '',
            httpPort: undefined,
            httpsHost: '',
            httpsPort: undefined,
            socks5Host: '',
            socks5Port: undefined,
          },
        }}
      >
        <Form.Item
          name={['proxy', 'enabled']}
          valuePropName="checked"
          label="启用代理"
          style={{ marginTop: '16px' }}
        >
          <Switch />
        </Form.Item>

        <Divider style={{ margin: '16px 0', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }} />

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 500, marginBottom: 12, color: theme === 'dark' ? '#e8e8e8' : '#333' }}>代理配置</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: theme === 'dark' ? '#303030' : '#fafafa' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', width: 80, fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>协议</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>服务器地址</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', width: 120, fontWeight: 500, color: theme === 'dark' ? '#e8e8e8' : '#333', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>端口</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>HTTP</td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['proxy', 'httpHost']} style={{ marginBottom: 0 }}>
                    <Input placeholder="不填则不使用" />
                  </Form.Item>
                </td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['proxy', 'httpPort']} style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="端口" style={{ width: '100%' }} min={1} max={65535} precision={0} />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500, borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>HTTPS</td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['proxy', 'httpsHost']} style={{ marginBottom: 0 }}>
                    <Input placeholder="不填则不使用" />
                  </Form.Item>
                </td>
                <td style={{ padding: '8px 12px', borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#f0f0f0'}` }}>
                  <Form.Item name={['proxy', 'httpsPort']} style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="端口" style={{ width: '100%' }} min={1} max={65535} precision={0} />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: theme === 'dark' ? '#a0a0a0' : '#666', fontWeight: 500 }}>SOCKS5</td>
                <td style={{ padding: '8px 12px' }}>
                  <Form.Item name={['proxy', 'socks5Host']} style={{ marginBottom: 0 }}>
                    <Input placeholder="不填则不使用" />
                  </Form.Item>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <Form.Item name={['proxy', 'socks5Port']} style={{ marginBottom: 0 }}>
                    <InputNumber placeholder="端口" style={{ width: '100%' }} min={1} max={65535} precision={0} />
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
