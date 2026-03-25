# Apiman - API 管理工具

## 📖 项目概述

**Apiman** 是一款基于 Wails 框架开发的轻量级 API 测试工具，融合了现代桌面应用的流畅体验与专业 API 管理工具的核心功能。它允许用户轻松创建、组织和测试 HTTP 请求，支持多项目管理、环境变量、变量替换等高级功能。

### 🎯 核心特性

- 🎨 **现代化界面**：采用 Apifox/Postman 风格设计，提供直观、专业的用户体验
- 📁 **项目管理**：支持多项目隔离，每个项目包含独立的 API 集合
- 📂 **文件夹组织**：通过树形结构组织 API 请求，便于分类管理
- 🔍 **智能搜索**：支持按名称和 HTTP 方法快速筛选 API
- 🌍 **环境变量**：支持多环境配置（开发、测试、生产等）
- ⚡ **变量替换**：支持 `{{variable}}` 语法进行动态变量替换
- 💾 **持久化存储**：所有数据存储在本地，跨会话保持

---

## 🏗️ 技术栈

### 后端 (Go)
- **框架**：Wails v2.11.0 - 使用 Go 和 Web 技术构建桌面应用
- **UUID**：github.com/google/uuid v1.6.0 - 生成唯一标识符
- **并发安全**：使用 Go 标准库的 sync.RWMutex 保证线程安全

### 前端 (React + TypeScript)
- **框架**：React 18.2 + TypeScript 4.6
- **UI 组件**：Ant Design 6.3.4 - 企业级 React 组件库
- **构建工具**：Vite 3.2.11 - 下一代前端构建工具
- **图标库**：@ant-design/icons 6.1.0
- **字体**：Outfit (正文) + JetBrains Mono (代码)

---

## 📂 项目结构

```
apiman/
├── main.go                 # 应用入口点
├── app.go                  # Wails 应用主类，暴露后端方法
├── wails.json             # Wails 配置文件
├── go.mod / go.sum        # Go 依赖管理
│
├── internal/              # 内部业务逻辑包
│   ├── config/            # 配置管理模块
│   │   └── config.go      # 配置文件读写（环境变量、全局变量）
│   │
│   ├── curl/              # Curl 执行引擎
│   │   └── curl.go       # HTTP 请求执行、响应格式化
│   │
│   ├── models/            # 数据模型定义
│   │   └── models.go     # 数据结构（Project、Folder、Request 等）
│   │
│   └── service/           # 服务层
│       └── service.go    # 业务逻辑编排
│
├── frontend/              # 前端应用
│   ├── src/              # React 源代码
│   │   ├── App.tsx       # 主应用组件
│   │   ├── App.css       # 主样式文件
│   │   ├── main.tsx      # React 入口
│   │   ├── style.css     # 全局样式
│   │   └── types/        # TypeScript 类型定义
│   │
│   ├── public/           # 静态资源
│   │   └── logo.png      # 应用图标
│   │
│   ├── wailsjs/          # Wails 生成的类型绑定
│   │   └── go/main/      # 后端 Go 函数的 TypeScript 绑定
│   │
│   ├── package.json      # 前端依赖
│   └── vite.config.ts    # Vite 配置
│
└── design/               # 设计资源
    └── 接口列表.png       # UI 设计图
```

---

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
```

### 2. **项目管理模块** (`internal/project`)

负责项目的创建、删除和树形结构管理。

**核心概念**：
- **Project**：顶级容器，包含多个文件夹和 API 请求
- **Folder**：用于组织 API 的目录结构
- **Request**：单个 API 请求，存储为 `.curl` 文件

**数据结构**：
```go
ProjectTree {
    ID: string
    Name: string
    Type: "project" | "folder" | "request"
    Children: []*ProjectTree
    Path: string
}
```

**文件存储格式**：
```
~/.apiman/projects/
├── {project-id}/
│   ├── meta.json           # 项目元数据
│   ├── {folder-name}/
│   │   ├── {request-id}.curl    # 请求内容
│   │   └── {request-id}.meta     # 请求元数据
│   └── {subfolder}/
│       └── ...
```

### 3. **Curl 执行引擎** (`internal/curl`)

将 curl 命令解析并执行为真实的 HTTP 请求。

**核心能力**：
- 🔄 **命令解析**：支持解析 curl 命令的所有常用参数
  - `-X`：HTTP 方法
  - `-H`：请求头
  - `-d`：请求体
  - `-u`：Basic 认证
  
- 📤 **请求执行**：使用 Go 标准库 `net/http` 执行请求
- 📥 **响应处理**：返回状态码、响应头、响应体、执行时间
- 🖨️ **格式化**：支持 JSON 响应格式化（缩进对齐）
- 🔍 **变量提取**：`{{variable}}` 语法支持
- 🔄 **变量替换**：运行时替换变量为实际值

**响应格式**：
```go
CurlResponse {
    StatusCode: int          // HTTP 状态码
    Headers: map[string]string // 响应头
    Body: string             // 响应体
    Duration: int64          // 执行时间（毫秒）
    Error: string            // 错误信息
}
```

### 4. **服务层** (`internal/service`)

业务逻辑编排层，协调各模块工作。

---

## 🎨 前端架构

### **UI 设计风格**

采用 **Apifox/Postman** 混合风格：

#### 左侧边栏（Apifox 风格）
- 🔍 **搜索框**：快速搜索接口名称
- 🎯 **方法过滤器**：按 HTTP 方法筛选
- 📁 **文件夹树**：可折叠的树形结构
- 🏷️ **HTTP 标签**：彩色标签标识方法
  - GET → 蓝色 `#61affe`
  - POST → 绿色 `#49cc90`
  - PUT → 橙色 `#fca130`
  - DELETE → 红色 `#f93e3e`
  - PATCH → 青色 `#50e3c2`

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
```

---

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

**方式三：手动编译前端**
```bash
cd frontend
npm run build
cd ..
wails dev
```

### **生产构建**

```bash
wails build
```

构建产物位于 `build/bin/` 目录。

---

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

---

## 🎨 界面功能说明

### **首页**
- 展示所有项目卡片
- 支持新建、打开、删除项目
- 卡片悬停动画效果

### **项目工作区**

#### 侧边栏
- **标题栏**：显示「接口列表」
- **搜索区**：关键词搜索接口
- **过滤器**：按 HTTP 方法筛选
- **文件夹树**：
  - 可折叠展开
  - 显示接口数量
  - 右键菜单操作
- **接口列表**：
  - 方法标签（彩色）
  - 接口名称
  - 悬停显示删除按钮

#### 主工作区
- **请求标签栏**：支持多标签切换
- **请求配置**：
  - 方法 + URL 组合输入
  - Params/Headers/Body 标签页
- **响应展示**：
  - 状态码 + 时间
  - 格式化响应体

---

## 🔧 开发指南

### **添加新功能**

#### 后端（Go）

1. 在 `internal/models/models.go` 定义数据结构
2. 在相应模块实现业务逻辑
3. 在 `app.go` 暴露新方法给前端
4. 前端自动生成 TypeScript 绑定

#### 前端（React）

1. 在 `App.tsx` 添加状态管理
2. 实现 UI 组件
3. 调用 `wailsjs/go/main/App` 中的绑定函数

### **样式定制**

- 主样式文件：`frontend/src/App.css`
- 全局样式：`frontend/src/style.css`
- CSS 变量定义在 `:root` 中

### **API 绑定**

Wails 自动生成绑定文件：
- Go → JavaScript: `frontend/wailsjs/go/main/App.js`
- Go → TypeScript: `frontend/wailsjs/go/main/App.d.ts`

---

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
├── projects/                 # 项目数据
│   ├── {uuid}/
│   │   ├── meta.json
│   │   ├── folder1/
│   │   │   ├── {uuid}.curl
│   │   │   └── {uuid}.meta
│   │   └── folder2/
│   │
├── environments.json        # 环境变量配置
└── variables.json          # 全局变量配置
```

### **备份与迁移**

直接复制 `~/.apiman/` 目录即可完整迁移数据。

---

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

4. **端口占用**
   修改 `wails.json` 中的端口配置

---

## 🚧 未来规划

- [ ] 环境切换功能（开发/测试/生产）
- [ ] API 导入/导出（Postman、Swagger）
- [ ] 团队协作功能
- [ ] API 文档自动生成
- [ ] 请求历史记录
- [ ] 响应对比功能
- [ ] 批量执行测试
- [ ] 插件系统
- [ ] 主题切换（深色/浅色）
- [ ] 快捷键支持

---

## 📜 许可证

本项目采用 MIT 许可证。

---

## 🙏 致谢

- [Wails](https://wails.io/) - Go + Web 桌面应用框架
- [Ant Design](https://ant.design/) - 企业级 React UI 组件库
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Google UUID](https://github.com/google/uuid) - UUID 生成库

---

## 📞 联系方式

- 作者：zetaoxie
- 邮箱：592334843@qq.com

---

## 📝 更新日志

### v1.0 (当前版本)
- ✅ 项目管理（创建、删除、打开）
- ✅ 文件夹组织（树形结构）
- ✅ API 请求测试（支持多种 HTTP 方法和请求体类型）
- ✅ 搜索和过滤功能
- ✅ 现代 UI 设计（Apifox/Postman 风格）
- ✅ 响应展示（状态码、格式化、时间）
- ✅ 持久化存储
