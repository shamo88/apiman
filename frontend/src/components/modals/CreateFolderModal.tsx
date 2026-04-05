import React from 'react';
import { Modal, Input } from 'antd';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
  folderName: string;
  onNameChange: (name: string) => void;
  loading?: boolean;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onCreate,
  folderName,
  onNameChange,
  loading,
}) => {
  return (
    <Modal
      title="新建文件夹"
      open={visible}
      onCancel={onClose}
      onOk={onCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="文件夹名称"
        value={folderName}
        onChange={(e) => onNameChange(e.target.value)}
        onPressEnter={onCreate}
      />
    </Modal>
  );
};
