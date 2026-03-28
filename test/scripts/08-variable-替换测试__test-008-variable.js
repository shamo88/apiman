// ========================================
// 脚本测试用例：变量替换场景
// ========================================

console.log("=== 变量替换场景测试 ===");

am.globals.set("userId", "12345");
am.globals.set("authToken", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");

console.log("生成带变量的 URL:");
var url = am.globals.get("baseUrl") || "https://api.example.com";
console.log("完整 URL:", url + "/users/" + am.globals.get("userId"));

console.log("\n生成带 Token 的 Authorization header:");
am.request.headers.set("Authorization", am.globals.get("authToken"));
console.log("Authorization:", am.request.headers.get("Authorization"));

console.log("\n动态生成查询参数:");
var timestamp = Date.now();
am.request.params.set("t", timestamp.toString());
console.log("添加时间戳参数:", am.request.params.get("t"));

console.log("\n变量替换场景测试完成！");
