import React, { useState, useEffect } from 'react';
import { Tabs, Button, message } from 'antd';
import { ScriptBindingList } from '../request';
import { UpdateProjectScripts } from '../../../wailsjs/go/main/App';

interface ProjectScript {
    id: string;
    name: string;
}

interface ProjectScriptPanelProps {
    projectId: string;
    projectName: string;
    preScripts: string[];
    postScripts: string[];
    projectScripts: ProjectScript[];
    onSave: (preScripts: string[], postScripts: string[]) => void;
}

export const ProjectScriptPanel: React.FC<ProjectScriptPanelProps> = ({
    projectId,
    projectName,
    preScripts: initialPreScripts,
    postScripts: initialPostScripts,
    projectScripts,
    onSave,
}) => {
    const [preScripts, setPreScripts] = useState<string[]>(initialPreScripts || []);
    const [postScripts, setPostScripts] = useState<string[]>(initialPostScripts || []);
    const [saving, setSaving] = useState(false);

    // Sync local state when props change (e.g., when loading from backend)
    useEffect(() => {
        setPreScripts(initialPreScripts || []);
        setPostScripts(initialPostScripts || []);
    }, [initialPreScripts, initialPostScripts]);

    const handleSave = async () => {
        setSaving(true);
        try {
            console.log('[DEBUG] Saving project scripts:', projectId, preScripts, postScripts);
            await UpdateProjectScripts(projectId, preScripts, postScripts);
            console.log('[DEBUG] Save successful');
            onSave(preScripts, postScripts);
            message.success('保存成功');
        } catch (error) {
            console.error('[DEBUG] Save failed:', error);
            message.error('保存失败');
        } finally {
            setSaving(false);
        }
    };

    const handlePreScriptAdd = (scriptId: string) => {
        setPreScripts([...preScripts, scriptId]);
    };

    const handlePreScriptRemove = (scriptId: string) => {
        setPreScripts(preScripts.filter(id => id !== scriptId));
    };

    const handlePreScriptMoveUp = (index: number) => {
        if (index > 0) {
            const newScripts = [...preScripts];
            [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
            setPreScripts(newScripts);
        }
    };

    const handlePreScriptMoveDown = (index: number) => {
        if (index < preScripts.length - 1) {
            const newScripts = [...preScripts];
            [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
            setPreScripts(newScripts);
        }
    };

    const handlePostScriptAdd = (scriptId: string) => {
        setPostScripts([...postScripts, scriptId]);
    };

    const handlePostScriptRemove = (scriptId: string) => {
        setPostScripts(postScripts.filter(id => id !== scriptId));
    };

    const handlePostScriptMoveUp = (index: number) => {
        if (index > 0) {
            const newScripts = [...postScripts];
            [newScripts[index - 1], newScripts[index]] = [newScripts[index], newScripts[index - 1]];
            setPostScripts(newScripts);
        }
    };

    const handlePostScriptMoveDown = (index: number) => {
        if (index < postScripts.length - 1) {
            const newScripts = [...postScripts];
            [newScripts[index], newScripts[index + 1]] = [newScripts[index + 1], newScripts[index]];
            setPostScripts(newScripts);
        }
    };

    return (
        <div className="project-script-panel">
            <div className="project-script-panel-header">
                <div className="project-script-panel-title">
                    <span className="project-icon">📂</span>
                    <span className="project-name">{projectName}</span>
                    <span className="script-badge">项目脚本配置</span>
                </div>
                <div className="project-script-panel-actions">
                    <Button type="primary" onClick={handleSave} loading={saving}>
                        保存
                    </Button>
                </div>
            </div>
            <div className="project-script-panel-content">
                <Tabs
                    defaultActiveKey="pre-script"
                    items={[
                        {
                            key: 'pre-script',
                            label: '前置脚本',
                            children: (
                                <div className="script-binding-panel">
                                    <ScriptBindingList
                                        scripts={preScripts}
                                        projectScripts={projectScripts}
                                        onAdd={handlePreScriptAdd}
                                        onRemove={handlePreScriptRemove}
                                        onMoveUp={handlePreScriptMoveUp}
                                        onMoveDown={handlePreScriptMoveDown}
                                        emptyText="暂无前置脚本"
                                    />
                                </div>
                            ),
                        },
                        {
                            key: 'post-script',
                            label: '后置脚本',
                            children: (
                                <div className="script-binding-panel">
                                    <ScriptBindingList
                                        scripts={postScripts}
                                        projectScripts={projectScripts}
                                        onAdd={handlePostScriptAdd}
                                        onRemove={handlePostScriptRemove}
                                        onMoveUp={handlePostScriptMoveUp}
                                        onMoveDown={handlePostScriptMoveDown}
                                        emptyText="暂无后置脚本"
                                    />
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </div>
    );
};
