// ========================================
// 脚本测试用例：am.crypto 加密函数
// ========================================

console.log("=== am.crypto 加密函数测试 ===");

console.log("\n【1. MD5 哈希】");
console.log("MD5('hello'):", am.crypto.md5("hello"));
console.log("MD5('123456'):", am.crypto.md5("123456"));
console.log("MD5('admin'):", am.crypto.md5("admin"));

console.log("\n【2. SHA256 哈希】");
console.log("SHA256('hello'):", am.crypto.sha256("hello"));
console.log("SHA256('world'):", am.crypto.sha256("world"));

console.log("\n【3. SHA512 哈希】");
console.log("SHA512('test'):", am.crypto.sha512("test"));

console.log("\n【4. Base64 编码解码】");
var original = "Hello World 你好世界";
var encoded = am.crypto.base64Encode(original);
console.log("原文:", original);
console.log("Base64编码:", encoded);
console.log("Base64解码:", am.crypto.base64Decode(encoded));

console.log("\n【5. URL安全Base64】");
var urlData = "name=张三&age=18";
var urlEncoded = am.crypto.base64URLEncode(urlData);
console.log("URL安全编码:", urlEncoded);

console.log("\n【6. HMAC-SHA256 签名】");
var message = "user=1001&time=1699999999&amount=100";
var secret = "your-secret-key-123";
var signature = am.crypto.hmacSHA256(message, secret);
console.log("消息:", message);
console.log("密钥:", secret);
console.log("HMAC-SHA256签名:", signature);

console.log("\n【7. AES 对称加密】");
var aesKey = "1234567890123456";
var plaintext = "这是一段需要加密的敏感数据";
var encrypted = am.crypto.aesEncrypt(plaintext, aesKey);
console.log("原文:", plaintext);
console.log("AES加密:", encrypted);
var decrypted = am.crypto.aesDecrypt(encrypted, aesKey);
console.log("AES解密:", decrypted);

console.log("\n【8. 随机字符串】");
console.log("随机16位:", am.crypto.randomString(16));
console.log("随机32位:", am.crypto.randomString(32));

console.log("\n【9. JSON 格式化】");
var messyJson = '{"name":"test","code":200,"data":[1,2,3]}';
console.log("原始JSON:", messyJson);
console.log("格式化后:", am.crypto.formatJSON(messyJson));

console.log("\n【10. 常用签名模式演示】");
var timestamp = Date.now();
var appSecret = "app_secret_2024";
var signStr = "appId=1001&timestamp=" + timestamp + "&nonce=" + am.crypto.randomString(8);
var sign = am.crypto.hmacSHA256(signStr, appSecret);
console.log("签名原文:", signStr);
console.log("最终签名:", sign);

console.log("\n=== am.crypto 加密函数测试完成 ===");
