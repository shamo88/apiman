import { ApiOutlined, CloseOutlined, CopyOutlined, DownOutlined, EditOutlined, ExperimentOutlined, FileOutlined, FolderOutlined, HomeOutlined, ImportOutlined, MoreOutlined, PlusOutlined, ProjectOutlined, QuestionCircleOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { javascript } from '@codemirror/lang-javascript';
import CodeMirror from '@uiw/react-codemirror';
import type { UploadProps } from 'antd';
import { Button, Card, Checkbox, Col, Dropdown, Empty, Input, InputRef, message, Modal, Radio, Row, Select, Space, Spin, Tabs, Tooltip, Upload } from 'antd';
import type { DataNode } from 'antd/es/tree';
import React, { useEffect, useState } from 'react';
import { AddRequestCase, CopyRequest, CreateEnvironment, CreateFolder, CreateProject, CreateProjectScript, CreateRequest, DeleteEnvironment, DeleteFolder, DeleteProject, DeleteProjectScript, DeleteRequest, DeleteRequestCase, DuplicateRequestCase, ExecuteHTTPRequest, ExecuteHTTPRequestWithScripts, GetProjectTree, GetRequest, ImportPostmanCollection, ListProjects, ListProjectScripts, LoadAppConfig, LoadEnvironments, MoveFolder, MoveRequest, RenameFolder, RenameProject, RenameRequest, RenameRequestCase, UpdateEnvironment, UpdateProjectScript, UpdateRequest, UpdateRequestScripts } from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import './App.css';
import { ScriptHelpWindow } from './components/ScriptHelpWindow';
import { TitleBar } from './components/TitleBar';

interface Project {
    id: string;
    name: string;
    path: string;
}

interface ProjectTree {
    id: string;
    name: string;
    type: string;
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

const parseRequestCaseRef = (path: string): { projectId: string; requestId: string; caseId: string } | null => {
    if (!path.startsWith('requestCase|')) return null;
    const parts = path.slice('requestCase|'.length).split('|');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return { projectId: parts[0], requestId: parts[1], caseId: parts[2] };
};

const requestRefFromIds = (projectId: string, requestId: string) => `request|${projectId}|${requestId}`;

/** plain：无子用例；interface：编辑集合根请求；case：编辑某一用例 */
type RequestEditorSurface = 'plain' | 'interface' | 'case';

interface CurlRequest {
    path: string;
    name: string;
    content?: string;
    pre_script_id?: string;
    post_script_id?: string;
    method?: string;
    http_url?: string;
    headers?: { key: string; value: string; enabled?: boolean }[];
    params?: { key: string; value: string; enabled?: boolean }[];
    body?: string;
    body_type?: string;
    form_data?: { key: string; value: string; enabled?: boolean }[];
    url_encoded?: { key: string; value: string; enabled?: boolean }[];
    cases?: models.HttpRequestCase[];
    active_case_id?: string;
    interface_spec?: models.HttpRequestSpec;
}

interface RequestCaseState {
    id: string;
    name: string;
    config: ApiConfig;
}

interface ProjectTab {
    id: string;
    title: string;
    project: Project;
}

interface RequestTab {
    id: string;
    title: string;
    path: string;
}

interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
    created_at: string;
    updated_at: string;
}

interface EnvironmentVariableRow {
    id: string;
    key: string;
    value: string;
}

interface EnvironmentEditorTab {
    key: string;
    title: string;
    environmentId?: string;
    isNew?: boolean;
}

interface ProjectScript {
    id: string;
    project_id: string;
    name: string;
    path: string;
    content: string;
}

interface ApiConfig {
    name: string;
    method: string;
    url: string;
    headers: { key: string; value: string; enabled: boolean }[];
    params: { key: string; value: string; enabled: boolean }[];
    body: string;
    bodyType: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary';
    formData: { key: string; value: string; enabled: boolean }[];
    urlencoded: { key: string; value: string; enabled: boolean }[];
    preScriptId?: string;
    postScriptId?: string;
}

interface ProjectWorkspaceState {
    requestTabs: RequestTab[];
    activeRequestTab: string;
    currentRequest: CurlRequest | null;
    response: any;
    selectedKeys: string[];
    apiConfig: ApiConfig;
    selectedEnvironmentId: string;
    requestCases: RequestCaseState[];
    activeCaseId: string;
    interfaceApiConfig: ApiConfig;
    requestEditorSurface: RequestEditorSurface;
    /** 侧栏用例高亮：仅用户点击用例行时设置；点击接口行或切换请求标签时清空 */
    sidebarHighlightedCasePath: string;
}

interface ProjectGroupStore {
    groups: string[];
    assignments: Record<string, string>;
    collapsedGroups?: string[];
}

const createDefaultApiConfig = (): ApiConfig => ({
    name: '',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: '',
    bodyType: 'none',
    formData: [],
    urlencoded: [],
    preScriptId: '',
    postScriptId: '',
});

const createEmptyWorkspaceState = (): ProjectWorkspaceState => ({
    requestTabs: [],
    activeRequestTab: '',
    currentRequest: null,
    response: null,
    selectedKeys: [],
    apiConfig: createDefaultApiConfig(),
    selectedEnvironmentId: '',
    requestCases: [],
    activeCaseId: '',
    interfaceApiConfig: createDefaultApiConfig(),
    requestEditorSurface: 'plain',
    sidebarHighlightedCasePath: ''
});

const apiConfigFromRequest = (r: CurlRequest, fallbackName: string): ApiConfig => {
    const bt = (r.body_type || 'none') as ApiConfig['bodyType'];
    const allowed: ApiConfig['bodyType'][] = ['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw', 'binary'];
    const bodyType = allowed.includes(bt) ? bt : 'none';
    return {
        name: r.name || fallbackName,
        method: (r.method || 'GET').toUpperCase(),
        url: r.http_url || '',
        headers: Array.isArray(r.headers)
            ? r.headers.map((h) => ({
                key: h.key || '',
                value: h.value || '',
                enabled: h.enabled !== false,
            }))
            : [],
        params: Array.isArray(r.params)
            ? r.params.map((p) => ({
                key: p.key || '',
                value: p.value || '',
                enabled: p.enabled !== false,
            }))
            : [],
        body: r.body || '',
        bodyType,
        formData: Array.isArray(r.form_data)
            ? r.form_data.map((f) => ({
                key: f.key || '',
                value: f.value || '',
                enabled: f.enabled !== false,
            }))
            : [],
        urlencoded: Array.isArray(r.url_encoded)
            ? r.url_encoded.map((u) => ({
                key: u.key || '',
                value: u.value || '',
                enabled: u.enabled !== false,
            }))
            : [],
        preScriptId: r.pre_script_id || '',
        postScriptId: r.post_script_id || '',
    };
};

const apiConfigToSpec = (c: ApiConfig) => ({
    method: c.method,
    http_url: c.url,
    headers: c.headers.map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
    params: c.params.map((p) => ({ key: p.key, value: p.value, enabled: p.enabled })),
    body: c.body,
    body_type: c.bodyType,
    form_data: c.formData.map((f) => ({ key: f.key, value: f.value, enabled: f.enabled })),
    url_encoded: c.urlencoded.map((u) => ({ key: u.key, value: u.value, enabled: u.enabled })),
});

/** Wails 将 HttpRequestSpec 生成为 class（含 convertValues），需用 createFrom 包装字面量。 */
const toWailsHttpSpec = (c: ApiConfig) => models.HttpRequestSpec.createFrom(apiConfigToSpec(c));

const cloneApiConfig = (c: ApiConfig): ApiConfig => JSON.parse(JSON.stringify(c));

/** 从 apiConfig 生成 curl 命令 */
const buildCurlCommand = (c: ApiConfig): string => {
    const parts: string[] = ['curl'];

    // URL with params
    let url = c.url || '';
    const enabledParams = (c.params || []).filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
        const queryParams = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
        url += (url.includes('?') ? '&' : '?') + queryParams;
    }

    // Method
    if (c.method && c.method !== 'GET') {
        parts.push(`-X ${c.method}`);
    }

    // Headers
    const enabledHeaders = (c.headers || []).filter(h => h.enabled && h.key);
    for (const h of enabledHeaders) {
        parts.push(`-H '${h.key}: ${h.value}'`);
    }

    // Body
    if (c.bodyType === 'json' || c.bodyType === 'raw' || c.bodyType === 'xml') {
        if (c.body) {
            // Add Content-Type if not present
            const hasContentType = enabledHeaders.some(h => h.key.toLowerCase() === 'content-type');
            if (!hasContentType && c.bodyType === 'json') {
                parts.push("-H 'Content-Type: application/json'");
            } else if (!hasContentType && c.bodyType === 'xml') {
                parts.push("-H 'Content-Type: application/xml'");
            }
            parts.push(`-d '${c.body.replace(/'/g, "'\\''")}'`);
        }
    } else if (c.bodyType === 'form-data') {
        for (const f of (c.formData || []).filter(f => f.enabled && f.key)) {
            parts.push(`-F '${f.key}=${f.value}'`);
        }
    } else if (c.bodyType === 'x-www-form-urlencoded') {
        const enabledFields = (c.urlencoded || []).filter(f => f.enabled && f.key);
        if (enabledFields.length > 0) {
            const encoded = enabledFields.map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`).join('&');
            if (!enabledHeaders.some(h => h.key.toLowerCase() === 'content-type')) {
                parts.push("-H 'Content-Type: application/x-www-form-urlencoded'");
            }
            parts.push(`-d '${encoded}'`);
        }
    }

    // URL (quoted if contains special chars)
    if (url) {
        if (url.includes('&') || url.includes('?') || url.includes('=')) {
            parts.push(`'${url}'`);
        } else {
            parts.push(url);
        }
    } else {
        parts.push("'http://example.com/api'");
    }

    return parts.join(' \\\n  ');
};

/** 从 curl 命令解析回 apiConfig (仅解析用户编辑的主要部分) */
const parseCurlToApiConfig = (curl: string): Partial<ApiConfig> => {
    const result: Partial<ApiConfig> = {
        method: 'GET',
        headers: [],
        params: [],
        url: '',
        body: '',
        bodyType: 'none',
        formData: [],
        urlencoded: [],
    };

    if (!curl) return result;

    // Extract method: -X POST
    const methodMatch = curl.match(/-X\s+(\S+)/);
    if (methodMatch) {
        result.method = methodMatch[1].toUpperCase();
    }

    // Extract headers: -H 'Key: value' or -H "Key: value"
    const headerRegex = /-H\s+['"]([^:]+):\s*([^'"]+)['"]/g;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(curl)) !== null) {
        const key = headerMatch[1].trim();
        const value = headerMatch[2].trim();
        if (key.toLowerCase() === 'content-type') {
            if (value.includes('application/json')) {
                result.bodyType = 'json';
            } else if (value.includes('application/x-www-form-urlencoded')) {
                result.bodyType = 'x-www-form-urlencoded';
            } else if (value.includes('multipart/form-data')) {
                result.bodyType = 'form-data';
            } else if (value.includes('xml')) {
                result.bodyType = 'xml';
            } else {
                result.bodyType = 'raw';
            }
        } else {
            result.headers!.push({ key, value, enabled: true });
        }
    }

    // Extract URL: 'http://...' or "http://..." or bare URL
    let urlMatch = curl.match(/['"](https?:\/\/[^\s'"]+)['"]/);
    if (!urlMatch) {
        // Try bare URL at the end
        const bareUrlMatch = curl.match(/(https?:\/\/[^\s'"-]+(?:\?[^\s'"]*)?)/);
        if (bareUrlMatch) {
            urlMatch = ['', bareUrlMatch[1]];
        }
    }
    if (urlMatch) {
        const fullUrl = urlMatch[1];
        try {
            const urlObj = new URL(fullUrl);
            result.url = `${urlObj.origin}${urlObj.pathname}`;
            // Extract query params
            urlObj.searchParams.forEach((val, key) => {
                result.params!.push({ key, value: val, enabled: true });
            });
        } catch {
            result.url = fullUrl.split('?')[0];
        }
    }

    // Extract body: -d 'body' or --data 'body'
    const bodyMatch = curl.match(/-d\s+['"]([^'"]*)['"]/);
    if (bodyMatch) {
        result.body = bodyMatch[1];
        if (result.bodyType === 'none') {
            result.bodyType = 'raw';
        }
    }

    // Extract form-data: -F 'key=value'
    const formDataRegex = /-F\s+['"]([^=]+)=([^'"]*)['"]/g;
    let formMatch;
    while ((formMatch = formDataRegex.exec(curl)) !== null) {
        result.formData!.push({ key: formMatch[1], value: formMatch[2], enabled: true });
    }
    if (result.formData!.length > 0 && result.bodyType === 'none') {
        result.bodyType = 'form-data';
    }

    return result;
};

const apiConfigFromHttpSpec = (spec: models.HttpRequestSpec, requestName: string): ApiConfig => {
    const bt = (spec.body_type || 'none') as ApiConfig['bodyType'];
    const allowed: ApiConfig['bodyType'][] = ['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw', 'binary'];
    const bodyType = allowed.includes(bt) ? bt : 'none';
    const mapKV = (arr: models.RequestKeyVal[] | undefined) =>
        Array.isArray(arr)
            ? arr.map((h) => ({
                key: h.key || '',
                value: h.value || '',
                enabled: h.enabled !== false,
            }))
            : [];
    const mapPair = (arr: models.RequestPair[] | undefined) =>
        Array.isArray(arr)
            ? arr.map((p) => ({
                key: p.key || '',
                value: p.value || '',
                enabled: p.enabled !== false,
            }))
            : [];
    return {
        name: requestName,
        method: (spec.method || 'GET').toUpperCase(),
        url: spec.http_url || '',
        headers: mapKV(spec.headers),
        params: mapKV(spec.params),
        body: spec.body || '',
        bodyType,
        formData: mapPair(spec.form_data),
        urlencoded: mapPair(spec.url_encoded),
        preScriptId: '',
        postScriptId: '',
    };
};

const createEnvironmentVariableRow = (key: string = '', value: string = ''): EnvironmentVariableRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value
});

const DEFAULT_PROJECT_GROUP = '未分组';

const escapeHtml = (text: string) => (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getCaretOffset = (root: HTMLElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(root);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
};

const setCaretOffset = (root: HTMLElement, targetOffset: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let foundNode: Node | null = null;
    let foundOffset = 0;

    while (walker.nextNode()) {
        const textNode = walker.currentNode;
        const textLength = textNode.textContent?.length || 0;
        if (currentOffset + textLength >= targetOffset) {
            foundNode = textNode;
            foundOffset = Math.max(0, targetOffset - currentOffset);
            break;
        }
        currentOffset += textLength;
    }

    if (!foundNode) {
        foundNode = root;
        foundOffset = root.childNodes.length;
    }

    const range = document.createRange();
    range.setStart(foundNode, foundOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
};

const renderHighlightedVariableHtml = (value: string, environmentVariables: Record<string, string>) => {
    const input = value || '';
    const regex = /\{\{(\w+)\}\}/g;
    let html = '';
    let lastIndex = 0;
    let match = regex.exec(input);

    while (match) {
        const token = match[0];
        const varName = match[1];
        const start = match.index;
        const end = start + token.length;
        if (start > lastIndex) {
            html += `<span class="variable-inline-text">${escapeHtml(input.slice(lastIndex, start))}</span>`;
        }
        const exists = Object.prototype.hasOwnProperty.call(environmentVariables, varName);
        html += `<span class="variable-inline-token ${exists ? 'active' : 'missing'}">${escapeHtml(token)}</span>`;
        lastIndex = end;
        match = regex.exec(input);
    }

    if (lastIndex < input.length) {
        html += `<span class="variable-inline-text">${escapeHtml(input.slice(lastIndex))}</span>`;
    }

    if (!html) {
        html = `<span class="variable-inline-text"></span>`;
    }
    return html;
};

const getVariableSuggestions = (text: string, caretIndex: number, environmentVariables: Record<string, string>) => {
    const beforeCaret = (text || '').slice(0, Math.max(0, caretIndex));
    const match = beforeCaret.match(/\{\{(\w*)$/);
    if (!match) return { items: [] as string[], rangeStart: -1, rangeEnd: -1 };
    const keyword = (match[1] || '').toLowerCase();
    const items = Object.keys(environmentVariables).filter(name => name.toLowerCase().includes(keyword));
    return {
        items,
        rangeStart: beforeCaret.length - match[0].length,
        rangeEnd: beforeCaret.length,
    };
};

const VariableEditableInput: React.FC<{
    value: string;
    onChange: (next: string) => void;
    placeholder: string;
    style?: React.CSSProperties;
    environmentVariables: Record<string, string>;
    multiline?: boolean;
}> = ({ value, onChange, placeholder, style, environmentVariables, multiline = false }) => {
    const editorRef = React.useRef<HTMLDivElement | null>(null);
    const [caretIndex, setCaretIndex] = useState<number>((value || '').length);
    const [focused, setFocused] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [forceSuggestAll, setForceSuggestAll] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const suggestions = getVariableSuggestions(value, caretIndex, environmentVariables);
    const suggestionItems = forceSuggestAll ? Object.keys(environmentVariables) : suggestions.items;

    const updateCaretPosition = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const rect = editor.getBoundingClientRect();
        const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
        if (range) {
            const caretRect = range.getBoundingClientRect();
            // Position to the right of caret, within the editor wrapper
            setSuggestionPos({
                top: caretRect.top - rect.top + 20,
                left: caretRect.right - rect.left + 5,
            });
        } else {
            // Fallback: position below cursor line
            setSuggestionPos({
                top: 20,
                left: 5,
            });
        }
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const html = renderHighlightedVariableHtml(value, environmentVariables);
        if (editor.innerHTML !== html) {
            editor.innerHTML = html;
            if (focused) {
                setCaretOffset(editor, Math.min(caretIndex, (value || '').length));
            }
        }
    }, [value, focused, caretIndex, environmentVariables]);

    useEffect(() => {
        if (suggestionItems.length === 0) {
            setActiveSuggestionIndex(0);
            return;
        }
        setActiveSuggestionIndex((prev) => Math.min(prev, suggestionItems.length - 1));
    }, [suggestionItems.length]);

    useEffect(() => {
        if (focused && suggestionItems.length > 0) {
            updateCaretPosition();
        }
    }, [caretIndex, focused, suggestionItems.length]);

    const applySuggestion = (name: string) => {
        const token = `{{${name}}}`;
        let next = value || '';
        let nextCaret = caretIndex;
        if (suggestions.rangeStart >= 0 && suggestions.rangeEnd >= 0) {
            next = (value || '').slice(0, suggestions.rangeStart) + token + (value || '').slice(suggestions.rangeEnd);
            nextCaret = suggestions.rangeStart + token.length;
        } else {
            next = (value || '').slice(0, Math.max(0, caretIndex)) + token + (value || '').slice(Math.max(0, caretIndex));
            nextCaret = Math.max(0, caretIndex) + token.length;
        }
        onChange(next);
        setCaretIndex(nextCaret);
        setForceSuggestAll(false);
        window.requestAnimationFrame(() => {
            if (editorRef.current) {
                setCaretOffset(editorRef.current, nextCaret);
                editorRef.current.focus();
            }
        });
    };

    return (
        <div className="variable-editable-wrapper" style={style}>
            <div
                ref={editorRef}
                className="variable-editable"
                data-multiline={multiline ? 'true' : 'false'}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onFocus={() => {
                    setFocused(true);
                    updateCaretPosition();
                }}
                onBlur={() => {
                    setFocused(false);
                    setForceSuggestAll(false);
                }}
                onDoubleClick={(e) => {
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    setForceSuggestAll(true);
                    updateCaretPosition();
                }}
                onInput={(e) => {
                    const nextText = multiline
                        ? (e.currentTarget.textContent || '')
                        : (e.currentTarget.textContent || '').replace(/\n/g, '');
                    onChange(nextText);
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    setForceSuggestAll(false);
                    updateCaretPosition();
                }}
                onKeyDown={(e) => {
                    if (suggestionItems.length > 0) {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveSuggestionIndex((prev) => (prev + 1) % suggestionItems.length);
                            return;
                        }
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveSuggestionIndex((prev) => (prev - 1 + suggestionItems.length) % suggestionItems.length);
                            return;
                        }
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const name = suggestionItems[activeSuggestionIndex];
                            if (name) {
                                applySuggestion(name);
                            }
                            return;
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            setActiveSuggestionIndex(0);
                            setForceSuggestAll(false);
                            return;
                        }
                    }
                    if (!multiline && e.key === 'Enter') e.preventDefault();
                }}
                onKeyUp={(e) => {
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    updateCaretPosition();
                }}
            />
            {focused && suggestionItems.length > 0 && (
                <div
                    className="variable-editable-suggestions"
                    style={{
                        position: 'absolute',
                        top: suggestionPos.top,
                        left: suggestionPos.left,
                        zIndex: 1200,
                    }}
                >
                    {suggestionItems.map((name, idx) => (
                        <div
                            key={name}
                            className={`variable-editable-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                applySuggestion(name);
                            }}
                            onMouseEnter={() => setActiveSuggestionIndex(idx)}
                        >
                            {`{{${name}}}`}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function App() {
    const [status, setStatus] = useState('初始化中...');
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [createProjectModal, setCreateProjectModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);
    const [activeTab, setActiveTab] = useState<string>('home');
    const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
    const [projectTrees, setProjectTrees] = useState<Record<string, ProjectTree>>({});
    const [requestTabs, setRequestTabs] = useState<RequestTab[]>([]);
    const [activeRequestTab, setActiveRequestTab] = useState<string>('');
    const [currentRequest, setCurrentRequest] = useState<CurlRequest | null>(null);
    const [response, setResponse] = useState<any>(null);
    const [executing, setExecuting] = useState(false);
    const [createFolderModal, setCreateFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [createRequestModal, setCreateRequestModal] = useState(false);
    const [newRequestName, setNewRequestName] = useState('');
    const [renameModal, setRenameModal] = useState(false);
    const [renameType, setRenameType] = useState<'request' | 'folder'>('request');
    const [renamePath, setRenamePath] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [apiConfig, setApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [curlPreview, setCurlPreview] = useState<string>('');
    const [requestCases, setRequestCases] = useState<RequestCaseState[]>([]);
    const [activeCaseId, setActiveCaseId] = useState<string>('');
    const [interfaceApiConfig, setInterfaceApiConfig] = useState<ApiConfig>(createDefaultApiConfig());
    const [requestEditorSurface, setRequestEditorSurface] = useState<RequestEditorSurface>('plain');
    const [sidebarHighlightedCasePath, setSidebarHighlightedCasePath] = useState<string>('');
    const [expandedRequestPaths, setExpandedRequestPaths] = useState<Set<string>>(() => new Set());
    const [caseRenameModalOpen, setCaseRenameModalOpen] = useState(false);
    const [caseRenameCasePath, setCaseRenameCasePath] = useState('');
    const [caseRenameInput, setCaseRenameInput] = useState('');
    const [addCaseModalOpen, setAddCaseModalOpen] = useState(false);
    const [addCaseTargetPath, setAddCaseTargetPath] = useState('');
    const [addCaseNameInput, setAddCaseNameInput] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterMethod, setFilterMethod] = useState<string>('ALL');
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
    const [draggingNode, setDraggingNode] = useState<{ type: 'request' | 'folder'; path: string } | null>(null);
    const [dropTargetFolderPath, setDropTargetFolderPath] = useState<string | null>(null);
    const [invalidDropHint, setInvalidDropHint] = useState<{ message: string; x: number; y: number } | null>(null);
    const [movedHighlightPath, setMovedHighlightPath] = useState<string | null>(null);
    const searchInputRef = React.useRef<InputRef>(null);
    const renameInputRef = React.useRef<InputRef>(null);
    const renameSelectionEndRef = React.useRef<number>(0);
    const [importing, setImporting] = useState(false);
    const [searchVersion, setSearchVersion] = useState(0);
    const [projectWorkspaceStates, setProjectWorkspaceStates] = useState<Record<string, ProjectWorkspaceState>>({});
    const [listAnimationEnabled, setListAnimationEnabled] = useState(false);
    const [forceListAnimation, setForceListAnimation] = useState(false);
    const [projectSearchKeyword, setProjectSearchKeyword] = useState('');
    const [projectGroups, setProjectGroups] = useState<string[]>([]);
    const [projectGroupAssignments, setProjectGroupAssignments] = useState<Record<string, string>>({});
    const [createGroupModal, setCreateGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [renameProjectModal, setRenameProjectModal] = useState(false);
    const [renameProjectId, setRenameProjectId] = useState('');
    const [renameProjectValue, setRenameProjectValue] = useState('');
    const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set());
    const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);
    const [projectDropTargetGroup, setProjectDropTargetGroup] = useState<string | null>(null);
    const [renameGroupModal, setRenameGroupModal] = useState(false);
    const [renameGroupValue, setRenameGroupValue] = useState('');
    const [editingGroupName, setEditingGroupName] = useState('');
    const [draggingGroupName, setDraggingGroupName] = useState<string | null>(null);
    const [groupSortDropTarget, setGroupSortDropTarget] = useState<string | null>(null);
    const [projectGroupsLoaded, setProjectGroupsLoaded] = useState(false);
    const [sidebarMenu, setSidebarMenu] = useState<'apis' | 'environments' | 'scripts'>('apis');
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
    const [editingEnvironmentId, setEditingEnvironmentId] = useState<string>('');
    const [environmentFormName, setEnvironmentFormName] = useState('');
    const [environmentFormVariables, setEnvironmentFormVariables] = useState<EnvironmentVariableRow[]>([createEnvironmentVariableRow()]);
    const [envLoading, setEnvLoading] = useState(false);
    const [envSaving, setEnvSaving] = useState(false);
    const [environmentTabs, setEnvironmentTabs] = useState<EnvironmentEditorTab[]>([]);
    const [activeEnvironmentTab, setActiveEnvironmentTab] = useState<string>('');
    const [projectScripts, setProjectScripts] = useState<ProjectScript[]>([]);
    const [editingScriptId, setEditingScriptId] = useState<string>('');
    const [scriptFormName, setScriptFormName] = useState('');
    const [scriptFormContent, setScriptFormContent] = useState('// 在这里编写 JavaScript 脚本\n');
    const [scriptsLoading, setScriptsLoading] = useState(false);
    const [scriptSaving, setScriptSaving] = useState(false);
    const [scriptHelpVisible, setScriptHelpVisible] = useState(false);
    const forceAnimationTimerRef = React.useRef<number | null>(null);
    const movedHighlightTimerRef = React.useRef<number | null>(null);

    const trimRightSpaces = (value: string) => value.replace(/\s+$/g, '');
    const getPrimaryName = (value: string) => value.replace(/-副本\d*$/u, '');

    const collectFolderKeys = (tree: ProjectTree | null): string[] => {
        if (!tree) return [];
        const keys: string[] = [];

        const walk = (node: ProjectTree) => {
            if (node.type === 'folder') {
                keys.push(node.path || node.id);
            }
            if (node.children) {
                node.children.forEach(walk);
            }
        };

        walk(tree);
        return keys;
    };

    const toggleFolderCollapse = (folderPath: string) => {
        setCollapsedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderPath)) {
                newSet.delete(folderPath);
            } else {
                newSet.add(folderPath);
            }
            return newSet;
        });
    };

    const clearDragState = () => {
        setDraggingNode(null);
        setDropTargetFolderPath(null);
        setInvalidDropHint(null);
    };

    const replacePathPrefix = (path: string, fromPrefix: string, toPrefix: string) => {
        if (path === fromPrefix) return toPrefix;
        const normalizedFrom = fromPrefix.endsWith('/') || fromPrefix.endsWith('\\') ? fromPrefix : fromPrefix + '/';
        if (path.startsWith(normalizedFrom)) {
            return toPrefix + path.slice(fromPrefix.length);
        }
        return path;
    };

    const getChildrenByFolderPath = (folderPath: string): ProjectTree[] => {
        if (!currentTree || !currentProject?.path) return [];
        if (folderPath === currentProject.path) {
            return currentTree.children || [];
        }
        const node = findTreeNode(currentTree, folderPath);
        if (!node || node.type !== 'folder') return [];
        return node.children || [];
    };

    const getNodeByPath = (path: string): ProjectTree | null => {
        if (!currentTree) return null;
        return findTreeNode(currentTree, path);
    };

    const getParentFolderPath = (path: string): string | null => {
        if (!currentTree || !currentProject?.path) return null;

        let foundParent: string | null = null;
        const walk = (node: ProjectTree, parentPath: string) => {
            const nodePath = node.path || node.id;
            if (nodePath === path) {
                foundParent = parentPath;
                return;
            }
            if (!node.children || foundParent) return;

            const nextParent = node.type === 'folder' ? nodePath : parentPath;
            for (const child of node.children) {
                walk(child, nextParent);
                if (foundParent) return;
            }
        };

        walk(currentTree, currentProject.path);
        return foundParent;
    };

    /** 拖入某文件夹（或根）末尾 */
    const checkDropAppendIntoFolder = (dragNode: { type: 'request' | 'folder'; path: string }, targetFolderPath: string): { ok: boolean; reason?: string } => {
        if (!currentProject?.path) return { ok: false, reason: 'invalid-target' };
        if (dragNode.path === targetFolderPath) return { ok: false, reason: 'self' };

        if (dragNode.type === 'folder') {
            let p: string | null = targetFolderPath;
            const seen = new Set<string>();
            while (p) {
                if (p === dragNode.path) {
                    return { ok: false, reason: 'child' };
                }
                if (seen.has(p)) break;
                seen.add(p);
                p = getParentFolderPath(p);
            }
        }

        const draggingTreeNode = getNodeByPath(dragNode.path);
        if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

        const targetChildren = getChildrenByFolderPath(targetFolderPath);
        if (dragNode.type === 'request') {
            const conflict = targetChildren.some(
                (child) => child.type === 'request' && child.name === draggingTreeNode.name && child.path !== dragNode.path
            );
            if (conflict) return { ok: false, reason: 'duplicate-request-name' };
        } else {
            const conflict = targetChildren.some(
                (child) => child.type === 'folder' && child.name === draggingTreeNode.name && child.path !== dragNode.path
            );
            if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
        }

        return { ok: true };
    };

    const subtreeContainsId = (folderRefPath: string, needleId: string): boolean => {
        const node = findTreeNode(currentTree, folderRefPath);
        if (!node) return false;
        const walk = (n: ProjectTree): boolean => {
            if (n.id === needleId) return true;
            return (n.children || []).some(walk);
        };
        return walk(node);
    };

    /** 插入到 parentContainerPath 的子列表中，位于 beforeID 之前；beforeID 为空表示末尾 */
    const checkDropOrdered = (
        dragNode: { type: 'request' | 'folder'; path: string },
        parentContainerPath: string,
        beforeID: string
    ): { ok: boolean; reason?: string } => {
        if (!currentProject?.path) return { ok: false, reason: 'invalid-target' };

        const dragParent = getParentFolderPath(dragNode.path);
        if (dragParent === null) return { ok: false, reason: 'missing-source' };

        if (dragNode.type === 'folder' && beforeID) {
            if (subtreeContainsId(dragNode.path, beforeID)) {
                return { ok: false, reason: 'child' };
            }
        }

        const draggingTreeNode = getNodeByPath(dragNode.path);
        if (!draggingTreeNode) return { ok: false, reason: 'missing-source' };

        if (dragParent !== parentContainerPath) {
            const targetChildren = getChildrenByFolderPath(parentContainerPath);
            if (dragNode.type === 'request') {
                const conflict = targetChildren.some((c) => c.type === 'request' && c.name === draggingTreeNode.name);
                if (conflict) return { ok: false, reason: 'duplicate-request-name' };
            } else {
                const conflict = targetChildren.some(
                    (c) => c.type === 'folder' && c.name === draggingTreeNode.name && c.path !== dragNode.path
                );
                if (conflict) return { ok: false, reason: 'duplicate-folder-name' };
            }
        }

        return { ok: true };
    };

    const getDropHintMessage = (reason?: string) => {
        const map: Record<string, string> = {
            'self': '不能拖到自己',
            'same-parent': '已在该目录',
            'child': '不能移动到子目录',
            'duplicate-request-name': '同名接口冲突',
            'duplicate-folder-name': '同名文件夹冲突',
            'invalid-target': '目标无效',
            'missing-source': '源节点不存在',
        };
        if (!reason) return '不可放置';
        return map[reason] || '不可放置';
    };

    const markMovedNode = (path: string) => {
        if (movedHighlightTimerRef.current) {
            window.clearTimeout(movedHighlightTimerRef.current);
        }
        setMovedHighlightPath(path);
        movedHighlightTimerRef.current = window.setTimeout(() => {
            setMovedHighlightPath(null);
            movedHighlightTimerRef.current = null;
        }, 2000);
    };

    const resetWorkspaceState = () => {
        const emptyState = createEmptyWorkspaceState();
        setRequestTabs(emptyState.requestTabs);
        setActiveRequestTab(emptyState.activeRequestTab);
        setCurrentRequest(emptyState.currentRequest);
        setResponse(emptyState.response);
        setSelectedKeys(emptyState.selectedKeys);
        setApiConfig(emptyState.apiConfig);
        setSelectedEnvironmentId(emptyState.selectedEnvironmentId);
        setRequestCases(emptyState.requestCases);
        setActiveCaseId(emptyState.activeCaseId);
        setInterfaceApiConfig(emptyState.interfaceApiConfig);
        setRequestEditorSurface(emptyState.requestEditorSurface);
        setSidebarHighlightedCasePath(emptyState.sidebarHighlightedCasePath);
        setExpandedRequestPaths(new Set());
    };

    const captureCurrentWorkspaceState = (): ProjectWorkspaceState => ({
        requestTabs,
        activeRequestTab,
        currentRequest,
        response,
        selectedKeys,
        apiConfig,
        selectedEnvironmentId,
        requestCases,
        activeCaseId,
        interfaceApiConfig,
        requestEditorSurface,
        sidebarHighlightedCasePath
    });

    const applyWorkspaceState = (state: ProjectWorkspaceState) => {
        setRequestTabs(state.requestTabs);
        setActiveRequestTab(state.activeRequestTab);
        setCurrentRequest(state.currentRequest);
        setResponse(state.response);
        setSelectedKeys(state.selectedKeys);
        setApiConfig(state.apiConfig);
        setSelectedEnvironmentId(state.selectedEnvironmentId || '');
        setRequestCases(state.requestCases || []);
        setActiveCaseId(state.activeCaseId || '');
        setInterfaceApiConfig(state.interfaceApiConfig || createDefaultApiConfig());
        setRequestEditorSurface(state.requestEditorSurface || 'plain');
        setSidebarHighlightedCasePath(state.sidebarHighlightedCasePath || '');
    };

    const environmentToRows = (variables: Record<string, string>): EnvironmentVariableRow[] => {
        const rows = Object.entries(variables || {}).map(([key, value]) => createEnvironmentVariableRow(key, value));
        return rows.length > 0 ? rows : [createEnvironmentVariableRow()];
    };

    const rowsToEnvironmentVariables = (rows: EnvironmentVariableRow[]): Record<string, string> => {
        return rows.reduce((acc, item) => {
            const key = item.key.trim();
            if (!key) return acc;
            acc[key] = item.value;
            return acc;
        }, {} as Record<string, string>);
    };

    const resetEnvironmentEditor = () => {
        setEditingEnvironmentId('');
        setEnvironmentFormName('');
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
    };

    const loadEnvironmentsData = async (projectID: string) => {
        setEnvLoading(true);
        try {
            const envs = await LoadEnvironments(projectID);
            setEnvironments(envs || []);
        } catch (error: any) {
            console.error('Failed to load environments:', error);
            message.error(`加载环境失败: ${error?.message || error}`);
            setEnvironments([]);
        } finally {
            setEnvLoading(false);
        }
    };

    const loadProjectScriptsData = async (projectID: string) => {
        setScriptsLoading(true);
        try {
            const scripts = await ListProjectScripts(projectID);
            setProjectScripts(scripts || []);
            if (scripts && scripts.length > 0) {
                const target = scripts.find(item => item.id === editingScriptId) || scripts[0];
                setEditingScriptId(target.id);
                setScriptFormName(target.name);
                setScriptFormContent(target.content || '');
            } else {
                setEditingScriptId('');
                setScriptFormName('');
                setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            }
        } catch (error: any) {
            console.error('Failed to load scripts:', error);
            message.error(`加载脚本失败: ${error?.message || error}`);
        } finally {
            setScriptsLoading(false);
        }
    };

    const handleCreateScript = async () => {
        if (!currentProject?.id) return;
        const scriptName = `脚本${projectScripts.length + 1}`;
        setScriptSaving(true);
        try {
            const created = await CreateProjectScript(currentProject.id, scriptName, '// 在这里编写 JavaScript 脚本\n');
            message.success('脚本已创建');
            await loadProjectScriptsData(currentProject.id);
            setEditingScriptId(created.id);
            setScriptFormName(created.name);
            setScriptFormContent(created.content || '');
            setSidebarMenu('scripts');
        } catch (error: any) {
            message.error(`创建脚本失败: ${error?.message || error}`);
        } finally {
            setScriptSaving(false);
        }
    };

    const handleSelectScriptEditor = (script: ProjectScript) => {
        setEditingScriptId(script.id);
        setScriptFormName(script.name);
        setScriptFormContent(script.content || '');
    };

    const handleSaveScript = async () => {
        if (!currentProject?.id || !editingScriptId) return;
        const name = scriptFormName.trim();
        if (!name) {
            message.warning('请输入脚本名称');
            return;
        }
        setScriptSaving(true);
        try {
            await UpdateProjectScript(currentProject.id, editingScriptId, name, scriptFormContent);
            message.success('脚本已保存');
            await loadProjectScriptsData(currentProject.id);
        } catch (error: any) {
            message.error(`保存脚本失败: ${error?.message || error}`);
        } finally {
            setScriptSaving(false);
        }
    };

    const handleDeleteScriptCurrent = async () => {
        if (!currentProject?.id || !editingScriptId) return;
        Modal.confirm({
            title: '删除脚本',
            content: '确定删除当前脚本吗？接口中已绑定该脚本的配置会被清空。',
            onOk: async () => {
                try {
                    await DeleteProjectScript(currentProject.id, editingScriptId);
                    message.success('脚本已删除');
                    await loadProjectScriptsData(currentProject.id);
                    setApiConfig((prev) => ({
                        ...prev,
                        preScriptId: prev.preScriptId === editingScriptId ? '' : prev.preScriptId,
                        postScriptId: prev.postScriptId === editingScriptId ? '' : prev.postScriptId,
                    }));
                    setInterfaceApiConfig((prev) => ({
                        ...prev,
                        preScriptId: prev.preScriptId === editingScriptId ? '' : prev.preScriptId,
                        postScriptId: prev.postScriptId === editingScriptId ? '' : prev.postScriptId,
                    }));
                } catch (error: any) {
                    message.error(`删除脚本失败: ${error?.message || error}`);
                }
            }
        });
    };

    const openEnvironmentEditor = (env: Environment) => {
        const tabKey = `env-${env.id}`;
        setEnvironmentTabs(prev => {
            if (prev.some(tab => tab.key === tabKey)) return prev;
            return [...prev, { key: tabKey, title: env.name, environmentId: env.id }];
        });
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    };

    const openCreateEnvironmentTab = () => {
        const p = projectTabs.find(t => t.id === activeTab)?.project;
        if (!p?.id) {
            message.warning('请先打开项目');
            return;
        }
        const tabKey = `new-env-${Date.now()}`;
        setEnvironmentTabs(prev => [...prev, { key: tabKey, title: '新建环境', isNew: true }]);
        setActiveEnvironmentTab(tabKey);
        setEditingEnvironmentId('');
        setEnvironmentFormName(`环境${environments.length + 1}`);
        setEnvironmentFormVariables([createEnvironmentVariableRow()]);
        setSidebarMenu('environments');
    };

    const closeEnvironmentTab = (tabKey: string) => {
        setEnvironmentTabs(prev => {
            const next = prev.filter(tab => tab.key !== tabKey);
            if (activeEnvironmentTab === tabKey) {
                setActiveEnvironmentTab(next[0]?.key || '');
                if (next.length === 0) {
                    resetEnvironmentEditor();
                }
            }
            return next;
        });
    };

    const switchProjectTab = (targetTab: string, skipSaveCurrent: boolean = false) => {
        if (targetTab === activeTab) {
            return;
        }

        if (!skipSaveCurrent && activeTab !== 'home') {
            const currentState = captureCurrentWorkspaceState();
            setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
        }

        setActiveTab(targetTab);
        if (targetTab === 'home') {
            resetWorkspaceState();
            return;
        }

        const targetState = projectWorkspaceStates[targetTab] || createEmptyWorkspaceState();
        applyWorkspaceState(targetState);
    };

    const getMethodColor = (method: string) => {
        const colors: Record<string, string> = {
            GET: '#61affe',
            POST: '#49cc90',
            PUT: '#fca130',
            DELETE: '#f93e3e',
            PATCH: '#50e3c2',
            OPTIONS: '#0d5aa7',
            HEAD: '#9012fe'
        };
        return colors[method.toUpperCase()] || '#999';
    };

    /** 侧栏方法标签文案（DELETE→DEL、PATCH→PAT，其余最长 7 字符） */
    const formatSidebarMethodLabel = (method: string): string => {
        const m = (method || 'GET').toUpperCase();
        if (m === 'DELETE') return 'DEL';
        if (m === 'PATCH') return 'PAT';
        return m.substring(0, 7);
    };

    const filterTreeNodes = (tree: ProjectTree | null, keyword: string, method: string): ProjectTree | null => {
        if (!tree) return null;
        const normalizedKeyword = keyword.trim().toLowerCase();
        const noSearchOrMethodFilter = normalizedKeyword === '' && method === 'ALL';

        if (tree.type === 'case') {
            return tree;
        }

        if (tree.type === 'request') {
            const nameLower = (tree.name || '').toLowerCase();
            const urlLower = (tree.url || '').toLowerCase();

            const matchName = normalizedKeyword === '' || nameLower.includes(normalizedKeyword);
            const matchURL = normalizedKeyword === '' || urlLower.includes(normalizedKeyword);
            const matchMethod = method === 'ALL' || tree.method === method;
            const caseChildren = (tree.children || []).filter((c): c is ProjectTree => c.type === 'case');
            const caseNameMatch =
                normalizedKeyword === '' ||
                caseChildren.some((c) => (c.name || '').toLowerCase().includes(normalizedKeyword));

            if ((matchName || matchURL || caseNameMatch) && matchMethod) {
                let nextChildren = tree.children;
                if (normalizedKeyword !== '' && !matchName && !matchURL && caseNameMatch) {
                    nextChildren = caseChildren.filter((c) =>
                        (c.name || '').toLowerCase().includes(normalizedKeyword)
                    );
                }
                return { ...tree, children: nextChildren };
            }
            return null;
        }

        if (tree.type === 'folder') {
            const children = tree.children ?? [];
            const filteredChildren = children
                .map(child => filterTreeNodes(child, keyword, method))
                .filter((child): child is ProjectTree => child !== null);

            // 无搜索/方法筛选时保留空文件夹，否则新建的空目录不会出现在树里
            if (filteredChildren.length > 0 || noSearchOrMethodFilter) {
                return { ...tree, children: filteredChildren };
            }
            return null;
        }

        if (tree.type === 'project') {
            const children = tree.children ?? [];
            const filteredChildren = children
                .map(child => filterTreeNodes(child, keyword, method))
                .filter((child): child is ProjectTree => child !== null);

            return {
                ...tree,
                children: filteredChildren
            };
        }

        return tree;
    };

    const renderApiList = () => {
        if (!filteredTree) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        const allChildren = filteredTree.children || [];
        if (allChildren.length === 0) {
            return <div style={{ padding: 20, color: '#999', textAlign: 'center' }}>没有找到匹配的接口</div>;
        }

        const renderCaseRow = (c: ProjectTree) => {
            const caseActive =
                sidebarHighlightedCasePath !== '' && sidebarHighlightedCasePath === c.path;
            return (
                <div
                    key={c.path}
                    className={`api-case-item ${caseActive ? 'active' : ''} ${movedHighlightPath === c.path ? 'moved-highlight' : ''}`}
                    onClick={() => handleCaseTreeClick(c)}
                >
                    <div className="api-request-expand-cell" aria-hidden>
                        <span className="api-request-expand-placeholder" />
                    </div>
                    <div className="api-item-main">
                        <span className="api-method-col api-method-col--case-icon" title="用例" aria-hidden>
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
                                    onClick: () => { handleDuplicateCaseFromTree(c.path!); },
                                },
                                {
                                    key: 'ren',
                                    icon: <EditOutlined />,
                                    label: '重命名',
                                    onClick: () => { openCaseRenameFromTree(c.path!, c.name); },
                                },
                                { type: 'divider' },
                                {
                                    key: 'del',
                                    icon: <CloseOutlined />,
                                    label: '删除',
                                    danger: true,
                                    onClick: () => { handleDeleteCaseFromTree(c.path!); },
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
            );
        };

        const renderRequestItem = (api: ProjectTree) => {
            const caseKids = (api.children || []).filter((c): c is ProjectTree => c.type === 'case');
            const hasCases = caseKids.length > 0;
            const expanded = !!(api.path && expandedRequestPaths.has(api.path));
            const caseHighlightRef = sidebarHighlightedCasePath
                ? parseRequestCaseRef(sidebarHighlightedCasePath)
                : null;
            const caseHighlightReqPath = caseHighlightRef
                ? requestRefFromIds(caseHighlightRef.projectId, caseHighlightRef.requestId)
                : '';
            const parentOpen =
                currentRequest?.path === api.path &&
                caseHighlightReqPath !== api.path;
            const method = formatSidebarMethodLabel(api.method || 'GET');
            const mc = getMethodColor(api.method || 'GET');

            return (
                <div key={api.path} className="api-request-block">
                    <div
                        className={`api-item ${parentOpen ? 'is-parent-open' : ''} ${movedHighlightPath === api.path ? 'moved-highlight' : ''}`}
                        onDragOver={(e) => {
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const parentPath = getParentFolderPath(api.path!);
                            if (parentPath === null) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const topHalf = e.clientY < rect.top + rect.height / 2;
                            const sibs = getChildrenByFolderPath(parentPath).filter((c) => c.type === 'folder' || c.type === 'request');
                            const idx = sibs.findIndex((c) => c.path === api.path);
                            const beforeID = topHalf ? api.id : (idx >= 0 && sibs[idx + 1] ? sibs[idx + 1].id : '');
                            const check = checkDropOrdered(draggingNode, parentPath, beforeID);
                            if (!check.ok) {
                                e.dataTransfer.dropEffect = 'none';
                                setInvalidDropHint({
                                    message: getDropHintMessage(check.reason),
                                    x: e.clientX + 14,
                                    y: e.clientY + 14,
                                });
                                return;
                            }
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setInvalidDropHint(null);
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const parentPath = getParentFolderPath(api.path!);
                            if (parentPath === null) {
                                clearDragState();
                                return;
                            }
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const topHalf = e.clientY < rect.top + rect.height / 2;
                            const sibs = getChildrenByFolderPath(parentPath).filter((c) => c.type === 'folder' || c.type === 'request');
                            const idx = sibs.findIndex((c) => c.path === api.path);
                            const beforeID = topHalf ? api.id : (idx >= 0 && sibs[idx + 1] ? sibs[idx + 1].id : '');
                            const check = checkDropOrdered(draggingNode, parentPath, beforeID);
                            if (!check.ok) {
                                clearDragState();
                                return;
                            }
                            if (draggingNode.type === 'request') {
                                await moveRequestNode(draggingNode.path, parentPath, beforeID);
                            } else {
                                await moveFolderNode(draggingNode.path, parentPath, beforeID);
                            }
                            clearDragState();
                        }}
                    >
                        <div className="api-request-expand-cell">
                            {hasCases ? (
                                <button
                                    type="button"
                                    className="api-request-expand"
                                    aria-expanded={expanded}
                                    aria-label={expanded ? '折叠用例' : '展开用例'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRequestCasesExpanded(api.path!);
                                    }}
                                >
                                    {expanded ? <DownOutlined /> : <RightOutlined />}
                                </button>
                            ) : (
                                <span className="api-request-expand-placeholder" aria-hidden />
                            )}
                        </div>
                        <div
                            className="api-item-main"
                            draggable
                            role="button"
                            tabIndex={0}
                            onClick={() => handleTreeItemClick(api)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleTreeItemClick(api);
                                }
                            }}
                            onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggingNode({ type: 'request', path: api.path! });
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={clearDragState}
                        >
                            <span className="api-method-col">
                                <span
                                    className="api-method-tag"
                                    style={{ backgroundColor: `${mc}20`, color: mc }}
                                >
                                    {method}
                                </span>
                            </span>
                            <span className="api-name">{(api.name || '').replace(/\.curl$/i, '')}</span>
                        </div>
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'add-case',
                                        icon: <PlusOutlined />,
                                        label: '新增用例',
                                        onClick: () => { openAddCaseModal(api.path!); },
                                    },
                                    { type: 'divider' },
                                    {
                                        key: 'copy',
                                        icon: <CopyOutlined />,
                                        label: '复制',
                                        onClick: () => { handleCopyRequest(api.path!); },
                                    },
                                    {
                                        key: 'rename',
                                        icon: <EditOutlined />,
                                        label: '重命名',
                                        onClick: () => { openRenameModal('request', api.path!, api.name); },
                                    },
                                    {
                                        key: 'delete',
                                        icon: <CloseOutlined />,
                                        label: '删除',
                                        danger: true,
                                        onClick: () => { handleDeleteRequest(api.path!); },
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
                    {hasCases && expanded && (
                        <div className="api-case-list">
                            {caseKids.map((c) => renderCaseRow(c))}
                        </div>
                    )}
                </div>
            );
        };

        // 递归渲染文件夹及其内容
        const renderFolder = (folder: any) => {
            const folderChildren = folder.children || [];
            const orderedKids = folderChildren.filter((child: any) => child.type === 'folder' || child.type === 'request');
            const isCollapsed = collapsedFolders.has(folder.path || folder.id);
            const totalCount = folderChildren.length;

            return (
                <div key={folder.path || folder.id} className="api-folder">
                    <div
                        className={`api-folder-header ${dropTargetFolderPath === (folder.path || folder.id) ? 'drop-target' : ''} ${movedHighlightPath === (folder.path || folder.id) ? 'moved-highlight' : ''}`}
                        draggable
                        onClick={() => toggleFolderCollapse(folder.path || folder.id)}
                        onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggingNode({ type: 'folder', path: folder.path! });
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={clearDragState}
                        onDragOver={(e) => {
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const targetPath = folder.path || folder.id;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const intoFolderHalf = e.clientY >= rect.top + rect.height / 2;
                            const check = intoFolderHalf
                                ? checkDropAppendIntoFolder(draggingNode, targetPath)
                                : (() => {
                                      const p = getParentFolderPath(folder.path!);
                                      if (p === null) return { ok: false as const, reason: 'invalid-target' };
                                      return checkDropOrdered(draggingNode, p, folder.id);
                                  })();
                            if (!check.ok) {
                                e.dataTransfer.dropEffect = 'none';
                                setDropTargetFolderPath(null);
                                setInvalidDropHint({
                                    message: getDropHintMessage(check.reason),
                                    x: e.clientX + 14,
                                    y: e.clientY + 14,
                                });
                                return;
                            }
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            setDropTargetFolderPath(targetPath);
                            setInvalidDropHint(null);
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!draggingNode) return;
                            const targetPath = folder.path || folder.id;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const intoFolderHalf = e.clientY >= rect.top + rect.height / 2;
                            if (intoFolderHalf) {
                                const check = checkDropAppendIntoFolder(draggingNode, targetPath);
                                if (!check.ok) {
                                    clearDragState();
                                    return;
                                }
                                if (draggingNode.type === 'request') {
                                    await moveRequestNode(draggingNode.path, targetPath, '');
                                } else {
                                    await moveFolderNode(draggingNode.path, targetPath, '');
                                }
                            } else {
                                const parentPath = getParentFolderPath(folder.path!);
                                if (parentPath === null) {
                                    clearDragState();
                                    return;
                                }
                                const check = checkDropOrdered(draggingNode, parentPath, folder.id);
                                if (!check.ok) {
                                    clearDragState();
                                    return;
                                }
                                if (draggingNode.type === 'request') {
                                    await moveRequestNode(draggingNode.path, parentPath, folder.id);
                                } else {
                                    await moveFolderNode(draggingNode.path, parentPath, folder.id);
                                }
                            }
                            clearDragState();
                        }}
                    >
                        <span className="folder-toggle-icon">
                            {isCollapsed ? <RightOutlined /> : <DownOutlined />}
                        </span>
                        <FolderOutlined className="folder-icon" />
                        <span className="folder-name">{folder.name}</span>
                        <span className="folder-count">{totalCount}</span>
                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'add-request', icon: <PlusOutlined />, label: '新建请求', onClick: () => { setSelectedFolder(folder.path || currentProject?.path || ''); setCreateRequestModal(true); } },
                                    { key: 'add-folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => { setSelectedFolder(folder.path || currentProject?.path || ''); setCreateFolderModal(true); } },
                                    { key: 'rename', icon: <EditOutlined />, label: '重命名', onClick: () => openRenameModal('folder', folder.path!, folder.name) },
                                    { type: 'divider' },
                                    { key: 'delete', icon: <CloseOutlined />, label: '删除文件夹', danger: true, onClick: () => handleDeleteFolder(folder.path!) }
                                ]
                            }}
                            trigger={['click']}
                        >
                            <button className="folder-action-btn" onClick={(e) => e.stopPropagation()}>
                                <MoreOutlined />
                            </button>
                        </Dropdown>
                    </div>

                    {!isCollapsed && orderedKids.length > 0 && (
                        <div className="api-folder-content">
                            {orderedKids.map((child: ProjectTree) =>
                                child.type === 'request' ? (
                                    <React.Fragment key={child.path || child.id}>{renderRequestItem(child)}</React.Fragment>
                                ) : (
                                    <React.Fragment key={child.path || child.id}>{renderFolder(child)}</React.Fragment>
                                )
                            )}
                        </div>
                    )}
                </div>
            );
        };

        // 与 collection 子项顺序一致：根下文件夹与接口可任意交错（拖拽排序才能生效）
        const rootChildren = (filteredTree.children || []).filter(
            (child: ProjectTree) => child.type === 'folder' || child.type === 'request'
        );

        return (
            <>
                {rootChildren.map((child: ProjectTree) => {
                    if (child.type === 'request') {
                        return (
                            <div key={child.path || child.id} className="api-root-sibling">
                                {renderRequestItem(child)}
                            </div>
                        );
                    }
                    return (
                        <div key={child.path || child.id} className="api-root-sibling">
                            {renderFolder(child)}
                        </div>
                    );
                })}
            </>
        );
    };

    useEffect(() => {
        loadProjects();
        loadUiConfig();
        loadProjectGroupsState();
    }, []);

    useEffect(() => {
        if (environments.length === 0) {
            if (selectedEnvironmentId) {
                setSelectedEnvironmentId('');
            }
            if (editingEnvironmentId) {
                resetEnvironmentEditor();
            }
            return;
        }

        const hasSelected = environments.some(env => env.id === selectedEnvironmentId);
        if (!hasSelected) {
            setSelectedEnvironmentId(environments[0].id);
        }

        if (editingEnvironmentId && !environments.some(env => env.id === editingEnvironmentId)) {
            resetEnvironmentEditor();
        }
    }, [environments, selectedEnvironmentId, editingEnvironmentId]);

    useEffect(() => {
        const activeProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!activeProject?.id) {
            setProjectScripts([]);
            setEditingScriptId('');
            setScriptFormName('');
            setScriptFormContent('// 在这里编写 JavaScript 脚本\n');
            setEnvironments([]);
            return;
        }
        loadProjectScriptsData(activeProject.id);
        loadEnvironmentsData(activeProject.id);
    }, [activeTab, projectTabs]);

    useEffect(() => {
        setEnvironmentTabs(prev => prev
            .filter(tab => tab.isNew || (tab.environmentId && environments.some(env => env.id === tab.environmentId)))
            .map(tab => {
                if (tab.isNew || !tab.environmentId) return tab;
                const env = environments.find(item => item.id === tab.environmentId);
                return env ? { ...tab, title: env.name } : tab;
            }));
    }, [environments]);

    useEffect(() => {
        if (!activeEnvironmentTab) return;
        const activeTab = environmentTabs.find(tab => tab.key === activeEnvironmentTab);
        if (!activeTab) return;
        if (activeTab.isNew) {
            setEditingEnvironmentId('');
            if (!environmentFormName) {
                setEnvironmentFormName(`环境${environments.length + 1}`);
            }
            if (!environmentFormVariables.length) {
                setEnvironmentFormVariables([createEnvironmentVariableRow()]);
            }
            return;
        }
        if (!activeTab.environmentId) return;
        const env = environments.find(item => item.id === activeTab.environmentId);
        if (!env) return;
        setEditingEnvironmentId(env.id);
        setEnvironmentFormName(env.name);
        setEnvironmentFormVariables(environmentToRows(env.variables));
    }, [activeEnvironmentTab, environmentTabs, environments]);

    useEffect(() => {
        const projectIds = new Set(projects.map(p => p.id));
        setProjectGroupAssignments(prev => {
            let changed = false;
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([projectId, groupName]) => {
                if (projectIds.has(projectId)) {
                    next[projectId] = groupName;
                } else {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [projects]);

    useEffect(() => {
        return () => {
            if (forceAnimationTimerRef.current) {
                window.clearTimeout(forceAnimationTimerRef.current);
            }
            if (movedHighlightTimerRef.current) {
                window.clearTimeout(movedHighlightTimerRef.current);
            }
        };
    }, []);

    const loadUiConfig = async () => {
        try {
            const cfg = await LoadAppConfig() as any;
            setListAnimationEnabled(Boolean(cfg?.ui?.enableListAnimation));
        } catch (error) {
            console.error('Failed to load UI config:', error);
        }
    };

    const loadProjectGroupsState = async () => {
        try {
            const state = await (window as any).go.main.App.LoadProjectGroupsState() as ProjectGroupStore;
            setProjectGroups(Array.isArray(state?.groups) ? state.groups.filter(Boolean) : []);
            setProjectGroupAssignments(state?.assignments || {});
            setCollapsedProjectGroups(new Set(Array.isArray(state?.collapsedGroups) ? state.collapsedGroups : []));
        } catch (error) {
            console.error('Failed to load project groups state:', error);
        } finally {
            setProjectGroupsLoaded(true);
        }
    };

    useEffect(() => {
        if (!projectGroupsLoaded) return;
        const persist = async () => {
            try {
                await (window as any).go.main.App.SaveProjectGroupsState({
                    groups: projectGroups,
                    assignments: projectGroupAssignments,
                    collapsedGroups: Array.from(collapsedProjectGroups),
                });
            } catch (error) {
                console.error('Failed to save project groups state:', error);
            }
        };
        persist();
    }, [projectGroups, projectGroupAssignments, collapsedProjectGroups, projectGroupsLoaded]);

    // Update curl preview when apiConfig changes
    useEffect(() => {
        setCurlPreview(buildCurlCommand(apiConfig));
    }, [apiConfig.method, apiConfig.url, apiConfig.headers, apiConfig.params, apiConfig.body, apiConfig.bodyType, apiConfig.formData, apiConfig.urlencoded]);

    const triggerOpenTabAnimation = () => {
        if (forceAnimationTimerRef.current) {
            window.clearTimeout(forceAnimationTimerRef.current);
        }
        setForceListAnimation(true);
        forceAnimationTimerRef.current = window.setTimeout(() => {
            setForceListAnimation(false);
            forceAnimationTimerRef.current = null;
        }, 400);
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            const projectList = await ListProjects();
            setProjects(projectList || []);
            setStatus(`已加载 ${(projectList || []).length} 个项目`);
        } catch (error: any) {
            console.error('Failed to load projects:', error);
            setStatus(`错误: ${error?.message || error}`);
            message.error('加载项目失败');
        } finally {
            setLoading(false);
        }
    };

    const handleImportPostman = async (file: File) => {
        setImporting(true);
        try {
            const text = await file.text();
            const project = await ImportPostmanCollection(text);
            message.success(`成功导入项目: ${project.name}`);
            loadProjects();
        } catch (error: any) {
            console.error('Failed to import Postman collection:', error);
            message.error(`导入失败: ${error?.message || error}`);
        } finally {
            setImporting(false);
        }
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.json',
        showUploadList: false,
        beforeUpload: (file) => {
            handleImportPostman(file);
            return false;
        },
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) {
            message.warning('请输入项目名称');
            return;
        }

        try {
            await CreateProject(newProjectName);
            message.success('项目创建成功');
            setCreateProjectModal(false);
            setNewProjectName('');
            loadProjects();
        } catch (error: any) {
            console.error('Failed to create project:', error);
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const handleDeleteProject = async (projectId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        Modal.confirm({
            title: '删除项目',
            content: '确定要删除这个项目吗？此操作不可恢复。',
            onOk: async () => {
                try {
                    await DeleteProject(projectId);
                    message.success('项目已删除');
                    setProjectTabs(projectTabs.filter(t => t.project.id !== projectId));
                    loadProjects();
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };

    const openRenameProjectModal = (project: Project, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setRenameProjectId(project.id);
        setRenameProjectValue(project.name);
        setRenameProjectModal(true);
    };

    const handleRenameProject = async () => {
        const newName = renameProjectValue.trim();
        if (!renameProjectId) return;
        if (!newName) {
            message.warning('请输入项目名称');
            return;
        }
        try {
            const renamed = await RenameProject(renameProjectId, newName);
            setProjectTabs(prev => prev.map(tab => (
                tab.project.id === renameProjectId
                    ? { ...tab, title: renamed.name, project: { ...tab.project, name: renamed.name, path: renamed.path } }
                    : tab
            )));
            setRenameProjectModal(false);
            setRenameProjectId('');
            setRenameProjectValue('');
            message.success('项目重命名成功');
            await loadProjects();
        } catch (error: any) {
            const msg = String(error?.message || error || '');
            if (msg.includes('同名') || msg.includes('已存在')) {
                message.warning('重命名失败：已存在同名项目');
            } else {
                message.error(`重命名失败: ${msg}`);
            }
        }
    };

    const handleCreateProjectGroup = () => {
        const groupName = newGroupName.trim();
        if (!groupName) {
            message.warning('请输入分组名称');
            return;
        }
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (projectGroups.includes(groupName)) {
            message.warning('分组名称已存在');
            return;
        }
        setProjectGroups(prev => [...prev, groupName]);
        setCreateGroupModal(false);
        setNewGroupName('');
        message.success('分组创建成功');
    };

    const handleAssignProjectGroup = (projectId: string, groupName: string) => {
        if (!groupName || groupName === DEFAULT_PROJECT_GROUP) {
            setProjectGroupAssignments(prev => {
                const next = { ...prev };
                delete next[projectId];
                return next;
            });
            return;
        }
        setProjectGroupAssignments(prev => ({ ...prev, [projectId]: groupName }));
    };

    const toggleProjectGroupCollapse = (groupName: string) => {
        setCollapsedProjectGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) {
                next.delete(groupName);
            } else {
                next.add(groupName);
            }
            return next;
        });
    };

    const openRenameProjectGroupModal = (groupName: string) => {
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('默认分组不支持重命名');
            return;
        }
        setEditingGroupName(groupName);
        setRenameGroupValue(groupName);
        setRenameGroupModal(true);
    };

    const handleRenameProjectGroup = () => {
        const nextName = renameGroupValue.trim();
        if (!editingGroupName) return;
        if (!nextName) {
            message.warning('请输入分组名称');
            return;
        }
        if (nextName === DEFAULT_PROJECT_GROUP) {
            message.warning('该名称为系统默认分组，请使用其他名称');
            return;
        }
        if (nextName !== editingGroupName && projectGroups.includes(nextName)) {
            message.warning('分组名称已存在');
            return;
        }

        setProjectGroups(prev => prev.map(name => (name === editingGroupName ? nextName : name)));
        setProjectGroupAssignments(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(projectId => {
                if (next[projectId] === editingGroupName) {
                    next[projectId] = nextName;
                }
            });
            return next;
        });
        setCollapsedProjectGroups(prev => {
            const next = new Set(prev);
            if (next.delete(editingGroupName)) {
                next.add(nextName);
            }
            return next;
        });

        setRenameGroupModal(false);
        setEditingGroupName('');
        setRenameGroupValue('');
        message.success('分组重命名成功');
    };

    const handleDeleteProjectGroup = (groupName: string) => {
        if (groupName === DEFAULT_PROJECT_GROUP) {
            message.warning('默认分组不支持删除');
            return;
        }
        const affectedCount = Object.values(projectGroupAssignments).filter(name => name === groupName).length;
        Modal.confirm({
            title: '删除分组',
            content: affectedCount > 0
                ? `该分组下有 ${affectedCount} 个项目，删除后将自动移动到“${DEFAULT_PROJECT_GROUP}”。是否继续？`
                : '确定删除该分组吗？',
            onOk: () => {
                setProjectGroups(prev => prev.filter(name => name !== groupName));
                setProjectGroupAssignments(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(projectId => {
                        if (next[projectId] === groupName) {
                            delete next[projectId];
                        }
                    });
                    return next;
                });
                setCollapsedProjectGroups(prev => {
                    const next = new Set(prev);
                    next.delete(groupName);
                    return next;
                });
                message.success('分组已删除');
            }
        });
    };

    const handleGroupDragStart = (groupName: string, e: React.DragEvent) => {
        if (groupName === DEFAULT_PROJECT_GROUP) return;
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        setDraggingGroupName(groupName);
    };

    const handleGroupDragOver = (groupName: string, e: React.DragEvent) => {
        if (!draggingGroupName) return;
        if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setGroupSortDropTarget(groupName);
    };

    const handleGroupDrop = (groupName: string, e: React.DragEvent) => {
        if (!draggingGroupName) return;
        if (groupName === DEFAULT_PROJECT_GROUP || groupName === draggingGroupName) return;
        e.preventDefault();
        e.stopPropagation();
        setProjectGroups(prev => {
            const sourceIndex = prev.indexOf(draggingGroupName);
            const targetIndex = prev.indexOf(groupName);
            if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return prev;
            const next = [...prev];
            next.splice(sourceIndex, 1);
            const insertIndex = next.indexOf(groupName);
            next.splice(insertIndex, 0, draggingGroupName);
            return next;
        });
        setDraggingGroupName(null);
        setGroupSortDropTarget(null);
    };

    const handleOpenProject = async (project: Project) => {
        const existingTab = projectTabs.find(t => t.project.id === project.id);
        if (existingTab) {
            switchProjectTab(existingTab.id);
        } else {
            const newTab: ProjectTab = {
                id: project.id,
                title: project.name,
                project: project,
            };
            if (activeTab !== 'home') {
                const currentState = captureCurrentWorkspaceState();
                setProjectWorkspaceStates(prev => ({ ...prev, [activeTab]: currentState }));
            }
            setProjectTabs([...projectTabs, newTab]);
            setProjectWorkspaceStates(prev => ({ ...prev, [newTab.id]: createEmptyWorkspaceState() }));
            setActiveTab(newTab.id);
            resetWorkspaceState();
            triggerOpenTabAnimation();

            setLoading(true);
            try {
                const tree = await GetProjectTree(project.id);
                setProjectTrees(prev => ({ ...prev, [project.id]: tree }));
                const folderKeys = collectFolderKeys(tree);
                setCollapsedFolders(prev => {
                    const next = new Set(prev);
                    folderKeys.forEach((key) => next.add(key));
                    return next;
                });
                setExpandedKeys([project.id]);
            } catch (error: any) {
                console.error('Failed to load project tree:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCloseProjectTab = (tabId: string) => {
        setProjectTabs(projectTabs.filter(t => t.id !== tabId));
        setProjectWorkspaceStates(prev => {
            const next = { ...prev };
            delete next[tabId];
            return next;
        });
        if (activeTab === tabId) {
            const remaining = projectTabs.filter(t => t.id !== tabId);
            if (remaining.length > 0) {
                switchProjectTab(remaining[0].id, true);
            } else {
                switchProjectTab('home', true);
            }
        }
    };

    const handleCreateFolder = async () => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!newFolderName.trim() || !currentProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || currentProject.path;
        try {
            await CreateFolder(currentProject.id, parentPath, newFolderName);
            message.success('文件夹创建成功');
            setCreateFolderModal(false);
            setNewFolderName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));

            // 清除折叠状态以显示新创建的文件夹
            if (!selectedFolder) {
                // 如果是在根目录创建，清除所有折叠状态
                setCollapsedFolders(new Set());
            } else {
                // 如果是在某个文件夹内创建，确保父文件夹展开
                setCollapsedFolders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedFolder);
                    return newSet;
                });
            }
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const findTreeNode = (tree: ProjectTree | null, key: string): ProjectTree | null => {
        if (!tree) return null;
        if ((tree.path || tree.id) === key) return tree;
        if (tree.children) {
            for (const child of tree.children) {
                const found = findTreeNode(child, key);
                if (found) return found;
            }
        }
        return null;
    };

    const moveRequestNode = async (requestPath: string, targetFolderPath: string, beforeID: string = '') => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newRequestPath = await MoveRequest(requestPath, targetFolderPath, beforeID ?? '');

            setRequestTabs(prev => prev.map(tab =>
                tab.path === requestPath ? { ...tab, path: newRequestPath } : tab
            ));
            if (currentRequest?.path === requestPath) {
                setCurrentRequest({ ...currentRequest, path: newRequestPath });
            }

            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(newRequestPath);
            message.success('接口移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const moveFolderNode = async (folderPath: string, targetFolderPath: string, beforeID: string = '') => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!currentProject) return;

        try {
            const newFolderPath = await MoveFolder(folderPath, targetFolderPath, beforeID ?? '');

            setRequestTabs(prev => prev.map(tab => ({
                ...tab,
                path: replacePathPrefix(tab.path, folderPath, newFolderPath)
            })));

            if (currentRequest?.path) {
                const nextPath = replacePathPrefix(currentRequest.path, folderPath, newFolderPath);
                if (nextPath !== currentRequest.path) {
                    setCurrentRequest({ ...currentRequest, path: nextPath });
                }
            }

            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            setCollapsedFolders(prev => {
                const next = new Set(prev);
                next.delete(targetFolderPath);
                return next;
            });
            markMovedNode(newFolderPath);
            message.success('文件夹移动成功');
        } catch (error: any) {
            message.error(`移动失败: ${error?.message || error}`);
        }
    };

    const handleCreateRequest = async () => {
        const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
        if (!newRequestName.trim() || !currentProject) {
            message.warning('请先选择一个项目');
            return;
        }

        const parentPath = selectedFolder || currentProject.path;
        try {
            await CreateRequest(currentProject.id, parentPath, newRequestName, toWailsHttpSpec(createDefaultApiConfig()));
            message.success('请求创建成功');
            setCreateRequestModal(false);
            setNewRequestName('');
            const tree = await GetProjectTree(currentProject.id);
            setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));

            // 清除折叠状态以显示新创建的请求
            if (!selectedFolder) {
                setCollapsedFolders(new Set());
            } else {
                setCollapsedFolders(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedFolder);
                    return newSet;
                });
            }
        } catch (error: any) {
            message.error(`创建失败: ${error?.message || error}`);
        }
    };

    const handleTreeItemClick = async (treeNode: ProjectTree) => {
        if (treeNode.type === 'request' && treeNode.path) {
            try {
                setSidebarHighlightedCasePath('');
                const request = await GetRequest(treeNode.path);
                hydrateRequestEditor(request);

                const existingTab = requestTabs.find(t => t.path === treeNode.path);
                if (existingTab) {
                    setActiveRequestTab(existingTab.id);
                } else {
                    const newTab: RequestTab = {
                        id: `request-${Date.now()}`,
                        title: request.name || treeNode.name.replace(/\.curl$/i, ''),
                        path: treeNode.path,
                    };
                    setRequestTabs([...requestTabs, newTab]);
                    setActiveRequestTab(newTab.id);
                }
            } catch (error: any) {
                console.error('Failed to load request:', error);
                message.error('加载请求失败');
            }
        }
    };

    const applyEnvironmentVariables = (input: string, variables: Record<string, string>): string => {
        if (!input) return input;
        return input.replace(/\{\{(\w+)\}\}/g, (raw, varName: string) => {
            return Object.prototype.hasOwnProperty.call(variables, varName) ? variables[varName] : raw;
        });
    };

    const currentEnvironmentVariables = React.useMemo(() => {
        const env = environments.find(item => item.id === selectedEnvironmentId);
        return env?.variables || {};
    }, [environments, selectedEnvironmentId]);

    const renderVariableAwareInput = (
        value: string,
        onChange: (next: string) => void,
        placeholder: string,
        style?: React.CSSProperties,
        multiline: boolean = false
    ) => <VariableEditableInput value={value} onChange={onChange} placeholder={placeholder} style={style} environmentVariables={currentEnvironmentVariables} multiline={multiline} />;

    const hydrateRequestEditor = (request: any, preferredCaseId?: string) => {
        const name = request.name || '';
        const scriptPre = request.pre_script_id || '';
        const scriptPost = request.post_script_id || '';
        setCurrentRequest(request as CurlRequest);
        const reqCases = request.cases as models.HttpRequestCase[] | undefined;
        const attachScripts = (cfg: ApiConfig): ApiConfig => ({
            ...cfg,
            preScriptId: scriptPre,
            postScriptId: scriptPost,
        });
        if (reqCases && reqCases.length > 0) {
            const rows: RequestCaseState[] = reqCases.map((c) => ({
                id: c.id,
                name: (c.name || '').trim() || '未命名',
                config: attachScripts({
                    ...apiConfigFromHttpSpec(c.spec, name),
                }),
            }));
            const cr = request as CurlRequest;
            const ifaceSpec = cr.interface_spec;
            const ifaceCfg: ApiConfig = ifaceSpec
                ? attachScripts({ ...apiConfigFromHttpSpec(ifaceSpec, name) })
                : attachScripts(apiConfigFromRequest(cr, name));
            setInterfaceApiConfig(ifaceCfg);
            setRequestCases(rows);
            const want = typeof preferredCaseId === 'string' ? preferredCaseId.trim() : '';
            const openAsCase = want !== '' && rows.some((r) => r.id === want);
            if (openAsCase) {
                setActiveCaseId(want);
                const activeRow = rows.find((r) => r.id === want)!;
                setApiConfig({ ...cloneApiConfig(activeRow.config), name });
                setRequestEditorSurface('case');
            } else {
                const resolvedActive = (request.active_case_id as string) || rows[0].id;
                setActiveCaseId(resolvedActive);
                setApiConfig({ ...cloneApiConfig(ifaceCfg), name });
                setRequestEditorSurface('interface');
            }
        } else {
            const cfg = attachScripts(apiConfigFromRequest(request as CurlRequest, name));
            setInterfaceApiConfig(createDefaultApiConfig());
            setRequestCases([]);
            setActiveCaseId('');
            setApiConfig(cfg);
            setRequestEditorSurface('plain');
        }
        setResponse(null);
    };

    const commitActiveCaseIntoList = (): RequestCaseState[] => {
        if (!currentRequest) return requestCases;
        return requestCases.map((c) =>
            c.id === activeCaseId ? { ...c, config: cloneApiConfig({ ...apiConfig, name: currentRequest.name }) } : c
        );
    };

    const refreshProjectTree = async () => {
        const cp = projectTabs.find((t) => t.id === activeTab)?.project;
        if (!cp) return;
        const tree = await GetProjectTree(cp.id);
        setProjectTrees((prev) => ({ ...prev, [cp.id]: tree }));
    };

    const toggleRequestCasesExpanded = (requestPath: string) => {
        setExpandedRequestPaths((prev) => {
            const next = new Set(prev);
            if (next.has(requestPath)) next.delete(requestPath);
            else next.add(requestPath);
            return next;
        });
    };

    const handleCaseTreeClick = async (caseNode: ProjectTree) => {
        const p = parseRequestCaseRef(caseNode.path || '');
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            const request = await GetRequest(reqPath);
            hydrateRequestEditor(request, p.caseId);
            setSidebarHighlightedCasePath(caseNode.path || '');
            const existingTab = requestTabs.find((t) => t.path === reqPath);
            if (existingTab) {
                setActiveRequestTab(existingTab.id);
            } else {
                const newTab: RequestTab = {
                    id: `request-${Date.now()}`,
                    title: request.name || caseNode.name,
                    path: reqPath,
                };
                setRequestTabs([...requestTabs, newTab]);
                setActiveRequestTab(newTab.id);
            }
        } catch (error: any) {
            console.error('Failed to load case:', error);
            message.error('加载用例失败');
        }
    };

    const openAddCaseModal = (requestPath: string) => {
        setAddCaseTargetPath(requestPath);
        setAddCaseNameInput('');
        setAddCaseModalOpen(true);
    };

    const confirmAddCaseModal = async () => {
        const name = addCaseNameInput.trim();
        if (!name) {
            message.warning('请输入用例名称');
            return Promise.reject();
        }
        const targetPath = addCaseTargetPath;
        try {
            await AddRequestCase(targetPath, name);
            message.success('已新增用例');
            setAddCaseModalOpen(false);
            setAddCaseTargetPath('');
            setAddCaseNameInput('');
            setExpandedRequestPaths((prev) => new Set(prev).add(targetPath));
            await refreshProjectTree();
            if (currentRequest?.path === targetPath) {
                const r = await GetRequest(targetPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`新增用例失败: ${error?.message || error}`);
            return Promise.reject();
        }
    };

    const handleDuplicateCaseFromTree = async (casePath: string) => {
        const p = parseRequestCaseRef(casePath);
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        try {
            await DuplicateRequestCase(reqPath, p.caseId);
            message.success('已复制用例');
            setExpandedRequestPaths((prev) => new Set(prev).add(reqPath));
            await refreshProjectTree();
            if (currentRequest?.path === reqPath) {
                const r = await GetRequest(reqPath);
                const aid = (r as CurlRequest).active_case_id;
                hydrateRequestEditor(r, typeof aid === 'string' ? aid : undefined);
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
        }
    };

    const handleDeleteCaseFromTree = (casePath: string) => {
        const p = parseRequestCaseRef(casePath);
        if (!p) return;
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        Modal.confirm({
            title: '删除用例',
            content: '确定删除该用例吗？',
            onOk: async () => {
                try {
                    await DeleteRequestCase(reqPath, p.caseId);
                    message.success('用例已删除');
                    await refreshProjectTree();
                    if (currentRequest?.path === reqPath) {
                        const r = await GetRequest(reqPath);
                        hydrateRequestEditor(r);
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            },
        });
    };

    const openCaseRenameFromTree = (casePath: string, currentName: string) => {
        setCaseRenameCasePath(casePath);
        setCaseRenameInput(currentName);
        setCaseRenameModalOpen(true);
    };

    const confirmCaseRenameFromTree = async () => {
        const p = parseRequestCaseRef(caseRenameCasePath);
        if (!p) {
            setCaseRenameModalOpen(false);
            return;
        }
        const reqPath = requestRefFromIds(p.projectId, p.requestId);
        const name = caseRenameInput.trim() || '未命名';
        try {
            await RenameRequestCase(reqPath, p.caseId, name);
            message.success('用例已重命名');
            setCaseRenameModalOpen(false);
            await refreshProjectTree();
            if (currentRequest?.path === reqPath) {
                setRequestCases((prev) => prev.map((c) => (c.id === p.caseId ? { ...c, name } : c)));
            }
        } catch (error: any) {
            message.error(`重命名失败: ${error?.message || error}`);
        }
    };

    const handleCloseRequestTab = (tabId: string) => {
        setRequestTabs(requestTabs.filter(t => t.id !== tabId));
        if (activeRequestTab === tabId) {
            const remaining = requestTabs.filter(t => t.id !== tabId);
            if (remaining.length > 0) {
                setActiveRequestTab(remaining[0].id);
                const lastRequest = remaining[remaining.length - 1];
                loadRequestContent(lastRequest.path);
            } else {
                setActiveRequestTab('');
                setCurrentRequest(null);
                setResponse(null);
                setRequestCases([]);
                setActiveCaseId('');
                setInterfaceApiConfig(createDefaultApiConfig());
                setRequestEditorSurface('plain');
                setSidebarHighlightedCasePath('');
                setApiConfig(createDefaultApiConfig());
            }
        }
    };

    const loadRequestContent = async (path: string) => {
        setLoading(true);
        try {
            setSidebarHighlightedCasePath('');
            const request = await GetRequest(path);
            hydrateRequestEditor(request);
        } catch (error: any) {
            console.error('Failed to load request:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteCurl = async () => {
        const selectedEnvironment = environments.find(env => env.id === selectedEnvironmentId);
        const variables = selectedEnvironment?.variables || {};
        const resolvedConfig: ApiConfig = {
            ...apiConfig,
            url: applyEnvironmentVariables(apiConfig.url, variables),
            headers: apiConfig.headers.map(header => ({
                ...header,
                key: applyEnvironmentVariables(header.key, variables),
                value: applyEnvironmentVariables(header.value, variables),
            })),
            params: apiConfig.params.map(param => ({
                ...param,
                key: applyEnvironmentVariables(param.key, variables),
                value: applyEnvironmentVariables(param.value, variables),
            })),
            body: applyEnvironmentVariables(apiConfig.body, variables),
            formData: apiConfig.formData.map(item => ({
                ...item,
                key: applyEnvironmentVariables(item.key, variables),
                value: applyEnvironmentVariables(item.value, variables),
            })),
            urlencoded: apiConfig.urlencoded.map(item => ({
                ...item,
                key: applyEnvironmentVariables(item.key, variables),
                value: applyEnvironmentVariables(item.value, variables),
            })),
        };

        if (!apiConfig.url?.trim()) {
            message.warning('请输入 URL');
            return;
        }

        const projectId = projectTabs.find(t => t.id === activeTab)?.project?.id;

        setExecuting(true);
        setResponse(null);
        try {
            let result;
            if (projectId && (apiConfig.preScriptId || apiConfig.postScriptId)) {
                result = await ExecuteHTTPRequestWithScripts(
                    projectId,
                    selectedEnvironmentId,
                    toWailsHttpSpec(resolvedConfig),
                    apiConfig.preScriptId || '',
                    apiConfig.postScriptId || ''
                );
            } else {
                result = await ExecuteHTTPRequest(toWailsHttpSpec(resolvedConfig));
            }
            setResponse(result);
            setStatus(`请求完成 - ${result.status_code}`);
        } catch (error: any) {
            console.error('Failed to execute request:', error);
            message.error(`执行失败: ${error?.message || error}`);
        } finally {
            setExecuting(false);
        }
    };

    const handleCreateEnvironmentClick = () => {
        openCreateEnvironmentTab();
    };

    const handleSaveEnvironment = async () => {
        const projectId = projectTabs.find(t => t.id === activeTab)?.project?.id;
        if (!projectId) {
            message.warning('请先打开项目');
            return;
        }
        const name = environmentFormName.trim();
        if (!name) {
            message.warning('请输入环境名称');
            return;
        }

        const variables = rowsToEnvironmentVariables(environmentFormVariables);
        setEnvSaving(true);
        try {
            if (editingEnvironmentId) {
                await UpdateEnvironment(projectId, editingEnvironmentId, name, variables);
                message.success('环境已更新');
            } else {
                const created = await CreateEnvironment(projectId, name, variables);
                message.success('环境已创建');
                setSelectedEnvironmentId(created.id);
                setEnvironmentTabs(prev => prev.map(tab => tab.key === activeEnvironmentTab
                    ? { key: `env-${created.id}`, title: created.name, environmentId: created.id }
                    : tab));
                setActiveEnvironmentTab(`env-${created.id}`);
                setEditingEnvironmentId(created.id);
            }
            await loadEnvironmentsData(projectId);
        } catch (error: any) {
            message.error(`保存环境失败: ${error?.message || error}`);
        } finally {
            setEnvSaving(false);
        }
    };

    const handleDeleteEnvironmentCurrent = async () => {
        const projectId = projectTabs.find(t => t.id === activeTab)?.project?.id;
        if (!projectId || !editingEnvironmentId) return;
        Modal.confirm({
            title: '删除环境',
            content: '确定删除当前环境吗？删除后无法恢复。',
            onOk: async () => {
                try {
                    await DeleteEnvironment(projectId, editingEnvironmentId);
                    message.success('环境已删除');
                    await loadEnvironmentsData(projectId);
                    setEnvironmentTabs(prev => prev.filter(tab => tab.environmentId !== editingEnvironmentId));
                    resetEnvironmentEditor();
                } catch (error: any) {
                    message.error(`删除环境失败: ${error?.message || error}`);
                }
            }
        });
    };

    const handleSaveRequest = async () => {
        if (!currentRequest?.path) return;

        try {
            if (requestCases.length === 0) {
                await UpdateRequest(
                    currentRequest.path,
                    toWailsHttpSpec({ ...apiConfig, name: currentRequest.name }),
                    null as any,
                    ''
                );
            } else {
                const committed =
                    requestEditorSurface === 'case' ? commitActiveCaseIntoList() : requestCases;
                setRequestCases(committed);
                const ifaceSource =
                    requestEditorSurface === 'interface' ? apiConfig : interfaceApiConfig;
                const wailsCases = committed.map((c) =>
                    models.HttpRequestCase.createFrom({
                        id: c.id,
                        name: (c.name || '').trim() || '未命名',
                        spec: models.HttpRequestSpec.createFrom(
                            apiConfigToSpec({ ...c.config, name: currentRequest.name })
                        ),
                    })
                );
                await UpdateRequest(
                    currentRequest.path,
                    toWailsHttpSpec({ ...ifaceSource, name: currentRequest.name }),
                    wailsCases,
                    activeCaseId
                );
                if (requestEditorSurface === 'interface') {
                    setInterfaceApiConfig(cloneApiConfig({ ...apiConfig, name: currentRequest.name }));
                }
            }
            await UpdateRequestScripts(currentRequest.path, apiConfig.preScriptId || '', apiConfig.postScriptId || '');
            message.success('请求已保存');
            setStatus('请求已保存');

            // 刷新项目树以更新接口列表中的方法显示
            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            }
        } catch (error: any) {
            message.error(`保存失败: ${error?.message || error}`);
        }
    };

    const handleDeleteRequest = async (path: string) => {
        Modal.confirm({
            title: '删除请求',
            content: '确定要删除这个请求吗？',
            onOk: async () => {
                try {
                    await DeleteRequest(path);
                    message.success('请求已删除');
                    handleCloseRequestTab(requestTabs.find(t => t.path === path)?.id || '');
                    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
                    if (currentProject) {
                        const tree = await GetProjectTree(currentProject.id);
                        setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };

    const handleCopyRequest = async (path: string) => {
        try {
            await CopyRequest(path);
            message.success('请求复制成功');
            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            }
        } catch (error: any) {
            message.error(`复制失败: ${error?.message || error}`);
        }
    };

    const openRenameModal = (type: 'request' | 'folder', path: string, currentName: string) => {
        const normalizedName = trimRightSpaces(currentName);
        const primaryName = getPrimaryName(normalizedName);
        setRenameType(type);
        setRenamePath(path);
        setRenameValue(normalizedName);
        renameSelectionEndRef.current = primaryName.length;
        setRenameModal(true);
    };

    const handleRename = async () => {
        const newName = renameValue.trim();
        if (!newName) {
            message.warning('请输入名称');
            return;
        }

        try {
            if (renameType === 'request') {
                const renamed = await RenameRequest(renamePath, newName);

                setRequestTabs(prev => prev.map(tab => tab.path === renamePath
                    ? { ...tab, path: renamed.path, title: renamed.name }
                    : tab));

                if (currentRequest?.path === renamePath) {
                    setCurrentRequest({ ...currentRequest, path: renamed.path, name: renamed.name });
                    setApiConfig({ ...apiConfig, name: renamed.name });
                    setInterfaceApiConfig((prev) => ({ ...prev, name: renamed.name }));
                    setRequestCases((prev) =>
                        prev.map((c) => ({ ...c, config: { ...c.config, name: renamed.name } }))
                    );
                }
            } else {
                await RenameFolder(renamePath, newName);
            }

            message.success('重命名成功');
            setRenameModal(false);

            const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
            if (currentProject) {
                const tree = await GetProjectTree(currentProject.id);
                setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
            }
        } catch (error: any) {
            const msg = String(error?.message || error || '');
            if (msg.includes('同名') || msg.includes('已存在')) {
                message.warning(renameType === 'request' ? '重命名失败：同级目录下已存在同名接口' : '重命名失败：同级目录下已存在同名文件夹');
            } else {
                message.error(`重命名失败: ${msg}`);
            }
        }
    };

    useEffect(() => {
        if (!renameModal) return;
        setTimeout(() => {
            const input = renameInputRef.current?.input;
            if (!input) return;
            input.focus();
            const end = Math.max(0, Math.min(renameSelectionEndRef.current, input.value.length));
            input.setSelectionRange(0, end);
        }, 0);
    }, [renameModal]);

    const handleDeleteFolder = async (path: string) => {
        Modal.confirm({
            title: '删除文件夹',
            content: '确定要删除这个文件夹吗？',
            onOk: async () => {
                try {
                    await DeleteFolder(path);
                    message.success('文件夹已删除');
                    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
                    if (currentProject) {
                        const tree = await GetProjectTree(currentProject.id);
                        setProjectTrees(prev => ({ ...prev, [currentProject.id]: tree }));
                    }
                } catch (error: any) {
                    message.error(`删除失败: ${error?.message || error}`);
                }
            }
        });
    };

    const convertTreeToDataNode = (tree: ProjectTree): DataNode => {
        return {
            key: tree.path || tree.id,
            title: (
                <div className="tree-item">
                    <span
                        className="tree-item-content"
                        onClick={() => handleTreeItemClick(tree)}
                        style={{ cursor: tree.type === 'request' ? 'pointer' : 'default' }}
                    >
                        {tree.type === 'project' && <ProjectOutlined style={{ marginRight: 8, color: '#1890ff' }} />}
                        {tree.type === 'folder' && <FolderOutlined style={{ marginRight: 8, color: '#faad14' }} />}
                        {tree.type === 'request' && <FileOutlined style={{ marginRight: 8, color: '#52c41a' }} />}
                        <span>{tree.name}</span>
                    </span>
                    {(tree.type === 'folder' || tree.type === 'request') && (
                        <Dropdown
                            menu={{
                                items: tree.type === 'folder'
                                    ? [{ key: 'delete', icon: <CloseOutlined />, label: '删除', danger: true, onClick: () => handleDeleteFolder(tree.path!) }]
                                    : [{ key: 'delete', icon: <CloseOutlined />, label: '删除', danger: true, onClick: () => handleDeleteRequest(tree.path!) }]
                            }}
                            trigger={['click']}
                        >
                            <CloseOutlined style={{ fontSize: 10, opacity: 0.5, marginLeft: 'auto' }} />
                        </Dropdown>
                    )}
                </div>
            ),
            isLeaf: tree.type === 'request',
            children: tree.children?.map(child => convertTreeToDataNode(child)),
        };
    };

    const getStatusColor = (code: number) => {
        if (code >= 200 && code < 300) return '#52c41a';
        if (code >= 300 && code < 400) return '#faad14';
        if (code >= 400 && code < 500) return '#fa8c16';
        if (code >= 500) return '#ff4d4f';
        return '#999';
    };

    const currentProject = projectTabs.find(t => t.id === activeTab)?.project;
    const currentTree = currentProject ? projectTrees[currentProject.id] : null;
    const normalizedProjectKeyword = projectSearchKeyword.trim().toLowerCase();
    const filteredProjects = projects.filter(project => {
        if (!normalizedProjectKeyword) return true;
        return (project.name || '').toLowerCase().includes(normalizedProjectKeyword);
    });
    const groupedProjects = React.useMemo(() => {
        const bucket: Record<string, Project[]> = {};
        const orderedGroups = [...projectGroups, DEFAULT_PROJECT_GROUP];

        filteredProjects.forEach(project => {
            const assigned = projectGroupAssignments[project.id];
            const groupName = assigned && projectGroups.includes(assigned) ? assigned : DEFAULT_PROJECT_GROUP;
            if (!bucket[groupName]) bucket[groupName] = [];
            bucket[groupName].push(project);
        });

        return orderedGroups
            .map(groupName => ({
                groupName,
                projects: bucket[groupName] || [],
            }));
    }, [filteredProjects, projectGroupAssignments, projectGroups]);

    const filteredTree = React.useMemo(() => {
        if (!currentTree) return null;
        return filterTreeNodes(currentTree, searchKeyword, filterMethod);
    }, [currentTree, searchKeyword, filterMethod, searchVersion]);

    const tabItems = [
        {
            key: 'home',
            label: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <HomeOutlined style={{ marginRight: 0 }} />
                    <span>主页</span>
                </span>
            ),
            closable: false,
        },
        ...projectTabs.map(tab => ({
            key: tab.id,
            label: tab.title,
        }))
    ];

    return (
        <div className="app-container">
            <TitleBar
                activeTab={activeTab}
                onListAnimationChange={setListAnimationEnabled}
                onTabChange={(key) => {
                    switchProjectTab(key);
                }}
                onTabEdit={(targetKey, action) => {
                    if (action === 'remove' && targetKey !== 'home') {
                        handleCloseProjectTab(targetKey as string);
                    }
                }}
                tabItems={tabItems}
            />

            <div className="app-content">
                {activeTab === 'home' ? (
                    <div className="home-page">
                        <div className="home-header">
                            <h2>我的项目</h2>
                            <Space>
                                <Input
                                    allowClear
                                    value={projectSearchKeyword}
                                    onChange={(e) => setProjectSearchKeyword(e.target.value)}
                                    prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                                    placeholder="搜索项目..."
                                    style={{ width: 260 }}
                                />
                                <Upload {...uploadProps}>
                                    <Button icon={<ImportOutlined />} loading={importing}>
                                        导入 Postman
                                    </Button>
                                </Upload>
                                <Button icon={<FolderOutlined />} onClick={() => setCreateGroupModal(true)}>
                                    新建分组
                                </Button>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateProjectModal(true)}>
                                    新建项目
                                </Button>
                            </Space>
                        </div>

                        {loading && <Spin style={{ display: 'block', margin: '40px auto' }} />}

                        {!loading && projects.length === 0 && (
                            <div className="empty-state">
                                <ApiOutlined className="empty-state-icon" />
                                <div>暂无项目，点击"新建项目"创建一个</div>
                            </div>
                        )}

                        {!loading && projects.length > 0 && filteredProjects.length === 0 && (
                            <div className="empty-state">
                                <ApiOutlined className="empty-state-icon" />
                                <div>没有匹配的项目</div>
                            </div>
                        )}

                        {!loading && groupedProjects.length > 0 && (
                            <div className="project-group-list">
                                {groupedProjects.map(group => (
                                    <div
                                        className={`project-group-section${projectDropTargetGroup === group.groupName ? ' drag-over' : ''}`}
                                        key={group.groupName}
                                        onDragOver={(e) => {
                                            if (!draggingProjectId) return;
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setProjectDropTargetGroup(group.groupName);
                                        }}
                                        onDragLeave={() => {
                                            if (projectDropTargetGroup === group.groupName) {
                                                setProjectDropTargetGroup(null);
                                            }
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            if (!draggingProjectId) return;
                                            handleAssignProjectGroup(draggingProjectId, group.groupName);
                                            setDraggingProjectId(null);
                                            setProjectDropTargetGroup(null);
                                            message.success(`已移动到分组：${group.groupName}`);
                                        }}
                                    >
                                        <div
                                            className={`project-group-header${groupSortDropTarget === group.groupName ? ' sort-drop-target' : ''}`}
                                            draggable={group.groupName !== DEFAULT_PROJECT_GROUP}
                                            onDragStart={(e) => handleGroupDragStart(group.groupName, e)}
                                            onDragOver={(e) => handleGroupDragOver(group.groupName, e)}
                                            onDrop={(e) => handleGroupDrop(group.groupName, e)}
                                            onDragEnd={() => {
                                                setDraggingGroupName(null);
                                                setGroupSortDropTarget(null);
                                            }}
                                            onClick={() => toggleProjectGroupCollapse(group.groupName)}
                                        >
                                            <div className="project-group-header-left">
                                                <span className="project-group-toggle-icon">
                                                    {collapsedProjectGroups.has(group.groupName) ? <RightOutlined /> : <DownOutlined />}
                                                </span>
                                                <span className="project-group-title">{group.groupName}</span>
                                                <span className="project-group-count">{group.projects.length} 个</span>
                                            </div>
                                            {group.groupName !== DEFAULT_PROJECT_GROUP && (
                                                <Dropdown
                                                    trigger={['click']}
                                                    menu={{
                                                        items: [
                                                            {
                                                                key: 'rename',
                                                                icon: <EditOutlined />,
                                                                label: '重命名',
                                                                onClick: () => openRenameProjectGroupModal(group.groupName),
                                                            },
                                                            {
                                                                key: 'delete',
                                                                icon: <CloseOutlined />,
                                                                danger: true,
                                                                label: '删除分组',
                                                                onClick: () => handleDeleteProjectGroup(group.groupName),
                                                            },
                                                        ]
                                                    }}
                                                >
                                                    <button
                                                        className="project-group-action-btn"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreOutlined />
                                                    </button>
                                                </Dropdown>
                                            )}
                                        </div>
                                        {!collapsedProjectGroups.has(group.groupName) && group.projects.length > 0 && (
                                            <Row gutter={[16, 16]} style={{ padding: '12px 20px 20px' }}>
                                                {group.projects.map(project => (
                                                    <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                                                        <Card
                                                            hoverable
                                                            draggable
                                                            className="project-card"
                                                            onDragStart={(e) => {
                                                                e.stopPropagation();
                                                                setDraggingProjectId(project.id);
                                                                e.dataTransfer.effectAllowed = 'move';
                                                            }}
                                                            onDragEnd={() => {
                                                                setDraggingProjectId(null);
                                                                setProjectDropTargetGroup(null);
                                                            }}
                                                            onClick={() => handleOpenProject(project)}
                                                        >
                                                            <Dropdown
                                                                trigger={['click']}
                                                                menu={{
                                                                    items: [
                                                                        {
                                                                            key: 'rename',
                                                                            icon: <EditOutlined />,
                                                                            label: '重命名',
                                                                            onClick: ({ domEvent }) => {
                                                                                domEvent.stopPropagation();
                                                                                openRenameProjectModal(project);
                                                                            }
                                                                        },
                                                                        {
                                                                            key: 'delete',
                                                                            icon: <CloseOutlined />,
                                                                            label: '删除',
                                                                            danger: true,
                                                                            onClick: ({ domEvent }) => {
                                                                                domEvent.stopPropagation();
                                                                                handleDeleteProject(project.id);
                                                                            }
                                                                        },
                                                                    ]
                                                                }}
                                                            >
                                                                <button className="project-card-menu-btn" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreOutlined />
                                                                </button>
                                                            </Dropdown>
                                                            <Card.Meta
                                                                avatar={<ProjectOutlined style={{ fontSize: 32, color: '#1890ff' }} />}
                                                                title={project.name}
                                                                description="点击打开项目"
                                                            />
                                                            <div className="project-group-select-row" onClick={(e) => e.stopPropagation()}>
                                                                <span className="project-group-select-label">分组</span>
                                                                <Select
                                                                    size="small"
                                                                    value={projectGroupAssignments[project.id] || DEFAULT_PROJECT_GROUP}
                                                                    onChange={(value) => handleAssignProjectGroup(project.id, value)}
                                                                    options={[
                                                                        { label: DEFAULT_PROJECT_GROUP, value: DEFAULT_PROJECT_GROUP },
                                                                        ...projectGroups.map(groupName => ({ label: groupName, value: groupName })),
                                                                    ]}
                                                                    style={{ width: 140 }}
                                                                />
                                                            </div>
                                                        </Card>
                                                    </Col>
                                                ))}
                                            </Row>
                                        )}
                                        {!collapsedProjectGroups.has(group.groupName) && group.projects.length === 0 && (
                                            <div className="project-group-empty-drop-zone">
                                                暂无项目，可将项目卡片拖拽到此分组
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="project-workspace">
                        <div className="project-sidebar">
                            <div className="sidebar-header sidebar-menu-header">
                                <div className="sidebar-top-menu">
                                    <button
                                        className={`sidebar-menu-item ${sidebarMenu === 'apis' ? 'active' : ''}`}
                                        onClick={() => setSidebarMenu('apis')}
                                    >
                                        接口列表
                                    </button>
                                    <button
                                        className={`sidebar-menu-item ${sidebarMenu === 'environments' ? 'active' : ''}`}
                                        onClick={() => setSidebarMenu('environments')}
                                    >
                                        环境变量
                                    </button>
                                    <button
                                        className={`sidebar-menu-item ${sidebarMenu === 'scripts' ? 'active' : ''}`}
                                        onClick={() => setSidebarMenu('scripts')}
                                    >
                                        脚本
                                    </button>
                                </div>
                                {sidebarMenu === 'apis' ? (
                                    <Dropdown
                                        menu={{
                                            items: [
                                                { key: 'folder', icon: <FolderOutlined />, label: '新建文件夹', onClick: () => setCreateFolderModal(true) },
                                                { key: 'request', icon: <FileOutlined />, label: '新建请求', onClick: () => setCreateRequestModal(true) },
                                            ]
                                        }}
                                        trigger={['click']}
                                    >
                                        <Button size="small" icon={<PlusOutlined />} />
                                    </Dropdown>
                                ) : sidebarMenu === 'environments' ? (
                                    <Button size="small" icon={<PlusOutlined />} onClick={handleCreateEnvironmentClick} />
                                ) : (
                                    <Button size="small" icon={<PlusOutlined />} loading={scriptSaving} onClick={handleCreateScript} />
                                )}
                            </div>

                            {sidebarMenu === 'apis' ? (
                                <>
                                    <div className="sidebar-search">
                                        <Input
                                            prefix={<SearchOutlined style={{ color: '#8b8b9a' }} />}
                                            placeholder="搜索接口..."
                                            value={searchKeyword}
                                            onChange={(e) => {
                                                setSearchKeyword(e.target.value);
                                                setSearchVersion(v => v + 1);
                                            }}
                                            allowClear
                                            size="small"
                                        />
                                    </div>

                                    <div className="sidebar-filters">
                                        <Select
                                            value={filterMethod}
                                            onChange={(value) => setFilterMethod(value)}
                                            size="small"
                                            style={{ width: '100%' }}
                                            options={[
                                                { value: 'ALL', label: '全部方法' },
                                                { value: 'GET', label: 'GET' },
                                                { value: 'POST', label: 'POST' },
                                                { value: 'PUT', label: 'PUT' },
                                                { value: 'DELETE', label: 'DELETE' },
                                                { value: 'PATCH', label: 'PATCH' },
                                            ]}
                                        />
                                    </div>

                                    <div
                                        className={`sidebar-content${(listAnimationEnabled || forceListAnimation) ? ' list-animations-enabled' : ''}${dropTargetFolderPath === currentProject?.path ? ' root-drop-target' : ''}`}
                                        onDragOver={(e) => {
                                            if (!draggingNode || !currentProject?.path) return;
                                            const check = checkDropAppendIntoFolder(draggingNode, currentProject.path);
                                            if (!check.ok) {
                                                e.dataTransfer.dropEffect = 'none';
                                                setDropTargetFolderPath(null);
                                                setInvalidDropHint({
                                                    message: getDropHintMessage(check.reason),
                                                    x: e.clientX + 14,
                                                    y: e.clientY + 14,
                                                });
                                                return;
                                            }
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                            setDropTargetFolderPath(currentProject.path);
                                            setInvalidDropHint(null);
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            if (!draggingNode || !currentProject?.path) return;
                                            const check = checkDropAppendIntoFolder(draggingNode, currentProject.path);
                                            if (!check.ok) {
                                                clearDragState();
                                                return;
                                            }
                                            if (draggingNode.type === 'request') {
                                                await moveRequestNode(draggingNode.path, currentProject.path, '');
                                            } else {
                                                await moveFolderNode(draggingNode.path, currentProject.path, '');
                                            }
                                            clearDragState();
                                        }}
                                    >
                                        {loading && <Spin style={{ display: 'block', margin: '20px auto' }} />}
                                        {!loading && !currentTree && (
                                            <div className="empty-sidebar">
                                                <ApiOutlined style={{ fontSize: 32, color: '#d0d0db', marginBottom: 12 }} />
                                                <div>暂无接口</div>
                                            </div>
                                        )}
                                        {!loading && currentTree && renderApiList()}
                                    </div>
                                </>
                            ) : sidebarMenu === 'environments' ? (
                                <div className="sidebar-content environment-sidebar-content">
                                    <Spin spinning={envLoading}>
                                        <div className="environment-list">
                                            {environments.map(env => (
                                                <button
                                                    key={env.id}
                                                    className={`environment-list-item ${editingEnvironmentId === env.id ? 'active' : ''}`}
                                                    onClick={() => openEnvironmentEditor(env)}
                                                >
                                                    <span className="environment-list-item-name">{env.name}</span>
                                                </button>
                                            ))}
                                            {environments.length === 0 && (
                                                <div className="empty-sidebar">暂无环境，点击右上角“新建”创建</div>
                                            )}
                                        </div>
                                    </Spin>
                                </div>
                            ) : (
                                <div className="sidebar-content environment-sidebar-content">
                                    <Spin spinning={scriptsLoading}>
                                        <div className="environment-list">
                                            {projectScripts.map(script => (
                                                <button
                                                    key={script.id}
                                                    className={`environment-list-item ${editingScriptId === script.id ? 'active' : ''}`}
                                                    onClick={() => handleSelectScriptEditor(script)}
                                                >
                                                    <span className="environment-list-item-name">{script.name}</span>
                                                </button>
                                            ))}
                                            {projectScripts.length === 0 && (
                                                <div className="empty-sidebar">暂无脚本，点击右上角“新建”创建</div>
                                            )}
                                        </div>
                                    </Spin>
                                </div>
                            )}
                        </div>

                        <div className="project-main">
                            {sidebarMenu === 'apis' && requestTabs.length > 0 && (
                                <div className="request-tabs-row">
                                    <div className="request-tabs-scroll-wrap">
                                        <Tabs
                                            activeKey={activeRequestTab}
                                            onChange={(key) => {
                                                setActiveRequestTab(key);
                                                const tab = requestTabs.find(t => t.id === key);
                                                if (tab) loadRequestContent(tab.path);
                                            }}
                                            type="editable-card"
                                            hideAdd
                                            onEdit={(targetKey, action) => {
                                                if (action === 'remove') {
                                                    handleCloseRequestTab(targetKey as string);
                                                }
                                            }}
                                            items={requestTabs.map(tab => ({
                                                key: tab.id,
                                                label: tab.title,
                                            }))}
                                            size="small"
                                            style={{ marginBottom: 0 }}
                                        />
                                    </div>
                                    <div className="request-tabs-environment-select">
                                        <Select
                                            size="small"
                                            value={selectedEnvironmentId || '__none__'}
                                            onChange={(value) => setSelectedEnvironmentId(value === '__none__' ? '' : value)}
                                            options={[
                                                { label: '不使用环境', value: '__none__' },
                                                ...environments.map(env => ({ label: env.name, value: env.id }))
                                            ]}
                                            style={{ width: 133 }}
                                        />
                                    </div>
                                </div>
                            )}

                            {sidebarMenu === 'environments' ? (
                                <div className="request-panel">
                                    {environmentTabs.length > 0 ? (
                                        <>
                                            <Tabs
                                                activeKey={activeEnvironmentTab}
                                                onChange={(key) => setActiveEnvironmentTab(key)}
                                                type="editable-card"
                                                hideAdd
                                                onEdit={(targetKey, action) => {
                                                    if (action === 'remove') {
                                                        closeEnvironmentTab(targetKey as string);
                                                    }
                                                }}
                                                items={environmentTabs.map(tab => ({
                                                    key: tab.key,
                                                    label: tab.title,
                                                }))}
                                                size="small"
                                                style={{ marginBottom: 12 }}
                                            />
                                            <div className="environment-panel">
                                                <Input
                                                    placeholder="环境名称"
                                                    value={environmentFormName}
                                                    onChange={(e) => setEnvironmentFormName(e.target.value)}
                                                    style={{ marginBottom: 10 }}
                                                />
                                                <div className="environment-vars-header">
                                                    <span>变量</span>
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        icon={<PlusOutlined />}
                                                        onClick={() => setEnvironmentFormVariables(prev => [...prev, createEnvironmentVariableRow()])}
                                                    >
                                                        添加
                                                    </Button>
                                                </div>
                                                <div className="environment-vars-list">
                                                    {environmentFormVariables.map((item) => (
                                                        <div className="environment-var-row" key={item.id}>
                                                            <Input
                                                                placeholder="变量名"
                                                                value={item.key}
                                                                onChange={(e) => {
                                                                    setEnvironmentFormVariables(prev => prev.map((row) => row.id === item.id ? { ...row, key: e.target.value } : row));
                                                                }}
                                                            />
                                                            <Input
                                                                placeholder="变量值"
                                                                value={item.value}
                                                                onChange={(e) => {
                                                                    setEnvironmentFormVariables(prev => prev.map((row) => row.id === item.id ? { ...row, value: e.target.value } : row));
                                                                }}
                                                            />
                                                            <Button
                                                                type="text"
                                                                danger
                                                                onClick={() => {
                                                                    setEnvironmentFormVariables(prev => {
                                                                        const next = prev.filter((row) => row.id !== item.id);
                                                                        return next.length > 0 ? next : [createEnvironmentVariableRow()];
                                                                    });
                                                                }}
                                                            >
                                                                ×
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 12 }}>
                                                    <Button onClick={resetEnvironmentEditor}>清空</Button>
                                                    <Space>
                                                        {editingEnvironmentId && (
                                                            <Button danger onClick={handleDeleteEnvironmentCurrent}>删除</Button>
                                                        )}
                                                        <Button type="primary" loading={envSaving} onClick={handleSaveEnvironment}>保存</Button>
                                                    </Space>
                                                </Space>
                                            </div>
                                        </>
                                    ) : (
                                        <Empty description="请先在左侧选择环境，或点击新建" />
                                    )}
                                </div>
                            ) : sidebarMenu === 'scripts' ? (
                                <div className="request-panel">
                                    {editingScriptId ? (
                                        <div className="environment-panel script-panel">
                                            <div className="script-editor-header">
                                                <Input
                                                    placeholder="脚本名称"
                                                    value={scriptFormName}
                                                    onChange={(e) => setScriptFormName(e.target.value)}
                                                    style={{ maxWidth: 360 }}
                                                />
                                                <Space>
                                                    <Tooltip title="脚本开发指南">
                                                        <Button
                                                            type="text"
                                                            icon={<QuestionCircleOutlined />}
                                                            onClick={() => setScriptHelpVisible(true)}
                                                        />
                                                    </Tooltip>
                                                    <Button danger onClick={handleDeleteScriptCurrent}>删除</Button>
                                                    <Button type="primary" loading={scriptSaving} onClick={handleSaveScript}>保存脚本</Button>
                                                </Space>
                                            </div>
                                            <div className="script-editor-wrapper">
                                                <CodeMirror
                                                    value={scriptFormContent}
                                                    height="100%"
                                                    theme="light"
                                                    extensions={[javascript()]}
                                                    onChange={(value) => setScriptFormContent(value)}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <Empty description="请先在左侧选择脚本，或点击新建" />
                                    )}
                                </div>
                            ) : currentRequest ? (
                                <div className="request-panel">
                                    {requestCases.length > 0 && (
                                        <div className="request-active-case-hint">
                                            {requestEditorSurface === 'interface'
                                                ? ''
                                                : `当前用例：${requestCases.find((c) => c.id === activeCaseId)?.name ?? '—'}`}
                                        </div>
                                    )}
                                    <div className="api-request-bar">
                                        <Select
                                            value={apiConfig.method}
                                            onChange={(value) => setApiConfig({ ...apiConfig, method: value })}
                                            style={{ width: 100 }}
                                            options={[
                                                { value: 'GET', label: 'GET' },
                                                { value: 'POST', label: 'POST' },
                                                { value: 'PUT', label: 'PUT' },
                                                { value: 'DELETE', label: 'DELETE' },
                                                { value: 'PATCH', label: 'PATCH' },
                                            ]}
                                        />
                                        {renderVariableAwareInput(
                                            apiConfig.url,
                                            (value) => setApiConfig({ ...apiConfig, url: value }),
                                            '输入请求 URL',
                                            { flex: 1 }
                                        )}
                                        <Button type="primary" onClick={handleExecuteCurl} loading={executing}>
                                            发送
                                        </Button>
                                        <Button onClick={handleSaveRequest}>
                                            保存
                                        </Button>
                                    </div>
                                    <div className="api-config-section">
                                        <Tabs
                                            defaultActiveKey="params"
                                            items={[
                                                {
                                                    key: 'params',
                                                    label: 'Params',
                                                    children: (
                                                        <div className="kv-editor">
                                                            {apiConfig.params.map((param, index) => (
                                                                <div key={index} className="kv-row kv-row-params">
                                                                    <Checkbox
                                                                        className="kv-param-enabled"
                                                                        checked={param.enabled !== false}
                                                                        onChange={(e) => {
                                                                            const newParams = [...apiConfig.params];
                                                                            newParams[index].enabled = e.target.checked;
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                        title="发送请求时包含该参数"
                                                                    />
                                                                    <Input
                                                                        placeholder="Key"
                                                                        value={param.key}
                                                                        onChange={(e) => {
                                                                            const newParams = [...apiConfig.params];
                                                                            newParams[index].key = e.target.value;
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                    />
                                                                    {renderVariableAwareInput(
                                                                        param.value,
                                                                        (value) => {
                                                                            const newParams = [...apiConfig.params];
                                                                            newParams[index].value = value;
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        },
                                                                        'Value',
                                                                        { flex: 1 }
                                                                    )}
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        onClick={() => {
                                                                            const newParams = apiConfig.params.filter((_, i) => i !== index);
                                                                            setApiConfig({ ...apiConfig, params: newParams });
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="link"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => {
                                                                    setApiConfig({
                                                                        ...apiConfig,
                                                                        params: [...apiConfig.params, { key: '', value: '', enabled: true }]
                                                                    });
                                                                }}
                                                            >
                                                                添加参数
                                                            </Button>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'headers',
                                                    label: 'Headers',
                                                    children: (
                                                        <div className="kv-editor">
                                                            {apiConfig.headers.map((header, index) => (
                                                                <div key={index} className="kv-row">
                                                                    <Input
                                                                        placeholder="Key"
                                                                        value={header.key}
                                                                        onChange={(e) => {
                                                                            const newHeaders = [...apiConfig.headers];
                                                                            newHeaders[index].key = e.target.value;
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        }}
                                                                    />
                                                                    {renderVariableAwareInput(
                                                                        header.value,
                                                                        (value) => {
                                                                            const newHeaders = [...apiConfig.headers];
                                                                            newHeaders[index].value = value;
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        },
                                                                        'Value',
                                                                        { flex: 1 }
                                                                    )}
                                                                    <Button
                                                                        type="text"
                                                                        danger
                                                                        onClick={() => {
                                                                            const newHeaders = apiConfig.headers.filter((_, i) => i !== index);
                                                                            setApiConfig({ ...apiConfig, headers: newHeaders });
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                            <Button
                                                                type="link"
                                                                icon={<PlusOutlined />}
                                                                onClick={() => {
                                                                    setApiConfig({
                                                                        ...apiConfig,
                                                                        headers: [...apiConfig.headers, { key: '', value: '', enabled: true }]
                                                                    });
                                                                }}
                                                            >
                                                                添加请求头
                                                            </Button>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'body',
                                                    label: 'Body',
                                                    children: (
                                                        <div className="body-editor">
                                                            <div className="body-type-selector">
                                                                <Radio.Group
                                                                    value={apiConfig.bodyType || 'none'}
                                                                    onChange={(e) => setApiConfig({ ...apiConfig, bodyType: e.target.value })}
                                                                    optionType="button"
                                                                    buttonStyle="solid"
                                                                >
                                                                    <Radio.Button value="none">none</Radio.Button>
                                                                    <Radio.Button value="form-data">form-data</Radio.Button>
                                                                    <Radio.Button value="x-www-form-urlencoded">x-www-form-urlencoded</Radio.Button>
                                                                    <Radio.Button value="json">JSON</Radio.Button>
                                                                    <Radio.Button value="xml">XML</Radio.Button>
                                                                    <Radio.Button value="raw">Raw</Radio.Button>
                                                                    <Radio.Button value="binary">Binary</Radio.Button>
                                                                </Radio.Group>
                                                            </div>
                                                            {apiConfig.bodyType === 'none' && (
                                                                <div className="body-empty">This request does not have a body</div>
                                                            )}
                                                            {(apiConfig.bodyType === 'form-data' || apiConfig.bodyType === 'x-www-form-urlencoded') && (
                                                                <div className="kv-editor">
                                                                    {(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded).map((item, index) => (
                                                                        <div key={index} className="kv-row kv-row-params">
                                                                            <Checkbox
                                                                                className="kv-param-enabled"
                                                                                checked={item.enabled !== false}
                                                                                onChange={(e) => {
                                                                                    const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                                                                    newData[index].enabled = e.target.checked;
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                }}
                                                                                title="发送请求时包含该字段"
                                                                            />
                                                                            {renderVariableAwareInput(
                                                                                item.key,
                                                                                (value) => {
                                                                                    const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                                                                    newData[index].key = value;
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                },
                                                                                'Key',
                                                                                { flex: 1 }
                                                                            )}
                                                                            {renderVariableAwareInput(
                                                                                item.value,
                                                                                (value) => {
                                                                                    const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded)];
                                                                                    newData[index].value = value;
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                },
                                                                                'Value',
                                                                                { flex: 1 }
                                                                            )}
                                                                            <Button
                                                                                type="text"
                                                                                danger
                                                                                onClick={() => {
                                                                                    const newData = (apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded).filter((_, i) => i !== index);
                                                                                    setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                        ? { ...apiConfig, formData: newData }
                                                                                        : { ...apiConfig, urlencoded: newData });
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                    <Button
                                                                        type="link"
                                                                        icon={<PlusOutlined />}
                                                                        onClick={() => {
                                                                            const newData = [...(apiConfig.bodyType === 'form-data' ? apiConfig.formData : apiConfig.urlencoded), { key: '', value: '', enabled: true }];
                                                                            setApiConfig(apiConfig.bodyType === 'form-data'
                                                                                ? { ...apiConfig, formData: newData }
                                                                                : { ...apiConfig, urlencoded: newData });
                                                                        }}
                                                                    >
                                                                        添加字段
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {(apiConfig.bodyType === 'json' || apiConfig.bodyType === 'xml' || apiConfig.bodyType === 'raw') && (
                                                                <>
                                                                    {renderVariableAwareInput(
                                                                        apiConfig.body,
                                                                        (value) => setApiConfig({ ...apiConfig, body: value }),
                                                                        apiConfig.bodyType === 'json'
                                                                            ? '{\n  "key": "value"\n}'
                                                                            : apiConfig.bodyType === 'xml'
                                                                                ? '<root>\n  <key>value</key>\n</root>'
                                                                                : 'Raw body content',
                                                                        {
                                                                            fontFamily: 'monospace',
                                                                            minHeight: 150,
                                                                            marginTop: 12
                                                                        },
                                                                        true
                                                                    )}
                                                                </>
                                                            )}
                                                            {apiConfig.bodyType === 'binary' && (
                                                                <div className="body-binary">
                                                                    <Input type="file" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'pre-script',
                                                    label: '前置脚本',
                                                    children: (
                                                        <div className="script-binding-panel">
                                                            <div className="script-binding-row">
                                                                <span>选择项目脚本</span>
                                                                <Select
                                                                    value={apiConfig.preScriptId || '__none__'}
                                                                    onChange={(value) => setApiConfig({ ...apiConfig, preScriptId: value === '__none__' ? '' : value })}
                                                                    style={{ width: 320 }}
                                                                    options={[
                                                                        { label: '不使用前置脚本', value: '__none__' },
                                                                        ...projectScripts.map(script => ({ label: script.name, value: script.id }))
                                                                    ]}
                                                                />
                                                            </div>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'post-script',
                                                    label: '后置脚本',
                                                    children: (
                                                        <div className="script-binding-panel">
                                                            <div className="script-binding-row">
                                                                <span>选择项目脚本</span>
                                                                <Select
                                                                    value={apiConfig.postScriptId || '__none__'}
                                                                    onChange={(value) => setApiConfig({ ...apiConfig, postScriptId: value === '__none__' ? '' : value })}
                                                                    style={{ width: 320 }}
                                                                    options={[
                                                                        { label: '不使用后置脚本', value: '__none__' },
                                                                        ...projectScripts.map(script => ({ label: script.name, value: script.id }))
                                                                    ]}
                                                                />
                                                            </div>
                                                        </div>
                                                    ),
                                                },
                                                {
                                                    key: 'curl',
                                                    label: 'Curl',
                                                    children: (
                                                        <div style={{ padding: '12px 0' }}>
                                                            {renderVariableAwareInput(
                                                                curlPreview,
                                                                (value) => setCurlPreview(value),
                                                                'curl 命令将显示在这里...',
                                                                {
                                                                    fontFamily: 'monospace',
                                                                    fontSize: 12,
                                                                    minHeight: 200,
                                                                    marginTop: 0
                                                                },
                                                                true
                                                            )}
                                                            <Button
                                                                type="primary"
                                                                onClick={() => {
                                                                    const parsed = parseCurlToApiConfig(curlPreview);
                                                                    setApiConfig({
                                                                        ...apiConfig,
                                                                        method: parsed.method || apiConfig.method,
                                                                        url: parsed.url || apiConfig.url,
                                                                        headers: parsed.headers || apiConfig.headers,
                                                                        params: parsed.params || apiConfig.params,
                                                                        body: parsed.body !== undefined ? parsed.body : apiConfig.body,
                                                                        bodyType: parsed.bodyType || apiConfig.bodyType,
                                                                        formData: parsed.formData || apiConfig.formData,
                                                                        urlencoded: parsed.urlencoded || apiConfig.urlencoded,
                                                                    });
                                                                    message.success('保存成功');
                                                                }}
                                                                style={{ marginTop: 12 }}
                                                            >
                                                                保存Curl
                                                            </Button>
                                                        </div>
                                                    ),
                                                },
                                            ]}
                                        />
                                    </div>

                                    {response && (
                                        <div className="response-panel">
                                            <div className="response-header">
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    background: getStatusColor(response.status_code) + '20',
                                                    color: getStatusColor(response.status_code),
                                                    border: `1px solid ${getStatusColor(response.status_code)}40`
                                                }}>
                                                    {response.status_code}
                                                </span>
                                                <span className="duration">{response.duration}ms</span>
                                            </div>
                                            <Tabs
                                                defaultActiveKey="body"
                                                items={[
                                                    {
                                                        key: 'body',
                                                        label: 'Body',
                                                        children: (
                                                            <div className="response-body">
                                                                <pre className="response-content">
                                                                    {response.body || response.error || 'No response body'}
                                                                </pre>
                                                            </div>
                                                        ),
                                                    },
                                                    ...(response.script_logs?.length || response.tests?.length ? [{
                                                        key: 'scripts',
                                                        label: '脚本结果',
                                                        children: (
                                                            <div className="script-results-panel">
                                                                {response.script_logs && response.script_logs.length > 0 && (
                                                                    <div className="script-logs-section">
                                                                        <div className="script-logs-title">Console Logs</div>
                                                                        <div className="script-logs-content">
                                                                            {response.script_logs.map((log: string, index: number) => (
                                                                                <div key={index} className="script-log-entry">
                                                                                    {log}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {response.tests && response.tests.length > 0 && (
                                                                    <div className="test-results-section">
                                                                        <div className="test-results-title">
                                                                            Test Results
                                                                            <span className="test-summary">
                                                                                ({response.tests.filter((t: any) => t.passed).length}/{response.tests.length} passed)
                                                                            </span>
                                                                        </div>
                                                                        <div className="test-results-list">
                                                                            {response.tests.map((test: any, index: number) => (
                                                                                <div key={index} className={`test-result-item ${test.passed ? 'passed' : 'failed'}`}>
                                                                                    <span className="test-status-icon">{test.passed ? '✓' : '✗'}</span>
                                                                                    <span className="test-name">{test.name}</span>
                                                                                    {!test.passed && test.message && (
                                                                                        <span className="test-message">{test.message}</span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ),
                                                    }] : []),
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <ApiOutlined className="empty-state-icon" />
                                    <div>选择一个请求开始测试</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {invalidDropHint && (
                <div
                    className="drop-hint-floating"
                    style={{
                        left: invalidDropHint.x,
                        top: invalidDropHint.y,
                    }}
                >
                    {invalidDropHint.message}
                </div>
            )}

            <Modal
                title="创建新项目"
                open={createProjectModal}
                onOk={handleCreateProject}
                onCancel={() => { setCreateProjectModal(false); setNewProjectName(''); }}
            >
                <Input
                    placeholder="输入项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onPressEnter={handleCreateProject}
                />
            </Modal>

            <Modal
                title="创建分组"
                open={createGroupModal}
                onOk={handleCreateProjectGroup}
                onCancel={() => { setCreateGroupModal(false); setNewGroupName(''); }}
            >
                <Input
                    placeholder="输入分组名称"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onPressEnter={handleCreateProjectGroup}
                />
            </Modal>

            <Modal
                title="重命名项目"
                open={renameProjectModal}
                onOk={handleRenameProject}
                onCancel={() => {
                    setRenameProjectModal(false);
                    setRenameProjectId('');
                    setRenameProjectValue('');
                }}
            >
                <Input
                    placeholder="输入新项目名称"
                    value={renameProjectValue}
                    onChange={(e) => setRenameProjectValue(e.target.value)}
                    onPressEnter={handleRenameProject}
                />
            </Modal>

            <Modal
                title="重命名分组"
                open={renameGroupModal}
                onOk={handleRenameProjectGroup}
                onCancel={() => {
                    setRenameGroupModal(false);
                    setEditingGroupName('');
                    setRenameGroupValue('');
                }}
            >
                <Input
                    placeholder="输入新分组名称"
                    value={renameGroupValue}
                    onChange={(e) => setRenameGroupValue(e.target.value)}
                    onPressEnter={handleRenameProjectGroup}
                />
            </Modal>

            <Modal
                title="创建文件夹"
                open={createFolderModal}
                onOk={handleCreateFolder}
                onCancel={() => { setCreateFolderModal(false); setNewFolderName(''); }}
            >
                <Input
                    placeholder="输入文件夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onPressEnter={handleCreateFolder}
                />
            </Modal>

            <Modal
                title="创建请求"
                open={createRequestModal}
                onOk={handleCreateRequest}
                onCancel={() => { setCreateRequestModal(false); setNewRequestName(''); }}
            >
                <Input
                    placeholder="输入请求名称"
                    value={newRequestName}
                    onChange={(e) => setNewRequestName(e.target.value)}
                    onPressEnter={handleCreateRequest}
                />
            </Modal>

            <Modal
                title={renameType === 'request' ? '重命名请求' : '重命名文件夹'}
                open={renameModal}
                onOk={handleRename}
                onCancel={() => { setRenameModal(false); setRenamePath(''); setRenameValue(''); }}
            >
                <Input
                    ref={renameInputRef}
                    placeholder="输入新名称"
                    value={renameValue}
                    onChange={(e) => setRenameValue(trimRightSpaces(e.target.value))}
                    onPressEnter={handleRename}
                />
            </Modal>

            <Modal
                title="新增用例"
                open={addCaseModalOpen}
                onOk={confirmAddCaseModal}
                onCancel={() => {
                    setAddCaseModalOpen(false);
                    setAddCaseTargetPath('');
                    setAddCaseNameInput('');
                }}
            >
                <Input
                    placeholder="输入用例名称"
                    value={addCaseNameInput}
                    onChange={(e) => setAddCaseNameInput(e.target.value)}
                    onPressEnter={confirmAddCaseModal}
                />
            </Modal>

            <Modal
                title="重命名用例"
                open={caseRenameModalOpen}
                onOk={confirmCaseRenameFromTree}
                onCancel={() => {
                    setCaseRenameModalOpen(false);
                    setCaseRenameCasePath('');
                    setCaseRenameInput('');
                }}
            >
                <Input
                    placeholder="用例名称"
                    value={caseRenameInput}
                    onChange={(e) => setCaseRenameInput(e.target.value)}
                    onPressEnter={confirmCaseRenameFromTree}
                />
            </Modal>

            <ScriptHelpWindow
                visible={scriptHelpVisible}
                onClose={() => setScriptHelpVisible(false)}
            />

        </div>
    );
}

export default App;
