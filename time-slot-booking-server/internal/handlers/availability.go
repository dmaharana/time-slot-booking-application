package handlers

import (
	"encoding/json"
	"net/http"
	"time"
	"time-slot-booking-server/internal/models"
	"time-slot-booking-server/internal/services"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type AvailabilityHandler struct {
	timeSlotService *services.TimeSlotService
}

func NewAvailabilityHandler(timeSlotService *services.TimeSlotService) *AvailabilityHandler {
	return &AvailabilityHandler{timeSlotService: timeSlotService}
}

// @Summary Get availability for a resource
// @Description Get available time slots for a resource within a date range
// @Tags availability
// @Produce json
// @Success 200 {object} models.AvailabilityResponse
// @Router /api/availability/{id} [get]
func (h *AvailabilityHandler) GetAvailability(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	// Parse query parameters for date range
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	if startDateStr == "" || endDateStr == "" {
		http.Error(w, "start_date and end_date query parameters are required", http.StatusBadRequest)
		return
	}

	startDate, err := time.Parse(time.RFC3339, startDateStr)
	if err != nil {
		http.Error(w, "Invalid start_date format. Use RFC3339", http.StatusBadRequest)
		return
	}

	endDate, err := time.Parse(time.RFC3339, endDateStr)
	if err != nil {
		http.Error(w, "Invalid end_date format. Use RFC3339", http.StatusBadRequest)
		return
	}

	timeSlots, err := h.timeSlotService.GetAvailable(r.Context(), id, startDate, endDate)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := &models.AvailabilityResponse{
		TimeSlots: timeSlots,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// @Summary Create time slot
// @Description Create a new time slot for a resource (admin only)
// @Tags availability
// @Accept json
// @Produce json
// @Success 201 {object} models.TimeSlot
// @Router /api/availability/{id} [post]
func (h *AvailabilityHandler) CreateTimeSlot(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	var req struct {
		StartTime time.Time `json:"start_time"`
		EndTime   time.Time `json:"end_time"`
		Capacity  int       `json:"capacity"`
		Price     *float64  `json:"price"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	timeSlot, err := h.timeSlotService.Create(r.Context(), id, req.StartTime, req.EndTime, req.Capacity, req.Price)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(timeSlot)
}

// @Summary Create time slots in bulk
// @Description Create multiple time slots with time increment options (admin only)
// @Tags availability
// @Accept json
// @Produce json
// @Success 201 {object} models.TimeSlotListResponse
// @Router /api/availability/{id}/bulk [post]
func (h *AvailabilityHandler) CreateTimeSlotsBulk(w http.ResponseWriter, r *http.Request) {
	resourceID := chi.URLParam(r, "id")
	id, err := uuid.Parse(resourceID)
	if err != nil {
		http.Error(w, "Invalid resource ID", http.StatusBadRequest)
		return
	}

	var req struct {
		BaseStartTime time.Time `json:"base_start_time"`
		Duration      int       `json:"duration"`  // Duration in minutes
		Increment     int       `json:"increment"` // Increment between slots in minutes
		Count         int       `json:"count"`     // Number of time slots to create
		Capacity      int       `json:"capacity"`
		Price         *float64  `json:"price"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Count <= 0 || req.Count > 50 {
		http.Error(w, "Count must be between 1 and 50", http.StatusBadRequest)
		return
	}
	if req.Duration <= 0 {
		http.Error(w, "Duration must be greater than 0", http.StatusBadRequest)
		return
	}
	if req.Increment <= 0 {
		http.Error(w, "Increment must be greater than 0", http.StatusBadRequest)
		return
	}

	duration := time.Duration(req.Duration) * time.Minute
	increment := time.Duration(req.Increment) * time.Minute

	timeSlots, err := h.timeSlotService.CreateBulk(r.Context(), id, req.BaseStartTime, duration, increment, req.Count, req.Capacity, req.Price)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(models.TimeSlotListResponse{TimeSlots: timeSlots})
}

// @Summary Update time slot availability
// @Description Update the availability status of a time slot (admin only)
// @Tags availability
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/availability/slot/{id}/availability [put]
func (h *AvailabilityHandler) UpdateAvailability(w http.ResponseWriter, r *http.Request) {
	timeSlotID := chi.URLParam(r, "id")
	id, err := uuid.Parse(timeSlotID)
	if err != nil {
		http.Error(w, "Invalid time slot ID", http.StatusBadRequest)
		return
	}

	var req struct {
		IsAvailable bool `json:"is_available"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	err = h.timeSlotService.UpdateAvailability(r.Context(), id, req.IsAvailable)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Availability updated successfully",
	})
}

// @Summary Delete time slot
// @Description Delete a time slot (admin only)
// @Tags availability
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/availability/slot/{id} [delete]
func (h *AvailabilityHandler) DeleteTimeSlot(w http.ResponseWriter, r *http.Request) {
	timeSlotID := chi.URLParam(r, "id")
	id, err := uuid.Parse(timeSlotID)
	if err != nil {
		http.Error(w, "Invalid time slot ID", http.StatusBadRequest)
		return
	}

	err = h.timeSlotService.Delete(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Time slot deleted successfully",
	})
}
