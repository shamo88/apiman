// ========================================
// 脚本测试用例：断言 API (am.expect)
// ========================================

console.log("=== 断言 API 测试 ===");

console.log("\n--- toBe 测试 ---");
am.expect(200).toBe(200);
am.expect("hello").toBe("hello");
am.expect(true).toBe(true);

console.log("\n--- eql 测试 ---");
am.expect(100).eql(100);
am.expect("test").eql("test");
am.expect({ id: 1 }).eql({ id: 1 });

console.log("\n--- include 测试 ---");
am.expect("Hello World").include("World");
am.expect("application/json").include("json");
am.expect([1, 2, 3]).include(2);

console.log("\n--- beTrue / beFalse 测试 ---");
am.expect(true).beTrue();
am.expect(1 === 1).beTrue();
am.expect(false).beFalse();
am.expect(1 > 2).beFalse();

console.log("\n--- haveProperty 测试 ---");
am.expect({ name: "test", value: 123 }).haveProperty("name");
am.expect({ id: 1, active: true }).haveProperty("active");

console.log("\n--- 失败的断言（用于演示） ---");
// 取消注释以下行可以看到失败效果
// am.expect(200).toBe(404);
// am.expect("hello").eql("world");
// am.expect("test").include("xyz");

console.log("断言 API 测试完成！");
