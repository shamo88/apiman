import React from 'react';
import { Empty } from 'antd';
import { useProjectContext } from '../../contexts/ProjectContext';
import { EnvironmentPanel } from './EnvironmentPanel';
import { EnvironmentImportModal, EnvironmentCompareModal } from '../modals';

interface EnvironmentViewProps {
    projectId: string | undefined;
}

export const EnvironmentView: React.FC<EnvironmentViewProps> = ({
    projectId,
}) => {
    const { environment } = useProjectContext();
    const {
        environments,
        environmentTabs,
        importModalVisible,
        compareModalVisible,
        closeImportModal,
        closeCompareModal,
        importEnvironments,
    } = environment;

    const handleImport = async (jsonData: string) => {
        if (projectId) {
            await importEnvironments(projectId, jsonData);
        }
    };

    return (
        <>
            <EnvironmentImportModal
                visible={importModalVisible}
                onClose={closeImportModal}
                onImport={handleImport}
            />
            <EnvironmentCompareModal
                visible={compareModalVisible}
                onClose={closeCompareModal}
                environments={environments}
            />
            {environmentTabs.length > 0 ? (
                <EnvironmentPanel projectId={projectId} />
            ) : (
                <Empty description="请先在左侧选择环境，或点击新建" />
            )}
        </>
    );
};
