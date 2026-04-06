import React, { useState } from 'react';
import { Modal, Input } from 'antd';
import { useUIStore, useProjectStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';
import { createDefaultApiConfig } from '../../constants/defaults';

export const CreateRequestModal: React.FC = () => {
  const { createRequestModal, createParentPath, closeCreateRequestModal } = useUIStore();
  const activeProjectId = useProjectStore((state) => state.activeTab);
  const { createRequest } = useProjects();
  const [requestName, setRequestName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!requestName.trim() || activeProjectId === 'home') return;
    setLoading(true);
    try {
      await createRequest(activeProjectId, createParentPath, requestName.trim(), createDefaultApiConfig());
      setRequestName('');
      closeCreateRequestModal();
    } catch (error) {
      console.error('Failed to create request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRequestName('');
    closeCreateRequestModal();
  };

  return (
    <Modal
      title="新建请求"
      open={createRequestModal}
      onCancel={handleClose}
      onOk={handleCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="请求名称"
        value={requestName}
        onChange={(e) => setRequestName(e.target.value)}
        onPressEnter={handleCreate}
      />
    </Modal>
  );
};
