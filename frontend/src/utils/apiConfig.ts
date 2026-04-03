import { models } from '../../wailsjs/go/models';
import type { CurlRequest } from '../types';

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

/** 将 CurlRequest（Go模型）转换为 ApiConfig（前端结构） */
export const apiConfigFromRequest = (r: CurlRequest, fallbackName: string): ApiConfig => {
    const bt = (r.body_type || 'none') as BodyType;
    const allowed: BodyType[] = ['none', 'form-data', 'x-www-form-urlencoded', 'json', 'xml', 'raw', 'binary'];
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
        preScripts: r.pre_scripts || [],
        postScripts: r.post_scripts || [],
    };
};
