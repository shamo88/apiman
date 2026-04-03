import { useState, useCallback } from 'react';
import { ListProjectScripts, CreateProjectScript, UpdateProjectScript, DeleteProjectScript } from '../../wailsjs/go/main/App';
import { ProjectScript } from '../types';

interface UseScriptReturn {
    projectScripts: ProjectScript[];
    editingScriptId: string;
    scriptFormName: string;
    scriptFormDescription: string;
    scriptFormContent: string;
    scriptsLoading: boolean;
    scriptSaving: boolean;
    scriptHelpVisible: boolean;
    setProjectScripts: React.Dispatch<React.SetStateAction<ProjectScript[]>>;
    setEditingScriptId: React.Dispatch<React.SetStateAction<string>>;
    setScriptFormName: React.Dispatch<React.SetStateAction<string>>;
    setScriptFormDescription: React.Dispatch<React.SetStateAction<string>>;
    setScriptFormContent: React.Dispatch<React.SetStateAction<string>>;
    setScriptsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setScriptSaving: React.Dispatch<React.SetStateAction<boolean>>;
    setScriptHelpVisible: React.Dispatch<React.SetStateAction<boolean>>;
    loadProjectScriptsData: (projectId: string) => Promise<void>;
    handleCreateScript: (projectId: string) => Promise<void>;
    handleSelectScriptEditor: (script: ProjectScript) => void;
    handleSaveScript: (projectId: string) => Promise<void>;
    handleDeleteScriptCurrent: (projectId: string, preScripts: string[], postScripts: string[], setApiConfig: (config: any) => void) => Promise<void>;
}

export const useScript = (): UseScriptReturn => {
    const [projectScripts, setProjectScripts] = useState<ProjectScript[]>([]);
    const [editingScriptId, setEditingScriptId] = useState<string>('');
    const [scriptFormName, setScriptFormName] = useState<string>('');
    const [scriptFormDescription, setScriptFormDescription] = useState<string>('');
    const [scriptFormContent, setScriptFormContent] = useState<string>('// 在这里编写 JavaScript 脚本\n');
    const [scriptsLoading, setScriptsLoading] = useState<boolean>(false);
    const [scriptSaving, setScriptSaving] = useState<boolean>(false);
    const [scriptHelpVisible, setScriptHelpVisible] = useState<boolean>(false);

    const loadProjectScriptsData = useCallback(async (projectId: string) => {
        setScriptsLoading(true);
        try {
            const scripts = await ListProjectScripts(projectId);
            setProjectScripts(scripts || []);
            if (scripts && scripts.length > 0) {
                const target = scripts.find((item: ProjectScript) => item.id === editingScriptId) || scripts[0];
                setEditingScriptId(target.id);
                setScriptFormName(target.name);
                setScriptFormDescription(target.description || '');
                setScriptFormContent(target.content || '');
            } else {
                setEditingScriptId('');
                setScriptFormName('');
                setScriptFormDescription('');
                setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            }
        } catch (error) {
            console.error('Failed to load scripts:', error);
        } finally {
            setScriptsLoading(false);
        }
    }, [editingScriptId]);

    const handleCreateScript = useCallback(async (projectId: string) => {
        const scriptName = `脚本${projectScripts.length + 1}`;
        setScriptSaving(true);
        try {
            const created = await CreateProjectScript(projectId, scriptName, '', '// 在这里编写 JavaScript 脚本\n');
            await loadProjectScriptsData(projectId);
            setEditingScriptId(created.id);
            setScriptFormName(created.name);
            setScriptFormDescription(created.description || '');
            setScriptFormContent(created.content || '');
        } catch (error) {
            console.error('Failed to create script:', error);
        } finally {
            setScriptSaving(false);
        }
    }, [projectScripts.length, loadProjectScriptsData]);

    const handleSelectScriptEditor = useCallback((script: ProjectScript) => {
        setEditingScriptId(script.id);
        setScriptFormName(script.name);
        setScriptFormDescription(script.description || '');
        setScriptFormContent(script.content || '');
    }, []);

    const handleSaveScript = useCallback(async (projectId: string) => {
        if (!projectId || !editingScriptId) return;
        const name = scriptFormName.trim();
        if (!name) return;
        setScriptSaving(true);
        try {
            await UpdateProjectScript(projectId, editingScriptId, name, scriptFormDescription, scriptFormContent);
            await loadProjectScriptsData(projectId);
        } catch (error) {
            console.error('Failed to save script:', error);
        } finally {
            setScriptSaving(false);
        }
    }, [editingScriptId, scriptFormName, scriptFormDescription, scriptFormContent, loadProjectScriptsData]);

    const handleDeleteScriptCurrent = useCallback(async (
        projectId: string,
        preScripts: string[],
        postScripts: string[],
        setApiConfig: (config: any) => void
    ) => {
        if (!projectId || !editingScriptId) return;
        setScriptSaving(true);
        try {
            await DeleteProjectScript(projectId, editingScriptId);
            await loadProjectScriptsData(projectId);
            setApiConfig((prev: any) => ({
                ...prev,
                preScripts: preScripts.filter(id => id !== editingScriptId),
                postScripts: postScripts.filter(id => id !== editingScriptId),
            }));
        } catch (error) {
            console.error('Failed to delete script:', error);
        } finally {
            setScriptSaving(false);
        }
    }, [editingScriptId, loadProjectScriptsData]);

    return {
        projectScripts,
        editingScriptId,
        scriptFormName,
        scriptFormDescription,
        scriptFormContent,
        scriptsLoading,
        scriptSaving,
        scriptHelpVisible,
        setProjectScripts,
        setEditingScriptId,
        setScriptFormName,
        setScriptFormDescription,
        setScriptFormContent,
        setScriptsLoading,
        setScriptSaving,
        setScriptHelpVisible,
        loadProjectScriptsData,
        handleCreateScript,
        handleSelectScriptEditor,
        handleSaveScript,
        handleDeleteScriptCurrent,
    };
};
