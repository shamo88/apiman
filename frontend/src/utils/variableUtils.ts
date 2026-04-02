/** Built-in variable generators */
export const builtInGenerators = [
    { name: '$date.timestamp', description: '当前Unix时间戳（秒）', example: '{{$date.timestamp}}' },
    { name: '$date.timestampMs', description: '当前Unix时间戳（毫秒）', example: '{{$date.timestampMs}}' },
    { name: '$date.now', description: '当前时间（ISO格式）', example: '{{$date.now}}' },
    { name: '$date.now', description: '格式化日期', example: '{{$date.now(\'yyyy-MM-dd\')}}' },
    { name: '$uuid', description: '随机UUID', example: '{{$uuid}}' },
    { name: '$random.int', description: '随机整数', example: '{{$random.int}}' },
    { name: '$random.float', description: '随机浮点数', example: '{{$random.float}}' },
    { name: '$random.alpha', description: '随机字母字符串', example: '{{$random.alpha(10)}}' },
    { name: '$random.alphanumeric', description: '随机字母数字字符串', example: '{{$random.alphanumeric(10)}}' },
];

export const escapeHtml = (text: string) => (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Check if a variable name is a built-in generator */
export const isBuiltInGenerator = (varName: string): boolean => {
    // Check exact match first
    if (builtInGenerators.some(g => g.name === varName)) {
        return true;
    }
    // Check function call format: baseName('arg') or baseName(arg)
    if (varName.includes('(')) {
        const baseName = varName.substring(0, varName.indexOf('('));
        const closingIdx = varName.indexOf(')');
        // Must have matching parentheses and baseName must be a valid generator
        if (closingIdx > 0 && varName.endsWith(')') && builtInGenerators.some(g => g.name === baseName)) {
            const args = varName.substring(varName.indexOf('(') + 1, closingIdx);
            // Args must be non-empty and contain only valid characters (for our generators, numbers or quoted strings)
            if (args.length > 0 && /^(\d+|'[^']*'|"[^"]*")$/.test(args)) {
                return true;
            }
        }
    }
    return false;
};

export const renderHighlightedVariableHtml = (value: string, environmentVariables: Record<string, string>) => {
    const input = value || '';
    const regex = /\{\{([\w$.()']+)\}\}/g;
    let html = '';
    let lastIndex = 0;
    let match = regex.exec(input);

    while (match) {
        const token = match[0];
        const varName = match[1];
        const start = match.index;
        const end = start + token.length;
        if (start > lastIndex) {
            html += `<span class="variable-inline-text">${escapeHtml(input.slice(lastIndex, start))}</span>`;
        }
        // Check if it's a valid built-in generator
        const isBuiltIn = isBuiltInGenerator(varName);
        const exists = Object.prototype.hasOwnProperty.call(environmentVariables, varName);
        const tokenClass = isBuiltIn ? 'built-in' : (exists ? 'active' : 'missing');
        html += `<span class="variable-inline-token ${tokenClass}">${escapeHtml(token)}</span>`;
        lastIndex = end;
        match = regex.exec(input);
    }

    if (lastIndex < input.length) {
        html += `<span class="variable-inline-text">${escapeHtml(input.slice(lastIndex))}</span>`;
    }

    if (!html) {
        html = `<span class="variable-inline-text"></span>`;
    }
    return html;
};

export const getVariableSuggestions = (text: string, caretIndex: number, environmentVariables: Record<string, string>) => {
    const beforeCaret = (text || '').slice(0, Math.max(0, caretIndex));
    // 匹配 {{ 后面的内容，包括 $ 字符
    const match = beforeCaret.match(/\{\{(\w*)$/);
    if (!match) return { items: [] as string[], rangeStart: -1, rangeEnd: -1 };
    const keyword = (match[1] || '').toLowerCase();
    // 合并环境变量和内置生成器
    const envItems = Object.keys(environmentVariables).map(name => ({ name, isBuiltIn: false }));
    const builtInItems = builtInGenerators.filter(g => g.name.toLowerCase().includes(keyword)).map(g => ({ name: g.name, isBuiltIn: true }));
    const allItems = [...envItems, ...builtInItems];
    return {
        items: allItems.map(item => item.name),
        rangeStart: beforeCaret.length - match[0].length,
        rangeEnd: beforeCaret.length,
    };
};

export const getCaretOffset = (root: HTMLElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(root);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
};

export const setCaretOffset = (root: HTMLElement, targetOffset: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let currentOffset = 0;
    let foundNode: Node | null = null;
    let foundOffset = 0;

    while (walker.nextNode()) {
        const textNode = walker.currentNode;
        const textLength = textNode.textContent?.length || 0;
        if (currentOffset + textLength >= targetOffset) {
            foundNode = textNode;
            foundOffset = Math.max(0, targetOffset - currentOffset);
            break;
        }
        currentOffset += textLength;
    }

    if (!foundNode) {
        foundNode = root;
        foundOffset = root.childNodes.length;
    }

    const range = document.createRange();
    range.setStart(foundNode, foundOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
};
