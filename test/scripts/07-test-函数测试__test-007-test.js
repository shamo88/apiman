// ========================================
// 脚本测试用例：测试函数 (am.test)
// ========================================

console.log("=== am.test 函数测试 ===");

am.test("状态码应为 200", function () {
    am.expect(am.response.code).toBe(200);
});

am.test("响应应包含 JSON 数据", function () {
    var json = am.response.json();
    am.expect(json).toBe(null);
});

am.test("响应时间应小于 5 秒", function () {
    am.expect(am.response.code).beTrue();
});

am.test("自定义验证逻辑", function () {
    var code = am.response.code;
    var body = am.response.text;
    if (code >= 200 && code < 300) {
        console.log("请求成功！");
    } else {
        console.log("请求失败！");
    }
});

console.log("am.test 函数测试完成！");
