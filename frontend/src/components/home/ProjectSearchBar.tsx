import React from 'react';
import { Input, Button, Upload, Space } from 'antd';
import type { UploadProps } from 'antd';
import { SearchOutlined, ImportOutlined, FolderOutlined, PlusOutlined } from '@ant-design/icons';

interface ProjectSearchBarProps {
    searchKeyword: string;
    onSearchChange: (keyword: string) => void;
    onImport: (file: File) => void;
    onCreateGroup: () => void;
    onCreateProject: () => void;
}

export const ProjectSearchBar: React.FC<ProjectSearchBarProps> = ({
    searchKeyword,
    onSearchChange,
    onImport,
    onCreateGroup,
    onCreateProject,
}) => {
    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.json',
        showUploadList: false,
        beforeUpload: (file) => {
            onImport(file);
            return false;
        },
    };

    return (
        <div className="home-header">
            <h2>我的项目</h2>
            <Space>
                <Input
                    allowClear
                    value={searchKeyword}
                    onChange={(e) => onSearchChange(e.target.value)}
                    prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                    placeholder="搜索项目..."
                    style={{ width: 260 }}
                />
                <Upload {...uploadProps}>
                    <Button icon={<ImportOutlined />}>
                        导入 Postman
                    </Button>
                </Upload>
                <Button icon={<FolderOutlined />} onClick={onCreateGroup}>
                    新建分组
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={onCreateProject}>
                    新建项目
                </Button>
            </Space>
        </div>
    );
};
