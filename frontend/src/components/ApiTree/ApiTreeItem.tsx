import React from 'react';
import { Dropdown, Button } from 'antd';
import { DownOutlined, RightOutlined, MoreOutlined, PlusOutlined, CopyOutlined, EditOutlined, CloseOutlined, ExperimentOutlined } from '@ant-design/icons';
import { ProjectTree } from '../../store';
import { getMethodColor, formatSidebarMethodLabel } from '../../constants/httpMethods';
import './ApiTree.css';

interface ApiTreeItemProps {
  request: ProjectTree;
  isExpanded: boolean;
  isActive: boolean;
  sidebarHighlightedCasePath: string;
  movedHighlightPath: string | null;
  onToggleCases: () => void;
  onClick: () => void;
  onAddCase: (requestPath: string) => void;
  onCopy: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCaseClick: (c: ProjectTree) => void;
  onDuplicateCase: (casePath: string) => void;
  onRenameCase: (casePath: string, currentName: string) => void;
  onDeleteCase: (casePath: string) => void;
}

export const ApiTreeItem: React.FC<ApiTreeItemProps> = ({
  request,
  isExpanded,
  isActive,
  sidebarHighlightedCasePath,
  movedHighlightPath,
  onToggleCases,
  onClick,
  onAddCase,
  onCopy,
  onRename,
  onDelete,
  onCaseClick,
  onDuplicateCase,
  onRenameCase,
  onDeleteCase,
}) => {
  const caseKids = (request.children || []).filter((c): c is ProjectTree => c.type === 'case');
  const hasCases = caseKids.length > 0;
  const method = formatSidebarMethodLabel(request.method || 'GET');
  const mc = getMethodColor(request.method || 'GET');

  return (
    <div className="api-request-block">
      <div
        className={`api-item ${isActive ? 'active' : ''} ${movedHighlightPath === request.path ? 'moved-highlight' : ''}`}
        onClick={onClick}
      >
        <div className="api-request-expand-cell">
          {hasCases ? (
            <button
              type="button"
              className="api-request-expand"
              aria-expanded={isExpanded}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCases();
              }}
            >
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </button>
          ) : (
            <span className="api-request-expand-placeholder" />
          )}
        </div>
        <div className="api-item-main">
          <span className="api-method-col">
            <span
              className="api-method-tag"
              style={{ backgroundColor: `${mc}20`, color: mc }}
            >
              {method}
            </span>
          </span>
          <span className="api-name">{(request.name || '').replace(/\.curl$/i, '')}</span>
        </div>
        <Dropdown
          menu={{
            items: [
              {
                key: 'add-case',
                icon: <PlusOutlined />,
                label: '新增用例',
                onClick: (e) => { e.domEvent.stopPropagation(); onAddCase(request.path || ''); },
              },
              { type: 'divider' as const },
              {
                key: 'copy',
                icon: <CopyOutlined />,
                label: '复制',
                onClick: (e) => { e.domEvent.stopPropagation(); onCopy(); },
              },
              {
                key: 'rename',
                icon: <EditOutlined />,
                label: '重命名',
                onClick: (e) => { e.domEvent.stopPropagation(); onRename(); },
              },
              {
                key: 'delete',
                icon: <CloseOutlined />,
                label: '删除',
                danger: true,
                onClick: (e) => { e.domEvent.stopPropagation(); onDelete(); },
              },
            ],
          }}
          trigger={['click']}
        >
          <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
            <MoreOutlined />
          </button>
        </Dropdown>
      </div>
      {hasCases && isExpanded && (
        <div className="api-case-list">
          {caseKids.map((c) => (
            <div
              key={c.path}
              className={`api-case-item ${sidebarHighlightedCasePath !== '' && sidebarHighlightedCasePath === c.path ? 'active' : ''} ${movedHighlightPath === c.path ? 'moved-highlight' : ''}`}
              onClick={() => onCaseClick(c)}
            >
              <div className="api-request-expand-cell">
                <span className="api-request-expand-placeholder" />
              </div>
              <div className="api-item-main">
                <span className="api-method-col api-method-col--case-icon" title="用例">
                  <ExperimentOutlined className="api-case-type-icon" />
                </span>
                <span className="api-case-name">{c.name}</span>
              </div>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'dup',
                      icon: <CopyOutlined />,
                      label: '复制',
                      onClick: (e) => { e.domEvent.stopPropagation(); onDuplicateCase(c.path!); },
                    },
                    {
                      key: 'ren',
                      icon: <EditOutlined />,
                      label: '重命名',
                      onClick: (e) => { e.domEvent.stopPropagation(); onRenameCase(c.path!, c.name); },
                    },
                    { type: 'divider' as const },
                    {
                      key: 'del',
                      icon: <CloseOutlined />,
                      label: '删除',
                      danger: true,
                      onClick: (e) => { e.domEvent.stopPropagation(); onDeleteCase(c.path!); },
                    },
                  ],
                }}
                trigger={['click']}
              >
                <button type="button" className="api-action-btn" onClick={(e) => e.stopPropagation()}>
                  <MoreOutlined />
                </button>
              </Dropdown>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
