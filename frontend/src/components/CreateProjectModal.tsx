import React, { useState } from 'react';
import { Modal, Input, message } from 'antd';

interface CreateProjectModalProps {
    visible: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    visible,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            message.warning('请输入项目名称');
            return;
        }
        setLoading(true);
        try {
            await onCreate(name.trim());
            setName('');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setName('');
        onClose();
    };

    return (
        <Modal
            title="创建项目"
            open={visible}
            onOk={handleCreate}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="创建"
            cancelText="取消"
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="请输入项目名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleCreate}
                    autoFocus
                />
            </div>
        </Modal>
    );
};
