package logger

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Test demonstrates different log levels with caller info
func Test() {
	Log.Info().
		Str("test_type", "logging_demo").
		Msg("This is an info log with file and line number")

	Log.Debug().
		Str("test_type", "debug_demo").
		Int("line", 15).
		Msg("Debug log - should not appear in production")

	Log.Warn().
		Str("test_type", "warning_demo").
		Str("context", "file_location_demonstration").
		Msg("Warning log showing file path and line number")

	Log.Error().
		Str("test_type", "error_demo").
		Str("error_code", "TEST_001").
		Msg("Error log with caller information")
}

// LogRequest demonstrates structured logging with request context
func LogRequest(method, url string, statusCode int, duration time.Duration) {
	Log.Info().
		Str("request_method", method).
		Str("request_url", url).
		Int("response_status", statusCode).
		Dur("response_duration", duration).
		Str("request_id", uuid.New().String()).
		Msg("Request processed")
}

// LogServiceCall demonstrates logging service interactions
func LogServiceCall(serviceName, operation string, err error) {
	event := Log.Info().Str("service", serviceName).Str("operation", operation)

	if err != nil {
		event.Str("status", "error").Err(err).Msg("Service call failed")
	} else {
		event.Str("status", "success").Msg("Service call completed")
	}
}

// LogBusinessEvent demonstrates business logic logging
func LogBusinessEvent(eventType, description string, metadata map[string]interface{}) {
	event := Log.Info().
		Str("event_type", eventType).
		Str("description", description)

	for key, value := range metadata {
		event.Interface(key, value)
	}

	event.Msg("Business event logged")
}

// DemoUsage shows how to use the logger throughout the application
func DemoUsage() {
	fmt.Println("=== Logger Usage Demo ===")

	// Basic logging with caller info
	Log.Info().
		Str("component", "demo").
		Msg("Basic info log with file:line")

	// Structured logging
	userID := uuid.New()
	resourceID := uuid.New()

	Log.Info().
		Str("event", "user_booking").
		Str("user_id", userID.String()).
		Str("resource_id", resourceID.String()).
		Int("capacity", 10).
		Bool("available", true).
		Msg("User attempted booking")

	// Error handling
	BookResource(resourceID, userID, "45m")

	// Business event
	metadata := map[string]interface{}{
		"user_name":     "John Doe",
		"resource_type": "tennis_court",
		"booking_time":  time.Now().Add(24 * time.Hour),
	}

	LogBusinessEvent("booking_created", "New tennis court booking", metadata)
}

// BookResource simulates a booking service call with proper logging
func BookResource(resourceID, userID uuid.UUID, duration string) {
	Log.Info().
		Str("function", "BookResource").
		Str("resource_id", resourceID.String()).
		Str("user_id", userID.String()).
		Str("duration", duration).
		Msg("Starting resource booking process")

	// Simulate some business logic
	time.Sleep(10 * time.Millisecond)

	// Simulate a potential error scenario
	if resourceID.String() == "" {
		Log.Error().
			Str("function", "BookResource").
			Str("error_type", "validation_error").
			Str("error_msg", "Invalid resource ID").
			Msg("Booking failed - validation error")
		return
	}

	// Success scenario
	Log.Info().
		Str("function", "BookResource").
		Str("status", "success").
		Str("booking_id", uuid.New().String()).
		Msg("Resource booking completed successfully")
}
