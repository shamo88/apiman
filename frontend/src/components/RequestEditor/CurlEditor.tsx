import React from 'react';
import { Button, message } from 'antd';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface CurlEditorProps {
  curl: string;
  onParse: (curl: string) => void;
}

export const CurlEditor: React.FC<CurlEditorProps> = ({ curl, onParse }) => {
  const handleParse = () => {
    if (curl.trim()) {
      onParse(curl);
      message.success('已解析 curl 命令');
    }
  };

  return (
    <div className="curl-editor">
      <div className="curl-toolbar">
        <Button type="primary" onClick={handleParse}>
          解析 Curl
        </Button>
      </div>
      <div className="curl-content">
        <CodeMirror
          value={curl}
          onChange={(value) => {}}
          extensions={[javascript()]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
          }}
          className="curl-codemirror"
        />
      </div>
    </div>
  );
};
