// ========================================
// 脚本测试用例：请求动态修改（前置脚本）
// ========================================

console.log("=== 前置脚本：请求动态修改 ===");

am.globals.set("generatedToken", "token_" + Date.now());
console.log("生成动态 Token:", am.globals.get("generatedToken"));

am.request.headers.set("X-Request-ID", "req-" + Math.random().toString(36).substr(2, 9));
console.log("添加请求追踪 ID");

am.request.headers.set("X-Generated-At", new Date().toISOString());
console.log("添加生成时间戳");

var body = JSON.parse(am.request.body.raw || '{}');
body.clientTime = Date.now();
body.traceId = "trace-" + Math.random().toString(36).substr(2, 16);
am.request.body.update(JSON.stringify(body, null, 2));
console.log("更新请求体添加追踪字段");

if (am.request.url.indexOf("prod") !== -1) {
    am.request.headers.set("X-Environment", "production");
    console.log("检测到生产环境，添加环境标记");
} else {
    am.request.headers.set("X-Environment", "development");
    console.log("检测到开发环境，添加环境标记");
}

console.log("请求动态修改完成！");
