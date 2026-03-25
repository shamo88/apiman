package curl

import (
	"apiman/internal/models"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type CurlExecutor struct{}

func NewCurlExecutor() *CurlExecutor {
	return &CurlExecutor{}
}

func (c *CurlExecutor) Execute(curlCommand string) (*models.CurlResponse, error) {
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
	if parts.Data != "" {
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

	client := &http.Client{
		Timeout: 30 * time.Second,
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

	headers := make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			headers[key] = values[0]
		}
	}

	return &models.CurlResponse{
		StatusCode: resp.StatusCode,
		Headers:    headers,
		Body:       bodyStr,
		Duration:   duration,
	}, nil
}

type ParsedCurl struct {
	Method  string
	URL     string
	Headers map[string]string
	Data    string
	Auth    string
}

func (c *CurlExecutor) parseCurlCommand(command string) (*ParsedCurl, error) {
	parts := &ParsedCurl{
		Headers: make(map[string]string),
	}

	command = strings.TrimSpace(command)
	command = strings.TrimPrefix(command, "curl ")

	patterns := map[string]*regexp.Regexp{
		"method": regexp.MustCompile(`-X\s+(\S+)`),
		"header": regexp.MustCompile(`-H\s+['"]([^'"]+)['"]`),
		"data":   regexp.MustCompile(`-d\s+['"]([^'"]+)['"]`),
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

	if matches := patterns["data"].FindStringSubmatch(command); len(matches) > 1 {
		parts.Data = matches[1]
	}

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
	for key, value := range variables {
		placeholder := "{{" + key + "}}"
		text = strings.ReplaceAll(text, placeholder, value)
	}
	return text
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
