# Apiman

Apiman 是一个基于 **Wails v2** 构建的桌面 API 测试工具，使用 Go + React/TypeScript 开发，功能类似于 Postman/Apifox。

## 功能特性

- **多项目管理** - 支持创建、导入、导出多个 API 项目
- **文件夹组织** - 使用文件夹树形结构组织 API 请求
- **环境变量** - 支持多环境配置（开发、测试、生产等）
- **请求用例** - 每个请求支持多个测试场景（Cases）
- **JavaScript 脚本** - 基于 goja 引擎，支持预请求脚本和后置断言
- **Git 同步** - 支持将项目备份到 Git 仓库
- **深色/浅色主题** - 支持主题切换
- **MCP 服务器** - 内置 MCP 服务器，支持 AI 集成
- **变量替换** - 支持 `{{variable}}` 语法进行变量替换

## 技术栈

### 后端
- **Go** 1.25.0
- **Wails v2** - 桌面应用框架
- **goja** - JavaScript 运行时
- **go-git** - Git 操作
- **kin-openapi** - OpenAPI 处理

### 前端
- **React** 18.2
- **TypeScript** 5.6
- **Vite** 5.x - 构建工具
- **Ant Design** 6.3.4 - UI 组件库
- **Zustand** 5.0.12 - 状态管理
- **CodeMirror** - 代码编辑器

## 项目结构

```
apiman/
├── main.go                 # 应用入口，窗口配置
├── app.go                  # Wails 应用类 (~380 绑定方法)
├── go.mod                  # Go 依赖
├── go.sum
├── frontend/               # 前端源码
│   ├── src/
│   │   ├── App.tsx        # 主 UI 组件 (~2000 行)
│   │   ├── components/    # React 组件
│   │   │   ├── TitleBar/       # 自定义标题栏
│   │   │   ├── HomePage/       # 项目列表页
│   │   │   ├── ProjectWorkspace/ # 主工作区
│   │   │   ├── ApiTree/        # API 树形目录
│   │   │   ├── RequestPanel/   # 请求编辑器
│   │   │   ├── ResponsePanel/ # 响应查看器
│   │   │   ├── ScriptHelp/     # 脚本帮助窗口
│   │   │   ├── MCPSettings/    # MCP 配置
│   │   │   ├── VariableInput/  # 变量输入组件
│   │   │   └── modals/         # 各种弹窗
│   │   ├── store/         # Zustand 状态管理
│   │   │   ├── useProjectStore.js
│   │   │   ├── useUIStore.js
│   │   │   ├── useWorkspaceStore.js
│   │   │   ├── useEnvironmentStore.js
│   │   │   ├── useScriptStore.js
│   │   │   ├── useHistoryStore.js
│   │   │   ├── useDragStore.js
│   │   │   └── useModalStore.js
│   │   └── hooks/         # 自定义 Hooks
│   ├── package.json
│   └── wailsjs/           # Wails 自动生成的绑定
├── internal/              # Go 业务逻辑
│   ├── config/            # 配置管理
│   ├── models/           # 数据模型
│   ├── curl/             # HTTP 请求引擎
│   ├── git/              # Git 同步
│   ├── project/          # 项目管理
│   └── service/          # 业务逻辑
└── docs/                 # 文档
```

## 数据存储

项目数据存储在 `~/.apiman/` 目录下：

```
~/.apiman/
├── projects/
│   └── {slug}__{uuid}/
│       ├── meta.json               # 项目元数据
│       ├── collection.postman.json # API 集合 (Postman v2.1 格式)
│       ├── environments.json       # 环境配置
│       ├── variables.json          # 项目变量
│       └── scripts/                # 项目脚本 (*.js)
├── config.json                    # 应用配置 (代理、主题、Git同步、MCP)
├── environments.json              # 全局环境变量
├── variables.json                # 全局变量
├── history/                     # 请求历史
└── logs/apiman.log              # 日志文件
```

## 脚本 API (am)

Apiman 内置 JavaScript 脚本引擎，支持以下 API：

### am.globals - 全局变量
```javascript
am.globals.get(key)       // 获取全局变量
am.globals.set(key, value) // 设置全局变量
am.globals.unset(key)     // 删除全局变量
```

### am.environment - 环境变量
```javascript
am.environment.get(key)    // 获取环境变量
```

### am.locals - 局部变量
```javascript
am.locals.get(key)        // 获取局部变量
am.locals.set(key, value) // 设置局部变量
```

### am.request - 请求信息
```javascript
am.request.method          // HTTP 方法
am.request.url             // 请求 URL
am.request.headers.get(key) / .set(key, value) / .unset(key)
am.request.params.get(key) / .set(key, value)
am.request.body.type       // body 类型
am.request.body.raw        // raw body 内容
```

### am.response - 响应信息
```javascript
am.response.code           // HTTP 状态码
am.response.headers.all() // 所有响应头
am.response.text()         // 响应体文本
am.response.json()        // 响应体 JSON
```

### am.test & am.expect - 测试断言
```javascript
am.test(name, fn)          // 定义测试用例
am.expect(actual)          // 链式断言
  .to.be() / .eql() / .include() / .beTrue() / .beFalse()
```

### am.crypto - 加密工具
- Hash: `md5`, `sha1`, `sha256`, `sha512`
- Encode: `base64Encode`, `base64Decode`, `base64URLEncode`
- HMAC: `hmacSHA256`, `hmacSHA1`
- AES: `aesEncrypt`, `aesDecrypt`
- RSA: `rsaEncrypt`, `rsaDecrypt`, `rsaSign`, `rsaVerify`

## MCP 服务器

Apiman 内置 MCP 服务器，支持 AI 工具集成：

- **端口**: 3847 (默认，可配置)
- **认证**: Bearer Token

### MCP 工具

| 工具 | 描述 |
|------|------|
| `mcp_list_apis` | 列出项目中的所有 API |
| `mcp_list_scripts` | 列出项目中的所有脚本 |
| `mcp_get_request` | 获取请求详情 |
| `mcp_create_case` | 创建测试用例 |
| `mcp_update_case` | 更新测试用例 |
| `mcp_create_request` | 创建新 API |
| `mcp_create_folder` | 创建文件夹 |
| `mcp_execute_request` | 执行保存的请求 |
| `mcp_execute_raw` | 执行原始 HTTP 请求 |

## 构建和运行

### 环境要求
- Go 1.25.0+
- Node.js 18+
- Wails CLI

### 安装依赖
```bash
# 安装前端依赖
cd frontend && npm install
```

### 开发模式
```bash
wails dev
```

### 生产构建
```bash
wails build
```

### 仅前端构建
```bash
cd frontend && npm run build
```

## HTTP 方法颜色

| 方法 | 颜色 | 标签 |
|------|------|------|
| GET | #61affe | GET |
| POST | #49cc90 | POST |
| PUT | #fca130 | PUT |
| DELETE | #f93e3e | DEL |
| PATCH | #50e3c2 | PAT |
| OPTIONS | #0d5aa7 | OPT |
| HEAD | #9012fe | HEAD |

## 变量语法

- `{{variableName}}` - 变量替换

内置变量生成器：
- `{{$date.now}}` - 当前时间戳
- `{{$date.timestamp}}` - Unix 时间戳
- `{{$uuid}}` - UUID
- `{{$random.int}}` - 随机整数
- `{{$random.alpha(10)}}` - 随机字母字符串
