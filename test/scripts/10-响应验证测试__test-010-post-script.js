// ========================================
// 脚本测试用例：响应验证（后置脚本）
// ========================================

console.log("=== 后置脚本：响应验证 ===");

console.log("当前响应状态:", am.response.code);

am.test("响应状态码应为 200", function () {
    am.expect(am.response.code).toBe(200);
});

am.test("响应应为 JSON 格式", function () {
    var json = am.response.json();
    am.expect(json).not().toBe(null);
});

am.test("响应应包含成功标志", function () {
    var json = am.response.json();
    if (json) {
        am.expect(JSON.stringify(json)).include("success");
    }
});

am.test("Content-Type 应为 application/json", function () {
    var ct = am.response.headers.all()["Content-Type"];
    am.expect(ct).include("application/json");
});

console.log("\n--- 响应数据日志 ---");
console.log("响应 Body:", am.response.text.substring(0, 200) + "...");

try {
    var data = am.response.json();
    if (data && typeof data === 'object') {
        console.log("JSON 数据键:", Object.keys(data).join(", "));
        if (data.data) {
            console.log("数据项数量:", Array.isArray(data.data) ? data.data.length : "N/A");
        }
    }
} catch (e) {
    console.log("解析响应 JSON 失败:", e.message);
}

console.log("响应验证完成！");
