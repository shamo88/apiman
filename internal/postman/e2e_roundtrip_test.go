package postman

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"apiman/internal/models"
)

// TestRealisticCreateRequestParamsRoundTrip is the closest the package
// can get to a full end-to-end test without spinning up apiman:
//
//  1. start with a fresh on-disk project path
//  2. ApplyHTTPRequestSpecToItem (what the handler does internally)
//  3. SaveCollection to a real file
//  4. LoadCollection from that file (what GetRequest does)
//  5. ItemToCurlRequestModel (what GetRequest does)
//  6. SpecFromCurlRequest (the path getRequest uses when InterfaceSpec
//     is nil)
//
// If ANY of these layers drops "true" / "2" while keeping "hello world",
// the user's MCP test report is reproducible here.
func TestRealisticCreateRequestParamsRoundTrip(t *testing.T) {
	tmpDir := t.TempDir()
	_ = os.MkdirAll(filepath.Join(tmpDir, "scripts"), 0755)

	cases := []struct {
		key, value string
	}{
		{"trace", "true"},
		{"page", "2"},
		{"keyword", "hello world"},
		{"bool", "false"},
		{"zero", "0"},
		{"empty_v", ""}, // empty string is its own special case
	}

	spec := models.HttpRequestSpec{
		Method:  "GET",
		HttpURL: "http://localhost:3000/api/users",
		Params:  make([]models.RequestKeyVal, 0, len(cases)),
	}
	for _, c := range cases {
		spec.Params = append(spec.Params, models.RequestKeyVal{
			Key: c.key, Value: c.value, Enabled: true,
		})
	}

	item := &CollectionItem{
		ID:      "req-real",
		Name:    "realistic",
		Request: &CollectionRequest{Method: "GET", URL: &PostmanURL{}},
	}
	ApplyHTTPRequestSpecToItem(item, &spec)

	coll := &Collection{
		Info: PostmanInfo{Name: "realistic"},
		Item: []CollectionItem{*item},
	}
	if err := SaveCollection(tmpDir, coll); err != nil {
		t.Fatalf("save: %v", err)
	}

	// Round 1: read raw JSON from disk to verify what is actually written.
	data, err := os.ReadFile(filepath.Join(tmpDir, "collection.postman.json"))
	if err != nil {
		t.Fatalf("read raw: %v", err)
	}
	t.Logf("on-disk JSON:\n%s", string(data))

	// Round 2: LoadCollection (production code path).
	loaded, err := LoadCollection(tmpDir)
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	// Round 3: ItemToCurlRequestModel (production code path).
	cr := ItemToCurlRequestModel("proj-real", &loaded.Item[0])
	if cr == nil {
		t.Fatal("nil CurlRequest")
	}

	// Round 4: SpecFromCurlRequest (getRequest fallback path).
	specOut := models.SpecFromCurlRequest(cr)

	t.Logf("params read back: %+v", cr.Params)

	for i, want := range cases {
		if i >= len(cr.Params) {
			t.Fatalf("cr.Params has %d entries, want %d", len(cr.Params), len(cases))
		}
		got := cr.Params[i]
		if got.Key != want.key {
			t.Errorf("[cr] param[%d].key = %q, want %q", i, got.Key, want.key)
		}
		if got.Value != want.value {
			t.Errorf("[cr] param[%d].value = %q, want %q (BUG)", i, got.Value, want.value)
		}

		gotSpec := specOut.Params[i]
		if gotSpec.Value != want.value {
			t.Errorf("[SpecFromCurlRequest] param[%d].value = %q, want %q (BUG)", i, gotSpec.Value, want.value)
		}
	}

	// Also serialize the response as JSON and round-trip to simulate the
	// wire format the MCP client receives.
	detail := struct {
		ID     string                 `json:"id"`
		Params []models.RequestKeyVal `json:"params"`
	}{ID: cr.ID, Params: cr.Params}
	raw, _ := json.Marshal(detail)
	t.Logf("client-facing JSON: %s", string(raw))

	var wire struct {
		Params []models.RequestKeyVal `json:"params"`
	}
	_ = json.Unmarshal(raw, &wire)
	for i, want := range cases {
		if i >= len(wire.Params) {
			t.Fatalf("wire params has %d entries, want %d", len(wire.Params), len(cases))
		}
		if wire.Params[i].Value != want.value {
			t.Errorf("[wire] param[%d].value = %q, want %q (BUG)", i, wire.Params[i].Value, want.value)
		}
	}
}
