import React from 'react';
import { Tabs, Select } from 'antd';

interface RequestTab {
    id: string;
    title: string;
    path: string;
}

interface Environment {
    id: string;
    name: string;
}

interface RequestTabsBarProps {
    requestTabs: RequestTab[];
    activeRequestTab: string;
    selectedEnvironmentId: string;
    environments: Environment[];
    animationEnabled: boolean;
    onTabChange: (key: string) => void;
    onTabClose: (targetKey: string) => void;
    onEnvironmentChange: (envId: string) => void;
    loadRequestContent: (path: string) => void;
}

export const RequestTabsBar: React.FC<RequestTabsBarProps> = ({
    requestTabs,
    activeRequestTab,
    selectedEnvironmentId,
    environments,
    animationEnabled,
    onTabChange,
    onTabClose,
    onEnvironmentChange,
    loadRequestContent,
}) => {
    if (requestTabs.length === 0) {
        return null;
    }

    return (
        <div className="request-tabs-row">
            <div className="request-tabs-scroll-wrap">
                <Tabs
                    activeKey={activeRequestTab}
                    onChange={(key) => {
                        onTabChange(key);
                        const tab = requestTabs.find(t => t.id === key);
                        if (tab) loadRequestContent(tab.path);
                    }}
                    type="editable-card"
                    hideAdd
                    onEdit={(targetKey, action) => {
                        if (action === 'remove') {
                            onTabClose(targetKey as string);
                        }
                    }}
                    items={requestTabs.map(tab => ({
                        key: tab.id,
                        label: tab.title,
                    }))}
                    size="small"
                    style={{ marginBottom: 0 }}
                    animated={animationEnabled}
                />
            </div>
            <div className="request-tabs-environment-select">
                <Select
                    size="small"
                    value={selectedEnvironmentId || '__none__'}
                    onChange={(value) => onEnvironmentChange(value === '__none__' ? '' : value)}
                    options={[
                        { label: '不使用环境', value: '__none__' },
                        ...environments.map(env => ({ label: env.name, value: env.id }))
                    ]}
                    style={{ width: 133 }}
                />
            </div>
        </div>
    );
};
