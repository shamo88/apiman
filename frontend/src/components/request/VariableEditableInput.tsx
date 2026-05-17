import React, { useState, useEffect, useRef } from 'react';
import { getVariableSuggestions, renderHighlightedVariableHtml, setCaretOffset, getCaretOffset } from '../../utils/variableUtils';
import { BUILT_IN_GENERATORS } from '../../constants/scriptHelpContent';

interface VariableEditableInputProps {
    value: string;
    onChange: (next: string) => void;
    placeholder: string;
    style?: React.CSSProperties;
    environmentVariables: Record<string, string>;
    multiline?: boolean;
    onBlur?: () => void;
    onEnter?: () => void;
}

export const VariableEditableInput: React.FC<VariableEditableInputProps> = ({
    value,
    onChange,
    placeholder,
    style,
    environmentVariables,
    multiline = false,
    onBlur,
    onEnter,
}) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const isFocusedRef = useRef(false); // Track if user is actively typing (skip useEffect DOM overwrite)
    const suggestionListRef = useRef<HTMLDivElement | null>(null);
    const [caretIndex, setCaretIndex] = useState<number>((value || '').length);
    const [focused, setFocused] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [forceSuggestAll, setForceSuggestAll] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    // Store caret rect captured directly from double-click event to avoid timing issues with selection
    const doubleClickCaretRectRef = useRef<DOMRect | null>(null);
    const suggestions = getVariableSuggestions(value, caretIndex, environmentVariables);
    const suggestionItems = forceSuggestAll
        ? [...Object.keys(environmentVariables), ...BUILT_IN_GENERATORS.map(g => g.name)]
        : suggestions.items;
    // 检测内容是否包含换行
    const hasNewline = (value || '').includes('\n');

    const updateCaretPosition = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
        if (range) {
            const caretRect = range.getBoundingClientRect();
            setSuggestionPos({
                top: caretRect.bottom + window.scrollY + 5,
                left: caretRect.left + window.scrollX,
            });
        } else if (doubleClickCaretRectRef.current) {
            // Use stored rect from double-click when selection is no longer available
            const rect = doubleClickCaretRectRef.current;
            setSuggestionPos({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
            });
        } else {
            const rect = editor.getBoundingClientRect();
            setSuggestionPos({
                top: rect.bottom + window.scrollY + 5,
                left: rect.left + window.scrollX,
            });
        }
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        // Skip DOM overwrite while user is actively typing - their input is already in the DOM
        if (isFocusedRef.current) return;
        const html = renderHighlightedVariableHtml(value, environmentVariables);
        if (editor.innerHTML !== html) {
            editor.innerHTML = html;
            if (focused) {
                setCaretOffset(editor, Math.min(caretIndex, (value || '').length));
            }
        }
    }, [value, focused, caretIndex, environmentVariables]);

    useEffect(() => {
        if (suggestionItems.length === 0) {
            setActiveSuggestionIndex(0);
            return;
        }
        setActiveSuggestionIndex((prev) => Math.min(prev, suggestionItems.length - 1));
    }, [suggestionItems.length]);

    useEffect(() => {
        if (focused && suggestionItems.length > 0) {
            // In forceSuggestAll mode (double-click), position is already set from mouse coordinates
            // Don't re-query selection which may be stale after re-render
            if (!forceSuggestAll) {
                updateCaretPosition();
            }
        }
    }, [caretIndex, focused, suggestionItems.length, forceSuggestAll]);

    // Scroll active suggestion into view when navigating with arrow keys
    useEffect(() => {
        if (!suggestionListRef.current || suggestionItems.length === 0) return;
        const activeEl = suggestionListRef.current.children[activeSuggestionIndex] as HTMLElement | undefined;
        activeEl?.scrollIntoView({ block: 'nearest' });
    }, [activeSuggestionIndex, suggestionItems.length]);

    const applySuggestion = (name: string) => {
        const token = `{{${name}}}`;
        let next = value || '';
        let nextCaret = caretIndex;
        if (suggestions.rangeStart >= 0 && suggestions.rangeEnd >= 0) {
            next = (value || '').slice(0, suggestions.rangeStart) + token + (value || '').slice(suggestions.rangeEnd);
            nextCaret = suggestions.rangeStart + token.length;
        } else {
            next = (value || '').slice(0, Math.max(0, caretIndex)) + token + (value || '').slice(Math.max(0, caretIndex));
            nextCaret = Math.max(0, caretIndex) + token.length;
        }
        onChange(next);
        setCaretIndex(nextCaret);
        setForceSuggestAll(false);
        doubleClickCaretRectRef.current = null;
        // Immediately update DOM with highlighted tokens - can't rely on effect (blocked by isFocusedRef)
        if (editorRef.current) {
            editorRef.current.innerHTML = renderHighlightedVariableHtml(next, environmentVariables);
            setCaretOffset(editorRef.current, nextCaret);
        }
    };

    return (
        <div className="variable-editable-wrapper" style={style}>
            <div
                ref={editorRef}
                className="variable-editable"
                data-multiline={multiline || hasNewline ? 'true' : 'false'}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onFocus={() => {
                    isFocusedRef.current = true;
                    setFocused(true);
                    updateCaretPosition();
                }}
                onBlur={() => {
                    isFocusedRef.current = false;
                    setFocused(false);
                    setForceSuggestAll(false);
                    doubleClickCaretRectRef.current = null;
                    onBlur?.();
                }}
                onDoubleClick={(e) => {
                    // Use mouse coordinates from the click event - more reliable than selection APIs
                    doubleClickCaretRectRef.current = new DOMRect(e.clientX, e.clientY, 0, 0);
                    // Immediate position set avoids rendering at wrong location before effect runs
                    setSuggestionPos({
                        top: e.clientY + window.scrollY + 5,
                        left: e.clientX + window.scrollX,
                    });
                    const editor = editorRef.current;
                    if (!editor) return;
                    setCaretIndex(getCaretOffset(editor));
                    setForceSuggestAll(true);
                }}
                onInput={(e) => {
                    const nextText = multiline
                        ? (e.currentTarget.textContent || '')
                        : (e.currentTarget.textContent || '').replace(/\n/g, '');
                    onChange(nextText);
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    setForceSuggestAll(false);
                    updateCaretPosition();
                }}
                onKeyDown={(e) => {
                    if (suggestionItems.length > 0) {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setActiveSuggestionIndex((prev) => (prev + 1) % suggestionItems.length);
                            return;
                        }
                        if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setActiveSuggestionIndex((prev) => (prev - 1 + suggestionItems.length) % suggestionItems.length);
                            return;
                        }
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const name = suggestionItems[activeSuggestionIndex];
                            if (name) {
                                applySuggestion(name);
                            }
                            return;
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            setActiveSuggestionIndex(0);
                            setForceSuggestAll(false);
                            return;
                        }
                    }
                    if (!multiline && e.key === 'Enter') {
                        e.preventDefault();
                        onEnter?.();
                    }
                }}
                onKeyUp={(e) => {
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    updateCaretPosition();
                }}
            />
            {focused && suggestionItems.length > 0 && (
                <div
                    ref={suggestionListRef}
                    className="variable-editable-suggestions"
                    style={{
                        position: 'fixed',
                        top: suggestionPos.top,
                        left: suggestionPos.left,
                        zIndex: 1200,
                    }}
                >
                    {suggestionItems.map((name, idx) => {
                        const builtIn = BUILT_IN_GENERATORS.find(g => g.name === name);
                        const isEnvironmentVar = environmentVariables && name in environmentVariables;
                        const itemClass = builtIn ? 'built-in-generator' : (!isEnvironmentVar ? 'invalid-variable' : '');
                        return (
                            <div
                                key={name}
                                className={`variable-editable-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''} ${itemClass}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    applySuggestion(name);
                                }}
                                onMouseEnter={() => setActiveSuggestionIndex(idx)}
                            >
                                <div className="suggestion-item-name">{`{{${name}}}`}</div>
                                {builtIn && <div className="suggestion-item-desc">{builtIn.description}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};