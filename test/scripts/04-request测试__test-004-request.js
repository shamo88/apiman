// ========================================
// 脚本测试用例：请求对象 (am.request)
// ========================================

console.log("=== 请求对象测试 ===");

console.log("当前请求方法:", am.request.method);
console.log("当前请求 URL:", am.request.url);

console.log("\n--- Headers 测试 ---");
console.log("获取 Content-Type header:", am.request.headers.get("Content-Type"));
console.log("获取 Authorization header:", am.request.headers.get("Authorization"));
console.log("获取所有 headers:", JSON.stringify(am.request.headers.all()));

am.request.headers.set("X-Custom-Header", "custom-value");
console.log("设置 X-Custom-Header 后的值:", am.request.headers.get("X-Custom-Header"));

am.request.headers.unset("X-Custom-Header");
console.log("删除 X-Custom-Header 后的值:", am.request.headers.get("X-Custom-Header"));

console.log("\n--- Params 测试 ---");
console.log("获取 page 参数:", am.request.params.get("page"));
console.log("获取 limit 参数:", am.request.params.get("limit"));
console.log("获取所有 params:", JSON.stringify(am.request.params.all()));

am.request.params.set("sort", "desc");
console.log("设置 sort 参数后的值:", am.request.params.get("sort"));

console.log("\n--- Body 测试 ---");
console.log("Body 类型:", am.request.body.type);
console.log("Body 内容:", am.request.body.raw);

am.request.body.update('{"name": "updated", "value": 456}');
console.log("更新后的 Body:", am.request.body.raw);

console.log("请求对象测试完成！");
