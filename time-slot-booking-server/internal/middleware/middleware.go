package middleware

import (
	"net/http"
	"os"
	"time"

	"github.com/rs/zerolog"
)

var localLogger zerolog.Logger

func init() {
	// Initialize local logger with caller information
	localLogger = zerolog.New(os.Stdout).
		With().
		Timestamp().
		Caller().
		Logger()
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap response writer to capture status and size
		lw := &loggingResponseWriter{
			ResponseWriter: w,
			statusCode:     200,
		}

		// Process the request
		next.ServeHTTP(lw, r)

		// Calculate duration
		duration := time.Since(start)

		// Log the request with all details
		localLogger.Info().
			Str("method", r.Method).
			Str("url", r.URL.RequestURI()).
			Int("status", lw.statusCode).
			Int("size", lw.size).
			Str("ip", r.RemoteAddr).
			Str("user_agent", r.Header.Get("User-Agent")).
			Dur("duration", duration).
			Msg("HTTP Request")
	})
}

type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
	size       int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

func (lrw *loggingResponseWriter) Write(b []byte) (int, error) {
	size, err := lrw.ResponseWriter.Write(b)
	lrw.size += size
	return size, err
}

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				localLogger.Error().
					Str("error_type", "panic").
					Str("error_msg", "panic occurred").
					Interface("recover", r).
					Msg("Panic Recovery")

				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
