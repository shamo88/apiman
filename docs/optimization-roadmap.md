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

**当前状态**：App.tsx 超过 5000 行，所有状态集中管理

**优化方向**：
- 拆分独立 hooks（useProject、useRequest、useEnvironment 等）
- 引入 React Context 替代部分 prop drilling
- 考虑引入状态管理库（zustand）
- 组件拆分（历史记录详情、独立设置弹窗等）

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

*最后更新：2026-04-02*
