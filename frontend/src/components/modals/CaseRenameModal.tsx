import React, { useState, useEffect } from 'react';
import { Modal, Input } from 'antd';
import { useUIStore, useProjectStore, useWorkspaceStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';

export const CaseRenameModal: React.FC = () => {
  const { caseRenameModalOpen, caseRenameCasePath, closeCaseRenameModal } = useUIStore();
  const activeProjectId = useProjectStore((state) => state.activeTab);
  const { renameCase } = useProjects();
  const workspaceStore = useWorkspaceStore();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (caseRenameModalOpen) {
      const parts = caseRenameCasePath.replace('requestCase|', '').split('|');
      if (parts.length === 3) {
        const caseId = parts[2];
        const workspace = workspaceStore.workspaceStates[activeProjectId];
        const caseItem = workspace?.requestCases.find(c => c.id === caseId);
        setInputValue(caseItem?.name || '');
      }
    }
  }, [caseRenameModalOpen, caseRenameCasePath, activeProjectId, workspaceStore]);

  const handleRename = async () => {
    if (!inputValue.trim() || !caseRenameCasePath || activeProjectId === 'home') return;
    setLoading(true);
    try {
      const parts = caseRenameCasePath.replace('requestCase|', '').split('|');
      if (parts.length === 3) {
        const caseId = parts[2];
        await renameCase(activeProjectId, parts[1], caseId, inputValue.trim());
        // Update the case name in workspace store to keep it in sync
        workspaceStore.updateCase(activeProjectId, caseId, { name: inputValue.trim() });
      }
      closeCaseRenameModal();
    } catch (error) {
      console.error('Failed to rename case:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setInputValue('');
    closeCaseRenameModal();
  };

  return (
    <Modal
      title="重命名用例"
      open={caseRenameModalOpen}
      onCancel={handleClose}
      onOk={handleRename}
      confirmLoading={loading}
    >
      <Input
        placeholder="请输入新的用例名称"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onPressEnter={handleRename}
        autoFocus
      />
    </Modal>
  );
};
