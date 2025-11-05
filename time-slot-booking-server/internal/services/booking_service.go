package services

import (
	"context"
	"fmt"
	"time"

	"time-slot-booking-server/internal/db"
	"time-slot-booking-server/internal/models"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type BookingService struct {
	db *db.DB
}

func NewBookingService(database *db.DB) *BookingService {
	return &BookingService{db: database}
}

func (s *BookingService) Create(ctx context.Context, userID, resourceID, timeSlotID uuid.UUID, notes string) (*models.Booking, error) {
	// Use a transaction to ensure data consistency
	err := s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Check if time slot exists and is available
		var timeSlot models.TimeSlot
		err := tx.NewSelect().
			Model(&timeSlot).
			Where("id = ?", timeSlotID).
			Where("resource_id = ?", resourceID).
			Where("is_available = ?", true).
			Scan(ctx)

		if err != nil {
			return fmt.Errorf("time slot not found or unavailable: %w", err)
		}

		// Check for overlapping bookings
		var existingBooking models.Booking
		err = tx.NewSelect().
			Model(&existingBooking).
			Where("time_slot_id = ?", timeSlotID).
			Where("status IN ('pending', 'confirmed')").
			Limit(1).
			Scan(ctx)

		if err == nil {
			return fmt.Errorf("time slot is already booked")
		}

		// Get current booking count for capacity check
		bookingCount, err := tx.NewSelect().
			Table("bookings").
			Where("time_slot_id = ?", timeSlotID).
			Where("status IN ('pending', 'confirmed')").
			Count(ctx)

		if err != nil {
			return fmt.Errorf("failed to check capacity: %w", err)
		}

		if bookingCount >= timeSlot.Capacity {
			return fmt.Errorf("time slot is at full capacity")
		}

		// Create the booking
		booking := &models.Booking{
			UserID:      userID,
			ResourceID:  resourceID,
			TimeSlotID:  timeSlotID,
			Status:      "confirmed",
			Notes:       notes,
			TotalAmount: timeSlot.Price,
		}

		_, err = tx.NewInsert().
			Model(booking).
			Exec(ctx)

		if err != nil {
			return fmt.Errorf("failed to create booking: %w", err)
		}

		// Update time slot availability if capacity reached
		if bookingCount+1 >= timeSlot.Capacity {
			_, err = tx.NewUpdate().
				Model((*models.TimeSlot)(nil)).
				Set("is_available = ?", false).
				Where("id = ?", timeSlotID).
				Exec(ctx)

			if err != nil {
				return fmt.Errorf("failed to update time slot availability: %w", err)
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Return the created booking
	var booking models.Booking
	err = s.db.NewSelect().
		Model(&booking).
		Where("user_id = ?", userID).
		Where("resource_id = ?", resourceID).
		Where("time_slot_id = ?", timeSlotID).
		Order("created_at DESC").
		Limit(1).
		Scan(ctx)

	return &booking, err
}

func (s *BookingService) GetUserBookings(ctx context.Context, userID uuid.UUID) ([]models.Booking, error) {
	bookings := make([]models.Booking, 0) // Initialize empty slice instead of var declaration

	err := s.db.NewSelect().
		Model(&bookings).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Scan(ctx)

	// For SELECT queries with multiple rows, "no rows in result set" means empty result
	// This is not an error condition, just return empty slice
	if err != nil && err.Error() == "sql: no rows in result set" {
		return bookings, nil
	}

	return bookings, err
}

func (s *BookingService) GetByID(ctx context.Context, bookingID uuid.UUID) (*models.Booking, error) {
	var booking models.Booking

	err := s.db.NewSelect().
		Model(&booking).
		Where("id = ?", bookingID).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return &booking, nil
}

func (s *BookingService) Cancel(ctx context.Context, bookingID uuid.UUID, userID uuid.UUID) error {
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		// Get booking details
		var booking models.Booking
		err := tx.NewSelect().
			Model(&booking).
			Where("id = ?", bookingID).
			Where("user_id = ?", userID).
			Scan(ctx)

		if err != nil {
			return fmt.Errorf("booking not found: %w", err)
		}

		// Update booking status
		_, err = tx.NewUpdate().
			Model(&booking).
			Set("status = ?", "cancelled").
			Set("updated_at = NOW()").
			Where("id = ?", bookingID).
			Exec(ctx)

		if err != nil {
			return fmt.Errorf("failed to cancel booking: %w", err)
		}

		// Re-enable time slot if capacity was reached
		var timeSlot models.TimeSlot
		err = tx.NewSelect().
			Model(&timeSlot).
			Where("id = ?", booking.TimeSlotID).
			Scan(ctx)

		if err == nil {
			// Check current booking count
			remainingBookings, err := tx.NewSelect().
				Table("bookings").
				Where("time_slot_id = ?", booking.TimeSlotID).
				Where("status IN ('pending', 'confirmed')").
				Count(ctx)

			if err == nil && remainingBookings < timeSlot.Capacity {
				// Re-enable the time slot
				_, err = tx.NewUpdate().
					Model((*models.TimeSlot)(nil)).
					Set("is_available = ?", true).
					Where("id = ?", booking.TimeSlotID).
					Exec(ctx)

				if err != nil {
					return fmt.Errorf("failed to update time slot availability: %w", err)
				}
			}
		}

		return nil
	})
}

func (s *BookingService) CheckConflicts(ctx context.Context, resourceID uuid.UUID, startTime, endTime time.Time) error {
	var conflicts []models.Booking

	// Find bookings that overlap with the requested time range
	err := s.db.NewSelect().
		Model(&conflicts).
		Where("resource_id = ?", resourceID).
		Where("status IN ('pending', 'confirmed')").
		Where("(start_time <= ? AND end_time > ?)", startTime, startTime).
		Where("(start_time < ? AND end_time >= ?)", endTime, endTime).
		Scan(ctx)

	if err == nil && len(conflicts) > 0 {
		return fmt.Errorf("time slot conflicts with existing bookings")
	}

	return nil
}
