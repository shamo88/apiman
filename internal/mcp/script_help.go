package mcp

// amApiDocsMarkdown is the full reference surfaced to AI clients via the
// mcp_get_am_api_docs tool. The content is intentionally Markdown so
// every MCP client renders it readably and an LLM can ingest it as one
// block of structured text.
//
// This must stay in lock-step with the actual injection in
// internal/script/runtime.go. Whenever a field is added / renamed /
// removed there, update this constant and bump the version string.
const amApiDocsMarkdown = "# Apiman pre / post script runtime — am.* reference\n\n" +
	"Pre and post scripts run in a goja JS VM. All scripts are **synchronous**;\n" +
	"async/await is **not** awaited. Default timeout is 5s. panic is caught\n" +
	"and surfaced as a script error (the request itself still completes).\n\n" +
	"## Console\n\n" +
	"| Method | Notes |\n" +
	"|---|---|\n" +
	"| console.log/info/warn/error(...args) | Output is captured into the request's 'script_logs' field on history. |\n\n" +
	"## am.globals — persistent global vars (~/.apiman/variables.json)\n\n" +
	"| Method | Returns | Notes |\n" +
	"|---|---|---|\n" +
	"| am.globals.get(key) | string / undefined | |\n" +
	"| am.globals.set(key, value) | — | Persists immediately; visible to subsequent MCP execute_request calls and {{key}} substitution. |\n" +
	"| am.globals.unset(key) | — | Idempotent. |\n\n" +
	"## am.environment — active env vars (read-only from script)\n\n" +
	"| Method | Returns | Notes |\n" +
	"|---|---|---|\n" +
	"| am.environment.get(key) | string / undefined | Reading the current env's variables. Set them via the env editor / mcp_update_environment. |\n\n" +
	"## am.locals — per-request scratch space\n\n" +
	"| Method | Notes |\n" +
	"|---|---|\n" +
	"| am.locals.get(key) | |\n" +
	"| am.locals.set(key, value) | Not persisted. Lives only within the current pre→post chain. |\n" +
	"| am.locals.unset(key) | |\n\n" +
	"## am.request — mutable in pre-script, read-only in post\n\n" +
	"| Field / method | Notes |\n" +
	"|---|---|\n" +
	"| am.request.method | string (GET, POST, …). Mutable in pre. |\n" +
	"| am.request.url | string. Mutable in pre. |\n" +
	"| am.request.headers.get(key) / set(key, value) / unset(key) / all() | set/unset modify the **outgoing** request. Pre-script only. |\n" +
	"| am.request.params.get(key) / set(key, value) / unset(key) / all() | Same. |\n" +
	"| am.request.body.type | \"json\" / \"raw\" / \"form-data\" / \"x-www-form-urlencoded\" / \"none\" |\n" +
	"| am.request.body.raw | The full body string. |\n" +
	"| am.request.body.update(newBody) | Replace the body. |\n\n" +
	"## am.response — populated in post-script only\n\n" +
	"| Field | Notes |\n" +
	"|---|---|\n" +
	"| am.response.code | Alias of status_code. |\n" +
	"| am.response.status_code | HTTP status code (200, 404, …). |\n" +
	"| am.response.duration | Milliseconds (alias of elapsed_ms). |\n" +
	"| am.response.elapsed_ms | Milliseconds. |\n" +
	"| am.response.headers.all() | All response headers as a map. |\n" +
	"| am.response.text() | Raw body as text. |\n" +
	"| am.response.json() | Parsed JSON (returns null on parse error or non-JSON body). |\n\n" +
	"In **pre-script**, am.response is **undefined**. Setting am.response.* has\n" +
	"no effect on the actual HTTP response.\n\n" +
	"## am.test / am.expect — assertions\n\n" +
	"```javascript\n" +
	"am.test(\"status is 200\", function () {\n" +
	"  am.expect(am.response.code).to.eql(200);\n" +
	"});\n" +
	"am.test(\"fast\", function () {\n" +
	"  am.expect(am.response.duration).to.be.below(500);\n" +
	"});\n" +
	"am.test(\"body has token\", function () {\n" +
	"  am.expect(am.response.json()).to.have.property(\"token\");\n" +
	"});\n" +
	"```\n\n" +
	"Each am.test is recorded in result.Tests and shown in history.\n\n" +
	"## am.crypto (optional)\n\n" +
	"HMAC, hash, base64, AES, RSA, key-pair generation, randomString,\n" +
	"formatJSON. Call mcp_get_am_api_docs to see the full listing — kept\n" +
	"short here because it is rarely needed in post-script.\n\n" +
	"## Execution order\n\n" +
	"1. pre-script runs (may mutate am.request.*)\n" +
	"2. HTTP request fires (with {{var}} substitution + cookies)\n" +
	"3. post-script runs (am.response.* is now populated)\n" +
	"4. am.test results + console logs are persisted with the history entry\n\n" +
	"## Common pitfalls\n\n" +
	"- am.response in pre-script → **undefined**\n" +
	"- await fetch(...) → ignored; scripts are synchronous\n" +
	"- Forgetting return in am.test → assertion still runs, but the test\n" +
	"  result is reported without a name\n" +
	"- Mutating am.request.* in post-script → **no-op** (request already sent)\n\n" +
	"## Variable priority (lowest → highest)\n\n" +
	"1. Project default globals\n" +
	"2. Parent folder scripts (not vars)\n" +
	"3. Environment variables\n" +
	"4. am.globals\n" +
	"5. am.locals set in pre-script (wins within the chain)\n"

const amApiDocsVersion = "2026-07-03.1"

// scriptExamplesCatalog is the catalog returned by
// mcp_get_script_examples. The IDs are stable so an AI can refer to
// "example:signing" by name in a follow-up.
var scriptExamplesCatalog = []MCPScriptExample{
	{
		ID:          "signing",
		Title:       "Pre-script: HMAC-style request signing",
		Description: "Inject a timestamp + signature header based on a stored API key. Use it when the upstream requires X-Sign = md5(key + ts).",
		Stage:       "pre",
		Code: `// Read a secret stored in globals (e.g. set via mcp_set_global).
var apiKey = am.globals.get('apiKey');
if (!apiKey) {
  throw new Error('apiKey global is missing — set it via mcp_set_global first');
}

// Generate a timestamp and compute the signature.
var ts = String(Date.now());
var sign = am.crypto.md5(apiKey + ts);

// Mutate the outgoing request. These changes are applied to the
// actual HTTP call.
am.request.headers.set('X-Timestamp', ts);
am.request.headers.set('X-Sign', sign);

// Optional: also override the URL to add a query param.
am.request.params.set('ts', ts);
`,
	},
	{
		ID:          "token_extract",
		Title:       "Post-script: extract token from JSON response",
		Description: "Read the token out of the response body and store it as a global for downstream requests.",
		Stage:       "post",
		Code: `// am.response.json() returns null if the body isn't valid JSON.
var body = am.response.json();
if (body && body.data && body.data.token) {
  am.globals.set('authToken', body.data.token);
  // also keep a request-local copy for this chain
  am.locals.set('token', body.data.token);
}
`,
	},
	{
		ID:          "assert_status",
		Title:       "Post-script: assert status + timing",
		Description: "Verify the response is 2xx and the round-trip is fast enough. Shows up in history.tests.",
		Stage:       "post",
		Code: `am.test('status is 2xx', function () {
  am.expect(am.response.code).to.be.within(200, 299);
});

am.test('response fast', function () {
  am.expect(am.response.duration).to.be.below(1000);
});
`,
	},
	{
		ID:          "assert_body",
		Title:       "Post-script: assert response JSON shape",
		Description: "Validate a specific field exists and matches a value.",
		Stage:       "post",
		Code: `var body = am.response.json();
am.test('has userId', function () {
  am.expect(body).to.have.property('userId');
});
am.test('userId is number', function () {
  am.expect(typeof body.userId).to.eql('number');
});
`,
	},
	{
		ID:          "rewrite_url",
		Title:       "Pre-script: rewrite URL with templated path param",
		Description: "Inject a runtime-resolved {{orderId}} or similar path param that came from a prior request.",
		Stage:       "pre",
		Code: `// e.g. URL was https://api.example.com/orders/{{orderId}}
// am.locals was set in a previous post-script: am.locals.set('orderId', '...')
var orderId = am.locals.get('orderId') || am.globals.get('orderId');
if (!orderId) {
  throw new Error('orderId not found in locals or globals');
}

// Replace the placeholder.
am.request.url = am.request.url.replace('{{orderId}}', orderId);
`,
	},
	{
		ID:          "sign_request_body",
		Title:       "Pre-script: sign a JSON request body",
		Description: "Compute a signature over the body and add it as a header (common in payment APIs).",
		Stage:       "pre",
		Code: `var secret = am.globals.get('signingSecret');
if (!secret) { throw new Error('signingSecret global missing'); }

var body = am.request.body.raw || '';
var sig = am.crypto.hmacSHA256(secret, body);
am.request.headers.set('X-Signature', sig);
`,
	},
	{
		ID:          "extract_set_cookie",
		Title:       "Post-script: capture session cookie",
		Description: "Pull a Set-Cookie header value out and reuse it on later requests.",
		Stage:       "post",
		Code: `var all = am.response.headers.all();
var sc = all['Set-Cookie'] || all['set-cookie'];
if (sc && sc.length > 0) {
  // sc is an array of strings; first one is usually the session.
  am.globals.set('sessionCookie', sc[0]);
}
`,
	},
}
