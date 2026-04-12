import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface ScriptEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ value, onChange }) => {
    return (
        <CodeMirror
            value={value}
            height="100%"
            theme="light"
            extensions={[javascript()]}
            onChange={onChange}
        />
    );
};