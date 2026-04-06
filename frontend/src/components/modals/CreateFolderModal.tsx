import React, { useState } from 'react';
import { Modal, Input } from 'antd';
import { useUIStore, useProjectStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';

export const CreateFolderModal: React.FC = () => {
  const { createFolderModal, createParentPath, closeCreateFolderModal } = useUIStore();
  const activeProjectId = useProjectStore((state) => state.activeTab);
  const { createFolder } = useProjects();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim() || activeProjectId === 'home') return;
    setLoading(true);
    try {
      await createFolder(activeProjectId, createParentPath, folderName.trim());
      setFolderName('');
      closeCreateFolderModal();
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    closeCreateFolderModal();
  };

  return (
    <Modal
      title="新建文件夹"
      open={createFolderModal}
      onCancel={handleClose}
      onOk={handleCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="文件夹名称"
        value={folderName}
        onChange={(e) => setFolderName(e.target.value)}
        onPressEnter={handleCreate}
      />
    </Modal>
  );
};
