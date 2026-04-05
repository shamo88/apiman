import React from 'react';
import { Tabs, Select } from 'antd';
import { useRequest } from '../../hooks/useRequest';
import { useProject } from '../../hooks/useProject';

interface RequestTabsBarProps {
    projectId: string | undefined;
}

export const RequestTabsBar: React.FC<RequestTabsBarProps> = ({
    projectId,
}) => {
    const useReq = useRequest({});
    const project = useProject(projectId);

    const { requestTabs, activeRequestTab } = useReq;
    const { environments, selectedEnvironmentId, setSelectedEnvironmentId } = project;

    if (requestTabs.length === 0) {
        return null;
    }

    const handleTabChange = (key: string) => {
        useReq.setActiveRequestTab(key);
        const tab = requestTabs.find(t => t.id === key);
        if (tab) {
            useReq.loadRequestContent(tab.path);
        }
    };

    const handleTabClose = (targetKey: string) => {
        useReq.handleCloseRequestTab(targetKey);
    };

    return (
        <div className="request-tabs-row">
            <div className="request-tabs-scroll-wrap">
                <Tabs
                    activeKey={activeRequestTab}
                    onChange={handleTabChange}
                    type="editable-card"
                    hideAdd
                    onEdit={(targetKey, action) => {
                        if (action === 'remove') {
                            handleTabClose(targetKey as string);
                        }
                    }}
                    items={requestTabs.map(tab => ({
                        key: tab.id,
                        label: tab.title,
                    }))}
                    animated={false}
                />
            </div>
            {environments.length > 0 && (
                <div className="request-tabs-environment-select">
                    <Select
                        value={selectedEnvironmentId || undefined}
                        onChange={setSelectedEnvironmentId}
                        options={[
                            { label: '无环境', value: '' },
                            ...environments.map(env => ({ label: env.name, value: env.id })),
                        ]}
                        style={{ width: 100 }}
                        placeholder="选择环境"
                    />
                </div>
            )}
        </div>
    );
};
