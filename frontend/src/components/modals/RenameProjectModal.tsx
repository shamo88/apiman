import React from 'react';
import { Modal, Input } from 'antd';

interface RenameProjectModalProps {
  open: boolean;
  onClose: () => void;
  onRename: () => void;
  project: { id: string; name: string } | null;
  onNameChange: (project: { id: string; name: string }) => void;
}

export const RenameProjectModal: React.FC<RenameProjectModalProps> = ({
  open,
  onClose,
  onRename,
  project,
  onNameChange,
}) => {
  return (
    <Modal
      title="重命名项目"
      open={open}
      onCancel={onClose}
      onOk={onRename}
    >
      {project && (
        <Input
          placeholder="项目名称"
          value={project.name}
          onChange={(e) => onNameChange({ ...project, name: e.target.value })}
          onPressEnter={onRename}
        />
      )}
    </Modal>
  );
};
