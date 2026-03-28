// ========================================
// 脚本测试用例：全局变量 (am.globals)
// ========================================

console.log("=== 全局变量测试 ===");

console.log("当前全局变量值:", am.globals.get("testKey"));

am.globals.set("apiKey", "sk-test-12345678");
console.log("设置 apiKey 后的值:", am.globals.get("apiKey"));

am.globals.set("baseUrl", "https://api.example.com");
console.log("设置 baseUrl 后的值:", am.globals.get("baseUrl"));

am.globals.set("counter", 100);
console.log("设置 counter 后的值:", am.globals.get("counter"));

console.log("使用变量拼接 URL:", am.globals.get("baseUrl") + "/v1/users");

am.globals.unset("counter");
console.log("删除 counter 后的值:", am.globals.get("counter"));

am.globals.set("timestamp", Date.now());
console.log("设置时间戳:", am.globals.get("timestamp"));

console.log("全局变量测试完成！");
