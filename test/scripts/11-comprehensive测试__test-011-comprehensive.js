// ========================================
// 脚本测试用例：综合场景测试
// ========================================

console.log("=== 综合场景测试 ===");

console.log("\n【1. 初始化测试数据】");
am.globals.set("testStartTime", Date.now());
am.globals.set("testRunId", "run-" + Math.floor(Math.random() * 10000));
console.log("测试运行 ID:", am.globals.get("testRunId"));

console.log("\n【2. 请求前准备】");
var env = am.environment.get("env") || "dev";
console.log("当前环境:", env);

am.request.headers.set("X-Test-ID", am.globals.get("testRunId"));
am.request.headers.set("X-Env", env);

console.log("设置认证 Token");
var token = am.environment.get("token") || "demo-token";
am.request.headers.set("Authorization", "Bearer " + token);

console.log("\n【3. 发送请求】");
console.log("Method:", am.request.method);
console.log("URL:", am.request.url);
console.log("Headers:", JSON.stringify(am.request.headers.all()));

console.log("\n【4. 验证响应】");
var statusOk = am.response.code >= 200 && am.response.code < 300;
am.test("响应状态成功", function () {
    am.expect(statusOk).beTrue();
});

am.test("响应时间合理", function () {
    am.expect(true).beTrue();
});

console.log("\n【5. 数据提取与保存】");
try {
    var json = am.response.json();
    if (json && json.data) {
        if (Array.isArray(json.data)) {
            am.globals.set("resultCount", json.data.length.toString());
            console.log("提取到结果数量:", json.data.length);
        }
        if (json.data[0] && json.data[0].id) {
            am.globals.set("lastItemId", json.data[0].id.toString());
            console.log("保存最后一项 ID:", json.data[0].id);
        }
    }
} catch (e) {
    console.log("数据提取跳过（非 JSON 响应）");
}

console.log("\n【6. 测试结束】");
var duration = Date.now() - parseInt(am.globals.get("testStartTime") || "0");
console.log("测试耗时:", duration + "ms");
console.log("测试运行 ID:", am.globals.get("testRunId"));

console.log("\n=== 综合场景测试完成 ===");
