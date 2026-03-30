package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	// Load config to determine theme before app starts
	cfg, err := app.service.LoadAppConfig()
	bgColor := &options.RGBA{R: 255, G: 255, B: 255, A: 255}
	if err == nil && cfg != nil && cfg.UI.Theme == "dark" {
		// Dark theme background
		bgColor = &options.RGBA{R: 36, G: 36, B: 36, A: 255}
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
