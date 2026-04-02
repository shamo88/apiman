import React from 'react';
import { Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const HTTP_METHOD_OPTIONS = [
    { value: 'ALL', label: '全部方法' },
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
];

interface ApiListFiltersProps {
    searchKeyword: string;
    filterMethod: string;
    onSearchChange: (keyword: string) => void;
    onMethodChange: (method: string) => void;
}

export const ApiListFilters: React.FC<ApiListFiltersProps> = ({
    searchKeyword,
    filterMethod,
    onSearchChange,
    onMethodChange,
}) => {
    return (
        <>
            <div className="sidebar-search">
                <Input
                    prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                    placeholder="搜索接口..."
                    value={searchKeyword}
                    onChange={(e) => onSearchChange(e.target.value)}
                    allowClear
                    size="small"
                />
            </div>

            <div className="sidebar-filters">
                <Select
                    value={filterMethod}
                    onChange={onMethodChange}
                    size="small"
                    style={{ width: '100%' }}
                    options={HTTP_METHOD_OPTIONS}
                />
            </div>
        </>
    );
};
