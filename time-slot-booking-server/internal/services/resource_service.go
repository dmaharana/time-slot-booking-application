package services

import (
	"context"
	"time"

	"time-slot-booking-server/internal/db"
	"time-slot-booking-server/internal/models"

	"github.com/google/uuid"
)

type ResourceService struct {
	db *db.DB
}

func NewResourceService(database *db.DB) *ResourceService {
	return &ResourceService{db: database}
}

func (s *ResourceService) GetAll(ctx context.Context) ([]models.Resource, error) {
	var resources []models.Resource

	err := s.db.NewSelect().
		Model(&resources).
		Order("created_at DESC").
		Scan(ctx)

	return resources, err
}

func (s *ResourceService) GetByID(ctx context.Context, id uuid.UUID) (*models.Resource, error) {
	var resource models.Resource

	err := s.db.NewSelect().
		Model(&resource).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return &resource, nil
}

func (s *ResourceService) Create(ctx context.Context, req *models.CreateResourceRequest) (*models.Resource, error) {
	resource := &models.Resource{
		Name:           req.Name,
		Type:           req.Type,
		Description:    req.Description,
		Location:       req.Location,
		Capacity:       req.Capacity,
		OperatingHours: req.OperatingHours,
	}

	_, err := s.db.NewInsert().
		Model(resource).
		Exec(ctx)

	return resource, err
}

func (s *ResourceService) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) (*models.Resource, error) {
	// First, fetch the existing resource to make sure it exists
	var resource models.Resource
	err := s.db.NewSelect().
		Model(&resource).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	// Build the update query using the updates map
	updateQuery := s.db.NewUpdate().
		Model((*models.Resource)(nil)).
		Where("id = ?", id)

	// Apply updates based on the map with safe type assertions
	if name, ok := updates["name"]; ok {
		if nameStr, ok := name.(string); ok {
			updateQuery = updateQuery.Set("name = ?", nameStr)
		}
	}
	if resourceType, ok := updates["type"]; ok {
		if typeStr, ok := resourceType.(string); ok {
			updateQuery = updateQuery.Set("type = ?", typeStr)
		}
	}
	if description, ok := updates["description"]; ok {
		if descStr, ok := description.(string); ok {
			updateQuery = updateQuery.Set("description = ?", descStr)
		}
	}
	if location, ok := updates["location"]; ok {
		if locStr, ok := location.(string); ok {
			updateQuery = updateQuery.Set("location = ?", locStr)
		}
	}
	if capacity, ok := updates["capacity"]; ok {
		if cap, ok := capacity.(float64); ok { // JSON numbers are float64 by default
			updateQuery = updateQuery.Set("capacity = ?", int(cap))
		}
	}
	if operatingHours, ok := updates["operating_hours"]; ok {
		if opHours, ok := operatingHours.(map[string]interface{}); ok {
			updateQuery = updateQuery.Set("operating_hours = ?", opHours)
		}
	}

	updateQuery = updateQuery.Set("updated_at = NOW()")

	// Execute the update
	_, err = updateQuery.Exec(ctx)
	if err != nil {
		return nil, err
	}

	// Fetch the updated resource again to return the latest data
	var updatedResource models.Resource
	err = s.db.NewSelect().
		Model(&updatedResource).
		Where("id = ?", id).
		Scan(ctx)

	if err != nil {
		return nil, err
	}

	return &updatedResource, nil
}

func (s *ResourceService) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := s.db.NewDelete().
		Model((*models.Resource)(nil)).
		Where("id = ?", id).
		Exec(ctx)

	return err
}

func (s *ResourceService) GetByType(ctx context.Context, resourceType string) ([]models.Resource, error) {
	var resources []models.Resource

	err := s.db.NewSelect().
		Model(&resources).
		Where("type = ?", resourceType).
		Order("name ASC").
		Scan(ctx)

	return resources, err
}

type TimeSlotService struct {
	db *db.DB
}

func NewTimeSlotService(database *db.DB) *TimeSlotService {
	return &TimeSlotService{db: database}
}

func (s *TimeSlotService) GetAvailable(ctx context.Context, resourceID uuid.UUID, startDate, endDate time.Time) ([]models.TimeSlot, error) {
	var timeSlots []models.TimeSlot

	query := s.db.NewSelect().
		Model(&timeSlots).
		Where("resource_id = ?", resourceID).
		Where("is_available = ?", true).
		Where("start_time >= ?", startDate).
		Where("end_time <= ?", endDate).
		Order("start_time ASC")

	// Add capacity check
	query = query.Where("(capacity - COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.time_slot_id = time_slots.id AND b.status IN ('pending', 'confirmed')), 0)) > 0")

	err := query.Scan(ctx)

	return timeSlots, err
}

func (s *TimeSlotService) Create(ctx context.Context, resourceID uuid.UUID, startTime, endTime time.Time, capacity int, price *float64) (*models.TimeSlot, error) {
	timeSlot := &models.TimeSlot{
		ResourceID:  resourceID,
		StartTime:   startTime,
		EndTime:     endTime,
		Capacity:    capacity,
		IsAvailable: true,
		Price:       price,
	}

	_, err := s.db.NewInsert().
		Model(timeSlot).
		Exec(ctx)

	return timeSlot, err
}

func (s *TimeSlotService) UpdateAvailability(ctx context.Context, id uuid.UUID, isAvailable bool) error {
	_, err := s.db.NewUpdate().
		Model((*models.TimeSlot)(nil)).
		Set("is_available = ?", isAvailable).
		Where("id = ?", id).
		Exec(ctx)

	return err
}
