// ========================================
// 脚本测试用例：Console 日志输出
// ========================================

console.log("这是一条普通日志消息");
console.log("支持多个参数:", "Hello", "World", 123, true);

console.info("这是一条信息级别日志");
console.info("当前时间:", new Date().toISOString());

console.warn("这是一条警告日志");
console.warn("警告内容: 某些值可能不符合预期");

console.error("这是一条错误日志");
console.error("错误详情: 连接超时");

console.log("数字运算:", 1 + 2, 3 * 4, 10 / 2);
console.log("布尔值:", true, false);
console.log("对象:", { name: "test", value: 123 });

console.info("Console 测试完成！");
