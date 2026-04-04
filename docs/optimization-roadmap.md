# Apiman 优化建议

本文档记录 Apiman 后续迭代的优化方向与待实现功能。

---

## 1. 响应展示增强

**当前状态**：只支持 JSON 格式化

**优化方向**：
- 自动检测响应类型并格式化（XML/JSON/HTML/纯文本）
- 增加「原始视图」与「格式化视图」切换
- 响应头折叠展示（当前全部平铺）
- 图片/PDF 等二进制响应预览

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

**当前 App.tsx 大小**：
- 原始：4080 行
- 当前：2612 行（累计减少 ~60 行 from 本次集成）
- 目标：500-800 行

**App.tsx 当前结构分析**（2522 行）：
```
App.tsx (2522 行)
├── 导入 (1-39)
├── 状态定义 (~200行)
├── 树操作辅助 (~200行) - toggleFolderCollapse, clearDragState, checkDrop* 等
├── 拖拽处理 (~150行)
├── 项目/文件夹/请求管理 (~400行)
├── 环境管理 (~150行)
├── 脚本管理 (~150行)
├── 搜索过滤 (~50行)
├── useEffects (~100行)
├── 渲染逻辑 (~900行) - 已大部分组件化
└── 模态框/弹窗 (~200行)
```

**待完成组件化计划**：

| 优先级 | 模块 | 描述 | 预估减少 |
|--------|------|------|----------|
| P1 | ~~类型定义统一~~ | ✅ 已完成（types/index.ts） | - |
| P1 | ~~curlUtils 扩展~~ | ✅ 已完成（curlUtils.ts） | - |
| P1 | ~~变量工具体系~~ | ✅ 已完成（variableUtils.ts） | - |
| P1 | ~~通用工具函数去重~~ | ✅ 已完成（misc.ts 重复函数已清理） | - |
| P2 | ~~useScript Hook 集成~~ | ✅ 已完成（useScript hook 集成，移除 ~60 行重复状态） | ~60行 |
| P2 | ~~useRequest Hook 清理~~ | ✅ 已完成（移除了 hook 中重复的函数定义） | ~20行 |
| P2 | **useRequest Hook 集成** | 进行中（需替换 42 个状态声明 + 数百处调用，setter 类型不兼容 React 函数式更新） | ~500-800行 |
| P2 | **WorkspaceContext 完善** | App.tsx 尚未使用已存在的 `WorkspaceContext` | ~300行 |

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

*最后更新：2026-04-04*
