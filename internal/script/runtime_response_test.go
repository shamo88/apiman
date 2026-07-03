package script

import (
	"testing"

	"github.com/dop251/goja"
)

// TestInjectAmResponse_ExposesStatusCodeAndDuration verifies the
// response object surfaced to user scripts carries both `status_code`
// (alias of `code`) and `elapsed_ms` (alias of `duration`).
//
// The MCP test report flagged am.response.statusCode / am.response.elapsedMs
// as undefined; this guards against regression.
func TestInjectAmResponse_ExposesStatusCodeAndDuration(t *testing.T) {
	se := NewScriptExecutor()
	vm := goja.New()
	am := vm.NewObject()
	execCtx := &ExecutionContext{
		Response: &ResponseSnapshot{
			StatusCode: 200,
			Headers:    map[string][]string{"Content-Type": {"application/json"}},
			Body:       `{"ok":true}`,
			Duration:   123,
		},
	}

	vm.Set("am", am)
	se.injectAmResponse(vm, am, execCtx)

	raw, err := vm.RunString(`(function(){
		var r = am.response;
		return JSON.stringify({
			code: r.code,
			status_code: r.status_code,
			duration: r.duration,
			elapsed_ms: r.elapsed_ms,
			has_text: typeof r.text === 'function',
			has_json: typeof r.json === 'function',
			text_value: r.text(),
		});
	})()`)
	if err != nil {
		t.Fatalf("script error: %v", err)
	}
	got := raw.String()
	want := `{"code":200,"status_code":200,"duration":123,"elapsed_ms":123,"has_text":true,"has_json":true,"text_value":"{\"ok\":true}"}`
	if got != want {
		t.Errorf("am.response mismatch\n  want: %s\n  got:  %s", want, got)
	}
}
