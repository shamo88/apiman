package script

import (
	"context"
	"sync"
	"time"

	"apiman/internal/models"
)

type ScriptableRequestExecutor struct {
	scriptExecutor *ScriptExecutor
	curlExecutor   interface {
		ExecuteWithProxy(command string, proxy interface{}) (*models.CurlResponse, error)
	}
	proxyOpts interface{}
}

type RequestExecutionContext struct {
	RequestSpec   *models.HttpRequestSpec
	ProjectID     string
	RequestPath   string
	PreScript     string
	PostScript    string
	ProxyOpts     interface{}
	GlobalSetter  func(key, value string)
}

type RequestExecutionResult struct {
	Response     *models.CurlResponse
	ScriptResult *ScriptResult
	Error        error
}

func NewScriptableRequestExecutor(curlExec interface {
	ExecuteWithProxy(command string, proxy interface{}) (*models.CurlResponse, error)
}, proxyOpts interface{}) *ScriptableRequestExecutor {
	return &ScriptableRequestExecutor{
		scriptExecutor: NewScriptExecutor(),
		curlExecutor:    curlExec,
		proxyOpts:       proxyOpts,
	}
}

func (sre *ScriptableRequestExecutor) ExecuteWithScripts(ctx context.Context, execCtx *RequestExecutionContext) *RequestExecutionResult {
	result := &RequestExecutionResult{}

	if execCtx.RequestSpec == nil {
		result.Error = ErrInvalidRequest
		return result
	}

	spec := *execCtx.RequestSpec

	if execCtx.PreScript != "" {
		preScriptCtx := sre.buildExecutionContext(execCtx.ProjectID, &spec)
		preResult := sre.scriptExecutor.RunPreRequestScript(ctx, execCtx.PreScript, preScriptCtx, execCtx.GlobalSetter)

		if !preResult.Success {
			result.Error = ErrPreScriptFailed
			result.ScriptResult = preResult
			return result
		}

		if preResult.ModifiedSpec != nil {
			sre.applyModifiedSpec(&spec, preResult.ModifiedSpec)
		}

		if len(preResult.GlobalUpdates) > 0 && execCtx.GlobalSetter != nil {
			for k, v := range preResult.GlobalUpdates {
				execCtx.GlobalSetter(k, v)
			}
		}
	}

	curlCmd := sre.buildCurlCommand(&spec)
	resp, err := sre.curlExecutor.ExecuteWithProxy(curlCmd, sre.proxyOpts)
	if err != nil {
		result.Error = err
		return result
	}
	result.Response = resp

	if execCtx.PostScript != "" {
		postScriptCtx := sre.buildPostExecutionContext(execCtx.ProjectID, &spec, resp)
		postResult := sre.scriptExecutor.RunTestScript(ctx, execCtx.PostScript, postScriptCtx, execCtx.GlobalSetter)
		result.ScriptResult = postResult

		if len(postResult.GlobalUpdates) > 0 && execCtx.GlobalSetter != nil {
			for k, v := range postResult.GlobalUpdates {
				execCtx.GlobalSetter(k, v)
			}
		}
	}

	return result
}

func (sre *ScriptableRequestExecutor) buildExecutionContext(projectID string, spec *models.HttpRequestSpec) *ExecutionContext {
	headers := make(map[string]string)
	for _, h := range spec.Headers {
		if h.Enabled {
			headers[h.Key] = h.Value
		}
	}

	params := make(map[string]string)
	for _, p := range spec.Params {
		if p.Enabled {
			params[p.Key] = p.Value
		}
	}

	return &ExecutionContext{
		Request: &RequestSnapshot{
			Method:    spec.Method,
			URL:       spec.HttpURL,
			Headers:   headers,
			Params:    params,
			Body:      spec.Body,
			BodyType:  spec.BodyType,
		},
		Globals:     make(map[string]string),
		Environment: make(map[string]string),
		Locals:      make(map[string]string),
	}
}

func (sre *ScriptableRequestExecutor) buildPostExecutionContext(projectID string, spec *models.HttpRequestSpec, resp *models.CurlResponse) *ExecutionContext {
	execCtx := sre.buildExecutionContext(projectID, spec)
	if resp != nil {
		execCtx.Response = &ResponseSnapshot{
			StatusCode: resp.StatusCode,
			Headers:    resp.Headers,
			Body:       resp.Body,
			Duration:   resp.Duration,
		}
	}
	return execCtx
}

func (sre *ScriptableRequestExecutor) applyModifiedSpec(spec *models.HttpRequestSpec, modified *ModifiedSpec) {
	if modified.Method != "" {
		spec.Method = modified.Method
	}
	if modified.URL != "" {
		spec.HttpURL = modified.URL
	}
	if modified.Headers != nil {
		for _, h := range spec.Headers {
			if val, ok := modified.Headers[h.Key]; ok {
				h.Value = val
			}
		}
		for k, v := range modified.Headers {
			found := false
			for i := range spec.Headers {
				if spec.Headers[i].Key == k {
					spec.Headers[i].Value = v
					found = true
					break
				}
			}
			if !found && v != "" {
				spec.Headers = append(spec.Headers, models.RequestKeyVal{
					Key:     k,
					Value:   v,
					Enabled: true,
				})
			}
		}
	}
	if modified.Params != nil {
		for _, p := range spec.Params {
			if val, ok := modified.Params[p.Key]; ok {
				p.Value = val
			}
		}
		for k, v := range modified.Params {
			found := false
			for i := range spec.Params {
				if spec.Params[i].Key == k {
					spec.Params[i].Value = v
					found = true
					break
				}
			}
			if !found && v != "" {
				spec.Params = append(spec.Params, models.RequestKeyVal{
					Key:     k,
					Value:   v,
					Enabled: true,
				})
			}
		}
	}
	if modified.Body != "" {
		spec.Body = modified.Body
	}
}

func (sre *ScriptableRequestExecutor) buildCurlCommand(spec *models.HttpRequestSpec) string {
	cmd := "curl"

	if spec.Method != "GET" && spec.Method != "" {
		cmd += " -X " + spec.Method
	}

	for _, h := range spec.Headers {
		if h.Enabled && h.Key != "" {
			cmd += " -H \"" + h.Key + ": " + h.Value + "\""
		}
	}

	for _, p := range spec.Params {
		if p.Enabled && p.Key != "" {
			spec.HttpURL = addQueryParam(spec.HttpURL, p.Key, p.Value)
		}
	}

	if spec.HttpURL != "" {
		cmd += " \"" + spec.HttpURL + "\""
	}

	if spec.Body != "" && (spec.BodyType == "json" || spec.BodyType == "raw" || spec.BodyType == "text" || spec.BodyType == "xml") {
		cmd += " -d '" + escapeShellString(spec.Body) + "'"
	}

	return cmd
}

func addQueryParam(url, key, value string) string {
	if url == "" {
		return url
	}
	separator := "?"
	if contains(url, "?") {
		separator = "&"
	}
	return url + separator + key + "=" + value
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func escapeShellString(s string) string {
	result := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '\'' {
			result = append(result, '\'')
			result = append(result, '"')
			result = append(result, '\'')
			result = append(result, '"')
			result = append(result, '\'')
		} else if c == '\\' {
			result = append(result, '\\')
			result = append(result, '\\')
		} else {
			result = append(result, c)
		}
	}
	return string(result)
}

var (
	ErrInvalidRequest  = &ScriptError{Message: "Invalid request specification"}
	ErrPreScriptFailed = &ScriptError{Message: "Pre-request script execution failed"}
)

type ScriptError struct {
	Message string
}

func (e *ScriptError) Error() string {
	return e.Message
}

type GlobalVariableStore struct {
	mu        sync.RWMutex
	variables map[string]string
}

func NewGlobalVariableStore(initial map[string]string) *GlobalVariableStore {
	store := &GlobalVariableStore{
		variables: make(map[string]string),
	}
	if initial != nil {
		for k, v := range initial {
			store.variables[k] = v
		}
	}
	return store
}

func (gvs *GlobalVariableStore) Get(key string) (string, bool) {
	gvs.mu.RLock()
	defer gvs.mu.RUnlock()
	val, ok := gvs.variables[key]
	return val, ok
}

func (gvs *GlobalVariableStore) Set(key, value string) {
	gvs.mu.Lock()
	defer gvs.mu.Unlock()
	gvs.variables[key] = value
}

func (gvs *GlobalVariableStore) Unset(key string) {
	gvs.mu.Lock()
	defer gvs.mu.Unlock()
	delete(gvs.variables, key)
}

func (gvs *GlobalVariableStore) GetAll() map[string]string {
	gvs.mu.RLock()
	defer gvs.mu.RUnlock()
	result := make(map[string]string)
	for k, v := range gvs.variables {
		result[k] = v
	}
	return result
}

type CachedScriptExecutor struct {
	mu        sync.RWMutex
	cache     map[string]*ScriptResult
	limit     int
	updatedAt time.Time
}

func NewCachedScriptExecutor(limit int) *CachedScriptExecutor {
	if limit <= 0 {
		limit = 100
	}
	return &CachedScriptExecutor{
		cache: make(map[string]*ScriptResult),
		limit: limit,
	}
}

func (cse *CachedScriptExecutor) Get(key string) (*ScriptResult, bool) {
	cse.mu.RLock()
	defer cse.mu.RUnlock()
	result, ok := cse.cache[key]
	return result, ok
}

func (cse *CachedScriptExecutor) Set(key string, result *ScriptResult) {
	cse.mu.Lock()
	defer cse.mu.Unlock()

	if len(cse.cache) >= cse.limit {
		cse.evictOldest()
	}

	cse.cache[key] = result
	cse.updatedAt = time.Now()
}

func (cse *CachedScriptExecutor) evictOldest() {
	if len(cse.cache) == 0 {
		return
	}
	oldestKey := ""
	for k := range cse.cache {
		oldestKey = k
		break
	}
	delete(cse.cache, oldestKey)
}

func (cse *CachedScriptExecutor) Clear() {
	cse.mu.Lock()
	defer cse.mu.Unlock()
	cse.cache = make(map[string]*ScriptResult)
}
