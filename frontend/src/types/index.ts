export interface Project {
    id: string;
    name: string;
    path: string;
    created_at: string;
    updated_at: string;
}

export interface ProjectTree {
    id: string;
    name: string;
    type: 'project' | 'folder' | 'request';
    method?: string;
    url?: string;
    children?: ProjectTree[];
    path?: string;
}

export interface CurlRequest {
    id?: string;
    name: string;
    project_id?: string;
    folder_id?: string;
    path: string;
    content?: string;
    pre_scripts?: string[];
    post_scripts?: string[];
    created_at?: string;
    updated_at?: string;
    method?: string;
    http_url?: string;
    headers?: { key: string; value: string; enabled?: boolean }[];
    params?: { key: string; value: string; enabled?: boolean }[];
    body?: string;
    body_type?: string;
    form_data?: { key: string; value: string; enabled?: boolean }[];
    url_encoded?: { key: string; value: string; enabled?: boolean }[];
    cases?: HttpRequestCase[];
    active_case_id?: string;
    interface_spec?: HttpRequestSpec;
}

export interface HttpRequestSpec {
    method: string;
    http_url: string;
    headers: RequestKeyVal[];
    params: RequestKeyVal[];
    body: string;
    body_type: string;
    form_data: RequestPair[];
    url_encoded: RequestPair[];
}

export interface HttpRequestCase {
    id: string;
    name: string;
    spec: HttpRequestSpec;
}

export interface RequestKeyVal {
    key: string;
    value: string;
    enabled: boolean;
}

export interface RequestPair {
    key: string;
    value: string;
    enabled: boolean;
}

export interface ProjectScript {
    id: string;
    project_id: string;
    name: string;
    description: string;
    path: string;
    content: string;
    created_at?: string;
    updated_at?: string;
}

export interface CurlResponse {
    status_code: number;
    headers: Record<string, string>;
    body: string;
    duration: number;
    error?: string;
    script_logs?: string[];
    tests?: TestResult[];
}

export interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    duration: number;
}

export interface TabItem {
    id: string;
    title: string;
    type: 'project' | 'request';
    path?: string;
    projectId?: string;
}

export interface ProjectTab {
    id: string;
    title: string;
    project: Project;
}

export interface RequestTab {
    id: string;
    title: string;
    path: string;
}

export interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
    created_at: string;
    updated_at: string;
}

export interface EnvironmentVariableRow {
    id: string;
    key: string;
    value: string;
}

export interface EnvironmentEditorTab {
    key: string;
    title: string;
    environmentId?: string;
    isNew?: boolean;
}

/** Request case state for UI */
export interface RequestCaseState {
    id: string;
    name: string;
    config: import('../utils/apiConfig').ApiConfig;
}

/** plain：无子用例；interface：编辑集合根请求；case：编辑某一用例 */
export type RequestEditorSurface = 'plain' | 'interface' | 'case';

/** Project workspace state */
export interface ProjectWorkspaceState {
    requestTabs: RequestTab[];
    activeRequestTab: string;
    currentRequest: CurlRequest | null;
    response: any;
    selectedKeys: string[];
    apiConfig: import('../utils/apiConfig').ApiConfig;
    selectedEnvironmentId: string;
    requestCases: RequestCaseState[];
    activeCaseId: string;
    interfaceApiConfig: import('../utils/apiConfig').ApiConfig;
    requestEditorSurface: RequestEditorSurface;
    /** 侧栏用例高亮：仅用户点击用例行时设置；点击接口行或切换请求标签时清空 */
    sidebarHighlightedCasePath: string;
}

/** Project group store */
export interface ProjectGroupStore {
    groups: string[];
    assignments: Record<string, string>;
    collapsedGroups?: string[];
}

/** MCP Config */
export interface MCPConfig {
    enabled: boolean;
    port: number;
    project_id: string;
    environment_id: string;
    api_key: string;
}

/** History entry */
export interface HistoryEntry {
    id: string;
    project_id: string;
    project_name: string;
    request_path: string;
    name: string;
    method: string;
    url: string;
    status: number;
    duration: number;
    timestamp: string;
    source: string;
    request_body?: string;
    response_body?: string;
}

/** Parse request case reference path */
export const parseRequestCaseRef = (path: string): { projectId: string; requestId: string; caseId: string } | null => {
    if (!path.startsWith('requestCase|')) return null;
    const parts = path.slice('requestCase|'.length).split('|');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
    return { projectId: parts[0], requestId: parts[1], caseId: parts[2] };
};

/** Create request reference path from IDs */
export const requestRefFromIds = (projectId: string, requestId: string) => `request|${projectId}|${requestId}`;

/** Create empty workspace state */
export const createEmptyWorkspaceState = (): ProjectWorkspaceState => ({
    requestTabs: [],
    activeRequestTab: '',
    currentRequest: null,
    response: null,
    selectedKeys: [],
    apiConfig: {
        name: '',
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        body: '',
        bodyType: 'none',
        formData: [],
        urlencoded: [],
        preScripts: [],
        postScripts: [],
    },
    selectedEnvironmentId: '',
    requestCases: [],
    activeCaseId: '',
    interfaceApiConfig: {
        name: '',
        method: 'GET',
        url: '',
        headers: [],
        params: [],
        body: '',
        bodyType: 'none',
        formData: [],
        urlencoded: [],
        preScripts: [],
        postScripts: [],
    },
    requestEditorSurface: 'plain',
    sidebarHighlightedCasePath: ''
});

/** Create environment variable row */
export const createEnvironmentVariableRow = (key: string = '', value: string = ''): EnvironmentVariableRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value
});

export const DEFAULT_PROJECT_GROUP = '未分组';
