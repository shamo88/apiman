package curl

import (
	"apiman/internal/models"
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ExecuteHTTPRequest runs an HTTP request from structured fields (Postman-aligned).
func (c *CurlExecutor) ExecuteHTTPRequest(spec *models.HttpRequestSpec) (*models.CurlResponse, error) {
	return c.ExecuteHTTPRequestWithProxy(spec, nil)
}

// ExecuteHTTPRequestWithProxy is like ExecuteHTTPRequest but honors proxy options.
func (c *CurlExecutor) ExecuteHTTPRequestWithProxy(spec *models.HttpRequestSpec, proxyOpts *ProxyOptions) (*models.CurlResponse, error) {
	if spec == nil {
		return &models.CurlResponse{Error: "request is nil"}, nil
	}

	method := strings.ToUpper(strings.TrimSpace(spec.Method))
	if method == "" {
		method = "GET"
	}

	fullURL := appendQueryParams(strings.TrimSpace(spec.HttpURL), spec.Params)
	headerMap := make(map[string]string)
	for _, h := range spec.Headers {
		if h.Enabled && strings.TrimSpace(h.Key) != "" {
			headerMap[h.Key] = h.Value
		}
	}

	startTime := time.Now()
	var body io.Reader
	bt := strings.TrimSpace(spec.BodyType)

	switch bt {
	case "form-data":
		stripContentType(headerMap)
		var formBuffer bytes.Buffer
		formWriter := multipart.NewWriter(&formBuffer)
		for _, f := range spec.FormData {
			if !f.Enabled || strings.TrimSpace(f.Key) == "" {
				continue
			}
			if err := formWriter.WriteField(f.Key, f.Value); err != nil {
				return &models.CurlResponse{Error: fmt.Sprintf("Failed to build multipart form data: %v", err)}, nil
			}
		}
		if err := formWriter.Close(); err != nil {
			return &models.CurlResponse{Error: fmt.Sprintf("Failed to finalize multipart form data: %v", err)}, nil
		}
		body = &formBuffer
		headerMap["Content-Type"] = formWriter.FormDataContentType()

	case "x-www-form-urlencoded":
		vals := url.Values{}
		for _, p := range spec.UrlEncoded {
			if !p.Enabled || strings.TrimSpace(p.Key) == "" {
				continue
			}
			vals.Set(p.Key, p.Value)
		}
		encoded := vals.Encode()
		if encoded != "" {
			body = strings.NewReader(encoded)
		}
		if !headerHasKeyCI(headerMap, "content-type") {
			headerMap["Content-Type"] = "application/x-www-form-urlencoded"
		}

	case "json", "xml", "raw", "binary":
		if spec.Body != "" {
			body = strings.NewReader(spec.Body)
		}
		if bt == "json" && !headerHasKeyCI(headerMap, "content-type") {
			headerMap["Content-Type"] = "application/json"
		}
		if bt == "xml" && !headerHasKeyCI(headerMap, "content-type") {
			headerMap["Content-Type"] = "application/xml"
		}

	case "none", "":
		// no body

	default:
		if spec.Body != "" {
			body = strings.NewReader(spec.Body)
		}
	}

	req, err := http.NewRequest(method, fullURL, body)
	if err != nil {
		return &models.CurlResponse{Error: fmt.Sprintf("Failed to create request: %v", err)}, nil
	}

	for key, value := range headerMap {
		req.Header.Set(key, value)
	}

	// 设置请求 Cookie
	fmt.Printf("[DEBUG] spec.Cookies: %+v\n", spec.Cookies)
	if len(spec.Cookies) > 0 {
		var cookieParts []string
		for _, c := range spec.Cookies {
			if c.Enabled && strings.TrimSpace(c.Key) != "" {
				cookieParts = append(cookieParts, c.Key+"="+c.Value)
			}
		}
		if len(cookieParts) > 0 {
			req.Header.Set("Cookie", strings.Join(cookieParts, "; "))
		}
	}

	client := &http.Client{Timeout: 30 * time.Second}
	if proxyOpts != nil && proxyOpts.Enabled {
		client.Transport = buildTransportWithProxy(proxyOpts)
	}

	resp, err := client.Do(req)
	if err != nil {
		return &models.CurlResponse{Error: fmt.Sprintf("Request failed: %v", err)}, nil
	}
	defer resp.Body.Close()

	duration := time.Since(startTime).Milliseconds()
	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	headers := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	// 提取响应 Cookie
	var cookies []models.ResponseCookie
	for _, c := range resp.Cookies() {
		cookies = append(cookies, models.ResponseCookie{
			Name:     c.Name,
			Value:    c.Value,
			Domain:   c.Domain,
			Path:     c.Path,
			Expires:  c.Expires.String(),
			HttpOnly: c.HttpOnly,
			Secure:   c.Secure,
		})
	}

	return &models.CurlResponse{
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       bodyStr,
		Duration:   duration,
		Cookies:    cookies,
	}, nil
}

func appendQueryParams(base string, params []models.RequestKeyVal) string {
	out := base
	for _, p := range params {
		if !p.Enabled || strings.TrimSpace(p.Key) == "" {
			continue
		}
		sep := "?"
		if strings.Contains(out, "?") {
			sep = "&"
		}
		out += sep + url.QueryEscape(p.Key) + "=" + url.QueryEscape(p.Value)
	}
	return out
}

func headerHasKeyCI(h map[string]string, want string) bool {
	want = strings.ToLower(want)
	for k := range h {
		if strings.ToLower(k) == want {
			return true
		}
	}
	return false
}

func stripContentType(h map[string]string) {
	for k := range h {
		if strings.EqualFold(k, "content-type") {
			delete(h, k)
			return
		}
	}
}
