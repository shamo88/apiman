import React, { useState, useEffect } from 'react';
import { Modal, Table } from 'antd';
import { SHORTCUTS_LIST } from '../../hooks/useKeyboardShortcuts';
import './KeyboardShortcutsHelp.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

interface KeyboardShortcutsHelpProps {
  visible: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ visible, onClose }) => {
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };

    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, onClose]);

  const columns = [
    {
      title: '快捷键',
      dataIndex: 'shortcut',
      key: 'shortcut',
      width: 200,
      render: (_: any, record: typeof SHORTCUTS_LIST[0]) => {
        const mods = isMac
          ? record.modifiers.map(m => m === 'ctrl' ? '⌘' : m === 'shift' ? '⇧' : m === 'alt' ? '⌥' : '⌘')
          : record.modifiers.map(m => m === 'ctrl' ? 'Ctrl' : m === 'shift' ? 'Shift' : m === 'alt' ? 'Alt' : 'Ctrl');
        const key = record.key.length === 1 ? record.key.toUpperCase() : record.key;
        return (
          <span className="shortcut-keys">
            {mods.map((mod, i) => (
              <React.Fragment key={i}>
                <kbd className="shortcut-kbd">{mod}</kbd>
                {i < mods.length - 1 && <span className="shortcut-plus">+</span>}
              </React.Fragment>
            ))}
            <span className="shortcut-plus">+</span>
            <kbd className="shortcut-kbd">{key}</kbd>
          </span>
        );
      },
    },
    {
      title: '功能',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <Modal
      title="键盘快捷键"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '90%' : 500}
      className="keyboard-shortcuts-modal"
    >
      <div className="keyboard-shortcuts-content">
        <p className="shortcuts-hint">
          {isMac ? 'Mac 环境下 ⌘ 等同于 Ctrl' : 'Windows/Linux 环境下 Ctrl 为主快捷键'}
        </p>
        <Table
          dataSource={SHORTCUTS_LIST.map(item => ({ ...item, key: item.id }))}
          columns={columns}
          pagination={false}
          size="small"
          className="shortcuts-table"
        />
      </div>
    </Modal>
  );
};

interface ShortcutToastProps {
  shortcutId: string | null;
  message: string;
}

export const ShortcutToast: React.FC<ShortcutToastProps> = ({ shortcutId, message }) => {
  if (!shortcutId) return null;

  return (
    <div className="shortcut-toast">
      <span className="shortcut-toast-message">{message}</span>
    </div>
  );
};
