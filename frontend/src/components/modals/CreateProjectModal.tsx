import React from 'react';
import { Modal, Input, Button } from 'antd';

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
  projectName: string;
  onNameChange: (name: string) => void;
  loading?: boolean;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  visible,
  onClose,
  onCreate,
  projectName,
  onNameChange,
  loading,
}) => {
  return (
    <Modal
      title="新建项目"
      open={visible}
      onCancel={onClose}
      onOk={onCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="项目名称"
        value={projectName}
        onChange={(e) => onNameChange(e.target.value)}
        onPressEnter={onCreate}
      />
    </Modal>
  );
};
