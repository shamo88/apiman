/**
 * 响应类型检测和格式化工具
 */

/**
 * 响应类型枚举
 */
export type ResponseType = 'json' | 'xml' | 'html' | 'text' | 'binary' | 'unknown';

/**
 * 检测结果
 */
export interface DetectedResponseType {
  type: ResponseType;
  contentType: string | null;
  charset: string | null;
  isTruncated: boolean;
}

/**
 * 从 Content-Type header 提取媒体类型和字符集
 */
export function parseContentType(contentTypeHeader: string | null): { mediaType: string; charset: string | null } {
  if (!contentTypeHeader) return { mediaType: '', charset: null };

  const parts = contentTypeHeader.split(';').map(s => s.trim().toLowerCase());
  const mediaType = parts[0] || '';
  const charsetPart = parts.find(p => p.startsWith('charset='));
  const charset = charsetPart ? charsetPart.split('=')[1]?.replace(/"/g, '') : null;

  return { mediaType, charset };
}

/**
 * 从响应体内容特征判断类型
 */
function detectByContent(body: string): ResponseType {
  const trimmed = body.trim();
  if (!trimmed) return 'text';

  // JSON: 以 { 或 [ 开头
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // 不是有效 JSON，继续检测
    }
  }

  // XML: 以 < 开头
  if (trimmed.startsWith('<')) {
    if (trimmed.includes('<?xml') || trimmed.includes('<!DOCTYPE')) {
      return 'xml';
    }
    // 检查是否是 HTML
    if (/<(html|body|head|div|span|table|a |img |script|link)[>\s]/i.test(trimmed)) {
      return 'html';
    }
    return 'xml';
  }

  // HTML: 包含常见 HTML 标签
  if (/<(html|body|head|div|span|table|a |img |script|link)/i.test(trimmed)) {
    return 'html';
  }

  return 'text';
}

/**
 * 检测是否为二进制内容（包含大量不可见字符）
 */
export function isBinaryContent(body: string): boolean {
  if (!body || body.length === 0) return false;

  // 检查不可打印字符的比例
  let nonPrintable = 0;
  const checkLength = Math.min(body.length, 8192);
  for (let i = 0; i < checkLength; i++) {
    const code = body.charCodeAt(i);
    // 允许 tab(9), newline(10), carriage return(13)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }
  return checkLength > 0 && nonPrintable / checkLength > 0.1;
}

/**
 * 自动检测响应类型
 */
export function detectResponseType(
  body: string,
  contentTypeHeader: string | null
): DetectedResponseType {
  const { mediaType, charset } = parseContentType(contentTypeHeader);

  // 基于 Content-Type 判断
  if (mediaType) {
    if (mediaType.includes('json')) return { type: 'json', contentType: mediaType, charset, isTruncated: false };
    if (mediaType.includes('xml')) return { type: 'xml', contentType: mediaType, charset, isTruncated: false };
    if (mediaType.includes('html')) return { type: 'html', contentType: mediaType, charset, isTruncated: false };
    if (mediaType.includes('text')) return { type: 'text', contentType: mediaType, charset, isTruncated: false };
    if (
      mediaType.includes('image') ||
      mediaType.includes('pdf') ||
      mediaType.includes('audio') ||
      mediaType.includes('video') ||
      mediaType.includes('application/octet') ||
      mediaType.includes('application/json') === false && (
        mediaType.includes('zip') ||
        mediaType.includes('tar') ||
        mediaType.includes('gzip') ||
        mediaType.includes('compressed')
      )
    ) {
      return { type: 'binary', contentType: mediaType, charset, isTruncated: false };
    }
  }

  // 基于内容特征判断
  if (isBinaryContent(body)) {
    return { type: 'binary', contentType: mediaType || null, charset, isTruncated: false };
  }

  const contentBasedType = detectByContent(body);
  return { type: contentBasedType, contentType: mediaType || null, charset, isTruncated: false };
}

/**
 * 获取 Content-Type header
 */
export function getContentType(headers: Record<string, string[]> | null): string | null {
  if (!headers) return null;
  for (const [key, values] of Object.entries(headers)) {
    if (key.toLowerCase() === 'content-type' && values.length > 0) {
      return values[0];
    }
  }
  return null;
}

/**
 * XML 格式化
 */
export function formatXML(xml: string, indent: string = '  '): string {
  let formatted = '';
  let indentLevel = 0;

  const tags: string[] = [];
  let inTag = false;
  let inContent = false;
  let currentTag = '';
  let currentContent = '';

  for (let i = 0; i < xml.length; i++) {
    const char = xml[i];

    if (char === '<') {
      if (currentContent.trim()) {
        formatted += indentLevel ? ' '.repeat(indentLevel * indent.length) : '';
        formatted += currentContent.trim() + '\n';
        currentContent = '';
      }
      inTag = true;
      currentTag = '<';
    } else if (char === '>' && inTag) {
      currentTag += '>';
      inTag = false;

      // 闭合标签
      if (currentTag.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
        formatted += ' '.repeat(indentLevel * indent.length) + currentTag + '\n';
      }
      // 自闭合标签
      else if (currentTag.endsWith('/>')) {
        formatted += ' '.repeat(indentLevel * indent.length) + currentTag + '\n';
      }
      // 开始标签
      else {
        formatted += ' '.repeat(indentLevel * indent.length) + currentTag + '\n';
        indentLevel++;
      }

      currentTag = '';
    } else if (inTag) {
      currentTag += char;
    } else {
      currentContent += char;
    }
  }

  return formatted.trim();
}

/**
 * HTML 语法高亮（返回带样式的 HTML 字符串）
 */
export function highlightHTML(html: string): string {
  let result = html;

  // 转义 HTML 特殊字符
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 高亮标签
  result = result.replace(
    /(&lt;\/?)([\w]+)/g,
    '<span class="html-tag">$1$2</span>'
  );

  // 高亮属性名
  result = result.replace(
    /(\s)([\w-]+)(=)/g,
    '$1<span class="html-attr">$2</span>$3'
  );

  // 高亮属性值
  result = result.replace(
    /(&quot;|&#39;)(.*?)(\1)/g,
    '<span class="html-value">$1$2$3</span>'
  );

  return result;
}

/**
 * 截断长文本（用于预览）
 */
export function truncateText(text: string, maxLength: number = 10000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '\n\n... (truncated)';
}
