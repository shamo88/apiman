import { models } from '../../wailsjs/go/models';

/** ApiConfig body type */
export type BodyType = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'json' | 'xml' | 'raw' | 'binary';

export interface ApiConfig {
    name: string;
    method: string;
    url: string;
    headers: { key: string; value: string; enabled: boolean }[];
    params: { key: string; value: string; enabled: boolean }[];
    body: string;
    bodyType: BodyType;
    formData: { key: string; value: string; enabled: boolean }[];
    urlencoded: { key: string; value: string; enabled: boolean }[];
    preScripts: string[];
    postScripts: string[];
}

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

export const cloneApiConfig = (c: ApiConfig): ApiConfig => JSON.parse(JSON.stringify(c));

/** Wails 将 HttpRequestSpec 生成为 class（含 convertValues），需用 createFrom 包装字面量。 */
export const toWailsHttpSpec = (c: ApiConfig) => models.HttpRequestSpec.createFrom(apiConfigToSpec(c));

export const apiConfigToSpec = (c: ApiConfig) => ({
    method: c.method,
    http_url: c.url,
    headers: c.headers.map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
    params: c.params.map((p) => ({ key: p.key, value: p.value, enabled: p.enabled })),
    body: c.body,
    body_type: c.bodyType,
    form_data: c.formData.map((f) => ({ key: f.key, value: f.value, enabled: f.enabled })),
    url_encoded: c.urlencoded.map((u) => ({ key: u.key, value: u.value, enabled: u.enabled })),
});

export const apiConfigFromHttpSpec = (spec: models.HttpRequestSpec, requestName: string): ApiConfig => {
    const bt = (spec.body_type || 'none') as BodyType;
    const allowed: BodyType[] = ['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw', 'binary'];
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
        preScripts: [],
        postScripts: [],
    };
};

/** 检查文本是否包含 {{}} 变量占位符 */
export const containsVariablePlaceholder = (text: string): boolean => {
    return /\{\{[^}]+\}\}/.test(text);
};
