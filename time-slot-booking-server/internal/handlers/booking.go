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

type BookingHandler struct {
	bookingService *services.BookingService
}

func NewBookingHandler(bookingService *services.BookingService) *BookingHandler {
	return &BookingHandler{bookingService: bookingService}
}

// @Summary Get user bookings
// @Description Retrieve all bookings for the current user
// @Tags bookings
// @Produce json
// @Success 200 {array} models.Booking
// @Router /api/bookings [get]
func (h *BookingHandler) GetUserBookings(w http.ResponseWriter, r *http.Request) {
	// TODO: Get user ID from authentication token
	// For now, using a placeholder UUID
	userID := uuid.New()

	bookings, err := h.bookingService.GetUserBookings(r.Context(), userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

// @Summary Create new booking
// @Description Create a new booking for a time slot
// @Tags bookings
// @Accept json
// @Produce json
// @Success 201 {object} models.Booking
// @Router /api/bookings [post]
func (h *BookingHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// TODO: Get user ID from authentication token
	// For now, using a placeholder UUID
	userID := uuid.New()

	booking, err := h.bookingService.Create(r.Context(), userID, req.ResourceID, req.TimeSlotID, req.Notes)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(booking)
}

// @Summary Get booking by ID
// @Description Retrieve a specific booking by its ID
// @Tags bookings
// @Produce json
// @Success 200 {object} models.Booking
// @Router /api/bookings/{id} [get]
func (h *BookingHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	id, err := uuid.Parse(bookingID)
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	booking, err := h.bookingService.GetByID(r.Context(), id)
	if err != nil {
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(booking)
}

// @Summary Cancel booking
// @Description Cancel a booking
// @Tags bookings
// @Success 204
// @Router /api/bookings/{id}/cancel [put]
func (h *BookingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	bookingID := chi.URLParam(r, "id")
	id, err := uuid.Parse(bookingID)
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	// TODO: Get user ID from authentication token
	// For now, using a placeholder UUID
	userID := uuid.New()

	err = h.bookingService.Cancel(r.Context(), id, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// @Summary Check booking conflicts
// @Description Check if there are conflicts for a proposed booking time
// @Tags bookings
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/bookings/check-conflicts [post]
func (h *BookingHandler) CheckConflicts(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ResourceID uuid.UUID `json:"resource_id"`
		StartTime  time.Time `json:"start_time"`
		EndTime    time.Time `json:"end_time"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	err := h.bookingService.CheckConflicts(r.Context(), req.ResourceID, req.StartTime, req.EndTime)

	response := map[string]interface{}{
		"has_conflicts": err != nil,
	}
	if err != nil {
		response["error"] = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
