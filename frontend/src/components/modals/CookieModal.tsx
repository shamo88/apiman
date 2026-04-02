import React, { useState } from 'react';
import { Modal, Input, Button, Table, Divider, message } from 'antd';
import { AddGlobalCookies, DeleteGlobalCookie } from '../../../wailsjs/go/main/App';

interface CookieModalProps {
    visible: boolean;
    onClose: () => void;
    appTheme: 'light' | 'dark';
    cookieInput: string;
    setCookieInput: (v: string) => void;
    globalCookies: any[];
    onLoadCookies: () => void;
}

export const CookieModal: React.FC<CookieModalProps> = ({
    visible,
    onClose,
    appTheme,
    cookieInput,
    setCookieInput,
    globalCookies,
    onLoadCookies,
}) => {
    const [saving, setSaving] = useState(false);

    const handleSaveCookies = async () => {
        if (!cookieInput.trim()) {
            message.warning('请输入 set-cookie 内容');
            return;
        }
        setSaving(true);
        try {
            await AddGlobalCookies(cookieInput);
            message.success('Cookie 保存成功');
            setCookieInput('');
            onLoadCookies();
        } catch (err) {
            message.error(`保存失败: ${err}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCookie = async (id: string) => {
        try {
            await DeleteGlobalCookie(id);
            message.success('Cookie 已删除');
            onLoadCookies();
        } catch (err: any) {
            console.error('Delete error:', err);
            message.error(`删除失败: ${err?.message || err}`);
        }
    };

    const handleClose = () => {
        setCookieInput('');
        onClose();
    };

    return (
        <Modal
            title="设置全局Cookie"
            open={visible}
            onOk={handleSaveCookies}
            onCancel={handleClose}
            className={`cookie-modal ${appTheme === 'dark' ? 'theme-dark' : ''}`}
            width={700}
            okText="保存"
            confirmLoading={saving}
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
                        columns={[
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
                            { title: 'SameSite', dataIndex: 'same_site', key: 'same_site', width: 80, ellipsis: true },
                            { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80, ellipsis: true },
                            {
                                title: 'Action',
                                key: 'action',
                                width: 80,
                                render: (_: any, record: any) => (
                                    <Button
                                        type="text"
                                        danger
                                        size="small"
                                        onClick={() => handleDeleteCookie(record.id)}
                                    >
                                        删除
                                    </Button>
                                ),
                            },
                        ]}
                    />
                </div>
            )}
        </Modal>
    );
};
