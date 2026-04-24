package curl

import (
	"apiman/internal/models"
	"bytes"
	"context"
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
	return c.ExecuteHTTPRequestWithProxyContext(context.Background(), spec, nil, 30)
}

// ExecuteHTTPRequestWithProxy is like ExecuteHTTPRequest but honors proxy options and timeout.
func (c *CurlExecutor) ExecuteHTTPRequestWithProxy(spec *models.HttpRequestSpec, proxyOpts *ProxyOptions, timeoutSeconds int) (*models.CurlResponse, error) {
	return c.ExecuteHTTPRequestWithProxyContext(context.Background(), spec, proxyOpts, timeoutSeconds)
}

// ExecuteHTTPRequestWithProxyContext is like ExecuteHTTPRequestWithProxy but with context support for cancellation.
func (c *CurlExecutor) ExecuteHTTPRequestWithProxyContext(ctx context.Context, spec *models.HttpRequestSpec, proxyOpts *ProxyOptions, timeoutSeconds int) (*models.CurlResponse, error) {
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
		if strings.EqualFold(key, "Host") {
			req.Host = value
		} else {
			req.Header.Set(key, value)
		}
	}

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	if proxyOpts != nil && proxyOpts.Enabled {
		client.Transport = buildTransportWithProxy(proxyOpts)
	}

	resp, err := client.Do(req.WithContext(ctx))
	if err != nil {
		return &models.CurlResponse{Error: fmt.Sprintf("Request failed: %v", err)}, nil
	}
	defer resp.Body.Close()

	duration := time.Since(startTime).Milliseconds()
	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	headers := make(map[string][]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values
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
		StatusCode:  resp.StatusCode,
		Headers:     headers,
		Body:        bodyStr,
		Duration:    duration,
		Cookies:     cookies,
		CurlCommand: buildCurlCommand(method, fullURL, headerMap, spec.Body, proxyOpts),
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

// buildCurlCommand 生成完整的 curl 命令
func buildCurlCommand(method, url string, headers map[string]string, body string, proxyOpts *ProxyOptions) string {
	var sb strings.Builder
	sb.WriteString("curl")

	// Proxy
	if proxyOpts != nil && proxyOpts.Enabled {
		proxyStr := buildCurlProxyString(proxyOpts)
		if proxyStr != "" {
			sb.WriteString(fmt.Sprintf(" -x '%s'", proxyStr))
		}
	}

	// Method
	if method != "GET" {
		sb.WriteString(fmt.Sprintf(" -X %s", method))
	}

	// Headers
	for key, value := range headers {
		sb.WriteString(fmt.Sprintf(" -H '%s: %s'", key, value))
	}

	// Body
	if body != "" {
		// 转义单引号
		escapedBody := strings.ReplaceAll(body, "'", "'\\''")
		sb.WriteString(fmt.Sprintf(" -d '%s'", escapedBody))
	}

	// URL
	sb.WriteString(fmt.Sprintf(" '%s'", url))

	return sb.String()
}

// buildCurlProxyString 根据代理配置生成 curl 的代理参数字符串
func buildCurlProxyString(proxyOpts *ProxyOptions) string {
	if proxyOpts == nil || !proxyOpts.Enabled {
		return ""
	}

	// SOCKS5 代理优先
	if proxyOpts.SOCKS5Host != "" && proxyOpts.SOCKS5Port > 0 {
		return fmt.Sprintf("socks5h://%s:%d", proxyOpts.SOCKS5Host, proxyOpts.SOCKS5Port)
	}

	// HTTP/HTTPS 代理
	if proxyOpts.HTTPSHost != "" && proxyOpts.HTTPSPort > 0 {
		return fmt.Sprintf("http://%s:%d", proxyOpts.HTTPSHost, proxyOpts.HTTPSPort)
	}
	if proxyOpts.HTTPHost != "" && proxyOpts.HTTPPort > 0 {
		return fmt.Sprintf("http://%s:%d", proxyOpts.HTTPHost, proxyOpts.HTTPPort)
	}

	return ""
}
