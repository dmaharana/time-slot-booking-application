package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"time-slot-booking-server/internal/logger"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// @Summary Health check
// @Description Health check endpoint for monitoring
// @Tags health
// @Produce json
// @Success 200 {object} HealthResponse
// @Router /health [get]
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	// Log the health check request with file and line info
	logger.Info().
		Str("endpoint", "/health").
		Str("handler", "HealthHandler.Health").
		Msg("Health check requested")

	response := &HealthResponse{
		Status:    "ok",
		Timestamp: time.Now().Format(time.RFC3339),
		Service:   "time-slot-booking-server",
		Version:   "1.0.0",
		RequestID: uuid.New().String(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// HealthResponse represents the health check response
type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Service   string `json:"service"`
	Version   string `json:"version"`
	RequestID string `json:"request_id"`
}

// @Summary Debug test
// @Description Test endpoint to demonstrate logging with caller info
// @Tags health
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /debug [get]
func (h *HealthHandler) Debug(w http.ResponseWriter, r *http.Request) {
	// This will demonstrate different log levels with file and line info
	logger.Debug().
		Str("function", "Debug").
		Msg("Debug log with caller info - this should not appear in production")

	logger.Info().
		Str("function", "Debug").
		Str("message", "Info log with caller info").
		Int("response_code", 200).
		Msg("This endpoint demonstrates logging with file and line numbers")

	// Simulate some processing to test timing logs
	// This would show file/line info in the logs
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":   "Debug endpoint - check logs for file:line info",
		"status":    "success",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
