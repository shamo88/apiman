# Apiman - API 管理工具

## 📖 项目概述

**Apiman** 是一款基于 Wails 框架开发的轻量级 API 测试桌面应用，融合了现代桌面应用的流畅体验与专业 API 管理工具的核心功能。它允许用户轻松创建、组织和测试 HTTP 请求，支持多项目管理、文件夹组织、变量替换等高级功能。

### 🎯 核心特性

- 🎨 **现代化界面**：采用 Apifox/Postman 风格设计，提供直观、专业的用户体验
- 🖥️ **无边框桌面应用**：完全自定义的窗口标题栏，现代化的窗口控制按钮
- 📁 **项目管理**：支持多项目隔离，每个项目包含独立的 API 集合
- 🧩 **项目分组管理**：支持分组创建、折叠、重命名、删除与拖拽排序
- 🔎 **项目搜索**：首页支持按项目名称实时搜索
- 📂 **多级文件夹组织**：支持任意深度的嵌套文件夹结构
- 🔍 **智能搜索**：支持按名称和 HTTP 方法快速筛选 API
- ↕️ **拖拽增强**：支持接口/文件夹拖拽移动，含冲突校验与可视化提示
- 🏷️ **HTTP 方法标签**：彩色标签标识不同的 HTTP 方法
- 📑 **请求用例**：单接口下可维护多条命名用例（不同 Params/Headers/Body 等），树形展开查看与编辑
- 📦 **Postman Collection 存储**：项目以 `collection.postman.json` 持久化（与 Postman 集合结构对齐），支持导入 Postman Collection
- 💾 **持久化存储**：所有数据存储在本地文件系统，跨会话保持
- ⚡ **热重载开发**：支持前后端代码修改后自动热更新
- 🔄 **变量替换**：支持 `{{variable}}` 语法进行动态变量替换
- 🌐 **环境变量管理**：支持多环境创建与变量维护，请求可按环境切换取值
- ✨ **变量高亮与补全**：请求配置区支持 `{{variable}}` 高亮与联想补全
- 🔌 **网络代理**：支持 HTTP/HTTPS/SOCKS5 代理配置并在请求执行时生效
- 📊 **响应展示**：支持状态码、响应时间、格式化响应体展示
- 🤖 **MCP Server**：内置 MCP (Model Context Protocol) Server，支持 AI 助手通过标准协议调用 Apiman 的项目管理、API 请求执行等功能

***

## 🏗️ 技术栈

### 后端 (Go)

- **框架**：Wails v2.11.0 - 使用 Go 和 Web 技术构建桌面应用
- **UUID**：github.com/google/uuid v1.6.0 - 生成唯一标识符
- **Git 同步**：github.com/go-git/go-git/v5 v5.17.0 - Git 仓库同步功能
- **并发安全**：使用 Go 标准库的 sync.RWMutex 保证线程安全
- **版本**：Go 1.24.0

### 前端 (React + TypeScript)

- **框架**：React 18.2 + TypeScript 4.6
- **UI 组件**：Ant Design 6.3.4 - 企业级 React 组件库
- **构建工具**：Vite 3.2.11 - 下一代前端构建工具
- **图标库**：@ant-design/icons 6.1.0
- **字体**：Outfit (正文) + JetBrains Mono (代码)

***

## 📂 项目结构

```
apiman/
├── main.go                    # 应用入口点，配置无边框窗口
├── app.go                     # Wails 应用主类，暴露后端方法
├── wails.json                # Wails 配置文件
├── go.mod / go.sum           # Go 依赖管理
│
├── internal/                  # 内部业务逻辑包
│   ├── config/               # 配置管理模块
│   │   └── config.go        # 配置文件读写（环境变量、全局变量）
│   │
│   ├── git/                  # Git 同步模块
│   │   └── git.go          # Git 仓库克隆/拉取/推送/提交
│   │
│   ├── mcp/                  # MCP Server 模块
│   │   ├── server.go       # HTTP Streamable Server 主循环
│   │   ├── handler.go      # MCP 工具调用 → service 映射
│   │   ├── middleware.go   # API Key 认证中间件
│   │   ├── tools.go        # MCP 工具定义
│   │   └── types.go        # MCP 协议类型定义
│   │
│   ├── curl/                 # Curl 执行引擎
│   │   ├── curl.go          # HTTP 请求执行、响应格式化
│   │   └── exec_with_scripts.go  # 脚本增强的请求执行
│   │
│   ├── models/               # 数据模型定义
│   │   └── models.go        # 数据结构（Project、Folder、Request、HttpRequestCase、CurlResponse 等）
│   │
│   ├── postman/              # Postman 集合模型与读写
│   │   ├── collection.go    # collection.postman.json 加载/保存、集合树结构
│   │   ├── cases.go         # 请求用例 CRUD 与树路径
│   │   ├── postman.go       # 导入/转换工具
│   │   └── request_spec.go  # 请求规格与模型映射
│   │
│   ├── script/                # JavaScript 脚本引擎
│   │   ├── runtime.go       # goja VM 运行时与 am API
│   │   ├── executor.go      # 脚本执行器
│   │   └── crypto.go        # 加密工具（MD5/SHA/AES/RSA 等）
│   │
│   └── service/              # 服务层
│       └── service.go        # 业务逻辑编排
│
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── TitleBar.tsx # 自定义窗口标题栏组件
│   │   │   ├── ScriptHelpWindow.tsx # 脚本 API 帮助浮窗组件
│   │   │   └── MCPSettingsModal.tsx # MCP Server 设置弹窗组件
│   │   │
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript 类型定义
│   │   │
│   │   ├── assets/
│   │   │   ├── fonts/       # 字体文件
│   │   │   └── images/      # 图片资源
│   │   │
│   │   ├── App.tsx          # 主应用组件
│   │   ├── App.css          # 主样式文件
│   │   ├── main.tsx         # React 入口
│   │   ├── style.css        # 全局样式
│   │   └── vite-env.d.ts    # Vite 类型声明
│   │
│   ├── public/
│   │   └── logo.png         # 应用图标
│   │
│   ├── wailsjs/              # Wails 生成的类型绑定
│   │   ├── go/
│   │   │   ├── main/
│   │   │   │   ├── App.d.ts # Go 方法的 TypeScript 类型定义
│   │   │   │   └── App.js  # Go 方法的 JavaScript 绑定
│   │   │   └── models.ts   # Go 结构的 TypeScript 模型
│   │   │
│   │   └── runtime/
│   │       ├── runtime.d.ts # Wails runtime 类型定义
│   │       ├── runtime.js   # Wails runtime 实现
│   │       └── package.json
│   │
│   ├── index.html           # HTML 入口
│   ├── package.json         # 前端依赖
│   ├── tsconfig.json        # TypeScript 配置
│   └── vite.config.ts       # Vite 配置
│
├── design/                   # 设计资源
│   └── 接口列表.png          # UI 设计图
│
└── build/                   # 构建输出目录
    └── bin/
        └── apiman.exe       # Windows 可执行文件
```

***

## 🧩 核心模块设计

### 1. **配置管理模块** (`internal/config`)

负责应用配置和数据的持久化存储。

**存储位置**：`~/.apiman/`

**核心功能**：

- 📁 管理项目目录结构
- 🌐 管理环境变量（`environments.json`）
- 🔧 管理全局变量（`variables.json`）
- 🔒 线程安全的读写操作（RWMutex）

**关键方法**：

```go
GetConfigDir()      // 获取配置目录
GetProjectsDir()    // 获取项目存储目录
LoadEnvironments()  // 加载环境变量
SaveGlobalVariables() // 保存全局变量
LoadAppConfig()     // 加载应用配置（代理、UI、Git 同步）
SaveAppConfig()     // 保存应用配置
```

**AppConfig 结构**：

```go
type AppConfig struct {
    Proxy    ProxyConfig    `json:"proxy"`     // 代理配置
    UI       UIConfig      `json:"ui"`        // UI 配置
    GitSync  GitSyncConfig `json:"gitSync"`   // Git 同步配置
    MCP      MCPConfig     `json:"mcp"`       // MCP Server 配置
}

type ProxyConfig struct {
    Enabled    bool   `json:"enabled"`
    HTTPHost   string `json:"httpHost,omitempty"`
    HTTPPort   int    `json:"httpPort,omitempty"`
    HTTPSHost  string `json:"httpsHost,omitempty"`
    HTTPSPort  int    `json:"httpsPort,omitempty"`
    SOCKS5Host string `json:"socks5Host,omitempty"`
    SOCKS5Port int    `json:"socks5Port,omitempty"`
}

type GitSyncConfig struct {
    Enabled   bool   `json:"enabled"`
    RemoteURL string `json:"remoteUrl,omitempty"`
    Branch    string `json:"branch,omitempty"`
    AuthType  string `json:"authType,omitempty"`
    Password  string `json:"password,omitempty"`
    AutoSync  bool   `json:"autoSync"`
    WorkDir   string `json:"workDir,omitempty"`
}

type MCPConfig struct {
    Enabled    bool   `json:"enabled"`
    Port       int    `json:"port"`
    ProjectID  string `json:"project_id"`   // 绑定的项目 ID
    APIKey     string `json:"api_key"`      // 认证密钥
}
```

### 2. **项目管理模块** (`internal/project`)

负责项目的创建、删除和树形结构管理。

**核心概念**：

- **Project**：顶级容器，磁盘上以项目目录存在；集合数据保存在该目录下的 **`collection.postman.json`**
- **Folder / Request**：集合中的文件夹与请求项（与 Postman `item` 树一致）
- **Request Case（用例）**：同一请求下的多条场景配置（独立 `spec`），在侧栏作为子节点展示
- **ProjectGroupsState**：项目分组状态（分组顺序、项目归属、折叠状态）

**数据结构**：

```go
type Project struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Path      string    `json:"path"`
    CreatedAt time.Time `json:"created_at"`
}

type Folder struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    ProjectID string    `json:"project_id"`
    ParentID  string    `json:"parent_id"`
    Path      string    `json:"path"`
    CreatedAt time.Time `json:"created_at"`
}

type CurlRequest struct {
    ID           string    `json:"id"`
    Name         string    `json:"name"`
    ProjectID    string    `json:"project_id"`
    FolderID     string    `json:"folder_id"`
    Path         string    `json:"path"`
    Content      string    `json:"content,omitempty"`
    PreScripts   []string  `json:"pre_scripts,omitempty"`
    PostScripts  []string  `json:"post_scripts,omitempty"`
    CreatedAt    time.Time `json:"created_at"`
    UpdatedAt    time.Time `json:"updated_at"`

    // 扁平化 HTTP 字段
    Method     string          `json:"method,omitempty"`
    HttpURL    string          `json:"http_url,omitempty"`
    Headers    []RequestKeyVal `json:"headers,omitempty"`
    Params     []RequestKeyVal `json:"params,omitempty"`
    Body       string          `json:"body,omitempty"`
    BodyType   string          `json:"body_type,omitempty"`
    FormData   []RequestPair   `json:"form_data,omitempty"`
    UrlEncoded []RequestPair   `json:"url_encoded,omitempty"`

    // 用例支持
    Cases        []HttpRequestCase `json:"cases,omitempty"`
    ActiveCaseID string            `json:"active_case_id,omitempty"`
}
```

> 完整定义见 `internal/models/models.go`。

**文件存储格式（当前实现）**：

```
~/.apiman/projects/
├── projects.json                        # 项目分组状态（排序/归属/折叠）
├── {project-slug}__{project-uuid}/
│   ├── meta.json                        # 项目元数据（展示名、路径等）
│   ├── collection.postman.json          # 项目 API 集合（文件夹、请求、用例；Postman v2.1 兼容形态）
│   └── scripts/                         # 项目级脚本（若已创建）
│       └── ...
```

> 以 **`collection.postman.json`** 为单一事实来源，由 `internal/postman` 读写。

### 3. **Curl 执行引擎** (`internal/curl`)

将 curl 命令解析并执行为真实的 HTTP 请求。

**核心能力**：

- 🔄 **命令解析**：支持解析 curl 命令的所有常用参数
  - `-X`：HTTP 方法
  - `-H`：请求头
  - `-d`：请求体
  - `-F`：表单字段（multipart/form-data）
  - `-u`：Basic 认证
- 📤 **请求执行**：使用 Go 标准库 `net/http` 执行请求
- 📥 **响应处理**：返回状态码、响应头、响应体、执行时间
- 🖨️ **格式化**：支持 JSON 响应格式化（缩进对齐）
- 🔍 **变量提取**：`{{variable}}` 语法支持
- 🔄 **变量替换**：运行时替换变量为实际值
- 🔌 **代理支持**：支持 HTTP/HTTPS/SOCKS5 代理
- ⚡ **动态变量**：支持 `{{$date.timestamp}}`, `{{$date.timestampMs}}`, `{{$date.now}}`, `{{$uuid}}`, `{{$random.int}}`, `{{$random.float}}`, `{{$random.alpha(n)}}`, `{{$random.alphanumeric(n)}}` 等动态生成器

**响应格式**：

```go
type CurlResponse struct {
    StatusCode int               `json:"status_code"`  // HTTP 状态码
    Headers    map[string]string `json:"headers"`       // 响应头
    Body       string            `json:"body"`          // 响应体
    Duration   int64             `json:"duration"`      // 执行时间（毫秒）
    Error      string            `json:"error"`        // 错误信息
}
```

### 4. **服务层** (`internal/service`)

业务逻辑编排层，协调各模块工作。

### 5. **Git 同步模块** (`internal/git`)

负责项目数据与 Git 仓库的同步。

**核心功能**：

- 🌐 **仓库克隆/初始化**：从远程仓库克隆或创建新仓库
- 🔄 **自动同步**：支持项目的自动拉取和推送
- 🔒 **认证支持**：支持 Token 和密码认证
- 📁 **项目隔离**：每个项目存储在 `projects/{slug}__{uuid}/` 目录

**关键方法**：

```go
CloneOrPull(remoteURL, branch, password) // 克隆或拉取
CommitAndPush(files, message, branch, password) // 提交并推送
SyncProject(projectPath, projectID, message, branch, password) // 同步单个项目
HasLocalRepo() bool // 检查本地仓库是否存在
```

### 6. **项目脚本管理**

项目级脚本存储在 `scripts/` 目录，支持创建、编辑、删除脚本。

**App 暴露的方法**：

```go
ListProjectScripts(projectID string)    // 列出项目脚本
CreateProjectScript(projectID, name, content) // 创建脚本
UpdateProjectScript(projectID, scriptID, name, content) // 更新脚本
DeleteProjectScript(projectID, scriptID) // 删除脚本
```

### 7. **MCP Server 模块** (`internal/mcp`)

Apiman 内置 MCP (Model Context Protocol) Server，使 AI 助手（如 Claude Code）能够通过标准 MCP 协议直接调用 Apiman 功能。

**核心能力**：

- 🔌 **HTTP Streamable 传输**：使用 MCP 官方推荐的 HTTP Streamable 传输模式
- 🔐 **API Key 认证**：所有请求需携带 Bearer Token 认证
- 📁 **项目绑定**：MCP Server 绑定到指定项目，操作权限限于该项目
- ⚡ **完整工具集**：覆盖 API 查询、创建、执行全流程

**MCP 工具列表**：

| 工具名 | 描述 |
|--------|------|
| `mcp_list_apis` | 列出绑定项目下所有接口（含多级目录） |
| `mcp_list_scripts` | 列出绑定项目下所有脚本 |
| `mcp_get_request` | 获取指定请求的完整详情 |
| `mcp_create_case` | 为指定请求创建新用例 |
| `mcp_update_case` | 更新指定请求的已有用例 |
| `mcp_create_request` | 在绑定项目中创建新接口 |
| `mcp_create_folder` | 在绑定项目中创建新文件夹 |
| `mcp_execute_request` | 执行已保存的 HTTP 请求（支持指定用例） |
| `mcp_execute_raw` | 执行原始 HTTP 请求（不依赖已保存的请求） |

**端点**：

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/mcp/streamable` | MCP 主端点（双向流） |
| GET | `/mcp/health` | 健康检查 |
| GET | `/mcp/info` | Server 信息 |

**Claude Code 配置示例**：

```json
{
  "mcpServers": {
    "apiman": {
      "transport": "streamable-http",
      "url": "http://localhost:3847/mcp/streamable",
      "headers": {
        "Authorization": "Bearer <配置的API密钥>"
      }
    }
  }
}
```

**关键方法**：

```go
LoadMCPConfig()     // 加载 MCP 配置
SaveMCPConfig(cfg)  // 保存 MCP 配置
StartMCPServer()    // 启动 MCP 服务
StopMCPServer()     // 停止 MCP 服务
GetMCPStatus()      // 获取服务状态
```

***

## 🎨 前端架构

### **窗口系统**

#### 无边框窗口配置

```go
// main.go
err := wails.Run(&options.App{
    Title:            "Apiman - API Management Tool",
    Width:            1280,
    Height:           800,
    Frameless:        true,  // 启用无边框模式
    BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 255},
    // ...
})
```

#### 自定义标题栏组件 (`TitleBar.tsx`)

**布局结构**：

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] │ [Tab1] [Tab2] [Tab3] ...        │ ─ □ ✕ │
└─────────────────────────────────────────────────────────┘
   ↓          ↓                               ↓
 可拖拽    可拖拽区域                     窗口控制按钮
```

**核心功能**：

- 🎨 Logo 显示在左侧
- 📑 标签页与 Logo 并排显示
- 🖱️ 整个标题栏（除控制按钮外）可拖动窗口
- 🎛️ 自定义窗口控制按钮（最小化、最大化、关闭）
- 🔄 使用 Wails runtime API 控制窗口

**拖拽实现**：

```typescript
// 使用 Wails 官方的拖拽属性
.title-bar {
    --wails-draggable: drag;  // 可拖拽区域
}

.title-bar-controls button {
    --wails-draggable: no-drag;  // 按钮不拦截拖拽事件
}
```

**窗口控制方法**：

```typescript
import { WindowMinimise, WindowToggleMaximise, Quit } from '../../wailsjs/runtime/runtime';

// 最小化
await WindowMinimise();

// 最大化/还原切换
await WindowToggleMaximise();

// 关闭应用
await Quit();
```

### **UI 设计风格**

采用 **Apifox/Postman** 混合风格：

#### 左侧边栏（Apifox 风格）

- 🔍 **搜索框**：快速搜索接口名称（及用例名等）
- 🎯 **方法过滤器**：按 HTTP 方法筛选
- 📁 **文件夹树**：可折叠的多级目录结构；文件夹与同级接口的**展开箭头左缘对齐**（行首预留与接口行一致的左边框占位）
- 🏷️ **HTTP 标签**：彩色标签标识方法；侧栏文案缩写 **`DELETE`→`DEL`**、**`PATCH`→`PAT`**，其余方法名最长 7 字符
- 📐 **类型与名称**：方法标签置于固定 **42px** 宽列，列与接口名之间 **无额外 margin**（名称紧随列后；视觉间隙来自「列宽 − 标签实际宽度」）
- 📂 **请求用例**：有子用例的请求可展开；子行左侧为 **用例图标**（`ExperimentOutlined`），与接口名**左缘对齐**（与同宽列布局）；图标在列内**靠右**以贴近名称，与文字**垂直居中**
- ✅ **选中态**：仅当点击**用例行**时高亮该用例；点击**接口行**不高亮子用例。选中行样式统一为**左侧主题色竖条** + **整行背景与 hover 相同**（`--bg-hover`）。选中用例时**父级接口行**不再显示「当前打开接口」的左侧强调条，避免父子同时抢焦点

#### HTTP 方法颜色规范

- **GET** → 蓝色 `#61affe`
- **POST** → 绿色 `#49cc90`
- **PUT** → 橙色 `#fca130`
- **DELETE** → 红色 `#f93e3e`
- **PATCH** → 青色 `#50e3c2`
- **OPTIONS** → 深蓝 `#0d5aa7`
- **HEAD** → 紫色 `#9012fe`

#### 右侧主区域（Postman 风格）

- 📋 **请求标签栏**：多标签支持
- 📝 **请求配置区**：
  - 方法选择器
  - URL 输入框
  - Params 参数编辑
  - Headers 请求头编辑
  - Body 请求体编辑
- 📊 **响应展示区**：
  - 状态码徽章
  - 响应时间
  - 响应体（支持 JSON 格式化）

### **组件状态管理**

使用 React Hooks (`useState`) 管理状态：

```typescript
// 项目状态
const [projects, setProjects] = useState<Project[]>([]);
const [projectTabs, setProjectTabs] = useState<ProjectTab[]>([]);

// API 配置状态
const [apiConfig, setApiConfig] = useState<ApiConfig>({
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: '',
    bodyType: 'none'
});

// UI 交互状态
const [searchKeyword, setSearchKeyword] = useState('');
const [filterMethod, setFilterMethod] = useState<string>('ALL');
const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
const [hoveredItem, setHoveredItem] = useState<string | null>(null);
```

***

## 🚀 安装与运行

### **环境要求**

- Go 1.23+
- Node.js 16+ (推荐 18+)
- npm 8+ (推荐 9+)
- Git

### **安装步骤**

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd apiman
   ```
2. **安装前端依赖**
   ```bash
   cd frontend
   npm install
   ```
3. **安装 Go 依赖**
   ```bash
   cd ..
   go mod download
   ```

### **开发模式运行**

**方式一：使用 Wails CLI（推荐）**

```bash
wails dev
```

**方式二：分别启动**

```bash
# 终端 1：启动前端开发服务器
cd frontend
npm run dev

# 终端 2：启动 Wails 应用
wails dev
```

### **生产构建**

```bash
wails build
```

构建产物位于 `build/bin/` 目录。

***

## 📖 使用指南

### **1. 创建项目**

1. 在首页点击「新建项目」按钮
2. 输入项目名称
3. 点击确认创建

### **2. 管理 API**

#### 创建文件夹

1. 点击侧边栏的 `+` 按钮
2. 选择「新建文件夹」
3. 输入文件夹名称
4. 在指定目录下创建文件夹
5. 支持创建多级嵌套文件夹

#### 创建 API 请求

1. 选择目标文件夹
2. 点击 `+` 按钮
3. 选择「新建请求」
4. 输入请求名称
5. 创建后自动在右侧打开编辑

### **3. 配置请求**

#### 基本信息

- **Method**：选择 HTTP 方法（GET/POST/PUT/DELETE/PATCH）
- **URL**：输入目标地址

#### Query Parameters

- 在 Params 标签页添加查询参数
- 自动拼接到 URL

#### 请求头

- 在 Headers 标签页添加自定义请求头
- 支持启用/禁用切换

#### 请求体

- **Body Type**：选择请求体类型
  - `none`：无请求体
  - `form-data`：表单数据
  - `x-www-form-urlencoded`：URL 编码表单
  - `JSON`：JSON 数据
  - `XML`：XML 数据
  - `Raw`：纯文本

### **4. 执行请求**

1. 配置完成点击「发送」按钮
2. 查看响应结果：
   - **状态码**：彩色徽章显示（200-绿色，400-橙色，500-红色）
   - **响应时间**：毫秒级精度
   - **响应体**：自动格式化显示

### **5. 保存请求**

点击「保存」按钮保存当前配置到文件。

### **6. 窗口操作**

#### 拖动窗口

- 点击并拖动标题栏的任意空白区域（Logo 和标签之间）
- 窗口将跟随鼠标移动

#### 窗口控制

- **最小化**：点击 `─` 按钮，窗口最小化到任务栏
- **最大化/还原**：点击 `□` 按钮，切换最大化状态
- **关闭**：点击 `✕` 按钮，关闭应用

***

## 🎨 界面功能说明

### **首页**

- 展示所有项目卡片
- 支持新建、打开、重命名、删除项目
- 支持项目分组（新建、折叠、重命名、删除、拖拽排序）
- 支持项目卡片拖拽到目标分组
- 支持项目名称搜索
- 卡片悬停动画效果与右上角「...」操作菜单

### **项目工作区**

#### 自定义标题栏

- **Logo**：应用标识，可点击拖动窗口
- **标签栏**：显示打开的项目标签页
- **窗口控制按钮**：最小化、最大化、关闭

#### 侧边栏

- **一级入口**：「接口列表」「环境变量」「**脚本**」同级切换
- **搜索区**：关键词搜索接口（名称、URL 等；可匹配用例名）
- **过滤器**：按 HTTP 方法筛选
- **文件夹树**：
  - 可折叠展开
  - 支持多级嵌套
  - 显示子项数量
  - 支持拖拽移动接口/文件夹
  - 移动前校验重名冲突
  - 禁止移动到自身/子目录并显示禁止放置提示
  - 移动后自动展开目标并高亮已移动项
- **接口列表**：
  - 方法彩色标签；侧栏显示 **`DEL`** **/** **`PAT`** 等缩写规则见上文「左侧边栏」
  - 接口名称与类型列布局见上文（42px 方法列、类型与名称无额外 margin）
  - 有子用例时可展开；用例行带用例图标，选中态与接口行一致（左条 + 灰底）；**仅点用例行高亮用例**
  - 支持复制、重命名、删除；用例支持复制、重命名、删除
- **环境变量**：
  - 支持环境创建/编辑/删除
  - 左侧环境列表 + 右侧标签页管理
  - 每个环境维护独立变量集合
- **脚本**：
  - 项目级脚本列表与编辑（存储于项目目录 `scripts/`）

#### 主工作区

- **请求标签栏**：支持多标签切换
- **环境选择器**：请求标签栏右侧可切换当前执行环境
- **请求配置**：
  - 方法 + URL 组合输入
  - Params/Headers/Body 标签页
  - `{{variable}}` 高亮与补全（支持方向键 + Enter 选择）
- **响应展示**：
  - 状态码 + 时间
  - 格式化响应体
- **MCP 设置**：
  - 底栏 MCP 状态按钮（显示运行/停止/错误状态）
  - 支持配置端口、项目绑定、API Key
  - 启用/禁用 MCP 服务

***

## 🔧 开发指南

### **添加新功能**

#### 后端（Go）

1. 在 `internal/models/models.go` 定义数据结构
2. 在相应模块实现业务逻辑
3. 在 `app.go` 暴露新方法给前端
4. Wails 自动生成 TypeScript 绑定

#### 前端（React）

1. 在 `App.tsx` 添加状态管理
2. 实现 UI 组件
3. 调用 Wails runtime 或生成的绑定函数

### **样式定制**

- 主样式文件：`frontend/src/App.css`
- 全局样式：`frontend/src/style.css`
- CSS 变量定义在 `:root` 中
- 拖拽属性使用 `--wails-draggable`

### **API 绑定**

Wails 自动生成绑定文件：

- Go → JavaScript: `frontend/wailsjs/go/main/App.js`
- Go → TypeScript: `frontend/wailsjs/go/main/App.d.ts`
- Wails Runtime: `frontend/wailsjs/runtime/runtime.js`

### **窗口系统开发**

#### 窗口配置

```go
// main.go
err := wails.Run(&options.App{
    Frameless: true,  // 无边框模式
    // ...
})
```

#### 拖拽实现

```typescript
// CSS 中使用 --wails-draggable 属性
.element {
    --wails-draggable: drag;    // 可拖拽
    --wails-draggable: no-drag; // 不可拖拽
}
```

#### 窗口控制

```typescript
import { WindowMinimise, WindowMaximise, WindowUnmaximise, WindowToggleMaximise, Quit, WindowIsMaximised } from '../../wailsjs/runtime/runtime';
```

***

## 🧪 前后置脚本设计（内嵌 JavaScript 引擎）

### **目标**

新增类似 Postman 的脚本能力，在请求生命周期中支持两类脚本：

- **前置脚本（Pre-request Script）**：发送请求前执行，用于动态生成签名、时间戳、token、请求头等。
- **后置脚本（Tests Script）**：响应返回后执行，用于断言结果、提取变量、驱动后续请求。

### **方案选型结论**

采用 **Go 后端内嵌 JavaScript 引擎**（`goja`）实现脚本运行时：

- ✅ 兼容 JavaScript 使用习惯，用户心智接近 Postman
- ✅ 可在后端统一接入请求执行链路，避免前端绕过
- ✅ 可控安全边界（超时、内存、API 白名单）
- ✅ `am` 运行时 API 与沙箱机制

不采用外部 Node 子进程作为实现，以降低跨平台打包和安全维护复杂度。

### **执行链路设计**

请求发送完整流程：

1. 读取请求配置（URL/Method/Headers/Body/Params）
2. 组装变量上下文（Global + Environment + Request Local）
3. 执行 **Pre-request Script**
4. 将脚本对请求的修改（Header/URL/Body/Vars）应用到实际请求
5. 执行 HTTP 请求（现有 curl 引擎）
6. 构造响应上下文（status/headers/body/duration）
7. 执行 **Tests Script**
8. 返回：响应数据 + 脚本日志 + 测试结果 + 脚本错误（若有）

### **脚本运行时与上下文模型**

#### 运行时容器（后端）

- 模块建议：`internal/script/`
- 核心职责：
  - 初始化 JS VM（`goja.Runtime`）
  - 注入 `am` 对象与受控 API
  - 控制超时、错误恢复、输出收集
  - 产出执行结果（变量变更、测试报告、日志）

#### 执行上下文（建议）

```go
type ScriptExecutionContext struct {
    Request      RequestSnapshot
    Response     *ResponseSnapshot // pre 阶段为 nil
    Globals      map[string]string
    Environment  map[string]string
    LocalVars    map[string]string
}
```

### **`am`** **API（已实现完整列表）**

#### **变量 API**

| API                          | 说明               |
| ---------------------------- | ---------------- |
| `am.globals.get(key)`        | 获取项目全局变量           | - |
| `am.globals.set(key, value)` | 设置项目全局变量           | ✅ 保存到项目 `variables.json` |
| `am.globals.unset(key)`      | 删除项目全局变量           | ✅ 保存到项目 `variables.json` |
| `am.environment.get(key)`    | 获取环境变量（只读）       | - |
| `am.locals.get(key)`         | 获取本地变量           | ❌ 仅当前脚本运行期有效 |
| `am.locals.set(key, value)`  | 设置本地变量（仅脚本运行期有效） | ❌ 仅当前脚本运行期有效 |
| `am.locals.unset(key)`       | 删除本地变量           | ❌ 仅当前脚本运行期有效 |

> **数据持久化说明**：
> - `am.globals`：存储在项目目录下的 `variables.json` 文件，**跨请求持久化**
> - `am.locals`：仅存储在内存中，脚本执行完毕即丢失，用于临时计算

#### **请求对象 API**

| API                                  | 说明          |
| ------------------------------------ | ----------- |
| `am.request.method`                  | 获取/设置请求方法   |
| `am.request.url`                     | 获取/设置请求 URL |
| `am.request.headers.all()`           | 获取所有请求头     |
| `am.request.headers.get(key)`        | 获取指定请求头     |
| `am.request.headers.set(key, value)` | 设置请求头       |
| `am.request.headers.unset(key)`      | 删除请求头       |
| `am.request.params.all()`            | 获取所有查询参数    |
| `am.request.params.get(key)`         | 获取指定参数      |
| `am.request.params.set(key, value)`  | 设置参数        |
| `am.request.params.unset(key)`       | 删除参数        |
| `am.request.body.type`               | 获取请求体类型     |
| `am.request.body.raw`                | 获取请求体内容     |
| `am.request.body.update(raw)`        | 更新请求体       |

#### **响应对象 API**

| API                         | 说明        |
| --------------------------- | --------- |
| `am.response.code`          | 获取响应状态码   |
| `am.response.headers.all()` | 获取所有响应头   |
| `am.response.text()`        | 获取响应文本    |
| `am.response.json()`        | 解析响应 JSON |

#### **测试 API**

| API                 | 说明          |
| ------------------- | ----------- |
| `am.test(name, fn)` | 定义测试用例      |
| `am.expect(actual)` | 创建断言，支持链式调用 |

**断言方法**：

- `.toBe(expected)` - 相等断言
- `.eql(expected)` - 深度相等
- `.include(expected)` - 包含子串
- `.beTrue()` - 为 true
- `.beFalse()` - 为 false
- `.haveProperty(key)` - 拥有属性

#### **Console API**

| API                  | 说明   |
| -------------------- | ---- |
| `console.log(...)`   | 普通日志 |
| `console.info(...)`  | 信息日志 |
| `console.warn(...)`  | 警告日志 |
| `console.error(...)` | 错误日志 |

#### **加密工具 API (am.crypto)**

| API                                     | 说明                     | 示例                                                    |
| --------------------------------------- | ---------------------- | ----------------------------------------------------- |
| `am.crypto.md5(str)`                    | MD5 哈希                 | `am.crypto.md5("hello")`                              |
| `am.crypto.sha1(str)`                   | SHA1 哈希                | `am.crypto.sha1("hello")`                             |
| `am.crypto.sha256(str)`                 | SHA256 哈希              | `am.crypto.sha256("hello")`                           |
| `am.crypto.sha512(str)`                 | SHA512 哈希              | `am.crypto.sha512("hello")`                           |
| `am.crypto.base64Encode(str)`           | Base64 编码              | `am.crypto.base64Encode("hello")`                     |
| `am.crypto.base64Decode(str)`           | Base64 解码              | `am.crypto.base64Decode("aGVsbG8=")`                  |
| `am.crypto.base64URLEncode(str)`        | URL 安全 Base64          | `am.crypto.base64URLEncode("hello world")`            |
| `am.crypto.hmacSHA256(msg, key)`        | HMAC-SHA256 签名         | `am.crypto.hmacSHA256("msg", "key")`                  |
| `am.crypto.hmacSHA1(msg, key)`         | HMAC-SHA1 签名          | `am.crypto.hmacSHA1("msg", "key")`                    |
| `am.crypto.aesEncrypt(str, key)`        | AES 加密（密钥 16/24/32 字节） | `am.crypto.aesEncrypt("data", "1234567890123456")`    |
| `am.crypto.aesDecrypt(str, key)`        | AES 解密                 | `am.crypto.aesDecrypt(encrypted, "1234567890123456")` |
| `am.crypto.aesEncryptWithIV(str, key, iv)` | AES 带 IV 加密          | `am.crypto.aesEncryptWithIV("data", "1234567890123456", "initialVec16")` |
| `am.crypto.aesDecryptWithIV(str, key, iv)` | AES 带 IV 解密          | `am.crypto.aesDecryptWithIV(encrypted, "1234567890123456", "initialVec16")` |
| `am.crypto.rsaEncrypt(str, pubKey)`     | RSA 公钥加密               | `am.crypto.rsaEncrypt("data", pemPublicKey)`          |
| `am.crypto.rsaDecrypt(str, privKey)`    | RSA 私钥解密               | `am.crypto.rsaDecrypt(encrypted, pemPrivateKey)`      |
| `am.crypto.rsaSign(msg, privKey)`       | RSA 签名                 | `am.crypto.rsaSign("message", pemPrivateKey)`         |
| `am.crypto.rsaVerify(msg, sig, pubKey)` | RSA 验签                 | `am.crypto.rsaVerify("msg", signature, pemPublicKey)` |
| `am.crypto.rsaEncryptOAEP(str, pubKey)` | RSA OAEP 公钥加密          | `am.crypto.rsaEncryptOAEP("data", pemPublicKey)`      |
| `am.crypto.rsaDecryptOAEP(str, privKey)` | RSA OAEP 私钥解密        | `am.crypto.rsaDecryptOAEP(encrypted, pemPrivateKey)` |
| `am.crypto.generateKeyPair(bits)`       | 生成 RSA 密钥对             | `am.crypto.generateKeyPair(2048)`                     |
| `am.crypto.randomString(len)`           | 生成随机字符串                | `am.crypto.randomString(16)`                          |
| `am.crypto.formatJSON(str)`             | 格式化 JSON               | `am.crypto.formatJSON('{"a":1}')`                     |

#### **脚本测试用例**

项目目录下 `scripts/` 文件夹包含完整的脚本测试用例：

| 文件                      | 功能覆盖                                        |
| ----------------------- | ------------------------------------------- |
| `01-console测试.js`       | console.log/info/warn/error                 |
| `02-globals测试.js`       | am.globals.get/set/unset                    |
| `03-environment测试.js`   | am.environment.get                          |
| `04-request测试.js`       | am.request.\*                               |
| `05-response测试.js`      | am.response.\*                              |
| `06-assert测试.js`        | am.expect().toBe/eql/include/beTrue/beFalse |
| `07-test测试.js`          | am.test(name, fn)                           |
| `08-variable测试.js`      | 变量组合使用场景                                    |
| `09-pre-script测试.js`    | 前置脚本场景                                      |
| `10-post-script测试.js`   | 后置脚本场景                                      |
| `11-comprehensive测试.js` | 综合测试                                        |
| `12-snippets测试.js`      | 常用代码片段                                      |
| `13-crypto测试.js`        | am.crypto 加密函数                              |

> 首版不开放 `am.sendRequest`，避免引入嵌套请求、并发与安全复杂度。

### **数据模型与持久化扩展**

在请求模型新增脚本字段（请求级）：

```go
type CurlRequest struct {
    // ... existing fields
    PreScripts  []string `json:"pre_scripts,omitempty"`   // 前置脚本列表
    PostScripts []string `json:"post_scripts,omitempty"`  // 后置脚本列表
}
```

请求文件（`.curl`）建议增加 `scripts` 块（或通过 meta 文件扩展）：

```json
{
  "name": "Get User",
  "method": "GET",
  "url": "https://api.example.com/user",
  "scripts": {
    "pre_request": "am.locals.set('ts', String(Date.now()))",
    "test": "am.test('status is 200', function () { am.expect(am.response.code).to.eql(200) })"
  }
}
```

### **作用域与变量优先级**

变量读取优先级建议如下：

1. `local`（`am.locals`，当前脚本临时变量）
2. `global`（`am.globals`，运行时全局变量）
3. `environment`（`am.environment`，当前环境只读变量）

变量写入策略建议：

- `am.locals.set`：仅当前脚本运行期间生效，不持久化，不跨请求共享
- `am.environment`：只读，不允许 set/unset
- `am.globals.set`：写回全局变量并持久化

### **错误处理与失败策略**

- Pre-script 执行失败：**默认中断请求发送**，并返回脚本错误
- Test-script 执行失败：请求已完成，标记测试失败并返回错误详情
- 脚本运行异常（语法/运行时）：记录错误堆栈（脱敏后展示）
- `am.test` 结果输出：`name`、`passed`、`message`、`duration`

### **安全与资源限制**

首版必须实现以下限制：

- ⏱️ **执行超时**：单脚本最大执行时间（建议 300\~1000ms）
- 🔒 **能力白名单**：仅暴露 `am` 与 `console`，不提供文件系统/网络/系统命令
- 🧱 **隔离执行**：每次执行使用独立 VM，上下文不跨请求泄漏
- 📏 **输出限制**：日志最大长度、测试数量上限，防止 UI 与内存膨胀
- 🧼 **敏感信息保护**：错误日志中对 token/password 等字段做脱敏展示

### **前端交互设计（请求编辑区）**

请求编辑面板新增 `Scripts` 标签页，包含两个子页签：

- `Pre-request`
- `Tests`

每个编辑器支持：

- 语法高亮（JavaScript）
- 代码保存（随请求保存）
- 运行后展示：
  - Console Logs
  - Test Results（通过/失败）
  - Script Error

### **版本迭代计划**

#### v1（MVP）

- 请求级 Pre/Test 脚本
- 最小 `am` API
- 日志 + 测试结果面板
- 超时和安全白名单

#### v2（增强）

- Folder/Project 级脚本继承（执行链：Project -> Folder -> Request）
- 断言能力扩展（JSONPath、schema 校验）
- 脚本模板库（签名、鉴权、变量提取）

#### v3（高级）

- `am.sendRequest`（受控放开）
- 脚本调试能力（断点/单步）
- Postman 脚本兼容增强

### **与现有模块的集成点**

- `internal/models`：扩展请求结构脚本字段
- `internal/service`：编排脚本执行时机与变量写回
- `internal/curl`：保持请求执行职责，接收脚本变更后的最终请求
- `internal/config`：持久化环境变量/全局变量更新
- `frontend/src/App.tsx`：新增 Scripts UI 与结果展示区

***

## 📊 数据存储

### **存储位置**

```
Windows: C:\Users\{username}\.apiman\
macOS:   ~/.apiman/
Linux:   ~/.config/apiman/
```

### **文件结构**

```
~/.apiman/
├── projects/                 # 项目数据（当未启用 Git 同步时）
│   ├── projects.json         # 分组状态（groups/assignments/collapsedGroups）
│   ├── {project-slug}__{uuid}/
│   │   ├── meta.json
│   │   ├── collection.postman.json   # API 集合（含文件夹、请求、用例）
│   │   └── scripts/                  # 项目脚本（.js + .meta）
│   └── ...
│
├── git-sync/                 # Git 同步目录（启用 Git 同步时）
│   ├── .git/
│   ├── projects/            # 同步的项目数据
│   └── README.md
│
├── environments.json        # 环境变量配置
├── config.json             # 应用配置（代理、UI、Git 同步）
└── variables.json          # 全局变量配置
```

### **备份与迁移**

直接复制 `~/.apiman/` 目录即可完整迁移数据。

***

## 🐛 故障排查

### **常见问题**

1. **前端编译失败**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **Go 模块下载失败**
   ```bash
   go mod tidy
   go mod download
   ```
3. **Wails 初始化失败**
   ```bash
   wails doctor
   ```
4. **窗口拖拽不工作**
   - 确保 `--wails-draggable` 属性正确设置
   - 检查控制按钮是否设置了 `no-drag`
   - 重启应用
5. **端口占用**
   - 开发模式默认使用端口 34115
   - 修改配置或关闭占用端口的程序

***

## 🚧 未来规划

- [ ] 环境切换功能（开发/测试/生产）
- [ ] API 导出与更多格式（Swagger 等；Postman 导入已具备基础能力）
- [ ] 请求历史记录
- [ ] 响应对比功能
- [ ] 批量执行测试
- [ ] 插件系统
- [ ] 主题切换（深色/浅色）
- [ ] 快捷键支持
- [ ] 团队协作功能
- [ ] API 文档自动生成
- [x] MCP Server

## 🙏 致谢

- [Wails](https://wails.io/) - Go + Web 桌面应用框架
- [Ant Design](https://ant.design/) - 企业级 React UI 组件库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Google UUID](https://github.com/google/uuid) - UUID 生成库

***

## 📞 联系方式

- shamo
- 邮箱：<592334843@qq.com>

***

## 📝 更新日志

### v1.0 (当前版本)

#### 核心功能

- ✅ 项目管理（创建、删除、打开）
- ✅ 多级文件夹组织（支持任意深度嵌套）
- ✅ API 请求测试（支持多种 HTTP 方法和请求体类型）
- ✅ 搜索和过滤功能（按名称和 HTTP 方法）
- ✅ 响应展示（状态码、格式化、时间）
- ✅ 持久化存储

#### UI/UX

- ✅ 现代 UI 设计（Apifox/Postman 风格）
- ✅ 无边框桌面应用
- ✅ 自定义窗口标题栏
- ✅ Logo 和标签栏并排显示
- ✅ 彩色 HTTP 方法标签
- ✅ 多级目录折叠/展开
- ✅ 悬停交互效果
- ✅ 平滑动画效果

#### 技术特性

- ✅ 热重载开发（前后端代码修改自动更新）
- ✅ 窗口拖拽功能
- ✅ 自定义窗口控制按钮
- ✅ 变量替换（`{{variable}}` 语法）
- ✅ Go 1.23+ 支持
- ✅ React 18.2 + TypeScript
- ✅ Ant Design 6.3.4 组件库

#### 性能优化

- ✅ 前端构建优化（Vite）
- ✅ 状态管理优化（React Hooks）
- ✅ 递归渲染支持（多级目录）
- ✅ 折叠状态管理

### v1.1 (最新增强)

#### 项目管理与首页体验

- ✅ 首页项目分组（新建、重命名、删除、折叠）
- ✅ 分组拖拽排序（支持持久化）
- ✅ 项目卡片拖拽到分组
- ✅ 空分组可展示并支持拖入
- ✅ 项目卡片右上角菜单（重命名/删除）
- ✅ 项目搜索框样式升级

#### 接口列表与交互增强

- ✅ 接口列表搜索支持名称 + URL
- ✅ 接口/文件夹支持拖拽移动
- ✅ 移动冲突校验与禁止放置提示
- ✅ 不可放置时鼠标跟随提示
- ✅ 移动后自动展开目标并高亮
- ✅ 接口复制（自动处理副本命名冲突）
- ✅ 接口/文件夹重命名体验优化

#### 数据持久化

- ✅ 项目/文件夹/请求采用 `slug__uuid` 存储命名
- ✅ 展示名与存储名解耦（展示名来自元数据）
- ✅ 项目分组状态后端持久化到 `projects/projects.json`

### v1.3（集合与侧栏规范）

#### 数据与模型

- ✅ 项目 API 以 **`collection.postman.json`** 为单一集合文件（`internal/postman` 读写）
- ✅ 请求支持多 **用例**（`HttpRequestCase` / 树节点 `requestCase|...`）
- ✅ Postman Collection 导入与集合字段对齐（持续迭代中）

#### 侧栏交互与样式（`App.tsx` / `App.css`）

- ✅ 选中接口不自动高亮子用例；仅选中用例行时高亮用例（`sidebarHighlightedCasePath` 等工作区状态）
- ✅ 接口行与用例行选中样式统一：左侧主题色条 + `--bg-hover` 行背景
- ✅ 选中用例时父级接口行不再使用「打开」左侧条，避免双重高亮
- ✅ 侧栏方法缩写：`DELETE`→`DEL`，`PATCH`→`PAT`
- ✅ 方法列固定 42px，与接口名无额外 margin；文件夹头与接口行同左边框占位，展开箭头左对齐
- ✅ 用例行：用例图标 + 与接口名左缘对齐；图标列内靠右贴近名称；图标与名称垂直居中

#### 项目工作区

- ✅ 侧栏增加 **脚本** 入口，与接口列表、环境变量并列

### v1.2 (当前增强)

#### 环境变量与请求联动

- ✅ 项目页新增「环境变量」一级菜单，与「接口列表」同级
- ✅ 环境管理支持创建/编辑/删除，按环境维护独立变量集
- ✅ 请求标签栏右侧新增环境切换，发送时按当前环境替换 `{{variable}}`
- ✅ 修复 Params 构建对 URL 的污染问题（发送时拼接，不改编辑态 URL）

#### 变量编辑体验

- ✅ URL/Params/Headers/Body 支持 `{{variable}}` 高亮（存在绿色、缺失红色）
- ✅ 支持输入 `{{` / `{{xx` 的变量联想补全
- ✅ 补全支持方向键上下选择 + Enter 确认
- ✅ 引入 `contenteditable` 变量输入控件，修复输入时焦点丢失问题

#### 请求执行与网络能力

- ✅ 代理配置执行链路打通（HTTP/HTTPS/SOCKS5）
- ✅ 代理地址输入兼容 `http://host` / `host` 形式
- ✅ curl 解析增强：修复 `-d` JSON 截断问题
- ✅ curl 执行增强：支持 `-F`（multipart/form-data）字段提交

### v1.4（前后置脚本与加密工具）

#### 前后置脚本功能

- ✅ Go 后端内嵌 JavaScript 引擎（`goja`）
- ✅ 完整 `am` 运行时 API 实现
- ✅ 前置脚本（Pre-request Script）支持
- ✅ 后置脚本（Tests Script）支持
- ✅ 脚本日志收集（console.log/info/warn/error）
- ✅ 测试用例断言（am.test / am.expect）
- ✅ 脚本结果展示 UI（Console Logs / Test Results）
- ✅ 脚本超时控制（默认 1 秒）
- ✅ 变量作用域（Globals / Environment / Locals）

#### 加密工具 (am.crypto)

- ✅ MD5 / SHA1 / SHA256 / SHA512 哈希
- ✅ Base64 / Base64URL 编解码
- ✅ HMAC-SHA256 / HMAC-SHA1 签名
- ✅ AES 对称加解密（支持 IV 模式）
- ✅ RSA 密钥生成、公钥加密、私钥解密
- ✅ RSA OAEP 公钥加密、私钥解密
- ✅ RSA 签名与验签
- ✅ RandomString 随机字符串
- ✅ FormatJSON JSON 格式化

#### 技术实现

- ✅ `internal/script/` 模块（runtime.go / executor.go）
- ✅ `internal/curl/exec_with_scripts.go` 脚本执行链路集成
- ✅ `app.go` / `service.go` 暴露脚本执行方法
- ✅ 13 个脚本测试用例文件

### v1.5（Git 同步功能）

#### Git 同步核心功能

- ✅ Git 仓库克隆与初始化（支持空仓库处理）
- ✅ 自动拉取远程更新
- ✅ 项目变更提交与推送
- ✅ 单项目同步与全量同步
- ✅ Token 认证支持（Gitee/GitHub）
- ✅ 仓库冲突处理与恢复

#### 技术实现

- ✅ `internal/git/git.go` Git 同步模块
- ✅ `SyncProjectToGit` 单项目同步
- ✅ `SyncAllProjectsToGit` 全量同步
- ✅ `EnableGitSync` / `DisableGitSync` 启用/禁用同步
- ✅ `InitGitRepo` 初始化仓库
- ✅ `AppConfig.GitSync` 配置持久化
- ✅ Token 密码混淆存储

#### 动态变量增强

- ✅ `{{$date.timestamp}}` Unix 时间戳（秒）
- ✅ `{{$date.timestampMs}}` Unix 时间戳（毫秒）
- ✅ `{{$date.now}}` 当前时间 ISO 格式
- ✅ `{{$date.now('format')}}` 自定义时间格式
- ✅ `{{$uuid}}` 随机 UUID
- ✅ `{{$random.int}}` 随机整数
- ✅ `{{$random.float}}` 随机浮点数
- ✅ `{{$random.alpha(n)}}` 随机字母字符串
- ✅ `{{$random.alphanumeric(n)}}` 随机字母数字字符串

### v1.6（MCP Server）

#### MCP Server 核心功能

- ✅ 内置 MCP (Model Context Protocol) Server
- ✅ HTTP Streamable 传输模式
- ✅ API Key 认证中间件
- ✅ 项目绑定机制（操作权限限于绑定项目）
- ✅ 9 个 MCP 工具完整实现

#### MCP 工具实现

- ✅ `mcp_list_apis` - 列出项目下所有接口（含多级目录）
- ✅ `mcp_list_scripts` - 列出项目下所有脚本
- ✅ `mcp_get_request` - 获取请求详情
- ✅ `mcp_create_case` - 创建用例
- ✅ `mcp_update_case` - 更新用例
- ✅ `mcp_create_request` - 创建接口
- ✅ `mcp_create_folder` - 创建文件夹
- ✅ `mcp_execute_request` - 执行已保存请求
- ✅ `mcp_execute_raw` - 执行原始请求

#### 技术实现

- ✅ `internal/mcp/` 模块（server.go / handler.go / middleware.go / tools.go / types.go）
- ✅ 底栏 MCP 状态按钮与设置弹窗
- ✅ MCP 配置持久化
- ✅ Claude Code 集成支持


