package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"users"`
	ID            uuid.UUID `json:"id" db:"id" bun:",pk,default:gen_random_uuid()"`
	Email         string    `json:"email" db:"email" bun:"email,notnull,unique"`
	Name          string    `json:"name" db:"name" bun:"name,notnull"`
	Role          string    `json:"role" db:"role" bun:"role,notnull,default:'customer'" validate:"oneof=admin provider customer"`
	Phone         string    `json:"phone" db:"phone" bun:"phone"`
	CreatedAt     time.Time `json:"created_at" db:"created_at" bun:"created_at,notnull,default:now()"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at" bun:"updated_at,notnull,default:now()"`
}

type Resource struct {
	bun.BaseModel  `bun:"resources"`
	ID             uuid.UUID              `json:"id" db:"id" bun:",pk,default:gen_random_uuid()"`
	Name           string                 `json:"name" db:"name" bun:"name,notnull"`
	Type           string                 `json:"type" db:"type" bun:"type,notnull" validate:"oneof=doctor court facility"`
	Description    string                 `json:"description" db:"description" bun:"description"`
	Location       string                 `json:"location" db:"location" bun:"location"`
	Capacity       int                    `json:"capacity" db:"capacity" bun:"capacity,notnull,default:1"`
	OperatingHours map[string]interface{} `json:"operating_hours" db:"operating_hours" bun:"operating_hours"`
	CreatedAt      time.Time              `json:"created_at" db:"created_at" bun:"created_at,notnull,default:now()"`
	UpdatedAt      time.Time              `json:"updated_at" db:"updated_at" bun:"updated_at,notnull,default:now()"`
}

type TimeSlot struct {
	bun.BaseModel `bun:"time_slots"`
	ID            uuid.UUID `json:"id" db:"id" bun:",pk,default:gen_random_uuid()"`
	ResourceID    uuid.UUID `json:"resource_id" db:"resource_id" bun:"resource_id,notnull" validate:"required"`
	StartTime     time.Time `json:"start_time" db:"start_time" bun:"start_time,notnull" validate:"required"`
	EndTime       time.Time `json:"end_time" db:"end_time" bun:"end_time,notnull" validate:"required"`
	Capacity      int       `json:"capacity" db:"capacity" bun:"capacity,notnull,default:1"`
	IsAvailable   bool      `json:"is_available" db:"is_available" bun:"is_available,notnull,default:true"`
	Price         *float64  `json:"price" db:"price" bun:"price"`
	CreatedAt     time.Time `json:"created_at" db:"created_at" bun:"created_at,notnull,default:now()"`
}

type Booking struct {
	bun.BaseModel `bun:"bookings"`
	ID            uuid.UUID `json:"id" db:"id" bun:",pk,default:gen_random_uuid()"`
	UserID        uuid.UUID `json:"user_id" db:"user_id" bun:"user_id,notnull" validate:"required"`
	ResourceID    uuid.UUID `json:"resource_id" db:"resource_id" bun:"resource_id,notnull" validate:"required"`
	TimeSlotID    uuid.UUID `json:"time_slot_id" db:"time_slot_id" bun:"time_slot_id,notnull" validate:"required"`
	Status        string    `json:"status" db:"status" bun:"status,notnull,default:'confirmed'" validate:"oneof=pending confirmed cancelled"`
	Notes         string    `json:"notes" db:"notes" bun:"notes"`
	TotalAmount   *float64  `json:"total_amount" db:"total_amount" bun:"total_amount"`
	CreatedAt     time.Time `json:"created_at" db:"created_at" bun:"created_at,notnull,default:now()"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at" bun:"updated_at,notnull,default:now()"`
}

// API Request/Response models
type CreateResourceRequest struct {
	Name           string                 `json:"name" validate:"required"`
	Type           string                 `json:"type" validate:"required,oneof=doctor court facility"`
	Description    string                 `json:"description"`
	Location       string                 `json:"location"`
	Capacity       int                    `json:"capacity" validate:"min=1"`
	OperatingHours map[string]interface{} `json:"operating_hours"`
}

type CreateBookingRequest struct {
	ResourceID uuid.UUID `json:"resource_id" validate:"required"`
	TimeSlotID uuid.UUID `json:"time_slot_id" validate:"required"`
	Notes      string    `json:"notes"`
}

type AvailabilityRequest struct {
	StartDate time.Time `json:"start_date" validate:"required"`
	EndDate   time.Time `json:"end_date" validate:"required"`
}

type AvailabilityResponse struct {
	TimeSlots []TimeSlot `json:"time_slots"`
}
