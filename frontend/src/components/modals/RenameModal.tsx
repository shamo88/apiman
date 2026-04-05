import React from 'react';
import { Modal, Input } from 'antd';

interface RenameModalProps {
  visible: boolean;
  onClose: () => void;
  onRename: () => void;
  type: 'request' | 'folder';
  value: string;
  onValueChange: (value: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  visible,
  onClose,
  onRename,
  type,
  value,
  onValueChange,
}) => {
  return (
    <Modal
      title={`重命名${type === 'request' ? '请求' : '文件夹'}`}
      open={visible}
      onCancel={onClose}
      onOk={onRename}
    >
      <Input
        placeholder={`请输入新的${type === 'request' ? '请求' : '文件夹'}名称`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onPressEnter={onRename}
      />
    </Modal>
  );
};
