import { models } from '../../wailsjs/go/models';
import { ApiConfig, createDefaultApiConfig } from '../constants/defaults';
import type { CurlRequest } from '../constants/defaults';
import type { WorkspaceStore } from '../store/useWorkspaceStore';
import type { ScriptStore } from '../store/useScriptStore';

const ALLOWED_BODY_TYPES: ApiConfig['bodyType'][] = [
  'none',
  'form-data',
  'x-www-form-urlencoded',
  'json',
  'xml',
  'raw',
  'binary',
];

export const apiConfigFromRequest = (r: CurlRequest, fallbackName: string): ApiConfig => {
  const bt = (r.body_type || 'none') as ApiConfig['bodyType'];
  const bodyType = ALLOWED_BODY_TYPES.includes(bt) ? bt : 'none';

  return {
    name: r.name || fallbackName,
    method: (r.method || 'GET').toUpperCase(),
    url: r.http_url || '',
    headers: Array.isArray(r.headers)
      ? r.headers.map(h => ({ key: h.key || '', value: h.value || '', enabled: h.enabled !== false }))
      : [],
    params: Array.isArray(r.params)
      ? r.params.map(p => ({ key: p.key || '', value: p.value || '', enabled: p.enabled !== false }))
      : [],
    body: r.body || '',
    bodyType,
    formData: Array.isArray(r.form_data)
      ? r.form_data.map(f => ({ key: f.key || '', value: f.value || '', enabled: true }))
      : [],
    urlencoded: Array.isArray(r.url_encoded)
      ? r.url_encoded.map(u => ({ key: u.key || '', value: u.value || '', enabled: true }))
      : [],
    preScripts: r.pre_scripts || [],
    postScripts: r.post_scripts || [],
  };
};

export const apiConfigFromHttpSpec = (spec: models.HttpRequestSpec, requestName: string): ApiConfig => {
  const bt = (spec.body_type || 'none') as ApiConfig['bodyType'];
  const bodyType = ALLOWED_BODY_TYPES.includes(bt) ? bt : 'none';

  const mapKV = (arr: models.RequestKeyVal[] | undefined) =>
    Array.isArray(arr)
      ? arr.map(h => ({ key: h.key || '', value: h.value || '', enabled: h.enabled !== false }))
      : [];

  const mapPair = (arr: models.RequestPair[] | undefined) =>
    Array.isArray(arr)
      ? arr.map(p => ({ key: p.key || '', value: p.value || '', enabled: p.enabled !== false }))
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
    preScripts: [],
    postScripts: [],
  };
};

export interface CaseRow {
  id: string;
  name: string;
  config: ApiConfig;
}

export const hydrateRequestEditor = (
  request: CurlRequest | null,
  currentProjectId: string,
  workspaceStore: WorkspaceStore,
  _scriptStore: ScriptStore | null
) => {
  if (!request) return;

  const name = request.name || '';
  const preScripts = request.pre_scripts || [];
  const postScripts = request.post_scripts || [];

  workspaceStore.setCurrentRequest(currentProjectId, request);

  const reqCases = request.cases as models.HttpRequestCase[] | undefined;
  const attachScripts = (cfg: ApiConfig): ApiConfig => ({
    ...cfg,
    preScripts: [...preScripts],
    postScripts: [...postScripts],
  });

  if (reqCases && reqCases.length > 0) {
    const rows: CaseRow[] = reqCases.map(c => ({
      id: c.id,
      name: c.name,
      config: apiConfigFromHttpSpec(c.spec, c.name),
    }));

    const ifaceCfg = apiConfigFromHttpSpec(
      request.interface_spec || models.HttpRequestSpec.createFrom({}),
      name
    );

    const activeId = request.active_case_id;

    workspaceStore.setWorkspaceState(currentProjectId, {
      requestCases: rows,
      activeCaseId: typeof activeId === 'string' ? activeId : rows[0]?.id || '',
      interfaceApiConfig: ifaceCfg,
    });

    if (activeId && rows.some(r => r.id === activeId)) {
      const activeRow = rows.find(r => r.id === activeId)!;
      workspaceStore.setApiConfig(currentProjectId, { ...activeRow.config, name });
      workspaceStore.setRequestEditorSurface(currentProjectId, 'case');
    } else {
      workspaceStore.setApiConfig(currentProjectId, { ...ifaceCfg, name });
      workspaceStore.setRequestEditorSurface(currentProjectId, 'interface');
    }
  } else {
    const cfg = attachScripts(apiConfigFromRequest(request, name));
    workspaceStore.setWorkspaceState(currentProjectId, {
      requestCases: [],
      activeCaseId: '',
      interfaceApiConfig: createDefaultApiConfig(),
    });
    workspaceStore.setApiConfig(currentProjectId, cfg);
    workspaceStore.setRequestEditorSurface(currentProjectId, 'plain');
  }

  workspaceStore.setResponse(currentProjectId, null);
};
