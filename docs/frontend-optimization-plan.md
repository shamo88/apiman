# 前端代码优化计划

## 现状分析

### 严重违规：App.tsx (5127行)

`App.tsx` 是一个典型的 **God Component**，承担了应用几乎所有的职责：

**状态管理 (100+ 状态变量)**:
- 项目管理：`projects`, `projectTabs`, `activeTab`, `projectTrees`, `expandedKeys`, `collapsedFolders`
- 请求/API状态：`requestTabs`, `activeRequestTab`, `currentRequest`, `apiConfig`, `requestCases`
- 环境变量：`environments`, `selectedEnvironmentId`, `environmentForm*`
- 脚本：`projectScripts`, `editingScriptId`, `scriptForm*`
- Cookie/MCP/历史：8+ 搜索过滤字段
- UI状态：拖拽、动画、侧边栏等
- 12+ 弹窗状态

**Handler类别 (未分离)**:
1. 项目管理 (创建/删除/重命名/分组)
2. 文件夹操作 (CRUD + 拖拽)
3. 请求操作 (创建/保存/删除/复制)
4. 环境管理 (完整CRUD)
5. 脚本管理 (完整CRUD)
6. Cookie管理
7. MCP管理
8. 历史记录管理
9. HTTP执行
10. 树渲染 (`renderApiList`, `renderRequestItem`, `renderFolder` - 400+行)
11. 拖拽处理 (8+ 处理器)
12. 变量系统 (`renderHighlightedVariableHtml`, `VariableEditableInput` - 180+行)

---

## 目标目录结构

```
frontend/src/
├── components/
│   ├── TitleBar/
│   │   ├── TitleBar.tsx
│   │   ├── TitleBar.css
│   │   ├── SettingsModal.tsx
│   │   ├── GeneralSettings.tsx
│   │   ├── ProxySettings.tsx
│   │   ├── GitSyncSettings.tsx
│   │   └── AboutSettings.tsx
│   ├── HomePage/
│   │   ├── HomePage.tsx
│   │   └── HomePage.css
│   ├── ProjectWorkspace/
│   │   ├── ProjectWorkspace.tsx
│   │   └── ProjectWorkspace.css
│   ├── ApiTree/
│   │   ├── ApiTree.tsx
│   │   ├── ApiTreeItem.tsx
│   │   ├── FolderNode.tsx
│   │   └── ApiTree.css
│   ├── RequestEditor/
│   │   ├── RequestEditor.tsx
│   │   ├── ParamsEditor.tsx
│   │   ├── HeadersEditor.tsx
│   │   ├── BodyEditor.tsx
│   │   ├── ScriptsEditor.tsx
│   │   ├── CurlEditor.tsx
│   │   └── RequestEditor.css
│   ├── ResponsePanel/
│   │   ├── ResponsePanel.tsx
│   │   ├── ResponseHeaders.tsx
│   │   ├── ResponseBody.tsx
│   │   └── ResponsePanel.css
│   ├── VariableInput/
│   │   ├── VariableEditableInput.tsx
│   │   └── VariableInput.css
│   ├── modals/
│   │   ├── CreateProjectModal.tsx
│   │   ├── CreateFolderModal.tsx
│   │   ├── CreateRequestModal.tsx
│   │   ├── EnvironmentEditorModal.tsx
│   │   ├── ScriptEditorModal.tsx
│   │   ├── HistoryModal.tsx
│   │   ├── CookieEditorModal.tsx
│   │   └── modals.css
│   ├── MCPSettings/
│   │   ├── MCPSettingsModal.tsx
│   │   └── MCPSettingsModal.css
│   └── ScriptHelp/
│       ├── ScriptHelpWindow.tsx
│       └── ScriptHelpWindow.css
├── hooks/
│   ├── useProjects.ts           # 项目CRUD、项目标签、项目分组
│   ├── useEnvironments.ts      # 环境变量管理
│   ├── useScripts.ts           # 脚本管理
│   ├── useHistory.ts           # 历史记录列表、搜索、详情
│   ├── useMCP.ts               # MCP配置和状态
│   ├── useCookies.ts           # Cookie管理
│   ├── useRequest.ts           # 当前请求状态、执行
│   ├── useVariableSuggestions.ts # 变量建议下拉
│   └── useDragDrop.ts          # 拖拽状态管理
├── utils/
│   ├── curlUtils.ts            # buildCurlCommand, parseCurlToApiConfig
│   ├── variableUtils.ts       # 变量渲染、高亮、替换
│   └── generators.ts          # 内置变量生成器
├── constants/
│   ├── httpMethods.ts          # HTTP方法颜色配置
│   ├── defaults.ts             # 默认配置项
│   └── scriptHelpContent.ts    # 脚本帮助文档内容
├── types/
│   └── index.ts                # 统一导出所有共享类型
└── styles/
    ├── variables.css           # CSS变量定义
    ├── base.css               # 基础样式
    └── components/            # 各组件样式（见上）
```

**目录组织原则**：
- **components/** - 按功能/领域分组，关联文件放同一目录
- **hooks/** - 扁平结构，命名即分类，数量少无需分层
- **modals/** - 所有弹窗类组件统一管理
- **styles/** - 按对应组件目录组织
- **types/** - 统一导出点，避免循环依赖

---

## 实施顺序

```
1. 提取工具函数和常量 (utils, constants)
   ↓
2. 提取 VariableEditableInput（依赖就绪）
   ↓
3. 拆分 TitleBar 设置组件 (TitleBar/)
   ↓
4. 提取 MCPSettings 和 ScriptHelp
   ↓
5. 提取 HomePage
   ↓
6. 提取 ApiTree (ApiTree/)
   ↓
7. 提取 RequestEditor (RequestEditor/)
   ↓
8. 提取 ResponsePanel (ResponsePanel/)
   ↓
9. 提取 ProjectWorkspace
   ↓
10. 提取各 Modal 组件 (modals/)  ← 从 App.tsx 新建
    ↓
11. 提取 Hooks（根据组件依赖调整）
    ↓
12. 清理 App.tsx，保留根容器逻辑
    ↓
13. 拆分 App.css (styles/)
```

**注意**：
- 步骤 1-2 可并行：utils 和 VariableEditableInput 都较独立
- 步骤 3-10 需按顺序：后续步骤依赖前面提取的组件
- 步骤 11 提取 Hooks：待组件拆分完成后，从 App.tsx 提取状态管理逻辑
- 步骤 10 的 Modal 组件目前存在于 App.tsx 内，提取时是**新建文件**

---

**收益**：
- 代码可测试性：每个模块可独立单元测试
- 代码可维护性：职责清晰，修改范围明确
- 可读性：新开发者可快速定位代码位置
- 团队协作：可并行开发不同模块

---

## 注意事项

1. **渐进式重构**：每次只移动一小部分，保持功能不变
2. **Wails绑定**：确保Go方法调用接口不变
3. **状态管理**：App.tsx精简后可考虑使用Context或Zustand管理跨组件状态
4. **测试覆盖**：每提取一个模块，确保相关功能正常
5. **Git提交**：每阶段单独提交，便于回溯
6. **类型组织**：`types/index.ts` 作为统一导出点，新增类型时追加至此文件