import React from 'react';
import { Modal, Input } from 'antd';

interface CreateRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: () => void;
  requestName: string;
  onNameChange: (name: string) => void;
  loading?: boolean;
}

export const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  visible,
  onClose,
  onCreate,
  requestName,
  onNameChange,
  loading,
}) => {
  return (
    <Modal
      title="新建请求"
      open={visible}
      onCancel={onClose}
      onOk={onCreate}
      confirmLoading={loading}
    >
      <Input
        placeholder="请求名称"
        value={requestName}
        onChange={(e) => onNameChange(e.target.value)}
        onPressEnter={onCreate}
      />
    </Modal>
  );
};
