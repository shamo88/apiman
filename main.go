package main

import (
	"embed"

	"apiman/internal/logger"
	"apiman/internal/mcp"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app, err := NewApp()
	if err != nil {
		println("Failed to create app:", err.Error())
		return
	}

	// Load config before initializing logger
	cfg, err := app.service.LoadAppConfig()

	// Initialize logger with log config
	if err := logger.Init(app.service.ConfigManager.GetConfigDir(), &cfg.Log); err != nil {
		println("Failed to initialize logger:", err.Error())
	}

	bgColor := &options.RGBA{R: 255, G: 255, B: 255, A: 255}
	if err == nil && cfg != nil && cfg.UI.Theme == "dark" {
		// Dark theme background
		bgColor = &options.RGBA{R: 36, G: 36, B: 36, A: 255}
	}

	// Auto-start MCP server if enabled
	if err == nil && cfg != nil && cfg.MCP.Enabled {
		// Initialize projects dir first
		_ = app.service.InitProjectsDir()
		// Create MCP server and start
		mcpServer = mcp.NewServer(app.service, &cfg.MCP)
		if err := mcpServer.Start(); err != nil {
			println("Failed to start MCP server:", err.Error())
		}
	}

	err = wails.Run(&options.App{
		Title:            "Apiman - API Management Tool",
		Width:            1280,
		Height:           800,
		MinWidth:         800,
		MinHeight:        600,
		Frameless:        true,
		BackgroundColour: bgColor,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			DisableWindowIcon:    false,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
