package curl

import (
	"testing"
	"time"

	"apiman/internal/models"
)

func TestParseSetCookie_Basic(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Name != "session" {
		t.Errorf("expected name 'session', got '%s'", cookie.Name)
	}

	if cookie.Value != "abc123" {
		t.Errorf("expected value 'abc123', got '%s'", cookie.Value)
	}

	if cookie.Path != "/" {
		t.Errorf("expected path '/', got '%s'", cookie.Path)
	}
}

func TestParseSetCookie_WithDomain(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Domain=example.com; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Domain != "example.com" {
		t.Errorf("expected domain 'example.com', got '%s'", cookie.Domain)
	}
}

func TestParseSetCookie_WithExpires(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Expires=Wed, 21 Oct 2025 07:28:00 GMT; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Expires.IsZero() {
		t.Error("expected non-zero expires")
	}

	expected := time.Date(2025, 10, 21, 7, 28, 0, 0, time.UTC)
	if !cookie.Expires.Equal(expected) {
		t.Errorf("expected expires %v, got %v", expected, cookie.Expires)
	}
}

func TestParseSetCookie_WithMaxAge(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Max-Age=3600; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.Expires.IsZero() {
		t.Error("expected non-zero expires from max-age")
	}

	// 应该在未来大约1小时
	expectedMin := time.Now().Add(30 * time.Minute)
	expectedMax := time.Now().Add(90 * time.Minute)
	if cookie.Expires.Before(expectedMin) || cookie.Expires.After(expectedMax) {
		t.Errorf("expires %v is not in expected range [%v, %v]", cookie.Expires, expectedMin, expectedMax)
	}
}

func TestParseSetCookie_WithMaxAgeZero(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Max-Age=0; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	// max-age=0 应该立即过期
	if cookie.Expires.IsZero() {
		t.Error("expected non-zero expires for max-age=0")
	}

	if cookie.Expires.After(time.Now()) {
		t.Error("expected expires to be in the past for max-age=0")
	}
}

func TestParseSetCookie_HttpOnly(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; HttpOnly; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if !cookie.HttpOnly {
		t.Error("expected HttpOnly to be true")
	}
}

func TestParseSetCookie_Secure(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; Secure; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if !cookie.Secure {
		t.Error("expected Secure to be true")
	}
}

func TestParseSetCookie_SameSite(t *testing.T) {
	cookie, err := ParseSetCookie("session=abc123; SameSite=Strict; Path=/")
	if err != nil {
		t.Fatalf("failed to parse cookie: %v", err)
	}

	if cookie.SameSite != "strict" {
		t.Errorf("expected SameSite 'strict', got '%s'", cookie.SameSite)
	}
}

func TestParseSetCookie_InvalidFormat(t *testing.T) {
	_, err := ParseSetCookie("")
	if err == nil {
		t.Error("expected error for empty cookie")
	}

	_, err = ParseSetCookie("invalid")
	if err == nil {
		t.Error("expected error for cookie without =")
	}
}

func TestParseSetCookieLines_Multiple(t *testing.T) {
	raw := `session=abc123; Path=/
token=xyz789; Path=/
	empty=line; Path=/`

	cookies, err := ParseSetCookieLines(raw)
	if err != nil {
		t.Fatalf("failed to parse cookie lines: %v", err)
	}

	if len(cookies) != 3 {
		t.Errorf("expected 3 cookies, got %d", len(cookies))
	}

	// 验证第一个和最后一个
	if cookies[0].Name != "session" {
		t.Errorf("expected first cookie name 'session', got '%s'", cookies[0].Name)
	}

	if cookies[2].Name != "empty" {
		t.Errorf("expected last cookie name 'empty', got '%s'", cookies[2].Name)
	}
}

func TestParseSetCookieLines_SkipsInvalid(t *testing.T) {
	raw := `valid=cookie; Path=/
invalid
another=valid; Path=/`

	cookies, err := ParseSetCookieLines(raw)
	if err != nil {
		t.Fatalf("failed to parse cookie lines: %v", err)
	}

	// 应该跳过 "invalid" 这一行
	if len(cookies) != 2 {
		t.Errorf("expected 2 cookies (skipping invalid), got %d", len(cookies))
	}
}

func TestParseSetCookieLines_EmptyLines(t *testing.T) {
	raw := `session=abc123; Path=/

token=xyz789; Path=/

`

	cookies, err := ParseSetCookieLines(raw)
	if err != nil {
		t.Fatalf("failed to parse cookie lines: %v", err)
	}

	if len(cookies) != 2 {
		t.Errorf("expected 2 cookies, got %d", len(cookies))
	}
}

func TestMatchCookie_Expired(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:    "session",
		Value:   "abc",
		Domain:  "example.com",
		Path:    "/",
		Expires: time.Now().Add(-1 * time.Hour), // 已过期
	}

	if MatchCookie("example.com", "/", cookie) {
		t.Error("expired cookie should not match")
	}
}

func TestMatchCookie_SessionCookie(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:    "session",
		Value:   "abc",
		Domain:  "example.com",
		Path:    "/",
		Expires: time.Time{}, // 无过期时间，session cookie
	}

	if !MatchCookie("example.com", "/", cookie) {
		t.Error("session cookie should match")
	}
}

func TestMatchCookie_DomainExact(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: "example.com",
		Path:   "/",
	}

	if !MatchCookie("example.com", "/", cookie) {
		t.Error("exact domain match should work")
	}
}

func TestMatchCookie_DomainWithDot(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: ".example.com",
		Path:   "/",
	}

	// 应该匹配子域名
	if !MatchCookie("www.example.com", "/", cookie) {
		t.Error("domain with dot should match subdomains")
	}

	// 应该匹配主域名
	if !MatchCookie("example.com", "/", cookie) {
		t.Error("domain with dot should match main domain")
	}
}

func TestMatchCookie_DomainNoMatch(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: "example.com",
		Path:   "/",
	}

	if MatchCookie("other.com", "/", cookie) {
		t.Error("different domain should not match")
	}
}

func TestMatchCookie_PathMatch(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: "example.com",
		Path:   "/api",
	}

	if !MatchCookie("example.com", "/api/users", cookie) {
		t.Error("path /api should match /api/users")
	}

	if MatchCookie("example.com", "/other", cookie) {
		t.Error("path /api should not match /other")
	}
}

func TestMatchCookie_PathRoot(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: "example.com",
		Path:   "/",
	}

	if !MatchCookie("example.com", "/anything", cookie) {
		t.Error("path / should match anything")
	}
}

func TestMatchCookie_PathEmpty(t *testing.T) {
	cookie := &models.GlobalCookie{
		Name:   "session",
		Value:  "abc",
		Domain: "example.com",
		Path:   "",
	}

	if !MatchCookie("example.com", "/api", cookie) {
		t.Error("empty path should match anything")
	}
}

func TestFilterCookies(t *testing.T) {
	cookies := []models.GlobalCookie{
		{Name: "a", Domain: "example.com", Path: "/", Expires: time.Time{}},
		{Name: "b", Domain: "other.com", Path: "/", Expires: time.Time{}},
		{Name: "c", Domain: "example.com", Path: "/api", Expires: time.Time{}},
	}

	matched := FilterCookies("example.com", "/api/users", cookies)

	if len(matched) != 2 {
		t.Errorf("expected 2 matched cookies, got %d", len(matched))
	}

	names := make(map[string]bool)
	for _, c := range matched {
		names[c.Name] = true
	}

	if !names["a"] || !names["c"] {
		t.Errorf("expected cookies 'a' and 'c', got %v", names)
	}
}

func TestFilterCookies_AllExpired(t *testing.T) {
	cookies := []models.GlobalCookie{
		{Name: "a", Domain: "example.com", Path: "/", Expires: time.Now().Add(-1 * time.Hour)},
		{Name: "b", Domain: "example.com", Path: "/", Expires: time.Now().Add(-1 * time.Hour)},
	}

	matched := FilterCookies("example.com", "/", cookies)

	if len(matched) != 0 {
		t.Errorf("expected 0 matched cookies (all expired), got %d", len(matched))
	}
}
