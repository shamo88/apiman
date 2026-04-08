# Apiman 项目优化建议文档

> 生成时间：2026-04-09
> 项目技术栈：Wails v2 (Go 1.24 + React 18 + TypeScript + Ant Design)

---

## 一、紧急问题（需立即修复）

### 1.1 安全问题

#### 🔴 密码学安全问题
**位置**：`internal/config/config.go`、`internal/git/git.go`

```go
// 硬编码密钥 + XOR 混淆（非真正加密）
var obfuscationKey = []byte("apiman-git-sync-key-2024")

func obfuscate(input string) string {
    // XOR 混淆可被轻易破解
}
```

**建议**：
- 使用 `golang.org/x/crypto/nacl/secretbox` 进行真正加密
- 或考虑使用系统 keychain（如 keyring 库）存储敏感信息
- Git token 等敏感信息应加密存储而非简单混淆

#### 🔴 Vite 3.x 已知安全漏洞
**位置**：`frontend/package.json`

当前使用 `vite@^3.0.7`，存在多个 CVE 漏洞（如 CVE-2024-23331）。

**修复**：
```bash
cd frontend
npm install vite@^5.0.0 --save-dev
```

---

### 1.2 构建问题

#### 🔴 go.mod 本地 replace 指令
**位置**：`go.mod` 第 63 行

```go
// replace github.com/wailsapp/wails/v2 v2.11.0 => C:\Users\shamo\go\pkg\mod
```

这会导致在其他机器上构建失败。

**修复**：
- 删除 replace 指令
- 或将本地修改提交到 fork 并使用 proper version

#### 🟠 goja 使用伪版本号
**位置**：`go.mod`

```go
github.com/dop251/goja v0.0.0-20260311135729-065cd970411c
```

**建议**：改为正式 release tag，如 `v0.0.0-20240517`

---

## 二、前端优化建议

### 2.1 代码重复（P0）

#### 问题：apiConfigFromRequest 函数重复定义 3 次

| 位置 | 函数名 | 行数 |
|------|--------|------|
| `frontend/src/utils/curlUtils.ts` | 184-225 | 重复定义 |
| `frontend/src/utils/apiConfig.ts` | 15-40 | 主定义 |
| `frontend/src/utils/curlUtils.ts` | 227-260 | `apiConfigFromHttpSpec` 重复 |

**修复**：
1. 删除 `curlUtils.ts` 中的重复函数
2. 统一从 `apiConfig.ts` 导入使用
3. 建立函数索引清单避免未来重复

#### 问题：环境变量转换函数重复
- `useEnvironmentStore.ts` 有 `environmentToRows` / `rowsToEnvironmentVariables`
- `apiConfig.ts` 有类似逻辑

**建议**：抽取为 `utils/envUtils.ts`

---

### 2.2 类型安全（P0）

#### 96 处 `any` 类型使用

主要分布：
```
useProjects.ts     - 18处
HomePage.tsx       - 10处
curlUtils.ts       - 8处
useHistoryStore.ts - 6处
```

**建议**：
1. 从 `CurlRequest` 接口开始建立完整类型定义
2. 使用 `unknown` 替代 `any`，配合类型守卫
3. 逐步迁移，优先处理业务核心类型

---

### 2.3 React 最佳实践违规（P1）

#### 问题 1：直接调用 store.getState()
**位置**：`TitleBar.tsx:61`、`useWorkspaceHandlers.ts:96`

```typescript
// 违反 React 单向数据流
const workspaceStore = useWorkspaceStore.getState();
```

**建议**：通过 props 传递或使用 custom hook 封装

#### 问题 2：contentEditable 直接操作 DOM
**位置**：`components/VariableEditableInput.tsx:54-55`

```typescript
// 存在 XSS 风险和 React reconciliation 问题
if (editor.innerHTML !== html) {
    editor.innerHTML = html;
}
```

**建议**：
- 使用 React 的受控组件模式
- 或使用 `<div contentEditable={false}>` 避免编辑

#### 问题 3：内联函数作为 props
**位置**：`ProjectWorkspace.tsx:556`

```typescript
<RequestPanel
    onApiConfigChange={(config) => handleUpdateWorkspace({ apiConfig: config })}
```

**建议**：使用 `useCallback` 包装或提升状态

#### 问题 4：缺少 React.memo 优化
**位置**：`HomePage.tsx:276`

```typescript
// 每次渲染重新计算
const filteredProjects = projects.filter(...)
```

**建议**：使用 `useMemo` 包装

#### 问题 5：window.location.reload() 滥用
**位置**：`HomePage.tsx:102, 118, 137`

```typescript
// 粗暴刷新，用户状态全部丢失
window.location.reload();
```

**建议**：使用 React 状态重置或 Wails 窗口刷新 API

---

### 2.4 组件复杂度（P2）

| 组件 | 行数 | 建议 |
|------|------|------|
| `ProjectWorkspace.tsx` | 588 | 拆分为 `EnvironmentEditor.tsx` 和 `ScriptEditor.tsx` |
| `HomePage.tsx` | 568 | 拆分为 `ProjectCard.tsx` 和 `GroupSection.tsx` |
| `useWorkspaceHandlers.ts` | 373 | 按领域拆分为多个 hook |

#### 巨型 Store
| Store | 状态字段 | 问题 |
|-------|---------|------|
| `useUIStore` | 56个状态 + 46个 action | 职责过重，建议拆分 |

---

### 2.5 样式管理（P3）

#### App.css 过于庞大
**位置**：`frontend/src/App.css` (884 行)

**建议**：拆分为
```
styles/
├── theme.css        # 主题变量
├── global.css       # 全局样式
├── antd-overrides.css # Ant Design 覆盖
└── components/      # 组件级样式
```

#### !important 滥用
多处使用 `!important` 覆盖 Ant Design 默认值，影响主题切换。

**建议**：使用 CSS 变量和 Ant Design ConfigProvider 主题机制

---

## 三、后端优化建议

### 3.1 模块架构（P1）

#### Service 层过于臃肿
**位置**：`internal/service/service.go` (~1013 行)

当前职责：
- 环境管理
- 项目管理
- 脚本执行
- Git 同步
- 历史记录
- Cookie 管理

**建议**：拆分为独立 Service
```
internal/service/
├── service.go       # 门面层
├── env_service.go   # 环境管理
├── project_service.go # 项目管理
├── history_service.go # 历史记录
└── git_service.go   # Git 同步
```

#### project.go 过大
**位置**：`internal/project/project.go` (~1450 行)

**建议**：拆分为 `project/` 子包
```
internal/project/
├── project.go       # 主逻辑
├── folder.go        # 文件夹操作
├── request.go       # 请求操作
└── import_export.go # 导入导出
```

---

### 3.2 错误处理（P1）

#### 不一致的模式

```go
// 问题 1：静默忽略错误，无日志
if recordErr := s.RecordHistory(...); recordErr != nil {
    // 历史记录失败不影响主流程
}

// 问题 2：nil vs error 不一致
func (s *Service) GetHistoryEntry(id string) (*models.RequestHistory, error) {
    if s.HistoryMgr == nil {
        return nil, nil  // 应返回 error
    }
}

// 问题 3：构造函数中 panic
if err := os.MkdirAll(configDir, 0755); err != nil {
    panic(err)  // 不应在构造函数中 panic
}
```

**建议**：
1. 建立统一的错误处理规范文档
2. 历史记录失败应至少记录 warn 日志
3. 移除构造函数中的 panic，改返回 error
4. 使用 sentinel errors 定义业务错误类型

---

### 3.3 日志系统（P2）

#### 当前实现过于简单
**位置**：`internal/logger/logger.go` (47 行)

问题：
- 仅使用标准库 `log`，无级别区分
- Git 模块使用 `log.Printf` 与全局 logger 不一致
- 无结构化日志，难以查询分析

**建议**：
```go
// 引入 zap 或 zerolog
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()

logger.Info("request completed",
    zap.String("method", "GET"),
    zap.String("url", url),
    zap.Int("status", 200),
)
```

---

### 3.4 配置管理（P2）

#### HTTP 超时硬编码
**位置**：`curl/curl.go:95`

```go
client := &http.Client{Timeout: 30 * time.Second}  // 应可配置
```

**建议**：从配置文件读取或使用环境变量

#### 魔法数字
**位置**：`script/runtime.go`

```go
DefaultScriptTimeout = 1000 * time.Millisecond
MaxLogOutputLength = 10000
MaxTestCount = 100
```

**建议**：移入配置文件

---

### 3.5 测试覆盖（P3）

整个项目未发现 `*_test.go` 文件。

**建议**：
1. 核心模块添加单元测试（curl、script、project）
2. 使用 table-driven tests 模式
3. 关键业务逻辑添加集成测试

---

## 四、依赖版本优化

### 4.1 前端依赖

| 依赖 | 当前版本 | 建议版本 | 原因 |
|------|---------|---------|------|
| vite | ^3.0.7 | ^5.0.0 | 安全漏洞 |
| typescript | ^4.6.4 | ^5.0.0 | 老旧版本 |
| @vitejs/plugin-react | ^2.0.1 | ^4.0.0 | Fast Refresh 改进 |
| @types/react | ^18.0.17 | ^18.3.0 | 类型更新 |
| @types/react-dom | ^18.0.6 | ^18.3.0 | 类型更新 |

### 4.2 Go 依赖

| 依赖 | 当前版本 | 建议版本 | 原因 |
|------|---------|---------|------|
| github.com/dop251/goja | pseudo-version | v0.0.0-20240517 | 正式 tag |
| github.com/natefinch/lumberjack | v2.0.0+incompatible | v2.2.1 | semver 兼容 |

---

## 五、文档问题

### 5.1 README 版本不一致

**位置**：`README.md`

```markdown
安装 Go 1.21+  # README 说 1.21+
go 1.24.0      # go.mod 要求 1.24.0
```

**修复**：统一为 Go 1.24.0

---

## 六、优化优先级汇总

| 优先级 | 问题 | 影响 |
|--------|------|------|
| P0 | XOR 密码学安全问题 | 安全风险 |
| P0 | Vite 3.x 安全漏洞 | 安全风险 |
| P0 | go.mod replace 指令 | 构建失败 |
| P0 | 代码重复（apiConfigFromRequest） | 维护困难 |
| P0 | 96 处 any 类型 | 类型安全 |
| P1 | 直接调用 store.getState() | 架构违规 |
| P1 | Service 层过于臃肿 | 维护性 |
| P1 | 错误处理不一致 | 可靠性 |
| P1 | 构造函数 panic | 健壮性 |
| P2 | 巨型组件（500+ 行） | 可维护性 |
| P2 | 日志系统过于简单 | 可观测性 |
| P2 | HTTP 超时硬编码 | 灵活性 |
| P3 | 缺少单元测试 | 代码质量 |
| P3 | App.css 过于庞大 | 可维护性 |
| P3 | !important 滥用 | 主题切换 |

---

## 七、长期规划建议

1. **引入 CI/CD**：添加 GitHub Actions 自动化测试和构建
2. **性能监控**：添加前端性能指标收集
3. **国际化**：错误消息统一使用 i18n
4. **插件系统**：考虑支持自定义脚本/插件扩展
5. **WebSocket 实时同步**：改善 Git 同步的实时反馈

---

## 八、修复状态 (2026-04-09)

### ✅ 已修复

| 问题 | 修复文件 | 修复方式 |
|------|---------|---------|
| XOR 密码学安全问题 | `config.go`, `git.go` | 使用 nacl/secretbox 替换 XOR 混淆 |
| Vite 3.x 安全漏洞 | `package.json` | 升级到 vite@^5.4.0 |
| go.mod replace 指令 | `go.mod` | 移除 replace 指令 |
| 代码重复 | `curlUtils.ts` | 删除重复的 `apiConfigFromRequest` 和 `apiConfigFromHttpSpec` |
| 构造函数 panic | `config.go`, `project.go`, `service.go`, `app.go`, `main.go` | 改为返回 `(*Service, error)` |
| 前端依赖升级 | `package.json` | 升级 TypeScript@^5.6.0, @vitejs/plugin-react@^4.3.0, @types/react@^18.3.0 |

### ⚠️ 待修复

| 问题 | 优先级 | 说明 |
|------|--------|------|
| 96 处 `any` 类型 | P0 | 需要较大重构，建议按模块逐步替换 |
| 巨型组件 (500+ 行) | P2 | 需要较大重构，建议拆分为多个小组件 |
| 日志系统过于简单 | P2 | 建议引入 zap 或 zerolog |
| HTTP 超时硬编码 | P2 | 建议移入配置文件 |
| 缺少单元测试 | P3 | 建议为关键模块添加测试 |
| App.css 过于庞大 | P3 | 建议按功能拆分样式文件 |
