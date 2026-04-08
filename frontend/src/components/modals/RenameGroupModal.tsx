import React from 'react';
import { Modal, Input } from 'antd';

interface RenameGroupModalProps {
  open: boolean;
  onClose: () => void;
  onRename: () => void;
  groupName: string;
  onNameChange: (name: string) => void;
}

export const RenameGroupModal: React.FC<RenameGroupModalProps> = ({
  open,
  onClose,
  onRename,
  groupName,
  onNameChange,
}) => {
  return (
    <Modal
      title="重命名分组"
      open={open}
      onCancel={onClose}
      onOk={onRename}
    >
      <Input
        placeholder="分组名称"
        value={groupName}
        onChange={(e) => onNameChange(e.target.value)}
        onPressEnter={onRename}
      />
    </Modal>
  );
};
