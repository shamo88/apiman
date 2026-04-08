package logger

import (
	"log"
	"os"
	"path/filepath"

	"apiman/internal/config"

	"github.com/natefinch/lumberjack"
)

var (
	// Logger is the global logger instance
	Logger *log.Logger
)

// Init initializes the global logger with lumberjack for log rotation
// If config is nil, uses default values (MaxSizeMB: 100, MaxBackups: 0, Compress: false)
func Init(configDir string, logConfig *config.LogConfig) error {
	logsDir := filepath.Join(configDir, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return err
	}

	logFile := filepath.Join(logsDir, "apiman.log")

	// Use config values or defaults
	maxSizeMB := 100
	maxBackups := 0
	compress := false
	if logConfig != nil {
		if logConfig.MaxSizeMB > 0 {
			maxSizeMB = logConfig.MaxSizeMB
		}
		maxBackups = logConfig.MaxBackups
		compress = logConfig.Compress
	}

	// Initialize lumberjack for log rotation
	lumberjackLogger := &lumberjack.Logger{
		Filename:   logFile,
		MaxSize:    maxSizeMB, // MB
		MaxBackups: maxBackups,
		Compress:   compress,
		LocalTime:  true,
	}

	// Set global logger to write to lumberjack
	Logger = log.New(lumberjackLogger, "", log.LstdFlags|log.Lshortfile)

	// Also set the standard library log to use our logger
	log.SetOutput(lumberjackLogger)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	return nil
}

// GetLogFilePath returns the current log file path
func GetLogFilePath(configDir string) string {
	return filepath.Join(configDir, "logs", "apiman.log")
}
