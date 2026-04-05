export const HTTP_METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  OPTIONS: '#0d5aa7',
  HEAD: '#9012fe'
};

export const METHOD_LABELS: Record<string, string> = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DEL',
  PATCH: 'PAT',
  OPTIONS: 'OPT',
  HEAD: 'HEAD'
};

export const getMethodColor = (method: string): string => {
  return HTTP_METHOD_COLORS[method.toUpperCase()] || '#999';
};

export const formatSidebarMethodLabel = (method: string): string => {
  const m = (method || 'GET').toUpperCase();
  if (m === 'DELETE') return 'DEL';
  if (m === 'PATCH') return 'PAT';
  if (m === 'OPTIONS') return 'OPT';
  return m.substring(0, 7);
};
