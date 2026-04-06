import React, { useEffect, useState } from 'react';
import { Button, Divider, Input, Modal, Table, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { AddGlobalCookies, DeleteGlobalCookie, LoadGlobalCookies } from '../../../wailsjs/go/main/App';
import { useUIStore } from '../../store';
import './modals.css';

interface GlobalCookie {
  id: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: string;
  httpOnly: boolean;
  secure: boolean;
}

export const CookieModal: React.FC = () => {
  const { cookieModalVisible, setCookieModalVisible } = useUIStore();
  const [cookieInput, setCookieInput] = useState('');
  const [globalCookies, setGlobalCookies] = useState<GlobalCookie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cookieModalVisible) {
      loadGlobalCookies();
    }
  }, [cookieModalVisible]);

  const loadGlobalCookies = async () => {
    setLoading(true);
    try {
      const data = await LoadGlobalCookies();
      if (data) {
        setGlobalCookies(JSON.parse(data));
      } else {
        setGlobalCookies([]);
      }
    } catch (err) {
      console.error('Failed to load cookies:', err);
      setGlobalCookies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCookies = async () => {
    if (!cookieInput.trim()) {
      message.warning('请输入 set-cookie 内容');
      return;
    }
    try {
      await AddGlobalCookies(cookieInput);
      message.success('Cookie 保存成功');
      setCookieInput('');
      loadGlobalCookies();
    } catch (err) {
      message.error(`保存失败: ${err}`);
    }
  };

  const handleDeleteCookie = async (id: string) => {
    try {
      await DeleteGlobalCookie(id);
      message.success('Cookie 已删除');
      loadGlobalCookies();
    } catch (err: any) {
      console.error('Delete error:', err);
      message.error(`删除失败: ${err?.message || err}`);
    }
  };

  const handleClose = () => {
    setCookieModalVisible(false);
    setCookieInput('');
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 120, ellipsis: true },
    { title: 'Domain', dataIndex: 'domain', key: 'domain', width: 120, ellipsis: true },
    { title: 'Path', dataIndex: 'path', key: 'path', width: 80, ellipsis: true },
    {
      title: 'Expires',
      dataIndex: 'expires',
      key: 'expires',
      width: 150,
      ellipsis: true,
      render: (val: string) => val ? new Date(val).toLocaleString() : 'Session',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: GlobalCookie) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteCookie(record.id)}
        />
      ),
    },
  ];

  return (
    <Modal
      title="全局 Cookies"
      open={cookieModalVisible}
      onOk={handleSaveCookies}
      onCancel={handleClose}
      width={700}
      okText="保存"
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          输入 set-cookie 原始报文，每行一个。Cookie 将对所有项目的所有请求生效。
        </p>
        <Input.TextArea
          rows={6}
          placeholder={`例如:
session=abc123; Domain=.example.com; Path=/; Expires=Wed, 09 Jun 2026 10:18:14 GMT; HttpOnly; Secure
token=xyz789; Domain=api.example.com; Path=/api`}
          value={cookieInput}
          onChange={(e) => setCookieInput(e.target.value)}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
      </div>

      {globalCookies.length > 0 && (
        <div>
          <Divider style={{ margin: '16px 0' }} />
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>已保存的 Cookies</p>
          <Table
            size="small"
            dataSource={globalCookies}
            rowKey="id"
            pagination={false}
            scroll={{ y: 200 }}
            columns={columns}
            loading={loading}
          />
        </div>
      )}
    </Modal>
  );
};
