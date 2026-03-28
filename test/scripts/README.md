# 脚本测试用例说明

本目录包含 Apiman 前后置脚本功能的测试用例，用于验证各 API 的正确性。

## 文件列表

| 文件 | 功能 | 适用场景 |
|------|------|----------|
| `01_console测试.js` | console.log/info/warn/error | 验证日志输出功能 |
| `02_全局变量测试.js` | am.globals.get/set/unset | 验证全局变量读写 |
| `03_环境变量测试.js` | am.environment.get | 验证环境变量读取 |
| `04_请求对象测试.js` | am.request.* | 验证请求对象访问与修改 |
| `05_响应对象测试.js` | am.response.* | 验证响应对象访问 |
| `06_断言API测试.js` | am.expect().toBe/eql/include/beTrue/beFalse/haveProperty | 验证断言 API |
| `07_测试函数测试.js` | am.test(name, fn) | 验证测试函数 |
| `08_变量替换测试.js` | 变量组合使用场景 | 验证变量拼接 URL/Headers |
| `09_请求动态修改测试.js` | 前置脚本场景 | 动态添加 headers/params/body |
| `10_响应验证测试.js` | 后置脚本场景 | 验证响应状态/内容 |
| `11_综合场景测试.js` | 完整测试流程 | 综合验证前后置脚本配合 |
| `12_常用代码片段.js` | 代码参考 | JavaScript 常用操作示例 |

## 使用方法

1. 在 Apiman 中打开任意请求
2. 选择「前置脚本」或「后置脚本」标签页
3. 从脚本列表中选择对应的测试脚本
4. 点击「发送」按钮执行
5. 在响应面板的「脚本结果」标签页查看日志和测试结果

## 测试脚本功能覆盖

### console 对象
- [x] console.log
- [x] console.info
- [x] console.warn
- [x] console.error

### am.globals 全局变量
- [x] get(key)
- [x] set(key, value)
- [x] unset(key)

### am.environment 环境变量
- [x] get(key)

### am.locals 本地变量
- [x] get(key)
- [x] set(key, value)
- [x] unset(key)

### am.request 请求对象
- [x] method
- [x] url
- [x] headers.get(key)
- [x] headers.set(key, value)
- [x] headers.unset(key)
- [x] headers.all()
- [x] params.get(key)
- [x] params.set(key, value)
- [x] params.unset(key)
- [x] params.all()
- [x] body.type
- [x] body.raw
- [x] body.update(newBody)

### am.response 响应对象
- [x] code
- [x] headers
- [x] text
- [x] json()

### am.test 测试函数
- [x] test(name, fn)

### am.expect 断言
- [x] .toBe(expected)
- [x] .eql(expected)
- [x] .include(expected)
- [x] .beTrue()
- [x] .beFalse()
- [x] .haveProperty(key)
