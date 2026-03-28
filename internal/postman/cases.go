package postman

import (
	"apiman/internal/models"
	"encoding/json"
	"strings"
)

// CurlRequestFromCollectionItem maps an item to CurlRequest including 用例 (cases).
func CurlRequestFromCollectionItem(projectID string, item *CollectionItem) *models.CurlRequest {
	cr := ItemToCurlRequestModel(projectID, item)
	if cr == nil {
		return nil
	}
	if len(item.ApimanCases) > 0 {
		is := models.SpecFromCurlRequest(cr)
		cr.InterfaceSpec = &is
	}
	AttachCasesToCurlRequest(cr, item)
	return cr
}

// AttachCasesToCurlRequest fills cr.Cases / ActiveCaseID and applies the active case spec to cr.
func AttachCasesToCurlRequest(cr *models.CurlRequest, item *CollectionItem) {
	if cr == nil || item == nil {
		return
	}
	cr.Cases = CloneHttpRequestCases(item.ApimanCases)
	if cr.Cases == nil {
		cr.Cases = []models.HttpRequestCase{}
	}
	cr.ActiveCaseID = strings.TrimSpace(item.ApimanActiveCaseID)
	if len(cr.Cases) == 0 {
		cr.ActiveCaseID = ""
		return
	}
	if cr.ActiveCaseID == "" || !casesHasID(cr.Cases, cr.ActiveCaseID) {
		cr.ActiveCaseID = cr.Cases[0].ID
	}
	spec := specForCaseID(cr.Cases, cr.ActiveCaseID)
	applySpecToCurlRequest(cr, spec)
}

func casesHasID(cases []models.HttpRequestCase, id string) bool {
	for _, c := range cases {
		if c.ID == id {
			return true
		}
	}
	return false
}

func specForCaseID(cases []models.HttpRequestCase, id string) models.HttpRequestSpec {
	for _, c := range cases {
		if c.ID == id {
			return c.Spec
		}
	}
	if len(cases) > 0 {
		return cases[0].Spec
	}
	return models.HttpRequestSpec{}
}

func applySpecToCurlRequest(cr *models.CurlRequest, spec models.HttpRequestSpec) {
	cr.Method = strings.ToUpper(strings.TrimSpace(spec.Method))
	if cr.Method == "" {
		cr.Method = "GET"
	}
	cr.HttpURL = spec.HttpURL
	cr.Headers = append([]models.RequestKeyVal(nil), spec.Headers...)
	cr.Params = append([]models.RequestKeyVal(nil), spec.Params...)
	cr.Body = spec.Body
	cr.BodyType = spec.BodyType
	cr.FormData = append([]models.RequestPair(nil), spec.FormData...)
	cr.UrlEncoded = append([]models.RequestPair(nil), spec.UrlEncoded...)
}

// CloneHttpRequestCases returns a deep copy via JSON round-trip.
func CloneHttpRequestCases(c []models.HttpRequestCase) []models.HttpRequestCase {
	if len(c) == 0 {
		return nil
	}
	b, err := json.Marshal(c)
	if err != nil {
		out := make([]models.HttpRequestCase, len(c))
		copy(out, c)
		return out
	}
	var out []models.HttpRequestCase
	if err := json.Unmarshal(b, &out); err != nil {
		out2 := make([]models.HttpRequestCase, len(c))
		copy(out2, c)
		return out2
	}
	return out
}

func CloneHttpRequestSpec(s *models.HttpRequestSpec) models.HttpRequestSpec {
	if s == nil {
		return models.HttpRequestSpec{}
	}
	b, err := json.Marshal(s)
	if err != nil {
		return *s
	}
	var out models.HttpRequestSpec
	if err := json.Unmarshal(b, &out); err != nil {
		return *s
	}
	return out
}
