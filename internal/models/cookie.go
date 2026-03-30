package models

import (
	"time"
)

// GlobalCookie 全局Cookie结构（存储 set-cookie 解析后的结果）
type GlobalCookie struct {
	ID       string    `json:"id"`       // 唯一标识
	Name     string    `json:"name"`     // cookie 名称
	Value    string    `json:"value"`    // cookie 值
	Domain   string    `json:"domain"`   // 域名（如 ".example.com" 或 "example.com"）
	Path     string    `json:"path"`     // 路径（如 "/" 或 "/api"）
	Expires  time.Time `json:"expires"`  // 过期时间，零值表示 session cookie
	HttpOnly bool      `json:"http_only"` // HttpOnly 标记
	Secure   bool      `json:"secure"`   // Secure 标记
	Creation time.Time `json:"creation"` // 创建时间
}
