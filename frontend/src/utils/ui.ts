/** HTTP 方法颜色 */
export const METHOD_COLORS: Record<string, string> = {
    GET: '#61affe',
    POST: '#49cc90',
    PUT: '#fca130',
    DELETE: '#f93e3e',
    PATCH: '#50e3c2',
    OPTIONS: '#0d5aa7',
    HEAD: '#9012fe',
};

/** HTTP 方法标签 */
export const METHOD_LABELS: Record<string, string> = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DEL',
    PATCH: 'PAT',
    OPTIONS: 'OPT',
    HEAD: 'HEAD',
};

/** 获取 HTTP 方法对应的颜色 */
export const getMethodColor = (method: string): string => {
    return METHOD_COLORS[method.toUpperCase()] || '#999';
};

/** 获取 HTTP 方法对应的侧边栏标签 */
export const formatSidebarMethodLabel = (method: string): string => {
    return METHOD_LABELS[method.toUpperCase()] || method.substring(0, 7);
};

/** 获取状态码对应的颜色 */
export const getStatusColor = (status: number | undefined): string => {
    if (!status) return '#666';
    if (status >= 200 && status < 300) return '#49cc90';
    if (status >= 300 && status < 400) return '#fca130';
    if (status >= 400 && status < 500) return '#f93e3e';
    if (status >= 500) return '#f93e3e';
    return '#666';
};
