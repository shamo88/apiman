import React from 'react';
import { Button, Dropdown } from 'antd';
import { PlusOutlined, FolderOutlined, FileOutlined, UploadOutlined, DownloadOutlined, SwapOutlined } from '@ant-design/icons';
import { useProjectContext } from '../../contexts/ProjectContext';

interface SidebarMenuHeaderProps {
    activeMenu: 'apis' | 'environments' | 'scripts';
    onMenuChange: (menu: 'apis' | 'environments' | 'scripts') => void;
    onCreateFolder: () => void;
    onCreateRequest: () => void;
    onCreateEnvironment: () => void;
    onCreateScript: () => void;
    projectId?: string;
    scriptSaving?: boolean;
}

export const SidebarMenuHeader: React.FC<SidebarMenuHeaderProps> = ({
    activeMenu,
    onMenuChange,
    onCreateFolder,
    onCreateRequest,
    onCreateEnvironment,
    onCreateScript,
    projectId,
    scriptSaving = false,
}) => {
    const { environment } = useProjectContext();
    const { openImportModal, openCompareModal, exportEnvironments } = environment;

    return (
        <div className="sidebar-header sidebar-menu-header">
            <div className="sidebar-top-menu">
                <button
                    className={`sidebar-menu-item ${activeMenu === 'apis' ? 'active' : ''}`}
                    onClick={() => onMenuChange('apis')}
                >
                    接口列表
                </button>
                <button
                    className={`sidebar-menu-item ${activeMenu === 'environments' ? 'active' : ''}`}
                    onClick={() => onMenuChange('environments')}
                >
                    环境变量
                </button>
                <button
                    className={`sidebar-menu-item ${activeMenu === 'scripts' ? 'active' : ''}`}
                    onClick={() => onMenuChange('scripts')}
                >
                    脚本
                </button>
            </div>
            {activeMenu === 'apis' ? (
                <Dropdown
                    menu={{
                        items: [
                            { key: 'folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: onCreateFolder },
                            { key: 'request', icon: <FileOutlined />, label: '新建请求', onClick: onCreateRequest },
                        ]
                    }}
                    trigger={['click']}
                >
                    <Button size="small" icon={<PlusOutlined />} />
                </Dropdown>
            ) : activeMenu === 'environments' ? (
                <Dropdown
                    menu={{
                        items: [
                            { key: 'create', icon: <PlusOutlined />, label: '新建环境', onClick: onCreateEnvironment },
                            { key: 'import', icon: <UploadOutlined />, label: '导入环境', onClick: openImportModal },
                            { key: 'export', icon: <DownloadOutlined />, label: '导出环境', onClick: () => exportEnvironments(projectId || '') },
                            { key: 'compare', icon: <SwapOutlined />, label: '对比环境', onClick: openCompareModal },
                        ]
                    }}
                    trigger={['click']}
                >
                    <Button size="small" icon={<PlusOutlined />} />
                </Dropdown>
            ) : (
                <Button size="small" icon={<PlusOutlined />} loading={scriptSaving} onClick={onCreateScript} />
            )}
        </div>
    );
};
