package curl

import (
	"apiman/internal/models"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ParseSetCookie parses a single set-cookie header value into a GlobalCookie struct.
func ParseSetCookie(setCookie string) (*models.GlobalCookie, error) {
	parts := strings.Split(setCookie, ";")
	if len(parts) == 0 {
		return nil, fmt.Errorf("invalid set-cookie format")
	}

	// 第一个部分是 name=value
	nameValue := strings.TrimSpace(parts[0])
	idx := strings.Index(nameValue, "=")
	if idx == -1 {
		return nil, fmt.Errorf("invalid set-cookie format: missing =")
	}

	cookie := &models.GlobalCookie{
		ID:       uuid.New().String(),
		Name:     nameValue[:idx],
		Value:    nameValue[idx+1:],
		Path:     "/",
		Creation: time.Now(),
	}

	// 解析其他属性
	for i := 1; i < len(parts); i++ {
		part := strings.TrimSpace(parts[i])
		lower := strings.ToLower(part)

		if strings.HasPrefix(lower, "domain=") {
			cookie.Domain = strings.ToLower(part[len("domain="):])
		} else if strings.HasPrefix(lower, "path=") {
			cookie.Path = part[len("path="):]
		} else if strings.HasPrefix(lower, "expires=") {
			expiresStr := part[len("expires="):]
			// 尝试多种时间格式
			formats := []string{
				time.RFC1123,
				time.RFC1123Z,
				"Mon, 02 Jan 2006 15:04:05 MST",
				"Mon, 02 Jan 2006 15:04:05 GMT",
			}
			for _, format := range formats {
				if t, err := time.Parse(format, expiresStr); err == nil {
					cookie.Expires = t
					break
				}
			}
		} else if strings.HasPrefix(lower, "max-age=") {
			maxAgeStr := part[len("max-age="):]
			if maxAge, err := strconv.ParseInt(maxAgeStr, 10, 64); err == nil {
				if maxAge > 0 {
					cookie.Expires = time.Now().Add(time.Duration(maxAge) * time.Second)
				} else {
					// max-age=0 表示立即过期
					cookie.Expires = time.Now().Add(-1 * time.Second)
				}
			}
		} else if lower == "httponly" {
			cookie.HttpOnly = true
		} else if lower == "secure" {
			cookie.Secure = true
		} else if strings.HasPrefix(lower, "samesite=") {
			cookie.SameSite = strings.ToLower(part[len("samesite="):])
		} else if strings.HasPrefix(lower, "priority=") {
			cookie.Priority = strings.ToLower(part[len("priority="):])
		}
	}

	return cookie, nil
}

// ParseSetCookieLines parses multiple set-cookie header values separated by newlines.
func ParseSetCookieLines(raw string) ([]models.GlobalCookie, error) {
	lines := strings.Split(raw, "\n")
	var cookies []models.GlobalCookie

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		cookie, err := ParseSetCookie(line)
		if err != nil {
			continue // 跳过无效的 cookie 行
		}
		cookies = append(cookies, *cookie)
	}
	return cookies, nil
}

// MatchCookie checks if a cookie matches the given domain and path.
// Returns true if the cookie should be sent for the given request.
func MatchCookie(domain, path string, cookie *models.GlobalCookie) bool {
	// 1. 过期检查（session cookie 无过期时间，不过期）
	if !cookie.Expires.IsZero() && cookie.Expires.Before(time.Now()) {
		return false
	}

	// 2. Domain 匹配
	if !matchDomain(domain, cookie.Domain) {
		return false
	}

	// 3. Path 匹配
	if !matchPath(path, cookie.Path) {
		return false
	}

	return true
}

// matchDomain checks if the request host matches the cookie domain.
func matchDomain(host, domain string) bool {
	if domain == "" {
		return true
	}

	// 精确匹配
	if host == domain {
		return true
	}

	// 前缀匹配（如 .example.com 匹配 www.example.com）
	if strings.HasPrefix(domain, ".") {
		return strings.HasSuffix(host, domain) || host == domain[1:]
	}

	// 后缀匹配
	return strings.HasSuffix(host, domain)
}

// matchPath checks if the request path matches the cookie path.
func matchPath(reqPath, cookiePath string) bool {
	if cookiePath == "" || cookiePath == "/" {
		return true
	}
	// 使用前缀匹配，/api 匹配 /api/users
	return strings.HasPrefix(reqPath, cookiePath)
}

// FilterCookies returns the subset of cookies that match the given domain and path.
func FilterCookies(domain, path string, cookies []models.GlobalCookie) []models.GlobalCookie {
	var matched []models.GlobalCookie
	for i := range cookies {
		if MatchCookie(domain, path, &cookies[i]) {
			matched = append(matched, cookies[i])
		}
	}
	return matched
}
