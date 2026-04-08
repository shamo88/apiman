package curl

import (
	"apiman/internal/models"
	"bytes"
	"context"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	xproxy "golang.org/x/net/proxy"
)

type CurlExecutor struct{}

func NewCurlExecutor() *CurlExecutor {
	return &CurlExecutor{}
}

type ProxyOptions struct {
	Enabled    bool
	HTTPHost   string
	HTTPPort   int
	HTTPSHost  string
	HTTPSPort  int
	SOCKS5Host string
	SOCKS5Port int
}

func (c *CurlExecutor) Execute(curlCommand string) (*models.CurlResponse, error) {
	return c.ExecuteWithProxy(curlCommand, nil, 30)
}

func (c *CurlExecutor) ExecuteWithProxy(curlCommand string, proxyOpts *ProxyOptions, timeoutSeconds int) (*models.CurlResponse, error) {
	parts, err := c.parseCurlCommand(curlCommand)
	if err != nil {
		return &models.CurlResponse{
			Error: fmt.Sprintf("Failed to parse curl command: %v", err),
		}, nil
	}

	if parts.Method == "" {
		parts.Method = "GET"
	}

	startTime := time.Now()

	var body io.Reader
	if len(parts.FormFields) > 0 {
		var formBuffer bytes.Buffer
		formWriter := multipart.NewWriter(&formBuffer)
		for key, value := range parts.FormFields {
			if err := formWriter.WriteField(key, value); err != nil {
				return &models.CurlResponse{
					Error: fmt.Sprintf("Failed to build multipart form data: %v", err),
				}, nil
			}
		}
		if err := formWriter.Close(); err != nil {
			return &models.CurlResponse{
				Error: fmt.Sprintf("Failed to finalize multipart form data: %v", err),
			}, nil
		}
		body = &formBuffer
		// multipart 必须带 boundary；如果用户配置了错误 Content-Type（如 application/json），这里强制修正。
		parts.Headers["Content-Type"] = formWriter.FormDataContentType()
	} else if parts.Data != "" {
		body = strings.NewReader(parts.Data)
	}

	req, err := http.NewRequest(parts.Method, parts.URL, body)
	if err != nil {
		return &models.CurlResponse{
			Error: fmt.Sprintf("Failed to create request: %v", err),
		}, nil
	}

	for key, value := range parts.Headers {
		req.Header.Set(key, value)
	}

	if parts.Auth != "" {
		req.Header.Set("Authorization", parts.Auth)
	}

	client := &http.Client{Timeout: time.Duration(timeoutSeconds) * time.Second}
	if proxyOpts != nil && proxyOpts.Enabled {
		client.Transport = buildTransportWithProxy(proxyOpts)
	}

	resp, err := client.Do(req)
	if err != nil {
		return &models.CurlResponse{
			Error: fmt.Sprintf("Request failed: %v", err),
		}, nil
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

	return &models.CurlResponse{
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       bodyStr,
		Duration:   duration,
	}, nil
}

func buildTransportWithProxy(proxyOpts *ProxyOptions) *http.Transport {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout: 30 * time.Second,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	if proxyOpts.SOCKS5Host != "" && proxyOpts.SOCKS5Port > 0 {
		normalizedSocksHost := normalizeProxyHost(proxyOpts.SOCKS5Host)
		if normalizedSocksHost == "" {
			return transport
		}
		socksAddr := net.JoinHostPort(normalizedSocksHost, strconv.Itoa(proxyOpts.SOCKS5Port))
		dialer, err := xproxy.SOCKS5("tcp", socksAddr, nil, xproxy.Direct)
		if err == nil {
			transport.Proxy = nil
			transport.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
				type dialResult struct {
					conn net.Conn
					err  error
				}
				ch := make(chan dialResult, 1)
				go func() {
					conn, dialErr := dialer.Dial(network, addr)
					ch <- dialResult{conn: conn, err: dialErr}
				}()

				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case res := <-ch:
					return res.conn, res.err
				}
			}
		}
		return transport
	}

	httpProxyURL := buildProxyURL("http", proxyOpts.HTTPHost, proxyOpts.HTTPPort)
	httpsProxyURL := buildProxyURL("http", proxyOpts.HTTPSHost, proxyOpts.HTTPSPort)

	if httpProxyURL == nil && httpsProxyURL == nil {
		return transport
	}

	transport.Proxy = func(req *http.Request) (*url.URL, error) {
		if req != nil && req.URL != nil && strings.EqualFold(req.URL.Scheme, "https") {
			if httpsProxyURL != nil {
				return httpsProxyURL, nil
			}
			return httpProxyURL, nil
		}
		if httpProxyURL != nil {
			return httpProxyURL, nil
		}
		return httpsProxyURL, nil
	}

	return transport
}

func buildProxyURL(scheme, host string, port int) *url.URL {
	normalizedHost := normalizeProxyHost(host)
	if normalizedHost == "" || port <= 0 {
		return nil
	}
	return &url.URL{
		Scheme: scheme,
		Host:   net.JoinHostPort(normalizedHost, strconv.Itoa(port)),
	}
}

func normalizeProxyHost(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	candidate := value
	if !strings.Contains(candidate, "://") {
		candidate = "http://" + candidate
	}

	parsed, err := url.Parse(candidate)
	if err != nil {
		return strings.Trim(value, "[]")
	}

	host := strings.TrimSpace(parsed.Host)
	if host == "" {
		host = strings.TrimSpace(parsed.Path)
	}
	if host == "" {
		return ""
	}

	if strings.Contains(host, ":") {
		if splitHost, _, splitErr := net.SplitHostPort(host); splitErr == nil {
			return strings.Trim(splitHost, "[]")
		}
	}

	return strings.Trim(host, "[]")
}

type ParsedCurl struct {
	Method     string
	URL        string
	Headers    map[string]string
	Data       string
	FormFields map[string]string
	Auth       string
}

func (c *CurlExecutor) parseCurlCommand(command string) (*ParsedCurl, error) {
	parts := &ParsedCurl{
		Headers:    make(map[string]string),
		FormFields: make(map[string]string),
	}

	command = strings.TrimSpace(command)
	command = strings.TrimPrefix(command, "curl ")

	patterns := map[string]*regexp.Regexp{
		"method": regexp.MustCompile(`-X\s+(\S+)`),
		"header": regexp.MustCompile(`-H\s+['"]([^'"]+)['"]`),
		"user":   regexp.MustCompile(`-u\s+['"]([^'"]+)['"]`),
		"url":    regexp.MustCompile(`['"]?(https?://[^\s'"]+)['"]?`),
	}

	if matches := patterns["method"].FindStringSubmatch(command); len(matches) > 1 {
		parts.Method = strings.ToUpper(matches[1])
	}

	for _, match := range patterns["header"].FindAllStringSubmatch(command, -1) {
		if len(match) > 1 {
			headerParts := strings.SplitN(match[1], ":", 2)
			if len(headerParts) == 2 {
				key := strings.TrimSpace(headerParts[0])
				value := strings.TrimSpace(headerParts[1])
				parts.Headers[key] = value
			}
		}
	}

	parts.Data = extractDataArgument(command)
	parts.FormFields = extractFormFields(command)

	if matches := patterns["user"].FindStringSubmatch(command); len(matches) > 1 {
		auth := matches[1]
		parts.Auth = "Basic " + base64Encode(auth)
	}

	urlMatch := patterns["url"].FindStringSubmatch(command)
	if len(urlMatch) > 1 {
		parts.URL = urlMatch[1]
	}

	if parts.URL == "" {
		urlPattern := regexp.MustCompile(`\s+([^\s]+)$`)
		if matches := urlPattern.FindStringSubmatch(command); len(matches) > 1 {
			parts.URL = strings.Trim(matches[1], "'\"")
		}
	}

	return parts, nil
}

func extractDataArgument(command string) string {
	// Prefer single-quoted payload first, as JSON bodies are usually wrapped by single quotes.
	// Example: -d '{"test":1}'
	singleQuoted := regexp.MustCompile(`(?:^|\s)-d\s+'([^']*)'`)
	if matches := singleQuoted.FindStringSubmatch(command); len(matches) > 1 {
		return matches[1]
	}

	// Handle double-quoted payload with possible escaped quotes.
	// Example: -d "{\"test\":1}"
	doubleQuoted := regexp.MustCompile(`(?:^|\s)-d\s+"((?:[^"\\]|\\.)*)"`)
	if matches := doubleQuoted.FindStringSubmatch(command); len(matches) > 1 {
		value := matches[1]
		value = strings.ReplaceAll(value, `\"`, `"`)
		value = strings.ReplaceAll(value, `\\`, `\`)
		return value
	}

	// Fallback for unquoted payload.
	unquoted := regexp.MustCompile(`(?:^|\s)-d\s+([^\s]+)`)
	if matches := unquoted.FindStringSubmatch(command); len(matches) > 1 {
		return matches[1]
	}

	return ""
}

func extractFormFields(command string) map[string]string {
	fields := make(map[string]string)
	pattern := regexp.MustCompile(`(?:^|\s)-F\s+['"]([^'"]+)['"]`)
	matches := pattern.FindAllStringSubmatch(command, -1)
	for _, match := range matches {
		if len(match) < 2 {
			continue
		}
		item := strings.TrimSpace(match[1])
		if item == "" {
			continue
		}
		parts := strings.SplitN(item, "=", 2)
		key := strings.TrimSpace(parts[0])
		if key == "" {
			continue
		}
		value := ""
		if len(parts) == 2 {
			value = parts[1]
		}
		fields[key] = value
	}
	return fields
}

func base64Encode(input string) string {
	cmd := exec.Command("powershell", "-Command", fmt.Sprintf("[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('%s'))", input))
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Run()
	return strings.TrimSpace(out.String())
}

func (c *CurlExecutor) ExtractVariables(text string) []string {
	pattern := regexp.MustCompile(`\{\{(\w+)\}\}`)
	matches := pattern.FindAllStringSubmatch(text, -1)

	vars := make([]string, 0)
	seen := make(map[string]bool)

	for _, match := range matches {
		if len(match) > 1 && !seen[match[1]] {
			vars = append(vars, match[1])
			seen[match[1]] = true
		}
	}

	return vars
}

func (c *CurlExecutor) ReplaceVariables(text string, variables map[string]string) string {
	// 首先处理内置的动态生成器
	text = replaceDynamicGenerators(text)

	// 然后处理用户定义的变量
	for key, value := range variables {
		placeholder := "{{" + key + "}}"
		text = strings.ReplaceAll(text, placeholder, value)
	}
	return text
}

// replaceDynamicGenerators 处理内置的动态变量生成器
func replaceDynamicGenerators(text string) string {
	// {{$date.timestamp}} - 当前Unix时间戳（秒）
	text = replaceGenerator(text, `{{$date.timestamp}}`, func() string {
		return fmt.Sprintf("%d", time.Now().Unix())
	})

	// {{$date.timestampMs}} - 当前Unix时间戳（毫秒）
	text = replaceGenerator(text, `{{$date.timestampMs}}`, func() string {
		return fmt.Sprintf("%d", time.Now().UnixMilli())
	})

	// {{$date.now}} - 当前时间ISO格式
	text = replaceGenerator(text, `{{$date.now}}`, func() string {
		return time.Now().Format(time.RFC3339)
	})

	// {{$date.now('格式')}} - 自定义格式，如 {{$date.now('2006-01-02')}}
	text = replaceGeneratorWithFormat(text, `{{$date.now('`, `'}}`, func(format string) string {
		// 使用Go的日期格式
		return time.Now().Format(format)
	})

	// {{$uuid}} - 随机UUID
	text = replaceGenerator(text, `{{$uuid}}`, func() string {
		return generateUUID()
	})

	// {{$random.int}} - 随机整数
	text = replaceGenerator(text, `{{$random.int}}`, func() string {
		return fmt.Sprintf("%d", time.Now().UnixNano()%1000000)
	})

	// {{$random.float}} - 随机浮点数
	text = replaceGenerator(text, `{{$random.float}}`, func() string {
		return fmt.Sprintf("%f", float64(time.Now().UnixNano())/float64(time.Now().Unix()))
	})

	// {{$random.alpha(10)}} - 随机字母字符串
	text = replaceGeneratorWithArg(text, `{{$random.alpha(`, `)}}`, func(arg string) string {
		length := 10
		if n, err := strconv.Atoi(arg); err == nil && n > 0 && n <= 100 {
			length = n
		}
		return randomAlpha(length)
	})

	// {{$random.alphanumeric(10)}} - 随机字母数字字符串
	text = replaceGeneratorWithArg(text, `{{$random.alphanumeric(`, `)}}`, func(arg string) string {
		length := 10
		if n, err := strconv.Atoi(arg); err == nil && n > 0 && n <= 100 {
			length = n
		}
		return randomAlphanumeric(length)
	})

	return text
}

func replaceGenerator(text, pattern string, generator func() string) string {
	if strings.Contains(text, pattern) {
		return strings.ReplaceAll(text, pattern, generator())
	}
	return text
}

func replaceGeneratorWithFormat(text, prefix, suffix string, generator func(string) string) string {
	for {
		idx := strings.Index(text, prefix)
		if idx == -1 {
			break
		}
		endIdx := strings.Index(text[idx+len(prefix):], suffix)
		if endIdx == -1 {
			break
		}
		endIdx = idx + len(prefix) + endIdx
		format := text[idx+len(prefix) : endIdx]
		value := generator(format)
		text = text[:idx] + value + text[endIdx+len(suffix):]
	}
	return text
}

func replaceGeneratorWithArg(text, prefix, suffix string, generator func(string) string) string {
	for {
		idx := strings.Index(text, prefix)
		if idx == -1 {
			break
		}
		endIdx := strings.Index(text[idx+len(prefix):], suffix)
		if endIdx == -1 {
			break
		}
		endIdx = idx + len(prefix) + endIdx
		arg := text[idx+len(prefix) : endIdx]
		value := generator(arg)
		text = text[:idx] + value + text[endIdx+len(suffix):]
	}
	return text
}

var uuidRegex = regexp.MustCompile(`[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}`)

func generateUUID() string {
	// 使用时间和随机数生成一个伪UUID格式
	timestamp := time.Now().UnixNano()
	high := timestamp / 1000000000
	low := timestamp % 1000000000
	return fmt.Sprintf("%08x-%04x-4%03x-%04x-%012x",
		uint32(high), uint16(high>>16), uint16(low>>48),
		0x8000|(low>>32)&0x0fff,
		low&0xffffffffffff)
}

var letterRunes = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

func randomAlpha(length int) string {
	b := make([]rune, length)
	for i := range b {
		b[i] = letterRunes[rand.Intn(len(letterRunes))]
	}
	return string(b)
}

func randomAlphanumeric(length int) string {
	return randomAlpha(length)
}

func (c *CurlExecutor) FormatResponseBody(body string, contentType string) string {
	if strings.Contains(contentType, "application/json") {
		return c.formatJSON(body)
	}
	return body
}

func (c *CurlExecutor) formatJSON(jsonStr string) string {
	var buf bytes.Buffer
	depth := 0
	inString := false
	escape := false

	for _, ch := range jsonStr {
		if escape {
			buf.WriteRune(ch)
			escape = false
			continue
		}

		switch ch {
		case '\\':
			if inString {
				escape = true
			}
			buf.WriteRune(ch)
		case '"':
			inString = !inString
			buf.WriteRune(ch)
		case '{', '[':
			if !inString {
				buf.WriteRune(ch)
				buf.WriteRune('\n')
				depth++
				buf.WriteString(strings.Repeat("  ", depth))
				continue
			}
			buf.WriteRune(ch)
		case '}', ']':
			if !inString {
				buf.WriteRune('\n')
				depth--
				buf.WriteString(strings.Repeat("  ", depth))
				buf.WriteRune(ch)
				continue
			}
			buf.WriteRune(ch)
		case ',':
			if !inString {
				buf.WriteRune(ch)
				buf.WriteRune('\n')
				buf.WriteString(strings.Repeat("  ", depth))
				continue
			}
			buf.WriteRune(ch)
		case ':':
			if !inString {
				buf.WriteString(" : ")
				continue
			}
			buf.WriteRune(ch)
		default:
			buf.WriteRune(ch)
		}
	}

	return buf.String()
}

func GetStatusCodeColor(code int) string {
	switch {
	case code >= 200 && code < 300:
		return "green"
	case code >= 300 && code < 400:
		return "yellow"
	case code >= 400 && code < 500:
		return "orange"
	case code >= 500:
		return "red"
	default:
		return "gray"
	}
}

func FormatDuration(ms int64) string {
	if ms < 1000 {
		return strconv.FormatInt(ms, 10) + " ms"
	}
	return strconv.FormatFloat(float64(ms)/1000, 'f', 2, 64) + " s"
}
