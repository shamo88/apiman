package curl

import (
	"apiman/internal/models"
	"apiman/internal/script"
	"context"
	"fmt"
	"strings"
)

type ScriptableExecutor struct {
	*CurlExecutor
	scriptExecutor *script.ScriptExecutor
}

func NewScriptableExecutor() *ScriptableExecutor {
	return &ScriptableExecutor{
		CurlExecutor:   NewCurlExecutor(),
		scriptExecutor: script.NewScriptExecutor(),
	}
}

func (se *ScriptableExecutor) ExecuteWithScripts(
	spec *models.HttpRequestSpec,
	proxyOpts *ProxyOptions,
	preScriptContents []string,
	postScriptContents []string,
	preScriptNames []string,
	postScriptNames []string,
	globals map[string]string,
	environment map[string]string,
	globalSetter func(key, value string),
	timeoutSeconds int,
) (*models.CurlResponse, error) {
	ctx := context.Background()
	return se.ExecuteWithScriptsContext(ctx, spec, proxyOpts, preScriptContents, postScriptContents, preScriptNames, postScriptNames, globals, environment, globalSetter, timeoutSeconds)
}

func (se *ScriptableExecutor) ExecuteWithScriptsContext(
	ctx context.Context,
	spec *models.HttpRequestSpec,
	proxyOpts *ProxyOptions,
	preScriptContents []string,
	postScriptContents []string,
	preScriptNames []string,
	postScriptNames []string,
	globals map[string]string,
	environment map[string]string,
	globalSetter func(key, value string),
	timeoutSeconds int,
) (*models.CurlResponse, error) {
	if spec == nil {
		return &models.CurlResponse{Error: "request is nil"}, nil
	}

	specCopy := &models.HttpRequestSpec{
		Method:     spec.Method,
		HttpURL:    spec.HttpURL,
		Headers:    copyKeyValSlice(spec.Headers),
		Params:     copyKeyValSlice(spec.Params),
		Body:       spec.Body,
		BodyType:   spec.BodyType,
		FormData:   copyPairSlice(spec.FormData),
		UrlEncoded: copyPairSlice(spec.UrlEncoded),
	}

	// Merge globals and environment for variable replacement
	allVars := mergeVariables(globals, environment)

	// Replace variables in specCopy before execution
	se.replaceVariablesInSpec(specCopy, allVars)

	var allLogs []string
	var allGlobalUpdates map[string]string

	// Execute pre-scripts in order, stop on first failure
	for i, preScriptContent := range preScriptContents {
		if preScriptContent == "" {
			continue
		}
		scriptName := fmt.Sprintf("Pre-Script %d", i+1)
		if i < len(preScriptNames) && preScriptNames[i] != "" {
			scriptName = preScriptNames[i]
		}

		allLogs = append(allLogs, fmt.Sprintf("[%s] ▶ START", scriptName))
		execCtx := se.buildExecutionContext(specCopy, globals, environment)
		preResult := se.scriptExecutor.RunPreRequestScript(ctx, preScriptContent, execCtx, globalSetter)

		allLogs = append(allLogs, preResult.Logs...)
		for k, v := range preResult.GlobalUpdates {
			if allGlobalUpdates == nil {
				allGlobalUpdates = make(map[string]string)
			}
			allGlobalUpdates[k] = v
		}

		if !preResult.Success {
			allLogs = append(allLogs, fmt.Sprintf("[%s] ✗ FAILED: %s", scriptName, preResult.Error))
			resp := &models.CurlResponse{
				Error:      fmt.Sprintf("Pre-request script failed: %s", preResult.Error),
				ScriptLogs: allLogs,
				Tests:      []models.TestResult{},
			}
			for _, t := range preResult.Tests {
				resp.Tests = append(resp.Tests, models.TestResult{
					Name:     t.Name,
					Passed:   t.Passed,
					Message:  t.Message,
					Duration: t.Duration,
				})
			}
			return resp, nil
		}

		allLogs = append(allLogs, fmt.Sprintf("[%s] ✓ SUCCESS", scriptName))
		if preResult.ModifiedSpec != nil {
			se.applyScriptModifications(specCopy, preResult.ModifiedSpec)
		}
	}

	curlResp, err := se.CurlExecutor.ExecuteHTTPRequestWithProxy(specCopy, proxyOpts, timeoutSeconds)
	if err != nil {
		return &models.CurlResponse{Error: err.Error()}, err
	}

	if curlResp.Error != "" {
		if len(allLogs) > 0 {
			curlResp.ScriptLogs = allLogs
		}
		return curlResp, nil
	}

	curlResp.ScriptLogs = allLogs

	// Execute post-scripts in order
	for i, postScriptContent := range postScriptContents {
		if postScriptContent == "" {
			continue
		}
		scriptName := fmt.Sprintf("Post-Script %d", i+1)
		if i < len(postScriptNames) && postScriptNames[i] != "" {
			scriptName = postScriptNames[i]
		}

		curlResp.ScriptLogs = append(curlResp.ScriptLogs, fmt.Sprintf("[%s] ▶ START", scriptName))
		execCtx := se.buildPostExecutionContext(specCopy, curlResp, globals, environment)
		postResult := se.scriptExecutor.RunTestScript(ctx, postScriptContent, execCtx, globalSetter)

		curlResp.ScriptLogs = append(curlResp.ScriptLogs, postResult.Logs...)
		for k, v := range postResult.GlobalUpdates {
			if allGlobalUpdates == nil {
				allGlobalUpdates = make(map[string]string)
			}
			allGlobalUpdates[k] = v
		}
		for _, t := range postResult.Tests {
			curlResp.Tests = append(curlResp.Tests, models.TestResult{
				Name:     t.Name,
				Passed:   t.Passed,
				Message:  t.Message,
				Duration: t.Duration,
			})
		}
		if postResult.Success {
			curlResp.ScriptLogs = append(curlResp.ScriptLogs, fmt.Sprintf("[%s] ✓ SUCCESS", scriptName))
		} else {
			curlResp.ScriptLogs = append(curlResp.ScriptLogs, fmt.Sprintf("[%s] ✗ FAILED: %s", scriptName, postResult.Error))
		}
	}

	if len(allGlobalUpdates) > 0 && globalSetter != nil {
		for k, v := range allGlobalUpdates {
			globalSetter(k, v)
		}
	}

	return curlResp, nil
}

func (se *ScriptableExecutor) buildExecutionContext(spec *models.HttpRequestSpec, globals, environment map[string]string) *script.ExecutionContext {
	headers := make(map[string]string)
	for _, h := range spec.Headers {
		if h.Enabled && strings.TrimSpace(h.Key) != "" {
			headers[h.Key] = h.Value
		}
	}

	params := make(map[string]string)
	for _, p := range spec.Params {
		if p.Enabled && strings.TrimSpace(p.Key) != "" {
			params[p.Key] = p.Value
		}
	}

	if globals == nil {
		globals = make(map[string]string)
	}
	if environment == nil {
		environment = make(map[string]string)
	}

	return &script.ExecutionContext{
		Request: &script.RequestSnapshot{
			Method:   spec.Method,
			URL:      spec.HttpURL,
			Headers:  headers,
			Params:   params,
			Body:     spec.Body,
			BodyType: spec.BodyType,
		},
		Globals:     globals,
		Environment: environment,
		Locals:      make(map[string]string),
	}
}

func (se *ScriptableExecutor) buildPostExecutionContext(spec *models.HttpRequestSpec, resp *models.CurlResponse, globals, environment map[string]string) *script.ExecutionContext {
	execCtx := se.buildExecutionContext(spec, globals, environment)
	if resp != nil {
		execCtx.Response = &script.ResponseSnapshot{
			StatusCode: resp.StatusCode,
			Headers:    resp.Headers,
			Body:       resp.Body,
			Duration:   resp.Duration,
		}
	}
	return execCtx
}

func (se *ScriptableExecutor) applyScriptModifications(spec *models.HttpRequestSpec, modified *script.ModifiedSpec) {
	if modified.Method != "" {
		spec.Method = modified.Method
	}
	if modified.URL != "" {
		spec.HttpURL = modified.URL
	}
	if modified.Headers != nil {
		for _, h := range spec.Headers {
			if val, ok := modified.Headers[h.Key]; ok {
				if val == "" {
					h.Enabled = false
				} else {
					h.Value = val
				}
			}
		}
		for k, v := range modified.Headers {
			if v == "" {
				continue
			}
			found := false
			for i := range spec.Headers {
				if spec.Headers[i].Key == k {
					spec.Headers[i].Value = v
					spec.Headers[i].Enabled = true
					found = true
					break
				}
			}
			if !found {
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
				if val == "" {
					p.Enabled = false
				} else {
					p.Value = val
				}
			}
		}
		for k, v := range modified.Params {
			if v == "" {
				continue
			}
			found := false
			for i := range spec.Params {
				if spec.Params[i].Key == k {
					spec.Params[i].Value = v
					spec.Params[i].Enabled = true
					found = true
					break
				}
			}
			if !found {
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

func copyKeyValSlice(src []models.RequestKeyVal) []models.RequestKeyVal {
	if src == nil {
		return nil
	}
	dst := make([]models.RequestKeyVal, len(src))
	copy(dst, src)
	return dst
}

func copyPairSlice(src []models.RequestPair) []models.RequestPair {
	if src == nil {
		return nil
	}
	dst := make([]models.RequestPair, len(src))
	copy(dst, src)
	return dst
}

func mergeVariables(globals, environment map[string]string) map[string]string {
	allVars := make(map[string]string)
	if globals != nil {
		for k, v := range globals {
			allVars[k] = v
		}
	}
	if environment != nil {
		for k, v := range environment {
			allVars[k] = v
		}
	}
	return allVars
}

func (se *ScriptableExecutor) replaceVariablesInSpec(spec *models.HttpRequestSpec, variables map[string]string) {
	spec.HttpURL = se.CurlExecutor.ReplaceVariables(spec.HttpURL, variables)
	for i := range spec.Headers {
		spec.Headers[i].Value = se.CurlExecutor.ReplaceVariables(spec.Headers[i].Value, variables)
	}
	for i := range spec.Params {
		spec.Params[i].Value = se.CurlExecutor.ReplaceVariables(spec.Params[i].Value, variables)
	}
	if spec.Body != "" {
		spec.Body = se.CurlExecutor.ReplaceVariables(spec.Body, variables)
	}
	for i := range spec.FormData {
		spec.FormData[i].Value = se.CurlExecutor.ReplaceVariables(spec.FormData[i].Value, variables)
	}
	for i := range spec.UrlEncoded {
		spec.UrlEncoded[i].Value = se.CurlExecutor.ReplaceVariables(spec.UrlEncoded[i].Value, variables)
	}
}
