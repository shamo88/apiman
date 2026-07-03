package postman

import (
	"encoding/json"
	"testing"

	"apiman/internal/models"
)

// TestParamsValueRoundTrip exercises the exact bug from the MCP test
// report: create_request with params[0].value="true" should round-trip
// through ApplyHTTPRequestSpecToItem → JSON marshal → JSON unmarshal →
// ItemToCurlRequestModel without losing the value.
func TestParamsValueRoundTrip(t *testing.T) {
	spec := models.HttpRequestSpec{
		Method:  "GET",
		HttpURL: "http://localhost:3000/api/users",
		Params: []models.RequestKeyVal{
			{Key: "trace", Value: "true", Enabled: true},
		},
		Headers: []models.RequestKeyVal{
			{Key: "Content-Type", Value: "application/json", Enabled: true},
		},
	}

	item := &CollectionItem{
		ID:      "req-1",
		Name:    "get_user",
		Request: &CollectionRequest{Method: "GET", URL: &PostmanURL{}},
	}
	ApplyHTTPRequestSpecToItem(item, &spec)

	// Marshal → unmarshal to simulate disk persistence.
	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	t.Logf("stored: %s", string(data))

	var loaded CollectionItem
	if err := json.Unmarshal(data, &loaded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if loaded.Request == nil || loaded.Request.URL == nil {
		t.Fatalf("no URL after roundtrip")
	}
	t.Logf("post-roundtrip URL.Raw=%q, URL.Query=%+v", loaded.Request.URL.Raw, loaded.Request.URL.Query)

	cr := ItemToCurlRequestModel("proj-1", &loaded)
	if cr == nil {
		t.Fatal("nil CurlRequest")
	}

	if len(cr.Params) != 1 {
		t.Fatalf("params len = %d, want 1", len(cr.Params))
	}
	if cr.Params[0].Key != "trace" {
		t.Errorf("params[0].key = %q, want trace", cr.Params[0].Key)
	}
	if cr.Params[0].Value != "true" {
		t.Errorf("params[0].value = %q, want true", cr.Params[0].Value)
	}
	if len(cr.Headers) != 1 || cr.Headers[0].Value != "application/json" {
		t.Errorf("headers lost: %+v", cr.Headers)
	}
}

// TestParamsValueAcrossFullCollectionRoundTrip simulates the full
// disk-write path: Collection → marshal → unmarshal → ItemToCurlRequest.
// This is closer to what the MCP handler does after SaveCollection.
func TestParamsValueAcrossFullCollectionRoundTrip(t *testing.T) {
	spec := models.HttpRequestSpec{
		Method:  "GET",
		HttpURL: "http://localhost:3000/api/users",
		Params: []models.RequestKeyVal{
			{Key: "trace", Value: "true", Enabled: true},
		},
		Headers: []models.RequestKeyVal{
			{Key: "Content-Type", Value: "application/json", Enabled: true},
		},
	}

	item := &CollectionItem{
		ID:      "req-1",
		Name:    "get_user",
		Request: &CollectionRequest{Method: "GET", URL: &PostmanURL{}},
	}
	ApplyHTTPRequestSpecToItem(item, &spec)

	coll := &Collection{
		Info: PostmanInfo{Name: "test"},
		Item: []CollectionItem{*item},
	}
	data, err := json.MarshalIndent(coll, "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	t.Logf("stored collection: %s", string(data))

	var loaded Collection
	if err := json.Unmarshal(data, &loaded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	cr := ItemToCurlRequestModel("proj-1", &loaded.Item[0])
	if cr == nil {
		t.Fatal("nil CurlRequest")
	}

	if len(cr.Params) != 1 || cr.Params[0].Value != "true" {
		t.Fatalf("params lost: %+v", cr.Params)
	}
	if len(cr.Headers) != 1 || cr.Headers[0].Value != "application/json" {
		t.Fatalf("headers lost: %+v", cr.Headers)
	}

	// Mirror what the MCP getRequest handler does: when InterfaceSpec
	// is absent, fall back to CurlRequest's top-level fields. Verify
	// SpecFromCurlRequest preserves the value too (this is the layer
	// the v2 report implicitly blames).
	got := models.SpecFromCurlRequest(cr)
	if len(got.Params) != 1 || got.Params[0].Value != "true" {
		t.Errorf("SpecFromCurlRequest lost value: %+v", got.Params)
	}
}
