export const SCRIPT_HELP_CONTENT = `## am.globals（全局变量）

- \`am.globals.get(key)\` - 获取全局变量
- \`am.globals.set(key, value)\` - 设置全局变量（持久化到 variables.json）
- \`am.globals.unset(key)\` - 删除全局变量

## am.environment（环境变量）

- \`am.environment.get(key)\` - 获取环境变量值

## am.locals（局部变量）

- \`am.locals.get(key)\` - 获取局部变量
- \`am.locals.set(key, value)\` - 设置局部变量
- \`am.locals.unset(key)\` - 删除局部变量

## am.request（请求信息）

- \`am.request.method\` - HTTP 方法
- \`am.request.url\` - 请求 URL
- \`am.request.headers\` - 请求头对象，支持 get/set/unset/all
- \`am.request.params\` - URL 参数对象
- \`am.request.body\` - 请求体对象

## am.response（响应信息）

- \`am.response.code\` - HTTP 状态码
- \`am.response.headers.all()\` - 所有响应头
- \`am.response.text()\` - 响应体文本
- \`am.response.json()\` - 响应体 JSON

## am.test & am.expect（测试断言）

- \`am.test(name, fn)\` - 定义测试用例
- \`am.expect(actual)\` - 链式断言

## am.crypto（加密工具）

- Hash: \`md5\`, \`sha1\`, \`sha256\`, \`sha512\`
- Encode: \`base64Encode\`, \`base64Decode\`
- HMAC: \`hmacSHA256\`, \`hmacSHA1\`
- AES: \`aesEncrypt\`, \`aesDecrypt\`
- RSA: \`rsaEncrypt\`, \`rsaDecrypt\`
- Other: \`randomString(length)\`, \`formatJSON(obj)\`
`;

export const BUILT_IN_GENERATORS = [
  { name: '$date.timestamp', description: '当前Unix时间戳（秒）', example: '{{$date.timestamp}}' },
  { name: '$date.timestampMs', description: '当前Unix时间戳（毫秒）', example: '{{$date.timestampMs}}' },
  { name: '$date.now', description: '当前时间（ISO格式）', example: '{{$date.now}}' },
  { name: '$date.now', description: '格式化日期', example: '{{$date.now(\'yyyy-MM-dd\')}}' },
  { name: '$uuid', description: '随机UUID', example: '{{$uuid}}' },
  { name: '$random.int', description: '随机整数', example: '{{$random.int}}' },
  { name: '$random.float', description: '随机浮点数', example: '{{$random.float}}' },
  { name: '$random.alpha', description: '随机字母字符串', example: '{{$random.alpha(10)}}' },
  { name: '$random.alphanumeric', description: '随机字母数字字符串', example: '{{$random.alphanumeric(10)}}' },
];
