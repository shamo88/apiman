import React, { useState, useEffect } from 'react';
import { Modal, Input, message } from 'antd';

interface RenameModalProps {
    visible: boolean;
    title: string;
    initialValue: string;
    onClose: () => void;
    onRename: (newName: string) => Promise<void>;
}

export const RenameModal: React.FC<RenameModalProps> = ({
    visible,
    title,
    initialValue,
    onClose,
    onRename,
}) => {
    const [name, setName] = useState(initialValue);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(initialValue);
        }
    }, [visible, initialValue]);

    const handleRename = async () => {
        if (!name.trim()) {
            message.warning('请输入名称');
            return;
        }
        setLoading(true);
        try {
            await onRename(name.trim());
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
            title={title}
            open={visible}
            onOk={handleRename}
            onCancel={handleCancel}
            confirmLoading={loading}
            okText="确定"
            cancelText="取消"
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="请输入名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleRename}
                    autoFocus
                />
            </div>
        </Modal>
    );
};
