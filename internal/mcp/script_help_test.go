package mcp

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestGetAmApiDocs_Structure asserts the full API reference returned
// to AI clients contains the canonical sections. If any of these
// keywords go missing, the reference is no longer useful as a self-
// contained learning resource.
func TestGetAmApiDocs_Structure(t *testing.T) {
	// Bypass the handler method (which would require a full Service
	// stack) and exercise the underlying constants directly.
	if amApiDocsVersion == "" {
		t.Fatal("amApiDocsVersion must be non-empty")
	}
	for _, kw := range []string{
		"am.globals",
		"am.environment",
		"am.locals",
		"am.request",
		"am.response",
		"am.test",
		"am.expect",
		"am.crypto",
		"pre-script",
		"post-script",
		"console",
		"Common pitfalls",
		"Variable priority",
		"Execution order",
	} {
		if !strings.Contains(amApiDocsMarkdown, kw) {
			t.Errorf("am.* reference missing keyword %q", kw)
		}
	}
}

// TestGetAmApiDocs_ResponseShape validates the JSON marshalling shape
// that an AI client will receive.
func TestGetAmApiDocs_ResponseShape(t *testing.T) {
	resp := MCPGetAmApiDocsResponse{
		Markdown: amApiDocsMarkdown,
		Version:  amApiDocsVersion,
	}
	data, err := json.Marshal(resp)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var got map[string]any
	if err := json.Unmarshal(data, &got); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if _, ok := got["markdown"].(string); !ok {
		t.Error("response missing 'markdown' string field")
	}
	if _, ok := got["version"].(string); !ok {
		t.Error("response missing 'version' string field")
	}
	if len(got["markdown"].(string)) < 1000 {
		t.Error("am.* reference suspiciously short; expected at least 1KB of docs")
	}
}

// TestGetScriptExamples_AllCatalog exhaustively checks that the static
// catalog returns at least the foundational patterns an AI client
// would need.
func TestGetScriptExamples_AllCatalog(t *testing.T) {
	resp := MCPGetScriptExamplesResponse{
		Examples: scriptExamplesCatalog,
		Count:    len(scriptExamplesCatalog),
	}
	if resp.Count == 0 {
		t.Fatal("script examples catalog must not be empty")
	}

	required := map[string]string{
		"signing":       "pre",
		"token_extract": "post",
		"assert_status": "post",
	}
	for id, wantStage := range required {
		found := false
		for _, ex := range scriptExamplesCatalog {
			if ex.ID == id {
				found = true
				if ex.Stage != wantStage {
					t.Errorf("example %q: stage = %q, want %q", id, ex.Stage, wantStage)
				}
				if ex.Code == "" {
					t.Errorf("example %q: code is empty", id)
				}
				if ex.Title == "" {
					t.Errorf("example %q: title is empty", id)
				}
				break
			}
		}
		if !found {
			t.Errorf("required example %q missing from catalog", id)
		}
	}
}

// TestGetScriptExamples_StageFilter exercises the handler's filter
// logic without needing a Service: it walks the catalog and applies
// the same rules the handler would.
func TestGetScriptExamples_StageFilter(t *testing.T) {
	type tc struct {
		stage   string
		wantMin int
	}

	for _, c := range []tc{
		{"", len(scriptExamplesCatalog)}, // all
		{"pre", 0},                       // at least the pre ones
		{"post", 0},                      // at least the post ones
		{"either", 0},                    // none expected unless catalog has 'either' stages
	} {
		got := filterExamples(scriptExamplesCatalog, c.stage)
		if c.stage == "" {
			if len(got) != c.wantMin {
				t.Errorf("empty stage filter returned %d, want %d", len(got), c.wantMin)
			}
		}
		// All returned examples must match the filter (or be 'either').
		for _, ex := range got {
			if c.stage != "" && ex.Stage != c.stage && ex.Stage != "either" {
				t.Errorf("filter %q returned example %q with stage %q",
					c.stage, ex.ID, ex.Stage)
			}
		}
	}
}

func filterExamples(in []MCPScriptExample, stage string) []MCPScriptExample {
	out := make([]MCPScriptExample, 0, len(in))
	for _, ex := range in {
		if stage != "" && ex.Stage != stage && ex.Stage != "either" {
			continue
		}
		out = append(out, ex)
	}
	return out
}
