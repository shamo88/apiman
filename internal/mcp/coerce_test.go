package mcp

import (
	"encoding/json"
	"testing"
)

// TestCoerceToString covers the types that JSON-RPC clients actually
// send. Before the coerceToString fix, only `string` survived — the
// strict `.(string)` assertion silently dropped numbers, booleans, and
// null values in headers / params / form_data / url_encoded / cookies.
func TestCoerceToString(t *testing.T) {
	cases := []struct {
		name string
		in   interface{}
		want string
	}{
		{"nil", nil, ""},
		{"string_passthrough", "hello world", "hello world"},
		{"empty_string", "", ""},
		{"int", 2, "2"},
		{"negative_int", -1, "-1"},
		{"zero_int", 0, "0"},
		{"int64", int64(123456789012), "123456789012"},
		{"uint", uint(42), "42"},
		{"float", 3.14, "3.14"},
		{"bool_true", true, "true"},
		{"bool_false", false, "false"},
		{"json_number_int", json.Number("7"), "7"},
		{"json_number_float", json.Number("3.14"), "3.14"},
		{"slice", []interface{}{"a", "b"}, `["a","b"]`},
		{"map", map[string]interface{}{"k": "v"}, `{"k":"v"}`},
		{"struct", struct{ Name string }{"foo"}, `{"Name":"foo"}`},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := coerceToString(c.in)
			if got != c.want {
				t.Errorf("coerceToString(%v) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}

// TestParseRequestKeyValArray_NonStringValues ensures non-string JSON
// values for `value` survive parsing. This is the exact regression
// path that surfaced in the user's params test report.
func TestParseRequestKeyValArray_NonStringValues(t *testing.T) {
	in := []interface{}{
		map[string]interface{}{"key": "page", "value": 2, "enabled": true},
		map[string]interface{}{"key": "active", "value": true, "enabled": true},
		map[string]interface{}{"key": "missing", "value": nil, "enabled": true},
		map[string]interface{}{"key": "greeting", "value": "hello world", "enabled": true},
	}
	got := parseRequestKeyValArray(in)
	if len(got) != 4 {
		t.Fatalf("len = %d, want 4", len(got))
	}

	wants := []struct{ key, value string }{
		{"page", "2"},
		{"active", "true"},
		{"missing", ""},
		{"greeting", "hello world"},
	}
	for i, want := range wants {
		if got[i].Key != want.key {
			t.Errorf("[%d] key = %q, want %q", i, got[i].Key, want.key)
		}
		if got[i].Value != want.value {
			t.Errorf("[%d] value = %q, want %q", i, got[i].Value, want.value)
		}
	}
}
