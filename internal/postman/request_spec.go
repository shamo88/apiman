package postman

import (
	"apiman/internal/models"
	"net/url"
	"strings"
)

// ItemToCurlRequestModel maps a collection item to the API model (structured fields, no curl string).
func ItemToCurlRequestModel(projectID string, item *CollectionItem) *models.CurlRequest {
	if item == nil || item.Request == nil {
		return nil
	}
	cr := &models.CurlRequest{
		ID:           item.ID,
		Name:         item.Name,
		ProjectID:    projectID,
		Path:         RequestRefPath(projectID, item.ID),
		PreScriptID:  item.PreScriptID,
		PostScriptID: item.PostScriptID,
	}
	req := item.Request
	cr.Method = strings.ToUpper(strings.TrimSpace(req.Method))
	if cr.Method == "" {
		cr.Method = "GET"
	}
	cr.HttpURL, cr.Params = splitPostmanURL(req.URL)
	cr.Headers = headersToModel(req.Header)
	cr.Body, cr.BodyType, cr.FormData, cr.UrlEncoded = bodyToModel(req.Body, req.ApimanBodyType, cr.Headers)
	return cr
}

func headersToModel(hh []PostmanHeader) []models.RequestKeyVal {
	out := make([]models.RequestKeyVal, 0, len(hh))
	for _, h := range hh {
		out = append(out, models.RequestKeyVal{
			Key:     h.Key,
			Value:   h.Value,
			Enabled: !h.Disabled,
		})
	}
	return out
}

func splitPostmanURL(u *PostmanURL) (string, []models.RequestKeyVal) {
	if u == nil {
		return "", nil
	}
	raw := strings.TrimSpace(u.Raw)
	if len(u.Query) > 0 {
		base := raw
		if i := strings.Index(raw, "?"); i >= 0 {
			base = raw[:i]
		}
		params := make([]models.RequestKeyVal, 0, len(u.Query))
		for _, q := range u.Query {
			if strings.TrimSpace(q.Key) == "" {
				continue
			}
			params = append(params, models.RequestKeyVal{Key: q.Key, Value: q.Value, Enabled: !q.Disabled})
		}
		return strings.TrimSpace(base), params
	}
	if idx := strings.Index(raw, "?"); idx >= 0 {
		base := strings.TrimSpace(raw[:idx])
		qs, err := url.ParseQuery(raw[idx+1:])
		if err != nil {
			return raw, nil
		}
		params := make([]models.RequestKeyVal, 0, len(qs))
		for k, vs := range qs {
			v := ""
			if len(vs) > 0 {
				v = vs[0]
			}
			params = append(params, models.RequestKeyVal{Key: k, Value: v, Enabled: true})
		}
		return base, params
	}
	return raw, nil
}

func bodyToModel(b *PostmanBody, apimanHint string, hdrs []models.RequestKeyVal) (body, bodyType string, form []models.RequestPair, enc []models.RequestPair) {
	if b == nil {
		return "", "none", nil, nil
	}
	switch b.Mode {
	case "raw":
		bt := apimanHint
		if bt == "" {
			bt = inferRawBodyType(b.Raw, hdrs)
		}
		if bt != "json" && bt != "xml" && bt != "binary" {
			bt = "raw"
		}
		return b.Raw, bt, nil, nil
	case "urlencoded":
		for _, p := range b.URLEncoded {
			enc = append(enc, models.RequestPair{Key: p.Key, Value: p.Value, Enabled: !p.Disabled})
		}
		return "", "x-www-form-urlencoded", nil, enc
	case "formdata":
		for _, f := range b.FormData {
			form = append(form, models.RequestPair{Key: f.Key, Value: f.Value, Enabled: !f.Disabled})
		}
		return "", "form-data", form, nil
	default:
		return "", "none", nil, nil
	}
}

func inferRawBodyType(raw string, hdrs []models.RequestKeyVal) string {
	for _, h := range hdrs {
		if !h.Enabled {
			continue
		}
		if strings.EqualFold(strings.TrimSpace(h.Key), "content-type") {
			v := strings.ToLower(h.Value)
			if strings.Contains(v, "application/json") {
				return "json"
			}
			if strings.Contains(v, "application/xml") || strings.Contains(v, "text/xml") {
				return "xml"
			}
		}
	}
	t := strings.TrimSpace(raw)
	if strings.HasPrefix(t, "{") || strings.HasPrefix(t, "[") {
		return "json"
	}
	return "raw"
}

// ApplyHTTPRequestSpecToItem writes spec into the Postman-shaped request on the item.
func ApplyHTTPRequestSpecToItem(item *CollectionItem, spec *models.HttpRequestSpec) {
	if item == nil || spec == nil {
		return
	}
	if item.Request == nil {
		item.Request = &CollectionRequest{}
	}
	req := item.Request
	req.Method = strings.ToUpper(strings.TrimSpace(spec.Method))
	if req.Method == "" {
		req.Method = "GET"
	}
	qp := make([]PostmanQueryParam, 0, len(spec.Params))
	for _, p := range spec.Params {
		if strings.TrimSpace(p.Key) == "" {
			continue
		}
		q := PostmanQueryParam{Key: p.Key, Value: p.Value}
		if !p.Enabled {
			q.Disabled = true
		}
		qp = append(qp, q)
	}
	base := strings.TrimSpace(spec.HttpURL)
	raw := joinRawURL(base, qp)
	req.URL = &PostmanURL{Raw: raw, Query: qp}

	req.Header = nil
	for _, h := range spec.Headers {
		if !h.Enabled || strings.TrimSpace(h.Key) == "" {
			continue
		}
		req.Header = append(req.Header, PostmanHeader{Key: h.Key, Value: h.Value})
	}

	req.ApimanBodyType = ""
	bt := strings.TrimSpace(spec.BodyType)
	switch bt {
	case "none", "":
		req.Body = nil
	case "json":
		req.Body = &PostmanBody{Mode: "raw", Raw: spec.Body}
		req.ApimanBodyType = "json"
		ensureContentType(req, "application/json")
	case "xml":
		req.Body = &PostmanBody{Mode: "raw", Raw: spec.Body}
		req.ApimanBodyType = "xml"
		ensureContentType(req, "application/xml")
	case "raw":
		req.Body = &PostmanBody{Mode: "raw", Raw: spec.Body}
		req.ApimanBodyType = "raw"
	case "binary":
		req.Body = &PostmanBody{Mode: "raw", Raw: spec.Body}
		req.ApimanBodyType = "binary"
	case "x-www-form-urlencoded":
		ps := make([]PostmanURLEncoded, 0, len(spec.UrlEncoded))
		for _, p := range spec.UrlEncoded {
			if strings.TrimSpace(p.Key) == "" {
				continue
			}
			e := PostmanURLEncoded{Key: p.Key, Value: p.Value, Type: "text"}
			if !p.Enabled {
				e.Disabled = true
			}
			ps = append(ps, e)
		}
		req.Body = &PostmanBody{Mode: "urlencoded", URLEncoded: ps}
		ensureContentType(req, "application/x-www-form-urlencoded")
	case "form-data":
		fs := make([]PostmanFormData, 0, len(spec.FormData))
		for _, f := range spec.FormData {
			if strings.TrimSpace(f.Key) == "" {
				continue
			}
			fd := PostmanFormData{Key: f.Key, Value: f.Value, Type: "text"}
			if !f.Enabled {
				fd.Disabled = true
			}
			fs = append(fs, fd)
		}
		req.Body = &PostmanBody{Mode: "formdata", FormData: fs}
	default:
		req.Body = nil
	}
}

func ensureContentType(req *CollectionRequest, ct string) {
	for _, h := range req.Header {
		if strings.EqualFold(strings.TrimSpace(h.Key), "content-type") {
			return
		}
	}
	req.Header = append(req.Header, PostmanHeader{Key: "Content-Type", Value: ct})
}

func joinRawURL(base string, qp []PostmanQueryParam) string {
	active := make([]PostmanQueryParam, 0, len(qp))
	for _, p := range qp {
		if p.Disabled || strings.TrimSpace(p.Key) == "" {
			continue
		}
		active = append(active, p)
	}
	if len(active) == 0 {
		return base
	}
	qs := make([]string, 0, len(active))
	for _, p := range active {
		qs = append(qs, url.QueryEscape(p.Key)+"="+url.QueryEscape(p.Value))
	}
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	return base + sep + strings.Join(qs, "&")
}

// NewRequestItemFromSpec creates a collection item from a structured spec (e.g. new request).
func NewRequestItemFromSpec(id, name string, spec *models.HttpRequestSpec) CollectionItem {
	item := CollectionItem{ID: id, Name: name}
	ApplyHTTPRequestSpecToItem(&item, spec)
	if item.Request == nil {
		item.Request = &CollectionRequest{
			Method: "GET",
			URL:    &PostmanURL{Raw: ""},
		}
	}
	return item
}
