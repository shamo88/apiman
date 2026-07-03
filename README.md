# Apiman

#### 介绍
Apiman 是一个桌面 API 测试工具，基于 Wails v2 (Go + React/TypeScript) 构建，类似于 Postman/Apifox 的功能。

#### 功能特性
- 多项目管理
- 文件夹组织
- 环境变量
- 请求用例（每个请求多个测试场景）
- JavaScript 脚本支持（基于 goja）
- Git 同步备份
- 深色/浅色主题

#### 软件架构

**后端 (Go)** - `internal/`
- `config/` - 配置管理，处理 `~/.apiman/` 存储
- `models/` - 数据结构
- `curl/` - HTTP 请求执行引擎
- `git/` - Git 同步功能
- `project/` - 项目管理
- `service/` - 业务逻辑编排

**前端 (React + TypeScript)** - `frontend/src/`
- `App.tsx` - 主 UI 组件
- `components/` - 标题栏、脚本帮助窗口等组件
- `wailsjs/` - Wails 自动生成的绑定

#### 安装教程

1. 安装 Go 1.21+
2. 安装 Node.js 18+
3. 安装 Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
4. 安装前端依赖: `cd frontend && npm install`

#### 构建命令

```bash
# 开发模式
wails dev

# 生产构建
wails build

# 仅前端构建
cd frontend && npm run build
```

#### 日志

日志文件位于: `~/.apiman/logs/apiman.log`

日志支持自动轮转，单文件最大 100MB。

#### 数据存储

项目存储在 `~/.apiman/projects/` 目录下，每个项目包含:
- `collection.postman.json` - 项目数据
- `environments.json` - 环境配置
- `variables.json` - 项目变量
- `scripts/` - 项目脚本


#### mcp服务

Apiman 内置 MCP (Model Context Protocol) 服务器，让 AI 客户端（如 Claude Desktop、opencode、Cline）能直接通过标准 JSON-RPC 2.0 协议操作项目、执行 HTTP 请求、管理环境和变量。

**协议**：`MCP 2024-11-05`（JSON-RPC 2.0 over HTTP）
**默认端点**：`http://localhost:3847/mcp/streamable`
**事件流**：`http://localhost:3847/mcp/events`（SSE，工具变更实时推送）
**健康检查**：`http://localhost:3847/mcp/health`
**服务信息**：`http://localhost:3847/mcp/info`
**能力声明**：仅 `tools`（不提供 Resources/Prompts —— apiman 是 executor 型 server）

**鉴权**：Bearer Token 放在 `Authorization` 头；`/mcp/health` 与 `/mcp/info` 免鉴权。

**配置路径**：apiman Settings → MCP Server 设置 → 启用 / 端口 / API 密钥。**初始项目绑定**可省略，启动后通过运行时状态栏或 `mcp_bind_project` 工具即时切换。

**使用示例**（opencode / Claude Code 配置）：

> opencode配置：
```json
{
  "mcp": {
    "apiman": {
      "type": "remote",
      "url": "http://localhost:3847/mcp/streamable",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

> claude code配置：
```json
{
  "mcpServers": {
    "apiman": {
      "serverUrl": "http://localhost:3847/mcp/streamable",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

##### 工具能力矩阵（36 个工具）

| 类别 | 工具 |
|---|---|
| **项目** | `mcp_list_projects` · `mcp_bind_project` |
| **文件夹** | `mcp_create_folder` · `mcp_rename_folder` · `mcp_move_folder` · `mcp_delete_folder` |
| **接口** | `mcp_create_request` · `mcp_get_request` · `mcp_update_request` · `mcp_rename_request` · `mcp_move_request` · `mcp_delete_request` · `mcp_search_apis` · `mcp_list_apis` |
| **用例** | `mcp_create_case` · `mcp_get_case` · `mcp_update_case` · `mcp_delete_case` |
| **脚本** | `mcp_list_scripts` · `mcp_create_script` · `mcp_update_script` · `mcp_delete_script` |
| **环境** | `mcp_list_environments` · `mcp_create_environment` · `mcp_update_environment` · `mcp_delete_environment` · `mcp_set_active_environment` |
| **全局变量** | `mcp_list_globals` · `mcp_get_globals` · `mcp_set_global` · `mcp_unset_global` |
| **历史** | `mcp_list_history` · `mcp_get_history_entry` · `mcp_clear_history` |
| **执行** | `mcp_execute_request` · `mcp_execute_raw` |

所有资源的 CRUD 都已闭环：项目 / 文件夹 / 接口 / 用例 / 脚本 / 环境 / 全局变量 / 运行时项目绑定 / 运行时环境激活。

##### 关键使用规则

- **环境 mark 过滤**：`mcp_set_active_environment` / `mcp_list_environments` 只允许 dev/test-marked 环境；pre/prod/未标记不可见也不可激活（防误操作生产）
- **update_* 语义**：所有 `update_*` 工具都是 PATCH/merge —— 未传的字段保留原值，不会被清空
- **execute_raw 限制**：未绑定项目时仍可执行（仅使用全局变量，无环境变量替换）；body/body_type/headers/params/form_data/url_encoded 完整支持
- **路径格式**：Request `request\|<project-id>\|<request-id>` · Folder `folder\|<project-id>\|<folder-id>` · Case `requestCase\|<project-id>\|<request-id>\|<case-id>`
- **响应值类型宽容**：`params[].value` / `headers[].value` / `form_data[].value` 等字段支持 string / number / bool / null，server 端会做类型兜底转换

##### 脚本上下文（`am.*` 对象）

pre / post script 运行时可访问以下 JS 全局对象（goja VM）：

| 对象 | 字段 |
|---|---|
| `am.request` | `method` · `url` · `headers.get/set/unset/all` · `params.get/set/unset/all` · `body.type` · `body.raw` · `body.update(...)` |
| `am.response` | `code` · `status_code` · `duration` · `elapsed_ms` · `headers.all()` · `text()` · `json()` |
| `am.globals` | `get(key)` · `set(key, value)` · `unset(key)` |
| `am.environment` | `get(key)` —— 读项目级环境变量 |
| `am.locals` | `get(key)` · `set(key, value)` · `unset(key)` —— 单次请求内有效 |
| `am.test(name, fn)` · `am.expect(actual)` | 断言 API：`.to.be()` / `.eql()` / `.include()` / `.beTrue()` / `.beFalse()` / `.have.property()` |

**变量优先级**（高→低）：pre-script `am.locals.set` > 环境变量 > 全局变量 > 父级 folder > project 默认。
