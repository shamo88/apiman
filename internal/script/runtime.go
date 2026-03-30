package script

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/dop251/goja"
)

const (
	DefaultScriptTimeout = 1000 * time.Millisecond
	MaxLogOutputLength   = 10000
	MaxTestCount         = 100
)

type ScriptExecutor struct {
	timeout time.Duration
}

type ScriptResult struct {
	Success       bool              `json:"success"`
	Error         string            `json:"error,omitempty"`
	Logs          []string          `json:"logs"`
	Tests         []TestResult      `json:"tests"`
	ModifiedSpec  *ModifiedSpec     `json:"modified_spec,omitempty"`
	GlobalUpdates map[string]string `json:"global_updates,omitempty"`
}

type TestResult struct {
	Name     string `json:"name"`
	Passed   bool   `json:"passed"`
	Message  string `json:"message,omitempty"`
	Duration int64  `json:"duration"`
}

type ModifiedSpec struct {
	Method  string            `json:"method,omitempty"`
	URL     string            `json:"url,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
	Params  map[string]string `json:"params,omitempty"`
	Body    string            `json:"body,omitempty"`
}

type ExecutionContext struct {
	Request      *RequestSnapshot
	Response     *ResponseSnapshot
	Globals      map[string]string
	Environment  map[string]string
	Locals       map[string]string
	GlobalSetter func(key, value string)
}

type RequestSnapshot struct {
	Method   string
	URL      string
	Headers  map[string]string
	Params   map[string]string
	Body     string
	BodyType string
}

type ResponseSnapshot struct {
	StatusCode int
	Headers    map[string][]string
	Body       string
	Duration   int64
}

func NewScriptExecutor() *ScriptExecutor {
	return &ScriptExecutor{
		timeout: DefaultScriptTimeout,
	}
}

func (se *ScriptExecutor) SetTimeout(timeout time.Duration) {
	se.timeout = timeout
}

func (se *ScriptExecutor) RunPreRequestScript(ctx context.Context, scriptCode string, execCtx *ExecutionContext, globalSetter func(key, value string)) *ScriptResult {
	if scriptCode == "" {
		return &ScriptResult{Success: true}
	}

	result := &ScriptResult{
		Success:       true,
		Logs:          []string{},
		Tests:         []TestResult{},
		GlobalUpdates: make(map[string]string),
	}

	vm := se.createVM(result, execCtx, globalSetter)

	done := make(chan bool)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				result.Success = false
				result.Error = fmt.Sprintf("Script panic: %v", r)
			}
			done <- true
		}()
		_, err := vm.RunString(scriptCode)
		if err != nil {
			result.Success = false
			result.Error = formatScriptError(err)
		}
	}()

	select {
	case <-done:
		se.finalizeResult(result, execCtx)
		return result
	case <-ctx.Done():
		result.Success = false
		result.Error = "Script execution timeout"
		return result
	case <-time.After(se.timeout):
		vm.Interrupt(nil)
		result.Success = false
		result.Error = fmt.Sprintf("Script execution exceeded timeout of %v", se.timeout)
		return result
	}
}

func (se *ScriptExecutor) RunTestScript(ctx context.Context, scriptCode string, execCtx *ExecutionContext, globalSetter func(key, value string)) *ScriptResult {
	if scriptCode == "" {
		return &ScriptResult{Success: true}
	}

	result := &ScriptResult{
		Success:       true,
		Logs:          []string{},
		Tests:         []TestResult{},
		GlobalUpdates: make(map[string]string),
	}

	vm := se.createVM(result, execCtx, globalSetter)

	done := make(chan bool)
	go func() {
		defer func() {
			if r := recover(); r != nil {
				result.Success = false
				result.Error = fmt.Sprintf("Script panic: %v", r)
			}
			done <- true
		}()
		_, err := vm.RunString(scriptCode)
		if err != nil {
			result.Success = false
			result.Error = formatScriptError(err)
		}
	}()

	select {
	case <-done:
		se.finalizeResult(result, execCtx)
		return result
	case <-ctx.Done():
		result.Success = false
		result.Error = "Script execution timeout"
		return result
	case <-time.After(se.timeout):
		vm.Interrupt(nil)
		result.Success = false
		result.Error = fmt.Sprintf("Script execution exceeded timeout of %v", se.timeout)
		return result
	}
}

func (se *ScriptExecutor) createVM(result *ScriptResult, execCtx *ExecutionContext, globalSetter func(key, value string)) *goja.Runtime {
	vm := goja.New()

	se.injectConsole(vm, result)
	se.injectCrypto(vm)
	se.injectAmObject(vm, result, execCtx, globalSetter)

	return vm
}

func (se *ScriptExecutor) injectCrypto(vm *goja.Runtime) {
	crypto := vm.NewObject()
	crypto.Set("md5", MD5Hash)
	crypto.Set("sha1", SHA1Hash)
	crypto.Set("sha256", SHA256Hash)
	crypto.Set("sha512", SHA512Hash)
	crypto.Set("base64Encode", Base64Encode)
	crypto.Set("base64Decode", Base64Decode)
	crypto.Set("base64URLEncode", Base64URLEncode)
	crypto.Set("base64URLDecode", Base64URLDecode)
	crypto.Set("hmacSHA256", HMACSHA256)
	crypto.Set("hmacSHA1", HMACSHA1)
	crypto.Set("aesEncrypt", AESEncrypt)
	crypto.Set("aesDecrypt", AESDecrypt)
	crypto.Set("aesEncryptWithIV", AESEncryptWithIV)
	crypto.Set("aesDecryptWithIV", AESDecryptWithIV)
	crypto.Set("rsaEncrypt", RSAPublicEncrypt)
	crypto.Set("rsaDecrypt", RSAPrivateDecrypt)
	crypto.Set("rsaSign", RSASign)
	crypto.Set("rsaVerify", RSAVerify)
	crypto.Set("rsaEncryptOAEP", RSAEncryptOAEP)
	crypto.Set("rsaDecryptOAEP", RSADecryptOAEP)
	crypto.Set("generateKeyPair", GenerateRSAKeyPair)
	crypto.Set("randomString", RandomString)
	crypto.Set("formatJSON", FormatJSON)
	vm.Set("am", vm.NewObject())
	vm.Get("am").(*goja.Object).Set("crypto", crypto)
}

func valueToJs(vm *goja.Runtime, val interface{}) goja.Value {
	return vm.ToValue(val)
}

func (se *ScriptExecutor) injectConsole(vm *goja.Runtime, result *ScriptResult) {
	console := vm.NewObject()
	console.Set("log", se.createConsoleFunc(result, "log"))
	console.Set("info", se.createConsoleFunc(result, "info"))
	console.Set("warn", se.createConsoleFunc(result, "warn"))
	console.Set("error", se.createConsoleFunc(result, "error"))
	vm.Set("console", console)
}

func (se *ScriptExecutor) createConsoleFunc(result *ScriptResult, level string) func(call goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		if len(result.Logs) >= MaxTestCount*10 {
			return goja.Undefined()
		}

		var parts []string
		for _, arg := range call.Arguments {
			parts = append(parts, formatJSValue(arg))
		}
		logMsg := "[" + strings.ToUpper(level) + "] " + strings.Join(parts, " ")
		if len(logMsg) > MaxLogOutputLength {
			logMsg = logMsg[:MaxLogOutputLength] + "... (truncated)"
		}
		result.Logs = append(result.Logs, logMsg)
		return goja.Undefined()
	}
}

func (se *ScriptExecutor) injectAmObject(vm *goja.Runtime, result *ScriptResult, execCtx *ExecutionContext, globalSetter func(key, value string)) {
	var am *goja.Object
	if existingAm := vm.Get("am"); existingAm != nil {
		am = existingAm.(*goja.Object)
	} else {
		am = vm.NewObject()
		vm.Set("am", am)
	}

	se.injectAmGlobals(vm, am, result, execCtx, globalSetter)
	se.injectAmEnvironment(vm, am, execCtx)
	se.injectAmLocals(vm, am, result, execCtx)
	se.injectAmRequest(vm, am, result, execCtx)
	se.injectAmResponse(vm, am, execCtx)
	se.injectAmTest(vm, am, result, execCtx)
}

func (se *ScriptExecutor) injectAmGlobals(vm *goja.Runtime, am *goja.Object, result *ScriptResult, execCtx *ExecutionContext, globalSetter func(key, value string)) {
	globals := vm.NewObject()

	globals.Set("get", func(key string) goja.Value {
		if val, ok := execCtx.Globals[key]; ok {
			return valueToJs(vm, val)
		}
		return goja.Undefined()
	})

	globals.Set("set", func(key, value string) {
		execCtx.Globals[key] = value
		if globalSetter != nil {
			result.GlobalUpdates[key] = value
		}
	})

	globals.Set("unset", func(key string) {
		delete(execCtx.Globals, key)
	})

	am.Set("globals", globals)
}

func (se *ScriptExecutor) injectAmEnvironment(vm *goja.Runtime, am *goja.Object, execCtx *ExecutionContext) {
	env := vm.NewObject()

	env.Set("get", func(key string) goja.Value {
		if val, ok := execCtx.Environment[key]; ok {
			return valueToJs(vm, val)
		}
		return goja.Undefined()
	})

	am.Set("environment", env)
}

func (se *ScriptExecutor) injectAmLocals(vm *goja.Runtime, am *goja.Object, result *ScriptResult, execCtx *ExecutionContext) {
	locals := vm.NewObject()

	locals.Set("get", func(key string) goja.Value {
		if val, ok := execCtx.Locals[key]; ok {
			return valueToJs(vm, val)
		}
		return goja.Undefined()
	})

	locals.Set("set", func(key, value string) {
		execCtx.Locals[key] = value
	})

	locals.Set("unset", func(key string) {
		delete(execCtx.Locals, key)
	})

	am.Set("locals", locals)
}

func (se *ScriptExecutor) injectAmRequest(vm *goja.Runtime, am *goja.Object, result *ScriptResult, execCtx *ExecutionContext) {
	request := vm.NewObject()

	request.Set("method", execCtx.Request.Method)
	request.Set("url", execCtx.Request.URL)

	headers := vm.NewObject()
	headers.Set("_data", execCtx.Request.Headers)
	headers.Set("all", func() map[string]string {
		return execCtx.Request.Headers
	})
	headers.Set("get", func(key string) goja.Value {
		if val, ok := execCtx.Request.Headers[key]; ok {
			return valueToJs(vm, val)
		}
		return goja.Undefined()
	})
	headers.Set("set", func(key, value string) {
		if result.ModifiedSpec == nil {
			result.ModifiedSpec = &ModifiedSpec{}
		}
		if result.ModifiedSpec.Headers == nil {
			result.ModifiedSpec.Headers = make(map[string]string)
			for k, v := range execCtx.Request.Headers {
				result.ModifiedSpec.Headers[k] = v
			}
		}
		result.ModifiedSpec.Headers[key] = value
	})
	headers.Set("unset", func(key string) {
		if result.ModifiedSpec == nil {
			result.ModifiedSpec = &ModifiedSpec{}
		}
		if result.ModifiedSpec.Headers == nil {
			result.ModifiedSpec.Headers = make(map[string]string)
			for k, v := range execCtx.Request.Headers {
				result.ModifiedSpec.Headers[k] = v
			}
		}
		result.ModifiedSpec.Headers[key] = ""
	})
	request.Set("headers", headers)

	params := vm.NewObject()
	params.Set("_data", execCtx.Request.Params)
	params.Set("all", func() map[string]string {
		return execCtx.Request.Params
	})
	params.Set("get", func(key string) goja.Value {
		if val, ok := execCtx.Request.Params[key]; ok {
			return valueToJs(vm, val)
		}
		return goja.Undefined()
	})
	params.Set("set", func(key, value string) {
		if result.ModifiedSpec == nil {
			result.ModifiedSpec = &ModifiedSpec{}
		}
		if result.ModifiedSpec.Params == nil {
			result.ModifiedSpec.Params = make(map[string]string)
			for k, v := range execCtx.Request.Params {
				result.ModifiedSpec.Params[k] = v
			}
		}
		result.ModifiedSpec.Params[key] = value
	})
	params.Set("unset", func(key string) {
		if result.ModifiedSpec == nil {
			result.ModifiedSpec = &ModifiedSpec{}
		}
		if result.ModifiedSpec.Params == nil {
			result.ModifiedSpec.Params = make(map[string]string)
			for k, v := range execCtx.Request.Params {
				result.ModifiedSpec.Params[k] = v
			}
		}
		result.ModifiedSpec.Params[key] = ""
	})
	request.Set("params", params)

	bodyObj := vm.NewObject()
	bodyObj.Set("type", execCtx.Request.BodyType)
	bodyObj.Set("raw", execCtx.Request.Body)
	bodyObj.Set("update", func(newBody string) {
		if result.ModifiedSpec == nil {
			result.ModifiedSpec = &ModifiedSpec{}
		}
		result.ModifiedSpec.Body = newBody
	})
	request.Set("body", bodyObj)

	am.Set("request", request)
}

func (se *ScriptExecutor) injectAmResponse(vm *goja.Runtime, am *goja.Object, execCtx *ExecutionContext) {
	if execCtx.Response == nil {
		am.Set("response", goja.Undefined())
		return
	}

	response := vm.NewObject()
	response.Set("code", execCtx.Response.StatusCode)

	headers := vm.NewObject()
	headers.Set("all", func() map[string][]string {
		return execCtx.Response.Headers
	})
	response.Set("headers", headers)

	response.Set("text", func() string {
		return execCtx.Response.Body
	})

	response.Set("json", func() interface{} {
		var result interface{}
		if err := json.Unmarshal([]byte(execCtx.Response.Body), &result); err != nil {
			return nil
		}
		return result
	})

	am.Set("response", response)
}

func (se *ScriptExecutor) injectAmTest(vm *goja.Runtime, am *goja.Object, result *ScriptResult, execCtx *ExecutionContext) {
	am.Set("test", func(name string, fn goja.Callable) goja.Value {
		if len(result.Tests) >= MaxTestCount {
			return goja.Undefined()
		}

		start := time.Now()
		testResult := &TestResult{
			Name:     name,
			Passed:   false,
			Duration: 0,
		}

		defer func() {
			if r := recover(); r != nil {
				testResult.Passed = false
				testResult.Message = fmt.Sprintf("Test function panic: %v", r)
			}
			testResult.Duration = time.Since(start).Milliseconds()
			result.Tests = append(result.Tests, *testResult)
		}()

		_, err := fn(goja.Undefined())
		if err != nil {
			testResult.Passed = false
			testResult.Message = formatScriptError(err)
			return valueToJs(vm, false)
		}

		testResult.Passed = true
		return valueToJs(vm, true)
	})

	am.Set("expect", func(actual interface{}) *AssertionBuilder {
		return &AssertionBuilder{
			actual:      actual,
			testResult:  nil,
			testResults: &result.Tests,
		}
	})
}

func (se *ScriptExecutor) finalizeResult(result *ScriptResult, execCtx *ExecutionContext) {
	if result.ModifiedSpec == nil {
		return
	}

	if result.ModifiedSpec.Method != "" && result.ModifiedSpec.Method != execCtx.Request.Method {
		execCtx.Request.Method = result.ModifiedSpec.Method
	}
	if result.ModifiedSpec.URL != "" {
		execCtx.Request.URL = result.ModifiedSpec.URL
	}
	if result.ModifiedSpec.Headers != nil {
		for k, v := range result.ModifiedSpec.Headers {
			if v == "" {
				delete(execCtx.Request.Headers, k)
			} else {
				execCtx.Request.Headers[k] = v
			}
		}
	}
	if result.ModifiedSpec.Params != nil {
		for k, v := range result.ModifiedSpec.Params {
			if v == "" {
				delete(execCtx.Request.Params, k)
			} else {
				execCtx.Request.Params[k] = v
			}
		}
	}
	if result.ModifiedSpec.Body != "" {
		execCtx.Request.Body = result.ModifiedSpec.Body
	}
}

type AssertionBuilder struct {
	actual      interface{}
	testResult  *TestResult
	testResults *[]TestResult
}

type expectation struct{}

func (ab *AssertionBuilder) to(expectation expectation) {
	if ab.testResult != nil && ab.testResults != nil {
		ab.testResult.Duration = 0
		*ab.testResults = append(*ab.testResults, *ab.testResult)
	}
}

func (ab *AssertionBuilder) toBe(expected interface{}) *AssertionBuilder {
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect %v to.be %v", formatJSValueSimple(ab.actual), formatJSValueSimple(expected)),
		Passed:  fmt.Sprintf("%v", ab.actual) == fmt.Sprintf("%v", expected),
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func (ab *AssertionBuilder) eql(expected interface{}) *AssertionBuilder {
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect %v to equal %v", formatJSValueSimple(ab.actual), formatJSValueSimple(expected)),
		Passed:  fmt.Sprintf("%v", ab.actual) == fmt.Sprintf("%v", expected),
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func (ab *AssertionBuilder) include(expected string) *AssertionBuilder {
	actualStr := fmt.Sprintf("%v", ab.actual)
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect %v to include %v", actualStr, expected),
		Passed:  strings.Contains(actualStr, expected),
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func (ab *AssertionBuilder) beTrue() *AssertionBuilder {
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect %v to be true", formatJSValueSimple(ab.actual)),
		Passed:  ab.actual == true,
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func (ab *AssertionBuilder) beFalse() *AssertionBuilder {
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect %v to be false", formatJSValueSimple(ab.actual)),
		Passed:  ab.actual == false,
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func (ab *AssertionBuilder) haveProperty(key string) *AssertionBuilder {
	actualMap, ok := ab.actual.(map[string]interface{})
	passed := ok && actualMap != nil && actualMap[key] != nil
	ab.testResult = &TestResult{
		Name:    fmt.Sprintf("expect object to have property '%s'", key),
		Passed:  passed,
		Message: "",
	}
	ab.to(expectation{})
	return ab
}

func formatJSValue(val goja.Value) string {
	if val == nil || val == goja.Undefined() || val == goja.Null() {
		return "undefined"
	}
	switch val.(type) {
	case *goja.Object:
		obj := val.(*goja.Object)
		return obj.String()
	default:
		return val.String()
	}
}

func formatJSValueSimple(val interface{}) string {
	if val == nil {
		return "undefined"
	}
	switch v := val.(type) {
	case string:
		return fmt.Sprintf("\"%s\"", v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func formatScriptError(err error) string {
	if err == nil {
		return ""
	}
	errStr := err.Error()

	errStr = regexp.MustCompile(`line \d+`).ReplaceAllString(errStr, "line $0")
	errStr = regexp.MustCompile(`column \d+`).ReplaceAllString(errStr, "column $0")

	return errStr
}
