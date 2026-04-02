import React, { useEffect } from 'react';

interface ScriptHelpWindowProps {
    visible: boolean;
    onClose: () => void;
}

const CONTENT = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>脚本开发指南</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #333; background: #fff; }
        .container { padding: 20px; height: 100vh; overflow-y: auto; }
        h3 { margin: 20px 0 10px 0; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        h4 { margin: 15px 0 8px 0; color: #333; }
        ul { padding-left: 20px; margin: 8px 0; }
        li { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: 500; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', Consolas, monospace; font-size: 12px; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; line-height: 1.5; margin: 10px 0; font-family: 'JetBrains Mono', Consolas, monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h3>一、存储位置</h3>
        <ul>
            <li>每个项目的脚本都保存在项目目录下：<code>scripts/</code></li>
            <li>脚本源码文件：<code>{slug}__{uuid}.js</code></li>
            <li>脚本元数据文件：<code>{uuid}.meta</code></li>
        </ul>

        <h3>二、使用流程</h3>
        <ul>
            <li>先在左侧「脚本」菜单中创建并保存脚本</li>
            <li>再到请求页，在「前置脚本 / 后置脚本」标签中绑定脚本</li>
            <li>请求点击"保存"后，接口与脚本的绑定关系会落盘到请求 meta</li>
        </ul>

        <h3>三、脚本职责建议</h3>
        <ul>
            <li><strong>前置脚本</strong>：生成时间戳、nonce、签名、动态 header、变量拼装</li>
            <li><strong>后置脚本</strong>：校验响应、抽取关键字段、记录调试日志</li>
        </ul>

        <h3>四、am 对象 API 完整文档</h3>

        <h4>4.1 console（日志输出）</h4>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>console.log(...args)</code></td><td>输出普通日志</td></tr>
            <tr><td><code>console.info(...args)</code></td><td>输出信息日志</td></tr>
            <tr><td><code>console.warn(...args)</code></td><td>输出警告日志</td></tr>
            <tr><td><code>console.error(...args)</code></td><td>输出错误日志</td></tr>
        </table>

        <h4>4.2 am.globals（全局变量）</h4>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.globals.get(key)</code></td><td>获取全局变量值，不存在返回 undefined</td></tr>
            <tr><td><code>am.globals.set(key, value)</code></td><td>设置全局变量（持久化到 variables.json）</td></tr>
            <tr><td><code>am.globals.unset(key)</code></td><td>删除指定全局变量</td></tr>
        </table>

        <h4>4.3 am.environment（环境变量）</h4>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.environment.get(key)</code></td><td>获取环境变量值，不存在返回 undefined</td></tr>
        </table>

        <h4>4.4 am.locals（局部变量）</h4>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.locals.get(key)</code></td><td>获取局部变量值，不存在返回 undefined</td></tr>
            <tr><td><code>am.locals.set(key, value)</code></td><td>设置局部变量</td></tr>
            <tr><td><code>am.locals.unset(key)</code></td><td>删除指定局部变量</td></tr>
        </table>

        <h4>4.5 am.request（请求信息）</h4>
        <table>
            <tr><th>属性/方法</th><th>说明</th></tr>
            <tr><td><code>am.request.method</code></td><td>HTTP 方法（如 GET、POST）</td></tr>
            <tr><td><code>am.request.url</code></td><td>请求 URL</td></tr>
            <tr><td><code>am.request.headers</code></td><td>请求头对象（见下方方法）</td></tr>
            <tr><td><code>am.request.params</code></td><td>URL 参数对象（见下方方法）</td></tr>
            <tr><td><code>am.request.body</code></td><td>请求体对象（见下方属性）</td></tr>
        </table>

        <p><strong>am.request.headers 方法：</strong></p>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.request.headers._data</code></td><td>所有请求头原始对象</td></tr>
            <tr><td><code>am.request.headers.all()</code></td><td>获取所有请求头的 Map</td></tr>
            <tr><td><code>am.request.headers.get(key)</code></td><td>获取指定请求头值</td></tr>
            <tr><td><code>am.request.headers.set(key, value)</code></td><td>设置请求头（仅对当前请求生效）</td></tr>
            <tr><td><code>am.request.headers.unset(key)</code></td><td>删除指定请求头</td></tr>
        </table>

        <p><strong>am.request.params 方法：</strong></p>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.request.params._data</code></td><td>所有参数原始对象</td></tr>
            <tr><td><code>am.request.params.all()</code></td><td>获取所有参数的 Map</td></tr>
            <tr><td><code>am.request.params.get(key)</code></td><td>获取指定参数值</td></tr>
            <tr><td><code>am.request.params.set(key, value)</code></td><td>设置参数（仅对当前请求生效）</td></tr>
            <tr><td><code>am.request.params.unset(key)</code></td><td>删除指定参数</td></tr>
        </table>

        <p><strong>am.request.body 属性：</strong></p>
        <table>
            <tr><th>属性/方法</th><th>说明</th></tr>
            <tr><td><code>am.request.body.type</code></td><td>请求体类型（如 json、text、form）</td></tr>
            <tr><td><code>am.request.body.raw</code></td><td>请求体原始内容</td></tr>
            <tr><td><code>am.request.body.update(newBody)</code></td><td>更新请求体内容</td></tr>
        </table>

        <h4>4.6 am.response（响应信息）</h4>
        <table>
            <tr><th>属性/方法</th><th>说明</th></tr>
            <tr><td><code>am.response.code</code></td><td>HTTP 状态码（如 200、404）</td></tr>
            <tr><td><code>am.response.headers.all()</code></td><td>获取所有响应头</td></tr>
            <tr><td><code>am.response.text()</code></td><td>获取响应体原文</td></tr>
            <tr><td><code>am.response.json()</code></td><td>解析响应体为 JSON 对象</td></tr>
        </table>

        <h4>4.7 am.test（测试断言）</h4>
        <p><code>am.test(name: string, fn: function): void</code></p>
        <p>定义一个测试用例，fn 返回 true 表示通过，抛出异常或返回 false 表示失败。</p>
        <pre>// 示例
am.test("状态码为200", function() {
    return am.response.code === 200;
});

am.test("响应包含token", function() {
    return am.response.text().includes("token");
});</pre>

        <h4>4.8 am.expect（链式断言）</h4>
        <p><code>am.expect(actual): AssertionBuilder</code></p>
        <p>对实际值进行链式断言，支持以下方法：</p>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>.to.be(expected)</code></td><td>断言值相等（严格相等 ===）</td></tr>
            <tr><td><code>.eql(expected)</code></td><td>断言值深度相等</td></tr>
            <tr><td><code>.include(expected)</code></td><td>断言包含子字符串</td></tr>
            <tr><td><code>.beTrue()</code></td><td>断言为 true</td></tr>
            <tr><td><code>.beFalse()</code></td><td>断言为 false</td></tr>
            <tr><td><code>.have.property(key)</code></td><td>断言对象包含指定属性</td></tr>
        </table>
        <pre>// 示例
am.expect(am.response.code).to.be(200);
am.expect(am.response.text()).to.include("success");
am.expect(am.response.json()).to.have.property("token");</pre>

        <h4>4.9 am.crypto（加密工具）</h4>
        <table>
            <tr><th>方法</th><th>说明</th></tr>
            <tr><td><code>am.crypto.md5(input)</code></td><td>MD5 哈希</td></tr>
            <tr><td><code>am.crypto.sha1(input)</code></td><td>SHA1 哈希</td></tr>
            <tr><td><code>am.crypto.sha256(input)</code></td><td>SHA256 哈希</td></tr>
            <tr><td><code>am.crypto.sha512(input)</code></td><td>SHA512 哈希</td></tr>
            <tr><td><code>am.crypto.base64Encode(input)</code></td><td>Base64 编码</td></tr>
            <tr><td><code>am.crypto.base64Decode(input)</code></td><td>Base64 解码</td></tr>
            <tr><td><code>am.crypto.base64URLEncode(input)</code></td><td>Base64URL 编码</td></tr>
            <tr><td><code>am.crypto.base64URLDecode(input)</code></td><td>Base64URL 解码</td></tr>
            <tr><td><code>am.crypto.hmacSHA256(data, key)</code></td><td>HMAC-SHA256</td></tr>
            <tr><td><code>am.crypto.hmacSHA1(data, key)</code></td><td>HMAC-SHA1</td></tr>
            <tr><td><code>am.crypto.aesEncrypt(data, key, iv?)</code></td><td>AES 加密（可选 IV）</td></tr>
            <tr><td><code>am.crypto.aesDecrypt(data, key, iv?)</code></td><td>AES 解密（可选 IV）</td></tr>
            <tr><td><code>am.crypto.rsaEncrypt(data, publicKey)</code></td><td>RSA 公钥加密</td></tr>
            <tr><td><code>am.crypto.rsaDecrypt(data, privateKey)</code></td><td>RSA 私钥解密</td></tr>
            <tr><td><code>am.crypto.rsaSign(data, privateKey)</code></td><td>RSA 签名</td></tr>
            <tr><td><code>am.crypto.rsaVerify(data, signature, publicKey)</code></td><td>RSA 验签</td></tr>
            <tr><td><code>am.crypto.rsaEncryptOAEP(data, publicKey)</code></td><td>RSA OAEP 加密</td></tr>
            <tr><td><code>am.crypto.rsaDecryptOAEP(data, privateKey)</code></td><td>RSA OAEP 解密</td></tr>
            <tr><td><code>am.crypto.generateKeyPair()</code></td><td>生成 RSA 密钥对，返回 &#123;pem PublicKey, pem PrivateKey&#125;</td></tr>
            <tr><td><code>am.crypto.randomString(length)</code></td><td>生成随机字符串</td></tr>
            <tr><td><code>am.crypto.formatJSON(obj)</code></td><td>格式化 JSON 字符串</td></tr>
        </table>

        <h3>五、前置脚本示例</h3>
        <pre>// 生成时间戳和 nonce
const timestamp = Date.now().toString();
const nonce = Math.random().toString(36).slice(2, 10);
console.log("timestamp =", timestamp);

// 设置签名到全局变量
am.globals.set("timestamp", timestamp);
am.globals.set("nonce", nonce);

// 修改请求头
am.request.headers.set("X-App-Timestamp", timestamp);
am.request.headers.set("X-App-Nonce", nonce);

// 使用 crypto 工具生成签名
const sign = am.crypto.sha256("appKey" + timestamp + nonce);
am.request.headers.set("X-App-Sign", sign);

// 添加 URL 参数
am.request.params.set("api_version", "v2");</pre>

        <h3>六、后置脚本示例</h3>
        <pre>// 校验状态码
am.test("状态码为200", function() {
    return am.response.code === 200;
});

// 响应内容校验
am.test("响应成功", function() {
    const body = am.response.text();
    return body.includes("success") || body.includes("200");
});

// 使用 expect 断言
am.expect(am.response.code).to.be(200);
am.expect(am.response.text()).to.include("data");

// 解析 JSON 响应
const json = am.response.json();
if (json && json.token) {
    am.globals.set("auth_token", json.token);
    console.log("已提取 token");
}

// 从响应中提取变量
const match = am.response.text().match(/"session_id"\\s*:\\s*"([^"]+)"/);
if (match) {
    am.globals.set("session_id", match[1]);
}</pre>

        <h3>七、常见问题排查</h3>
        <ul>
            <li>绑定后不生效：确认请求已点击"保存"</li>
            <li>脚本列表为空：确认当前项目下已创建脚本</li>
            <li>删除脚本后请求失效：请求绑定会自动清空，需要重新选择脚本</li>
            <li>变量替换不生效：检查变量语法是否正确（&#123;&#123;variableName&#125;&#125;）</li>
            <li>JSON 解析失败：确认响应是合法的 JSON 格式</li>
        </ul>
    </div>
</body>
</html>`;

let win: Window | null = null;

export const ScriptHelpWindow: React.FC<ScriptHelpWindowProps> = ({ visible, onClose }) => {
    useEffect(() => {
        if (visible) {
            if (win && !win.closed) {
                win.focus();
                win.document.open();
                win.document.write(CONTENT);
                win.document.close();
            } else {
                // 打开一个真正独立的浏览器窗口
                win = window.open(
                    '',
                    'apiman_scrithelp',
                    'width=780,height=680,left=100,top=50,menubar=no,toolbar=no,location=no,status=no,resizable=yes'
                );

                if (win) {
                    // 立即写入内容
                    win.document.open();
                    win.document.write(CONTENT);
                    win.document.close();

                    // 监听关闭事件
                    const timer = setInterval(() => {
                        if (win && win.closed) {
                            clearInterval(timer);
                            onClose();
                        }
                    }, 500);
                }
            }
        } else {
            if (win && !win.closed) {
                win.close();
            }
        }

        return () => {
            if (win && !win.closed) {
                win.close();
            }
        };
    }, [visible, onClose]);

    return null;
};
