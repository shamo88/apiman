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
- ✅ 清理未使用的图标导入（7个图标）

**当前 App.tsx 大小**：
- 原始：4080 行
- 当前：3187 行（累计减少 893 行）
- 目标：500-800 行

**App.tsx 当前结构分析**：
```
App.tsx (3187 行)
├── 类型定义 (17-145, ~130行) - Project, ProjectTree, CurlRequest 等
├── 辅助函数 (147-575, ~430行)
│   ├── apiConfig 相关 (~80行)
│   ├── curl 相关 (~200行) - buildCurlCommand, parseCurlToApiConfig
│   └── 变量相关 (~100行) - builtInGenerators, getVariableSuggestions
├── 状态定义 (578-748, ~170行)
├── 事件处理函数 (750-1270, ~520行)
├── useEffects (1274-1400, ~130行)
├── 更多事件处理 (1400-2737, ~1340行)
└── 渲染逻辑 (2787-3187, ~400行) - 已大部分组件化
```

**待完成组件化计划**：

| 优先级 | 模块 | 描述 | 预估减少 |
|--------|------|------|----------|
| P1 | **类型定义统一** | 将 `Project`, `ProjectTree`, `CurlRequest`, `ApiConfig` 等移动到 `types/index.ts` | ~130行 |
| P1 | **curlUtils 扩展** | `buildCurlCommand`, `parseCurlToApiConfig` 移动到 `utils/curlUtils.ts` | ~200行 |
| P1 | **变量工具体系** | `builtInGenerators`, `getVariableSuggestions` 等移动到 `utils/variableUtils.ts` | ~100行 |
| P2 | **WorkspaceContext 完善** | 将 `ProjectWorkspaceState` 相关状态和函数提取到 `contexts/WorkspaceContext.tsx` | ~500行 |
| P2 | **useScriptEditor Hook** | 脚本编辑器相关逻辑提取到 `hooks/useScriptEditor.ts` | ~200行 |
| P2 | **useRequestEditor Hook** | 请求编辑器状态管理提取到 `hooks/useRequestEditor.ts` | ~300行 |
| P3 | **通用工具函数** | `getMethodColor`, `formatSidebarMethodLabel` 移动到 `utils/misc.ts` | ~30行 |

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

*最后更新：2026-04-03*
