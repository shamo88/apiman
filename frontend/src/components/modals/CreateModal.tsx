import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';

interface CreateFolderModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
    visible,
    onClose,
    onConfirm,
}) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName('');
        }
    }, [visible]);

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

    return (
        <Modal
            title="创建文件夹"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入文件夹名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface CreateRequestModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
    visible,
    onClose,
    onConfirm,
}) => {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName('');
        }
    }, [visible]);

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

    return (
        <Modal
            title="创建请求"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入请求名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface RenameModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    title: string;
    initialValue?: string;
}

export const RenameModal: React.FC<RenameModalProps> = ({
    visible,
    onClose,
    onConfirm,
    title,
    initialValue = '',
}) => {
    const [name, setName] = useState(initialValue);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            setName(initialValue);
        }
    }, [visible, initialValue]);

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

    return (
        <Modal
            title={title}
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入新名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};
