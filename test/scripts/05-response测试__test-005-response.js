// ========================================
// 脚本测试用例：响应对象 (am.response)
// ========================================

console.log("=== 响应对象测试 ===");

console.log("响应状态码:", am.response.code);

console.log("\n--- Response Headers ---");
console.log("所有响应 headers:", JSON.stringify(am.response.headers.all()));

console.log("\n--- Response Body ---");
console.log("响应文本:", am.response.text);

console.log("\n--- JSON 解析 ---");
var jsonData = am.response.json();
if (jsonData) {
    console.log("JSON 解析成功:", JSON.stringify(jsonData));
} else {
    console.log("JSON 解析失败或响应不是 JSON 格式");
}

console.log("响应对象测试完成！");
