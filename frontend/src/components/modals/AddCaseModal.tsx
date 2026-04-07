import React, { useState } from 'react';
import { Modal, Input } from 'antd';
import { useUIStore, useProjectStore } from '../../store';
import { useWorkspaceHandlers } from '../../hooks/useWorkspaceHandlers';

export const AddCaseModal: React.FC = () => {
  const { addCaseModalOpen, addCaseTargetPath, closeAddCaseModal } = useUIStore();
  const activeProjectId = useProjectStore((state) => state.activeTab);
  const { handleAddCase } = useWorkspaceHandlers(activeProjectId);
  const [caseName, setCaseName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!caseName.trim() || !addCaseTargetPath) return;
    setLoading(true);
    try {
      await handleAddCase(addCaseTargetPath, caseName.trim());
      setCaseName('');
      closeAddCaseModal();
    } catch (error) {
      console.error('Failed to add case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCaseName('');
    closeAddCaseModal();
  };

  return (
    <Modal
      title="新增用例"
      open={addCaseModalOpen}
      onCancel={handleClose}
      onOk={handleCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="用例名称"
        value={caseName}
        onChange={(e) => setCaseName(e.target.value)}
        onPressEnter={handleCreate}
      />
    </Modal>
  );
};
