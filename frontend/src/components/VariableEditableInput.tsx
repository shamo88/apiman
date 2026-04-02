import React, { useState, useEffect, useRef } from 'react';
import { getVariableSuggestions, renderHighlightedVariableHtml, setCaretOffset, getCaretOffset, builtInGenerators } from '../utils/variableUtils';

interface VariableEditableInputProps {
    value: string;
    onChange: (next: string) => void;
    placeholder: string;
    style?: React.CSSProperties;
    environmentVariables: Record<string, string>;
    multiline?: boolean;
}

export const VariableEditableInput: React.FC<VariableEditableInputProps> = ({
    value,
    onChange,
    placeholder,
    style,
    environmentVariables,
    multiline = false,
}) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const [caretIndex, setCaretIndex] = useState<number>((value || '').length);
    const [focused, setFocused] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [forceSuggestAll, setForceSuggestAll] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const suggestions = getVariableSuggestions(value, caretIndex, environmentVariables);
    const suggestionItems = forceSuggestAll ? Object.keys(environmentVariables) : suggestions.items;

    const updateCaretPosition = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const rect = editor.getBoundingClientRect();
        const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
        if (range) {
            const caretRect = range.getBoundingClientRect();
            setSuggestionPos({
                top: caretRect.top - rect.top + 20,
                left: caretRect.right - rect.left + 5,
            });
        } else {
            setSuggestionPos({
                top: 20,
                left: 5,
            });
        }
    };

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
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
            updateCaretPosition();
        }
    }, [caretIndex, focused, suggestionItems.length]);

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
        window.requestAnimationFrame(() => {
            if (editorRef.current) {
                setCaretOffset(editorRef.current, nextCaret);
                editorRef.current.focus();
            }
        });
    };

    return (
        <div className="variable-editable-wrapper" style={style}>
            <div
                ref={editorRef}
                className="variable-editable"
                data-multiline={multiline ? 'true' : 'false'}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onFocus={() => {
                    setFocused(true);
                    updateCaretPosition();
                }}
                onBlur={() => {
                    setFocused(false);
                    setForceSuggestAll(false);
                }}
                onDoubleClick={(e) => {
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    setForceSuggestAll(true);
                    updateCaretPosition();
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
                    if (!multiline && e.key === 'Enter') e.preventDefault();
                }}
                onKeyUp={(e) => {
                    setCaretIndex(getCaretOffset(e.currentTarget));
                    updateCaretPosition();
                }}
            />
            {focused && suggestionItems.length > 0 && (
                <div
                    className="variable-editable-suggestions"
                    style={{
                        position: 'absolute',
                        top: suggestionPos.top,
                        left: suggestionPos.left,
                        zIndex: 1200,
                    }}
                >
                    {suggestionItems.map((name, idx) => {
                        const builtIn = builtInGenerators.find(g => g.name === name);
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
