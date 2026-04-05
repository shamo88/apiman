export const DEFAULT_PROJECT_GROUP = '未分组';

export const createDefaultApiConfig = (): ApiConfig => ({
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
});

export interface ApiConfig {
  name: string;
  method: string;
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  params: { key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary';
  formData: { key: string; value: string; enabled: boolean }[];
  urlencoded: { key: string; value: string; enabled: boolean }[];
  preScripts: string[];
  postScripts: string[];
}

export const createEmptyWorkspaceState = (): ProjectWorkspaceState => ({
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
  sidebarHighlightedCasePath: '',
  expandedRequestPaths: new Set()
});

export interface ProjectWorkspaceState {
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
  sidebarHighlightedCasePath: string;
  expandedRequestPaths: Set<string>;
}

export interface RequestCaseState {
  id: string;
  name: string;
  config: ApiConfig;
}

export interface RequestTab {
  id: string;
  title: string;
  path: string;
}

export type RequestEditorSurface = 'plain' | 'interface' | 'case';

export interface CurlRequest {
  path: string;
  name: string;
  content?: string;
  pre_scripts?: string[];
  post_scripts?: string[];
  method?: string;
  http_url?: string;
  headers?: { key: string; value: string; enabled?: boolean }[];
  params?: { key: string; value: string; enabled?: boolean }[];
  body?: string;
  body_type?: string;
  form_data?: { key: string; value: string; enabled?: boolean }[];
  url_encoded?: { key: string; value: string; enabled?: boolean }[];
  cases?: any[];
  active_case_id?: string;
  interface_spec?: any;
}
