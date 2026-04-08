import React from 'react';
import { Modal, Input } from 'antd';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  groupName: string;
  onNameChange: (name: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  open,
  onClose,
  onCreate,
  groupName,
  onNameChange,
}) => {
  return (
    <Modal
      title="新建分组"
      open={open}
      onCancel={onClose}
      onOk={onCreate}
    >
      <Input
        placeholder="分组名称"
        value={groupName}
        onChange={(e) => onNameChange(e.target.value)}
        onPressEnter={onCreate}
      />
    </Modal>
  );
};
