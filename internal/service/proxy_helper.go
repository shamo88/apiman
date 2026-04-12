package service

import (
	"apiman/internal/config"
	"apiman/internal/curl"
)

// buildProxyOptions 是一个辅助函数，从 AppConfig 构建代理选项
// 避免在多个地方重复相同的配置构建代码
func buildProxyOptions(appCfg *config.AppConfig) *curl.ProxyOptions {
	if appCfg == nil {
		return &curl.ProxyOptions{}
	}
	return &curl.ProxyOptions{
		Enabled:    appCfg.Proxy.Enabled,
		HTTPHost:   appCfg.Proxy.HTTPHost,
		HTTPPort:   appCfg.Proxy.HTTPPort,
		HTTPSHost:  appCfg.Proxy.HTTPSHost,
		HTTPSPort:  appCfg.Proxy.HTTPSPort,
		SOCKS5Host: appCfg.Proxy.SOCKS5Host,
		SOCKS5Port: appCfg.Proxy.SOCKS5Port,
	}
}

// getTimeout 是一个辅助函数，从 AppConfig 获取超时时间
func getTimeout(appCfg *config.AppConfig) int {
	timeout := 30
	if appCfg != nil && appCfg.HTTP.Timeout > 0 {
		timeout = appCfg.HTTP.Timeout
	}
	return timeout
}
