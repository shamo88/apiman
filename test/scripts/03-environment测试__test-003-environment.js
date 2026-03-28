// ========================================
// 脚本测试用例：环境变量 (am.environment)
// ========================================

console.log("=== 环境变量测试 ===");

console.log("获取环境变量 server:", am.environment.get("server"));
console.log("获取环境变量 port:", am.environment.get("port"));
console.log("获取环境变量 token:", am.environment.get("token"));
console.log("获取不存在的变量:", am.environment.get("nonExistent"));

console.log("注意: 环境变量仅支持读取，不支持修改");

console.log("环境变量测试完成！");
