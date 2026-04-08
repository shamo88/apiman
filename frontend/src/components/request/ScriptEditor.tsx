import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface ScriptEditorProps {
    value: string;
    onChange: (value: string) => void;
    theme: 'light' | 'dark';
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ value, onChange, theme }) => {
    return (
        <CodeMirror
            value={value}
            height="100%"
            theme={theme === 'dark' ? 'dark' : 'light'}
            extensions={[javascript()]}
            onChange={onChange}
        />
    );
};