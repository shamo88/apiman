import React, { useState } from 'react';
import { Modal, Input, Select, message } from 'antd';

interface CreateRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string, method: string) => Promise<void>;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

const METHOD_COLORS: Record<string, string> = {
    GET: '#61affe',
    POST: '#49cc90',
    PUT: '#fca130',
    DELETE: '#f93e3e',
    PATCH: '#50e3c2',
};

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
    visible,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [method, setMethod] = useState('GET');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            message.warning('请输入接口名称');
            return;
        }
        setLoading(true);
        try {
            await onCreate(name.trim(), method);
            setName('');
            setMethod('GET');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setName('');
        setMethod('GET');
        onClose();
    };

    return (
        <Modal
            title="创建接口"
            open={visible}
            onOk={handleCreate}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="创建"
            cancelText="取消"
        >
            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                    placeholder="请输入接口名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleCreate}
                    autoFocus
                />
                <Select
                    value={method}
                    onChange={setMethod}
                    style={{ width: '100%' }}
                >
                    {HTTP_METHODS.map((m) => (
                        <Select.Option key={m} value={m}>
                            <span style={{ color: METHOD_COLORS[m] || '#999', fontWeight: 600 }}>
                                {m}
                            </span>
                        </Select.Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
};
