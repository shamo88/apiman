import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { useUIStore, useProjectStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';

export const RenameModal: React.FC = () => {
  const { renameModal, renameType, renamePath, renameValue, closeRenameModal } = useUIStore();
  const activeProjectId = useProjectStore((state) => state.activeTab);
  const { renameRequest, renameFolder } = useProjects();
  const [inputValue, setInputValue] = useState(renameValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInputValue(renameValue);
  }, [renameValue]);

  const handleRename = async () => {
    if (!inputValue.trim() || !renamePath || activeProjectId === 'home') return;
    setLoading(true);
    try {
      if (renameType === 'request') {
        await renameRequest(activeProjectId, renamePath, inputValue.trim());
      } else {
        await renameFolder(activeProjectId, renamePath, inputValue.trim());
      }
      closeRenameModal();
    } catch (error) {
      console.error('Failed to rename:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInputValue('');
    closeRenameModal();
  };

  return (
    <Modal
      title={`重命名${renameType === 'request' ? '请求' : '文件夹'}`}
      open={renameModal}
      onCancel={handleClose}
      onOk={handleRename}
      confirmLoading={loading}
    >
      <Input
        placeholder={`请输入新的${renameType === 'request' ? '请求' : '文件夹'}名称`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onPressEnter={handleRename}
      />
    </Modal>
  );
};
