import { ApiConfig, containsVariablePlaceholder } from './apiConfig';

/** 从 apiConfig 生成 curl 命令 */
export const buildCurlCommand = (c: ApiConfig): string => {
    const parts: string[] = ['curl'];

    // URL with params
    let url = c.url || '';
    const enabledParams = (c.params || []).filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
        const queryParams = enabledParams.map(p => {
            const encodedKey = encodeURIComponent(p.key);
            // 如果值包含 {{}} 变量，不进行编码
            const encodedValue = containsVariablePlaceholder(p.value) ? p.value : encodeURIComponent(p.value);
            return `${encodedKey}=${encodedValue}`;
        }).join('&');
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
            const encoded = enabledFields.map(f => {
                const encodedKey = encodeURIComponent(f.key);
                // 如果值包含 {{}} 变量，不进行编码
                const encodedValue = containsVariablePlaceholder(f.value) ? f.value : encodeURIComponent(f.value);
                return `${encodedKey}=${encodedValue}`;
            }).join('&');
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
export const parseCurlToApiConfig = (curl: string): Partial<ApiConfig> => {
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
