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
    children?: ProjectTree[];
    path?: string;
}

export interface CurlRequest {
    id?: string;
    name: string;
    project_id?: string;
    folder_id?: string;
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
