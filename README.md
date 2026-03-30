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
