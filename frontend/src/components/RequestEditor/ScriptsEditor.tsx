import React from 'react';
import { Select, Checkbox } from 'antd';

interface ScriptsEditorProps {
  preScripts: string[];
  postScripts: string[];
  onChange: (preScripts: string[], postScripts: string[]) => void;
  projectScripts: Array<{ id: string; name: string }>;
}

export const ScriptsEditor: React.FC<ScriptsEditorProps> = ({
  preScripts,
  postScripts,
  onChange,
  projectScripts,
}) => {
  const handlePreScriptChange = (scriptId: string, checked: boolean) => {
    if (checked) {
      onChange([...preScripts, scriptId], postScripts);
    } else {
      onChange(preScripts.filter((id) => id !== scriptId), postScripts);
    }
  };

  const handlePostScriptChange = (scriptId: string, checked: boolean) => {
    if (checked) {
      onChange(preScripts, [...postScripts, scriptId]);
    } else {
      onChange(preScripts, postScripts.filter((id) => id !== scriptId));
    }
  };

  if (projectScripts.length === 0) {
    return (
      <div className="scripts-editor-empty">
        暂无脚本，请先在「脚本」菜单中创建脚本
      </div>
    );
  }

  return (
    <div className="scripts-editor">
      <div className="scripts-section">
        <h4>前置脚本 (Pre-request)</h4>
        <p className="scripts-hint">在请求发送之前执行的脚本</p>
        <div className="scripts-list">
          {projectScripts.map((script) => (
            <Checkbox
              key={script.id}
              checked={preScripts.includes(script.id)}
              onChange={(e) => handlePreScriptChange(script.id, e.target.checked)}
            >
              {script.name}
            </Checkbox>
          ))}
        </div>
      </div>

      <div className="scripts-section">
        <h4>后置脚本 (Post-request)</h4>
        <p className="scripts-hint">在请求发送之后执行的脚本</p>
        <div className="scripts-list">
          {projectScripts.map((script) => (
            <Checkbox
              key={script.id}
              checked={postScripts.includes(script.id)}
              onChange={(e) => handlePostScriptChange(script.id, e.target.checked)}
            >
              {script.name}
            </Checkbox>
          ))}
        </div>
      </div>
    </div>
  );
};
