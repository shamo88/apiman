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
- 💾 **持久化存储**：所有数据存储在本地文件系统，跨会话保持
- ⚡ **热重载开发**：支持前后端代码修改后自动热更新
- 🔄 **变量替换**：支持 `{{variable}}` 语法进行动态变量替换
- 📊 **响应展示**：支持状态码、响应时间、格式化响应体展示

---

## 🏗️ 技术栈

### 后端 (Go)
- **框架**：Wails v2.11.0 - 使用 Go 和 Web 技术构建桌面应用
- **UUID**：github.com/google/uuid v1.6.0 - 生成唯一标识符
- **并发安全**：使用 Go 标准库的 sync.RWMutex 保证线程安全
- **版本**：Go 1.23+

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
├── main.go                    # 应用入口点，配置无边框窗口
├── app.go                     # Wails 应用主类，暴露后端方法
├── wails.json                # Wails 配置文件
├── go.mod / go.sum           # Go 依赖管理
│
├── internal/                  # 内部业务逻辑包
│   ├── config/               # 配置管理模块
│   │   └── config.go        # 配置文件读写（环境变量、全局变量）
│   │
│   ├── curl/                 # Curl 执行引擎
│   │   └── curl.go          # HTTP 请求执行、响应格式化
│   │
│   ├── models/               # 数据模型定义
│   │   └── models.go        # 数据结构（Project、Folder、Request、CurlResponse）
│   │
│   └── service/              # 服务层
│       └── service.go        # 业务逻辑编排
│
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   └── TitleBar.tsx # 自定义窗口标题栏组件
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
- **Folder**：用于组织 API 的目录结构，支持多级嵌套
- **Request**：单个 API 请求，存储为 `.curl` 文件
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
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    ProjectID string    `json:"project_id"`
    FolderID  string    `json:"folder_id"`
    Path      string    `json:"path"`
    Content   string    `json:"content"`
    CreatedAt time.Time `json:"created_at"`
}
```

**文件存储格式（当前实现）**：
```
~/.apiman/projects/
├── projects.json                        # 项目分组状态（排序/归属/折叠）
├── {project-slug}__{project-uuid}/
│   ├── meta.json                        # 项目元数据（展示名、路径等）
│   ├── {folder-slug}__{folder-uuid}/
│   │   ├── .folder.meta                 # 文件夹展示名元数据
│   │   ├── {request-slug}__{req-uuid}.curl
│   │   ├── {req-uuid}.meta              # 请求展示名元数据
│   │   └── {subfolder-slug}__{sub-uuid}/
│   │       └── ...
│   └── ...
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

---

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
- 🔍 **搜索框**：快速搜索接口名称
- 🎯 **方法过滤器**：按 HTTP 方法筛选
- 📁 **文件夹树**：可折叠的多级目录结构
- 🏷️ **HTTP 标签**：彩色标签标识方法

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

---

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
- **标题栏**：显示「接口列表」
- **搜索区**：关键词搜索接口（名称 + URL）
- **过滤器**：按 HTTP 方法筛选
- **文件夹树**：
  - 可折叠展开
  - 支持多级嵌套
  - 显示接口数量
  - 右键菜单操作
  - 支持拖拽移动接口/文件夹
  - 移动前校验重名冲突
  - 禁止移动到自身/子目录并显示禁止放置提示
  - 移动后自动展开目标并高亮已移动项
- **接口列表**：
  - 方法标签（彩色）
  - 接口名称
  - 支持复制、重命名、删除

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
│   ├── projects.json         # 分组状态（groups/assignments/collapsedGroups）
│   ├── {project-slug}__{uuid}/
│   │   ├── meta.json
│   │   ├── {folder-slug}__{uuid}/
│   │   │   ├── .folder.meta
│   │   │   ├── {request-slug}__{uuid}.curl
│   │   │   └── {uuid}.meta
│   │   └── ...
│   └── ...
│
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

4. **窗口拖拽不工作**
   - 确保 `--wails-draggable` 属性正确设置
   - 检查控制按钮是否设置了 `no-drag`
   - 重启应用

5. **端口占用**
   - 开发模式默认使用端口 34115
   - 修改配置或关闭占用端口的程序

---

## 🚧 未来规划

- [ ] 环境切换功能（开发/测试/生产）
- [ ] API 导入/导出（Postman、Swagger）
- [ ] 请求历史记录
- [ ] 响应对比功能
- [ ] 批量执行测试
- [ ] 插件系统
- [ ] 主题切换（深色/浅色）
- [ ] 快捷键支持
- [ ] 团队协作功能
- [ ] API 文档自动生成

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
