package postman

import "testing"

// TestParseRequestRef_RejectsEmpty documents the contract that
// requestPath="" is invalid at the postman parser level, which is why
// mcp_execute_raw's requestPath="" used to fail at
// project.GetRequestScriptsWithPriority("") with os.ErrInvalid
// ("invalid argument" surfaced as -32603 to the MCP client).
//
// The fix lives in the service layer
// (internal/service/service.go:654) where we now skip the script
// inheritance lookup when requestPath is empty. The parser itself
// stays strict — empty is not a valid request reference.
func TestParseRequestRef_RejectsEmpty(t *testing.T) {
	cases := []struct {
		name string
		path string
	}{
		{"empty_string", ""},
		{"no_pipe", "request"},
		{"only_pipe", "|"},
		{"trailing_pipe", "request|"},
		{"leading_pipe", "|project|request"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, _, ok := ParseRequestRef(c.path)
			if ok {
				t.Errorf("ParseRequestRef(%q) should have failed", c.path)
			}
		})
	}
}
