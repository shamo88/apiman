# Apiman MCP Server 技术方案

## 概述

为 Apiman 添加 MCP (Model Context Protocol) Server 能力，使 AI 助手（如 Claude Code）能够通过标准 MCP 协议调用 Apiman 的项目管理、API 请求执行等功能。

## 架构设计

### 模式选择：嵌入模式

MCP Server 运行在 Apiman 主进程内，直接调用 `service` 层，复用现有业务逻辑。

```
┌─────────────────────────────────────────────────────────┐
│                    apiman 主进程                         │
│                                                          │
│  ┌────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ GUI/Wails  │    │ MCP Server   │    │  Service   │ │
│  │            │    │ :3847/mcp    │───►│ (复用)     │ │
│  └────────────┘    └──────────────┘    └────────────┘ │
│                          ▲                              │
│                          │                              │
│                    HTTP Streamable                      │
└─────────────────────────────────────────────────────────┘
```

### 目录结构

```
internal/mcp/
├── server.go        # HTTP Streamable Server 主循环
├── handler.go       # MCP 工具调用 → service 映射
├── middleware.go    # API Key 认证中间件
├── tools.go         # MCP 工具定义 (name, description, schema)
└── types.go         # MCP 协议类型定义

frontend/src/components/
└── MCPSettingsModal.tsx   # 设置弹窗组件
```

---

## 数据结构

### 配置结构 (config.go)

```go
type MCPConfig struct {
    Enabled    bool   `json:"enabled"`
    Port       int    `json:"port"`
    ProjectID  string `json:"project_id"`   // 绑定的项目 ID
    APIKey     string `json:"api_key"`      // 认证密钥
}
```

新增字段到 `AppConfig`:
```go
type AppConfig struct {
    Proxy    ProxyConfig    `json:"proxy"`
    UI       UIConfig      `json:"ui"`
    GitSync  GitSyncConfig `json:"gitSync"`
    MCP      MCPConfig     `json:"mcp"`       // 新增
}
```

### MCP 类型 (types.go)

```go
// MCP Request ID 类型 (请求在项目中的唯一标识)
type MCPRequestID struct {
    ProjectID string `json:"project_id"`
    RequestID string `json:"request_id"`
}

// MCP API 信息 (用于 list_apis 返回)
type MCPAPIInfo struct {
    ID       string        `json:"id"`
    Name     string        `json:"name"`
    Method   string        `json:"method"`
    URL      string        `json:"url"`
    Path     string        `json:"path"`       // request|<project-id>|<request-id>
    Children []*MCPAPIInfo `json:"children"`   // 子节点（用例）
}

// MCP 脚本信息 (用于 list_scripts 返回)
type MCPScriptInfo struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`
}

// MCP 请求详情 (用于 get_request 返回)
type MCPRequestDetail struct {
    ID          string                  `json:"id"`
    Name        string                  `json:"name"`
    Method      string                  `json:"method"`
    URL         string                  `json:"url"`
    Headers     []models.RequestKeyVal  `json:"headers"`
    Params      []models.RequestKeyVal  `json:"params"`
    Body        string                  `json:"body"`
    BodyType    string                  `json:"body_type"`
    PreScripts  []string                `json:"pre_scripts"`   // 脚本内容
    PostScripts []string                `json:"post_scripts"`
    Cases       []models.HttpRequestCase `json:"cases"`
}

// MCP 用例数据 (用于 create_case 输入)
type MCPCaseData struct {
    Name string                `json:"name"`
    Spec models.HttpRequestSpec `json:"spec"`
}
```

---

## MCP 工具列表

| 工具名 | 描述 | 输入 | 输出 |
|--------|------|------|------|
| `mcp_list_apis` | 查询项目下所有接口（含多级目录） | `{}` | `{folders: [], requests: []}` |
| `mcp_list_scripts` | 查询项目下所有脚本 | `{}` | `MCPScriptInfo[]` |
| `mcp_create_request` | 创建接口 | `{parent_id?, spec}` | `{id, name}` |
| `mcp_get_request` | 获取请求详情（包含脚本） | `{path: string}` | `MCPRequestDetail` |
| `mcp_create_case` | 创建接口用例 | `{path, case_data}` | `{id, name}` |
| `mcp_update_case` | 更新接口用例 | `{path, case_id, case_data}` | `{id, name}` |
| `mcp_create_folder` | 创建文件夹 | `{parent_id?, name}` | `{id, name}` |
| `mcp_execute_request` | 执行 HTTP 请求 | `{path, case_id?}` | `CurlResponse` |
| `mcp_execute_raw` | 执行原始 HTTP 请求 | `HttpRequestSpec` | `CurlResponse` |

### 工具详细定义

#### 1. mcp_list_apis

查询绑定项目下的所有接口树形结构。

**输入：**
```json
{}
```

**输出：**
```json
{
  "folders": [
    {
      "id": "folder-uuid",
      "name": "用户模块",
      "children": [
        {"id": "req-uuid", "name": "登录", "method": "POST", "url": "/api/login", "path": "request|proj|req"},
        {"id": "req-uuid-2", "name": "注册", "method": "POST", "url": "/api/register", "path": "request|proj|req2", "children": [
          {"id": "case-uuid", "name": "正常注册", "path": "..."},
          {"id": "case-uuid-2", "name": "重复注册", "path": "..."}
        ]}
      ]
    }
  ],
  "requests": [
    {"id": "req-uuid-3", "name": "获取用户信息", "method": "GET", "url": "/api/user/:id", "path": "..."}
  ]
}
```

#### 2. mcp_list_scripts

查询项目下所有脚本（仅返回 id、名称、描述）。

**输入：**
```json
{}
```

**输出：**
```json
[
  {"id": "script-uuid-1", "name": "生成签名", "description": "用于生成 HMAC 签名"},
  {"id": "script-uuid-2", "name": "解析响应", "description": "解析 JSON 响应"}
]
```

#### 3. mcp_create_request

在绑定项目中创建新接口。

**输入：**
```json
{
  "parent_id": "folder-uuid",  // 可选，指定父文件夹 ID，不填则创建在根目录
  "spec": {
    "name": "登录接口",
    "method": "POST",
    "http_url": "{{baseUrl}}/api/login",
    "headers": [{"key": "Content-Type", "value": "application/json", "enabled": true}],
    "params": [],
    "body": "{\"username\": \"{{username}}\", \"password\": \"{{password}}\"}",
    "body_type": "raw"
  }
}
```

**输出：**
```json
{
  "id": "new-request-uuid",
  "name": "登录接口"
}
```

#### 4. mcp_get_request

获取请求的完整详情。

**输入：**
```json
{
  "path": "request|project-id|request-id"
}
```

**输出：**
```json
{
  "id": "request-id",
  "name": "登录",
  "method": "POST",
  "url": "{{baseUrl}}/api/login",
  "headers": [
    {"key": "Content-Type", "value": "application/json", "enabled": true}
  ],
  "params": [],
  "body": "{\"username\": \"{{username}}\", \"password\": \"{{password}}\"}",
  "body_type": "raw",
  "pre_scripts": ["// 签名脚本\nam.request.headers.set('X-Sign', sign(am.request.body));"],
  "post_scripts": ["// 解析 token\nvar token = am.response.json().token;\nam.globals.set('token', token);"],
  "cases": [
    {"id": "case-1", "name": "正常登录", "spec": {...}},
    {"id": "case-2", "name": "密码错误", "spec": {...}}
  ]
}
```

#### 5. mcp_create_case

为指定请求创建新用例。

**输入：**
```json
{
  "path": "request|project-id|request-id",
  "case_data": {
    "name": "新用例",
    "spec": {
      "method": "POST",
      "http_url": "{{baseUrl}}/api/login",
      "headers": [{"key": "Content-Type", "value": "application/json", "enabled": true}],
      "body": "{\"username\": \"test\", \"password\": \"wrong\"}"
    }
  }
}
```

**输出：**
```json
{
  "id": "new-case-uuid",
  "name": "新用例"
}
```

#### 6. mcp_update_case

更新指定请求的已有用例。

**输入：**
```json
{
  "path": "request|project-id|request-id",
  "case_id": "case-uuid",
  "case_data": {
    "name": "更新后的用例名",
    "spec": {
      "method": "POST",
      "http_url": "{{baseUrl}}/api/login",
      "headers": [{"key": "Content-Type", "value": "application/json", "enabled": true}],
      "body": "{\"username\": \"admin\", \"password\": \"right\"}",
      "params": [],
      "body_type": "raw"
    }
  }
}
```

**输出：**
```json
{
  "id": "case-uuid",
  "name": "更新后的用例名"
}
```

#### 7. mcp_create_folder

在绑定项目中创建新文件夹。

**输入：**
```json
{
  "parent_id": "folder-uuid",  // 可选，指定父文件夹 ID，不填则创建在根目录
  "name": "用户模块"
}
```

**输出：**
```json
{
  "id": "new-folder-uuid",
  "name": "用户模块"
}
```

#### 8. mcp_execute_request

执行指定请求（支持选择用例）。

**输入：**
```json
{
  "path": "request|project-id|request-id",
  "case_id": "case-uuid"  // 可选，不填则使用 active case
}
```

**输出：**
```json
{
  "status_code": 200,
  "headers": {"content-type": ["application/json"]},
  "body": "{\"code\": 0, \"data\": {\"token\": \"xxx\"}}",
  "duration": 125,
  "script_logs": ["token saved to globals"],
  "tests": [
    {"name": "响应码为 200", "passed": true}
  ]
}
```

#### 9. mcp_execute_raw

执行原始 HTTP 请求（不依赖已保存的请求）。

**输入：**
```json
{
  "method": "POST",
  "http_url": "https://api.example.com/login",
  "headers": [{"key": "Content-Type", "value": "application/json", "enabled": true}],
  "body": "{\"username\": \"test\", \"password\": \"123456\"}"
}
```

**输出：**
```json
{
  "status_code": 200,
  "headers": {...},
  "body": "{\"code\": 0}",
  "duration": 89
}
```

---

## 协议设计

### HTTP Streamable 传输

MCP 协议使用 HTTP Streamable 传输（官方推荐）。

**端点：**

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/mcp/streamable` | MCP 主端点（双向流） |
| GET | `/mcp/health` | 健康检查 |
| GET | `/mcp/info` | Server 信息 |

### 认证方式

所有请求需要携带 API Key：

```
Authorization: Bearer <api_key>
```

中间件验证失败返回 `401 Unauthorized`。

### 响应格式

标准 MCP JSON-RPC 2.0 响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {"type": "text", "text": "{\"status\": \"ok\"}"}
    ],
    "isError": false
  }
}
```

错误响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

---

## 交互设计

### 底栏按钮

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 Cookie                                                ⚡ MCP │  ← 28px 底栏
└─────────────────────────────────────────────────────────────────┘
```

- 默认状态（未启用）：灰色文字 `⚡ MCP`
- 运行中状态：绿色点 + 文字 `● ⚡ MCP 运行中`
- 错误状态：红色点 + 文字 `● ⚡ MCP 错误`

### 设置弹窗

点击底栏 MCP 按钮打开设置弹窗：

```
┌─────────────────────────────────────────────────┐
│  MCP Server 设置                                  │
│                                                  │
│  端口: [3847____]           [🔄] 随机            │
│                                                  │
│  项目: [▼ 选择项目________]                      │
│                                                  │
│  密钥: [****************]    [🔄] 随机生成       │
│                                                  │
│  ☐ 启用 MCP 服务                                │
│                                                  │
│           [取消]              [保存并重启]       │
└─────────────────────────────────────────────────┘
```

**说明：**
- 端口：MCP Server 监听端口，默认 3847
- 项目：下拉选择已有项目，MCP 将绑定到该项目
- 密钥：Bearer Token，用于 AI 客户端认证；点击随机生成
- 启用：勾选后启动 MCP 服务

### Claude Code 配置示例

用户需要在 Claude Code 配置中添加：

```json
// ~/.claude/settings.json 或项目级 .mcp.json
{
  "mcpServers": {
    "apiman": {
      "transport": "streamable-http",
      "url": "http://localhost:3847/mcp/streamable",
      "headers": {
        "Authorization": "Bearer <生成的密钥>"
      }
    }
  }
}
```

---

## 前端组件

### App.tsx 改动

1. 新增 state：
```typescript
const [mcpModalVisible, setMCPModalVisible] = useState(false);
const [mcpConfig, setMCPConfig] = useState<MCPConfig>({...});
const [mcpStatus, setMCPStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
```

2. 底栏新增按钮：
```tsx
<div className="app-footer">
    <Button icon={<SafetyOutlined />} onClick={() => { setCookieModalVisible(true); loadGlobalCookies(); }}>
        Cookie
    </Button>
    <Button
        icon={<ApiOutlined />}
        className={`mcp-status ${mcpStatus}`}
        onClick={() => setMCPModalVisible(true)}
    >
        {mcpStatus === 'running' ? '●' : ''} MCP {mcpStatus === 'running' ? '运行中' : ''}
    </Button>
</div>
```

### MCPSettingsModal.tsx

设置弹窗组件，包含：
- 端口输入 + 随机按钮
- 项目下拉选择
- 密钥输入 + 随机生成按钮
- 启用复选框
- 保存/取消按钮

---

## 服务层集成

### app.go 新增方法

```go
// MCP 配置管理
func (a *App) LoadMCPConfig() (*config.MCPConfig, error)
func (a *App) SaveMCPConfig(cfg *config.MCPConfig) error

// MCP 服务控制
func (a *App) StartMCPServer() error
func (a *App) StopMCPServer() error
func (a *App) GetMCPStatus() string

// 项目列表（供前端下拉选择）
func (a *App) ListProjects() ([]models.Project, error)
```

### 启动流程

1. Apiman 启动时读取 `config.json` 中的 MCP 配置
2. 如果 `MCPConfig.Enabled == true`，自动启动 MCP Server
3. MCP Server 绑定到配置的端口和项目

### 自动创建项目

如果配置的 `ProjectID` 不存在：
```go
func ensureMCPProject(service *Service, config *MCPConfig) error {
    if config.ProjectID == "" {
        // 创建默认 MCP 项目
        project, err := service.CreateProject("MCP Default Project")
        if err != nil {
            return err
        }
        config.ProjectID = project.ID
    }
    return nil
}
```

---

## 实现步骤

### Phase 1: 数据层
- [x] `config/config.go` - 新增 `MCPConfig` 结构体和 Load/Save 方法
- [x] `models/models.go` - 新增 MCP 相关类型

### Phase 2: MCP 协议层
- [x] `internal/mcp/types.go` - MCP 协议类型定义
- [x] `internal/mcp/tools.go` - 工具定义
- [x] `internal/mcp/middleware.go` - API Key 认证中间件
- [x] `internal/mcp/handler.go` - 工具调用 → service 映射
- [x] `internal/mcp/server.go` - HTTP Streamable Server 主循环

### Phase 2.1: 新增工具实现
- [x] `mcp_update_case` - 更新接口用例
- [x] `mcp_create_request` - 创建接口
- [x] `mcp_create_folder` - 创建文件夹

### Phase 3: 服务集成
- [x] `app.go` - 新增 MCP 相关方法
- [x] `main.go` - 启动时根据配置恢复 MCP 状态

### Phase 4: 前端
- [x] `App.css` - MCP 底栏按钮样式
- [x] `App.tsx` - 底栏按钮 + 状态管理
- [x] `components/MCPSettingsModal.tsx` - 设置弹窗组件

### Phase 5: 测试
- [x] MCP 协议测试（已通过 Claude Code 调用验证）

---

## 错误处理

| 场景 | 返回错误码 | 错误信息 |
|------|-----------|---------|
| 未授权 | 401 | `Unauthorized: invalid API key` |
| 项目不存在 | 404 | `Project not found` |
| 请求不存在 | 404 | `Request not found` |
| 执行失败 | 500 | `Execution failed: <detail>` |
| 服务未启动 | 503 | `MCP server not running` |

---

## 安全考虑

1. **API Key 认证**：所有 MCP 请求必须携带有效的 Bearer Token
2. **本地监听**：MCP Server 默认只监听 `localhost`，不暴露到公网
3. **密钥存储**：API Key 明文存储在 `config.json`，可考虑加密
4. **CORS**：限制只允许本地请求

---

## 配置持久化

`~/.apiman/config.json` 示例：

```json
{
  "proxy": {...},
  "ui": {"theme": "light"},
  "gitSync": {...},
  "mcp": {
    "enabled": true,
    "port": 3847,
    "project_id": "abc123-uuid",
    "api_key": "mcp_sk_xxxxxxxxxxxx"
  }
}
```
