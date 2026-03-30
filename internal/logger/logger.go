package logger

import (
	"log"
	"os"
	"path/filepath"

	"github.com/natefinch/lumberjack"
)

var (
	// Logger is the global logger instance
	Logger *log.Logger
)

// Init initializes the global logger with lumberjack for log rotation
func Init(configDir string) error {
	logsDir := filepath.Join(configDir, "logs")
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return err
	}

	logFile := filepath.Join(logsDir, "apiman.log")

	// Initialize lumberjack for log rotation
	lumberjackLogger := &lumberjack.Logger{
		Filename:   logFile,
		MaxSize:    100, // MB
		MaxBackups: 0,   // Keep all old logs (only truncate when MaxSize exceeded)
		Compress:   false,
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
