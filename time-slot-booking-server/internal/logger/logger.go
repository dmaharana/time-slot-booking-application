package logger

import (
	"io"
	"os"

	"github.com/rs/zerolog"
)

// Initialize the global logger
var Log *zerolog.Logger

func init() {
	output := io.Writer(os.Stdout)

	// Configure logger with caller information for better debugging
	logger := zerolog.New(output).
		With().
		Timestamp().
		Caller().
		Logger()

	// Set global log level from environment or default to info
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	Log = &logger
}

// With creates a new logger with additional context
func With() *zerolog.Event {
	return Log.Info()
}

// Error creates a new error log event
func Error() *zerolog.Event {
	return Log.Error()
}

// Debug creates a new debug log event
func Debug() *zerolog.Event {
	return Log.Debug()
}

// Warn creates a new warning log event
func Warn() *zerolog.Event {
	return Log.Warn()
}

// Fatal creates a new fatal log event and exits
func Fatal() *zerolog.Event {
	return Log.Fatal()
}

// Info creates a new info log event
func Info() *zerolog.Event {
	return Log.Info()
}

// SetLevel sets the global log level
func SetLevel(level string) {
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
