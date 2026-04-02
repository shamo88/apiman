import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';

interface AddCaseModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    initialName?: string;
    title?: string;
}

export const AddCaseModal: React.FC<AddCaseModalProps> = ({
    visible,
    onClose,
    onConfirm,
    initialName = '',
    title = '新增用例',
}) => {
    const [name, setName] = useState(initialName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(initialName);
        }
    }, [visible, initialName]);

    const handleConfirm = async () => {
        if (!name.trim()) {
            return;
        }
        setLoading(true);
        try {
            await onConfirm(name.trim());
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
            title={title}
            open={visible}
            onOk={handleConfirm}
            onCancel={handleCancel}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入用例名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface RenameCaseModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    initialName: string;
}

export const RenameCaseModal: React.FC<RenameCaseModalProps> = ({
    visible,
    onClose,
    onConfirm,
    initialName,
}) => {
    const [name, setName] = useState(initialName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(initialName);
        }
    }, [visible, initialName]);

    const handleConfirm = async () => {
        if (!name.trim()) {
            return;
        }
        setLoading(true);
        try {
            await onConfirm(name.trim());
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
            title="重命名用例"
            open={visible}
            onOk={handleConfirm}
            onCancel={handleCancel}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="用例名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};
