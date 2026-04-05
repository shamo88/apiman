# Apiman 优化建议

本文档记录 Apiman 后续迭代的优化方向与待实现功能。

---

## 1. 响应展示增强

**当前状态**：✅ 已完成

**已完成功能**：
- ✅ 自动检测响应类型并格式化（JSON/XML/HTML/Text/Binary）
- ✅ 同一视图内 Raw/Formatted 切换（移除独立的 JsonView tab）
- ✅ 响应头分组折叠展示（Important/General/Other）
- ✅ 二进制响应 base64 编码（支持图片/PDF 等二进制预览）
- ✅ 响应头复制功能

**新增文件**：
- `frontend/src/utils/responseUtils.ts` - 响应类型检测工具
- `frontend/src/components/response/BinaryPreview.tsx` - 二进制预览组件（集成在 ResponseBodyViewer 中）

**修改文件**：
- `frontend/src/components/response/ResponseBodyViewer.tsx` - 重构支持 Raw/Formatted 切换
- `frontend/src/components/response/ResponseViewer.tsx` - 移除独立 JsonView tab
- `frontend/src/components/response/ResponseHeaders.tsx` - 分组折叠
- `frontend/src/types/index.ts` - 修复 CurlResponse 类型
- `internal/models/models.go` - 添加 BodyBase64/IsBinary 字段
- `internal/curl/curl.go` - 二进制检测和 base64 编码
- `internal/curl/exec_http.go` - 二进制检测和 base64 编码
- `frontend/src/App.css` - 新增样式

---

## 2. 批量执行测试

**当前状态**：每个 API 只能手动执行

**优化方向**：
- 支持选择多个请求/文件夹批量执行
- 显示汇总测试报告（通过/失败/耗时统计）
- 支持导出测试报告（HTML/JSON）
- 批量执行进度展示与取消功能

---

## 3. 导入/导出能力

**当前状态**：只支持 Postman Collection 导入

**优化方向**：
- **导出**：OpenAPI/Swagger、Postman、Har 格式
- **导入**：Swagger/OpenAPI 规范导入（自动生成 API 集合）

---

## 4. 脚本系统增强

**当前状态**：支持 pre/post 脚本，v3 规划 `am.sendRequest`

**优化方向**：
- 实现 `am.sendRequest` 串联多个 API 请求（登录→获取Token→调用其他API）
- 脚本调试能力（断点、日志输出）
- 脚本模板库（常用签名、鉴权等代码片段）
- Folder/Project 级脚本继承

---

## 5. 环境管理优化

**当前状态**：环境切换需要手动操作

**优化方向**：
- 状态栏快捷环境切换
- 环境导入/导出（JSON 格式）
- 环境对比功能（dev vs prod 变量差异检查）
- 环境变量优先级配置

---

## 6. 请求/响应对比

**优化方向**：
- 同一请求多次执行结果对比
- 不同环境/用例的响应对比
- API 版本历史对比

---

## 7. 前端架构优化

**当前状态**：进行中

**架构原则**：
1. **Hook 只暴露**：state + action 函数
2. **组件直接用 Hook**：传 `projectId` 等必要 coordination prop
3. **验证逻辑在 Hook 内部**：不在 App.tsx wrapper 里
4. **App.tsx 变薄**：只做组件组合

**已完成**：
- ✅ Contexts：AppContext、ProjectContext、WorkspaceContext
- ✅ Hooks：useProjects、useRequest、useEnvironment、useScript、useHistory、useMCP、useUI
- ✅ 组件拆分：ApiTree（API树）、HomePage（主页）
- ✅ 基础设施：utils/apiConfig、utils/curlUtils、utils/variableUtils、utils/treeUtils
- ✅ 删除废弃的 `renderApiList` 函数（377行）
- ✅ 删除废弃的 `convertTreeToDataNode` 函数（35行）
- ✅ 删除废弃的 `getStatusColor` 函数（7行）
- ✅ 清理未使用的图标导入（10个图标）
- ✅ 删除重复的树工具函数（62行）
- ✅ 清理 misc.ts 重复函数
- ✅ 清理未使用的 antd 导入：Row, Button, Dropdown, Tooltip, Upload, Input, searchInputRef
- ✅ 清理未使用的 wailsjs 导入：SaveGlobalCookies, SaveAppConfig, ListHistory, GetHistoryEntry, DeleteHistory, ClearHistory, SearchHistory
- ✅ 清理未使用的工具函数导入：escapeHtml, getCaretOffset, setCaretOffset, renderHighlightedVariableHtml, isBuiltInGenerator, builtInGenerators, getVariableSuggestions, containsVariablePlaceholder
- ✅ **WorkspaceContext 扩展**：添加了缺失的状态（createFolderModal, newFolderName, createRequestModal, newRequestName, renameModal, renameType, renamePath, renameValue, selectedFolder, selectedKeys, searchKeyword, filterMethod, collapsedFolders, draggingNode, dropTargetFolderPath, invalidDropHint, movedHighlightPath, expandedKeys）
- ✅ **WorkspaceContext setter 类型**：改为 `React.Dispatch<React.SetStateAction<T>>` 以兼容函数式更新
- ✅ **useRequest 使用 WorkspaceContext**：移除本地 useState，改为使用 WorkspaceContext
- ✅ **WorkspaceProvider 集成**：在 main.tsx 中添加 WorkspaceProvider 包装 App
- ✅ **App.tsx 状态解构**：从 useReq 解构状态，移除 ~45 个重复的状态声明
- ✅ **useEnvironment Hook 集成**：App.tsx 使用 useEnvironment hook，移除 ~60 行本地环境状态和 ~150 行环境处理函数
- ✅ **useEnvironment Bug 修复**：修复"添加环境变量"按钮不生效（useEffect 依赖数组问题）
- ✅ **useEnvironment Bug 修复**：修复"新建环境"按钮不生效（handleCreateEnvironmentClick 是空函数）
- ✅ **useEnvironment Hook 重构**：暴露 action 函数替代 raw setters（addVariable, removeVariable, updateVariable, updateEnvironmentName, saveEnvironment, deleteEnvironment）
- ✅ **EnvironmentPanel 重构**：直接使用 useEnvironment hook，只接收 `projectId` prop
- ✅ **useScript Hook 重构**：暴露 action 函数（createScript, selectScript, updateScriptName 等）

**当前 App.tsx 大小**：
- 原始：4080 行
- 当前：933 行（累计减少 ~3147 行，~77% 减少）
- 目标：500-800 行

**本次优化**：
- ✅ 添加 `activeProject` 派生值，移除 14 处重复的 `projectTabs.find(t => t.id === activeTab)?.project` 调用
- ✅ 清理未使用的 antd 导入：Button, Dropdown, Row, Tooltip, Upload, Input
- ✅ 清理未使用的 @ant-design/icons 导入（仅保留 HomeOutlined）
- ✅ 清理未使用的类型导入：EnvironmentEditorTab
- ✅ 清理未使用的 variableUtils 函数导入
- ✅ 清理未使用的 wailsjs 导入：CreateEnvironment, DeleteEnvironment, ListProjectScripts, LoadEnvironments, MoveFolder, MoveRequest, SaveAppConfig, SaveGlobalCookies, UpdateEnvironment, LoadMCPConfig, SaveMCPConfig, StartMCP, StopMCP, GetMCPStatus, ListHistory, GetHistoryEntry, DeleteHistory, ClearHistory, SearchHistory, AddGlobalCookies, DeleteGlobalCookie, DeleteProjectScript, UpdateProjectScript
- ✅ 清理未使用的 hook 返回值：useScriptContext (setScriptsLoading, createScript, updateScriptName 等), useEnvironment (environmentsInitiallyLoaded, environmentFormName 等), useMCP (mcpLoading)
- ✅ 清理未使用的函数：handleSaveScript, handleDeleteScriptCurrent, handleCreateProject, handleRenameProject, handleCreateProjectGroup, handleStopMCP, handleSaveCookies, handleDeleteCookie, handleRenameProjectGroup, handleEnvironmentSave, handleEnvironmentDelete
- ✅ 清理未使用的状态变量：newProjectName, newGroupName
- ✅ 清理未使用的计算变量：groupedProjects, filteredTree, normalizedProjectKeyword, filteredProjects, searchInputRef
- ✅ 清理未使用的 hook 返回项：searchVersion
- ✅ **useProjects 集成**：App.tsx 使用 useProjects hook，移除本地 projects/loading 状态和 ~150 行重复函数定义
- ✅ **useProjects 扩展**：添加 setDraggingProjectId 和 setProjectDropTargetGroup 到 hook 接口，支持 HomePage 组件调用
- ✅ **useRequest 树刷新回调**：添加 `onTreeRefresh` 回调选项，useRequest 操作后自动通知调用者刷新项目树
- ✅ **useRequest 函数集成**：App.tsx 使用 useRequest 的 handleDeleteRequest/handleCopyRequest/handleDeleteFolder/handleSaveRequest/handleCreateFolder/handleCreateRequest/handleDuplicateCaseFromTree/handleDeleteCaseFromTree/handleCloseRequestTab/loadRequestContent，通过包装函数传入 activeProject.id
- ✅ **useRequest handleRename 集成**：App.tsx 使用 useReq.handleRename
- ✅ **useRequest confirmAddCaseModal 集成**：App.tsx 直接使用 useReq.confirmAddCaseModal(name)
- ✅ **useRequest toggleFolderCollapse 集成**：App.tsx 使用 useReq.toggleFolderCollapse
- ✅ **useEnvironment 扩展**：添加 `currentEnvironmentVariables` 派生状态到 useEnvironment hook
- ✅ **移除重复函数**：清理 applyEnvironmentVariables, currentEnvironmentVariables, renderVariableAwareInput, hydrateRequestEditor, commitActiveCaseIntoList, refreshProjectTree, toggleRequestCasesExpanded, openAddCaseModal, confirmAddCaseModal, openCaseRenameFromTree, confirmCaseRenameFromTree, handleExecuteCurl, saveRequest, deleteRequest, copyRequest, createFolder, createRequest, duplicateCase, deleteCase, openRenameModal, handleRename, deleteFolder 等本地重复实现
- ✅ **清理未使用的导入**：移除未使用的 wailsjs 导入和未使用的类型导入
- ✅ **简化 moveRequestNode/moveFolderNode**：移除冗余的 tree 状态更新逻辑
- ✅ **精简树工具函数**：将 treeUtils 函数（findTreeNode, getChildrenByFolderPath, getParentFolderPath, checkDropAppendIntoFolder, checkDropOrdered, getDropHintMessage, replacePathPrefix）移至 treeUtils.ts，App.tsx 保留必要的包装函数
- ✅ **移除 filterTreeNodes**：删除未使用的 filterTreeNodes 函数
- ✅ **ResponseViewer 高度计算内聚**：将 responseBodyHeight 和 scriptResultsHeight 的计算逻辑移至 ResponseViewer 组件内部，移除 App.tsx 中的相关 useEffect
- ✅ **toggleFolderCollapse 移至 useRequest**：将树折叠逻辑添加至 useRequest hook

**Hooks 状态**：

| Hook | Raw Setters | 状态 | 优先级 |
|------|-------------|------|--------|
| useEnvironment | 0 | ✅ 已完成 | - |
| useHistory | 0 | ✅ 已完成 | - |
| useUI | 0 | ✅ 已完成 | - |
| useMCP | 0 | ✅ 已完成 | - |
| useScript | 0 | ✅ 已完成 | - |
| useProjects | ~8 | ✅ 已完成集成 | P3 (部分) |
| useRequest | ~50 | ✅ 已完成集成（大部分函数已移至 hook） | P3 |

**组件架构状态**：

| Component | Props | 架构 | 状态 |
|-----------|-------|------|------|
| HistoryModal | 3 | ✅ 直接用 hook | 已完成 |
| EnvironmentPanel | 1 | ✅ 直接用 hook | 已完成 |
| ScriptPanel | 1 | ✅ 直接用 context | 已完成 |
| MCPSettingsModal | 7 | ⚠️ 传 props | P2 |
| 其他简单组件 | - | ✅ 无需改动 | - |

**待完成重构计划**：

| 优先级 | Hook + Component | 描述 | 预估减少 |
|--------|-----------------|------|----------|
| P1 | ~~类型定义统一~~ | ✅ 已完成（types/index.ts） | - |
| P1 | ~~curlUtils 扩展~~ | ✅ 已完成（curlUtils.ts） | - |
| P1 | ~~变量工具体系~~ | ✅ 已完成（variableUtils.ts） | - |
| P1 | ~~通用工具函数去重~~ | ✅ 已完成（misc.ts 重复函数已清理） | - |
| P1 | ~~Bug 修复~~ | ✅ 修复环境变量和新建环境按钮 | - |
| P1 | ~~useEnvironment Hook 重构~~ | ✅ 暴露 action 函数 | ~80行 |
| P1 | ~~EnvironmentPanel 重构~~ | ✅ 直接用 hook，只传 projectId | - |
| P2 | ~~useMCP + App.tsx 重构~~ | ✅ useMCP Hook 重构，App.tsx 使用 hook 替代本地状态 | ~48行 |
| P2 | ~~useScript + ScriptPanel~~ | ✅ useScript Hook 重构，ScriptContext 共享状态，ScriptPanel 直接用 context | ~8行 |
| P3 | useProjects 重构 | ✅ 已完成集成：App.tsx 使用 useProjects hook，移除本地重复状态和函数 | ~200行 |
| P3 | useRequest 重构 | ✅ 已完成大部分：App.tsx 使用 useReq.handleXxx 系列函数，移除了 ~400 行重复代码。保留必要的树工具函数用于 ProjectSidebar 回调 | ~400行 |

**组件目录结构**：
```
frontend/src/components/
├── common/           # 通用组件
│   ├── MethodTag.tsx ✅
│   └── StatusTag.tsx ✅
├── home/            # 主页相关组件
│   ├── AppFooter.tsx ✅
│   ├── EmptyState.tsx ✅
│   ├── EnvironmentPanel.tsx ✅
│   ├── EnvironmentVarRow.tsx ✅
│   ├── HomePage.tsx ✅
│   ├── ProjectSearchBar.tsx ✅
│   ├── ProjectSidebar.tsx ✅
│   └── ScriptPanel.tsx ✅
├── layout/          # 布局组件
│   ├── ScriptHelpWindow.tsx ✅
│   └── TitleBar.tsx ✅
├── modals/          # 模态框组件
│   ├── CaseModal.tsx ✅
│   ├── CookieModal.tsx ✅
│   ├── CreateModal.tsx ✅
│   ├── HistoryModal.tsx ✅
│   ├── MCPSettingsModal.tsx ✅
│   └── ProjectModal.tsx ✅
├── request/         # 请求编辑相关组件
│   ├── ApiRequestBar.tsx ✅
│   ├── BodyTypeSelector.tsx ✅
│   ├── KeyValueEditor.tsx ✅
│   ├── MethodSelector.tsx ✅
│   ├── RequestEditor.tsx ✅
│   ├── ScriptBindingList.tsx ✅
│   ├── ScriptEditor.tsx ✅
│   └── VariableEditableInput.tsx ✅
├── response/        # 响应查看相关组件
│   ├── ResponseBodyViewer.tsx ✅
│   ├── ResponseCookies.tsx ✅
│   ├── ResponseHeaders.tsx ✅
│   ├── ResponseStatus.tsx ✅
│   ├── ResponseViewer.tsx ✅
│   └── ScriptResultsPanel.tsx ✅
└── sidebar/         # 侧边栏相关组件
    ├── ApiListFilters.tsx ✅
    ├── ApiTree.tsx ✅
    ├── RequestTabsBar.tsx ✅
    ├── SidebarList.tsx ✅
    └── SidebarMenuHeader.tsx ✅
```

---

## 8. MCP Server 增强

**当前工具**：`mcp_list_apis`、`mcp_list_scripts`、`mcp_get_request`、`mcp_create_case`、`mcp_update_case`、`mcp_create_request`、`mcp_create_folder`、`mcp_execute_request`、`mcp_execute_raw`

**待补充工具**：
- `mcp_list_environments` - 列出项目环境
- `mcp_execute_batch` - 批量执行
- `mcp_import_openapi` - 导入 OpenAPI 规范

---

## 9. 快捷键支持

**待实现**：
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Enter` | 发送请求 |
| `Ctrl+S` | 保存请求 |
| `Ctrl+P` | 快速切换项目 |
| `Ctrl+Shift+E` | 打开环境切换 |
| `Ctrl+H` | 打开历史记录 |

---

## 10. 性能优化

**待优化场景**：
- 大型项目（数百个 API）加载性能
- 历史记录分页加载（当前一次性加载）
- 搜索性能优化（按名称/URL 过滤）
- 并发请求性能

---

## 11. 其他功能

- [ ] API 文档自动生成
- [ ] 团队协作功能（远程配置共享）
- [ ] 请求书签/收藏
- [ ] WebSocket / SSE 支持
- [ ] gRPC 支持

---

## 优先级建议

### 高优先级（日常工作高频需求）
1. 批量执行测试
2. 导入/导出增强（OpenAPI 导入）

### 中优先级（提升效率）
3. 脚本增强（sendRequest）
4. 响应格式增强
5. 环境管理优化
6. 前端架构优化

### 低优先级（锦上添花）
7. 响应对比
8. 快捷键
9. MCP 增强
10. 其他高级功能

---

*最后更新：2026-04-06*
