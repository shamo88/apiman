// ========================================
// 脚本测试用例：常用代码片段参考
// ========================================

console.log("=== 常用代码片段参考 ===");

console.log("\n【获取当前时间戳】");
var timestamp = Date.now();
console.log("时间戳:", timestamp);
console.log("格式化:", new Date(timestamp).toISOString());

console.log("\n【生成随机字符串】");
var randomId = Math.random().toString(36).substr(2, 16);
console.log("随机 ID:", randomId);

console.log("\n【JSON 序列化与反序列化】");
var obj = { name: "test", value: 123 };
var jsonStr = JSON.stringify(obj);
console.log("对象转 JSON:", jsonStr);
var parsed = JSON.parse(jsonStr);
console.log("JSON 转对象:", JSON.stringify(parsed));

console.log("\n【字符串操作】");
var str = "Hello World";
console.log("转大写:", str.toUpperCase());
console.log("转小写:", str.toLowerCase());
console.log("包含检查:", str.includes("World"));
console.log("替换:", str.replace("World", "JavaScript"));
console.log("分割:", str.split(" "));

console.log("\n【数组操作】");
var arr = [1, 2, 3, 4, 5];
console.log("遍历:", arr.map(function (x) { return x * 2; }));
console.log("过滤:", arr.filter(function (x) { return x > 2; }));
console.log("求和:", arr.reduce(function (a, b) { return a + b; }, 0));

console.log("\n【条件判断】");
var code = 200;
if (code >= 200 && code < 300) {
    console.log("2xx 成功");
} else if (code >= 400 && code < 500) {
    console.log("4xx 客户端错误");
} else if (code >= 500) {
    console.log("5xx 服务器错误");
} else {
    console.log("其他状态码");
}

console.log("\n【错误处理】");
try {
    JSON.parse("invalid json");
} catch (e) {
    console.log("捕获错误:", e.message);
}

console.log("\n【MD5 加密】");
console.log("am.crypto.md5('hello'):", am.crypto.md5("hello"));
console.log("am.crypto.md5('world'):", am.crypto.md5("world"));

console.log("\n【SHA256 加密】");
console.log("am.crypto.sha256('hello'):", am.crypto.sha256("hello"));

console.log("\n【SHA512 加密】");
console.log("am.crypto.sha512('hello'):", am.crypto.sha512("hello"));

console.log("\n【Base64 编码解码】");
console.log("am.crypto.base64Encode('hello'):", am.crypto.base64Encode("hello"));
console.log("am.crypto.base64Decode('aGVsbG8='):", am.crypto.base64Decode("aGVsbG8="));
console.log("am.crypto.base64URLEncode('hello world'):", am.crypto.base64URLEncode("hello world"));

console.log("\n【HMAC 签名】");
console.log("am.crypto.hmacSHA256('message', 'secret'):", am.crypto.hmacSHA256("message", "secret"));

console.log("\n【AES 加解密】");
var aesKey = "1234567890123456";
var encrypted = am.crypto.aesEncrypt("secret data", aesKey);
console.log("am.crypto.aesEncrypt:", encrypted);
console.log("am.crypto.aesDecrypt:", am.crypto.aesDecrypt(encrypted, aesKey));

console.log("\n【随机字符串】");
console.log("am.crypto.randomString(16):", am.crypto.randomString(16));

console.log("\n【格式化 JSON】");
var uglyJson = '{"name":"test","value":123}';
console.log("am.crypto.formatJSON:", am.crypto.formatJSON(uglyJson));

console.log("\n常用代码片段参考完成！");
