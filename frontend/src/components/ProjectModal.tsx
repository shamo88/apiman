import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';

interface CreateProjectModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    appTheme?: 'light' | 'dark';
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
    visible,
    onClose,
    onConfirm,
    appTheme,
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
            title="创建新项目"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            className={`create-project-modal ${appTheme === 'dark' ? 'theme-dark' : ''}`}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入项目名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface CreateGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
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
            title="创建分组"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入分组名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface RenameProjectModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    initialValue?: string;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
    visible,
    onClose,
    onConfirm,
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
            title="重命名项目"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入新项目名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};

interface RenameGroupModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (name: string) => Promise<void>;
    initialValue?: string;
}

export const RenameGroupModal: React.FC<RenameGroupModalProps> = ({
    visible,
    onClose,
    onConfirm,
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
            title="重命名分组"
            open={visible}
            onOk={handleConfirm}
            onCancel={() => { setName(''); onClose(); }}
            confirmLoading={loading}
        >
            <div style={{ padding: '16px 0' }}>
                <Input
                    placeholder="输入新分组名称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onPressEnter={handleConfirm}
                    autoFocus
                />
            </div>
        </Modal>
    );
};
