export interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
    created_at: string;
    updated_at: string;
}

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
    pre_script_id?: string;
    post_script_id?: string;
    created_at?: string;
    updated_at?: string;
    method?: string;
    http_url?: string;
    headers?: { key: string; value: string; enabled?: boolean }[];
    params?: { key: string; value: string; enabled?: boolean }[];
    body?: string;
    body_type?: string;
    form_data?: { key: string; value: string }[];
    url_encoded?: { key: string; value: string }[];
}

export interface ProjectScript {
    id: string;
    project_id: string;
    name: string;
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
}

export interface TabItem {
    id: string;
    title: string;
    type: 'project' | 'request';
    path?: string;
    projectId?: string;
}
