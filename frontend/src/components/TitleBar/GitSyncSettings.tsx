import React, { useState, useEffect } from 'react';
import { Form, Input, Switch, Divider, Button, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { GeneralSettingsProps } from './SettingsModal';
import { ListGitBranches, GetCurrentGitBranch, CreateGitBranch, SwitchGitBranch, DeleteGitBranch } from '../../../wailsjs/go/main/App';

export const GitSyncSettings: React.FC<GeneralSettingsProps> = ({ form, onSave, onCancel }) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const branchList = await ListGitBranches();
      setBranches(branchList || []);
      const current = await GetCurrentGitBranch();
      setCurrentBranch(current || '');
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const handleCreateBranch = async () => {
    const name = newBranchName.trim();
    if (!name) {
      message.warning('请输入分支名称');
      return;
    }
    if (branches.includes(name)) {
      message.warning('分支已存在');
      return;
    }
    try {
      setLoading(true);
      await CreateGitBranch(name);
      await SwitchGitBranch(name);
      setNewBranchName('');
      await loadBranches();
      message.success(`分支 "${name}" 创建成功并已切换`);
      form.setFieldsValue({ 'gitSync': { ...form.getFieldValue('gitSync'), branch: name } });
    } catch (error) {
      message.error(`创建分支失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (name: string) => {
    try {
      setLoading(true);
      await SwitchGitBranch(name);
      setCurrentBranch(name);
      message.success(`已切换到分支 "${name}"`);
      form.setFieldsValue({ 'gitSync': { ...form.getFieldValue('gitSync'), branch: name } });
    } catch (error) {
      message.error(`切换分支失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (name: string) => {
    try {
      setLoading(true);
      await DeleteGitBranch(name);
      await loadBranches();
      message.success(`分支 "${name}" 已删除`);
    } catch (error) {
      message.error(`删除分支失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

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

        <Divider style={{ margin: '16px 0', borderColor: '#f0f0f0' }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 12, color: '#333' }}>仓库配置</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500, width: 80, borderBottom: '1px solid #f0f0f0' }}>仓库地址</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                  <Form.Item name={['gitSync', 'remoteUrl']} style={{ marginBottom: 0 }}>
                    <Input placeholder="https://gitee.com/username/repo.git" />
                  </Form.Item>
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>Access Token</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                  <Form.Item name={['gitSync', 'password']} style={{ marginBottom: 0 }}>
                    <Input type="password" placeholder="粘贴你的 Access Token" />
                  </Form.Item>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Divider style={{ margin: '16px 0', borderColor: '#f0f0f0' }} />

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontWeight: 500, color: '#333' }}>分支管理</div>
            {currentBranch && (
              <div style={{
                padding: '4px 12px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 4,
                fontSize: 12,
                color: '#52c41a'
              }}>
                当前分支: <strong>{currentBranch}</strong>
              </div>
            )}
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 12px', color: '#666', fontWeight: 500, width: 80, borderBottom: '1px solid #f0f0f0' }}>当前分支</td>
                <td style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                  <Form.Item name={['gitSync', 'branch']} style={{ marginBottom: 0 }}>
                    <Select
                      placeholder="选择分支"
                      showSearch
                      allowClear
                      style={{ width: '100%' }}
                      onChange={(value) => {
                        if (value) {
                          handleSwitchBranch(value);
                        }
                      }}
                      disabled={loading}
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ padding: '4px 8px', display: 'flex', gap: 8 }}>
                            <Input
                              placeholder="新分支名"
                              value={newBranchName}
                              onChange={(e) => setNewBranchName(e.target.value)}
                              onPressEnter={handleCreateBranch}
                              style={{ flex: 1 }}
                              size="small"
                            />
                            <Button
                              type="primary"
                              icon={<PlusOutlined />}
                              onClick={handleCreateBranch}
                              loading={loading}
                              size="small"
                            >
                              创建
                            </Button>
                          </div>
                        </>
                      )}
                    >
                      {branches.map((branch) => (
                        <Select.Option key={branch} value={branch}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{branch}</span>
                            {branch === currentBranch && (
                              <span style={{ color: '#52c41a', fontSize: 12 }}>当前</span>
                            )}
                          </div>
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </td>
              </tr>
            </tbody>
          </table>

          {branches.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                所有分支 ({branches.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {branches.map((branch) => (
                  <div
                    key={branch}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 12px',
                      background: branch === currentBranch
                        ? '#f6ffed'
                        : 'transparent',
                      borderRadius: 4,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        color: branch === currentBranch
                          ? '#52c41a'
                          : '#333'
                      }}>
                        {branch}
                      </span>
                      {branch === currentBranch && (
                        <span style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          background: '#d9f7be',
                          borderRadius: 4,
                          color: '#52c41a'
                        }}>
                          当前
                        </span>
                      )}
                    </div>
                    {branch !== currentBranch && (
                      <Popconfirm
                        title="确定删除此分支？"
                        onConfirm={() => handleDeleteBranch(branch)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={loading}
                        />
                      </Popconfirm>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Divider style={{ marginTop: 32, borderColor: '#f0f0f0' }} />

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