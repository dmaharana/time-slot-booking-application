package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"time-slot-booking-server/internal/config"

	_ "github.com/lib/pq"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/extra/bundebug"
)

type DB struct {
	*bun.DB
}

func NewConnection() (*DB, error) {
	conn, err := sql.Open("postgres", config.AppConfig.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db := bun.NewDB(conn, pgdialect.New())

	// Add debug middleware for development
	db.AddQueryHook(bundebug.NewQueryHook(
		bundebug.WithVerbose(true),
	))

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &DB{DB: db}, nil
}

func (db *DB) Close() error {
	return db.DB.Close()
}

func (db *DB) CreateTables(ctx context.Context) error {
	// Create tables using bun migrations
	migrations := []func(context.Context, *bun.DB) error{
		createUsersTable,
		createResourcesTable,
		createTimeSlotsTable,
		createBookingsTable,
	}

	for _, migration := range migrations {
		if err := migration(ctx, db.DB); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

func createUsersTable(ctx context.Context, db *bun.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email VARCHAR UNIQUE NOT NULL,
			name VARCHAR NOT NULL,
			role VARCHAR NOT NULL DEFAULT 'customer',
			phone VARCHAR,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)
	`)
	return err
}

func createResourcesTable(ctx context.Context, db *bun.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS resources (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR NOT NULL,
			type VARCHAR NOT NULL,
			description TEXT,
			location VARCHAR,
			capacity INTEGER DEFAULT 1,
			operating_hours JSONB,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)
	`)
	return err
}

func createTimeSlotsTable(ctx context.Context, db *bun.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS time_slots (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
			start_time TIMESTAMP NOT NULL,
			end_time TIMESTAMP NOT NULL,
			capacity INTEGER DEFAULT 1,
			is_available BOOLEAN DEFAULT true,
			price DECIMAL(10,2),
			created_at TIMESTAMP DEFAULT NOW(),
			CONSTRAINT valid_time_range CHECK (end_time > start_time)
		)
	`)
	return err
}

func createBookingsTable(ctx context.Context, db *bun.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS bookings (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id) ON DELETE CASCADE,
			resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
			time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
			status VARCHAR DEFAULT 'confirmed',
			notes TEXT,
			total_amount DECIMAL(10,2),
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)
	`)
	return err
}

func (db *DB) CreateIndexes(ctx context.Context) error {
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_time_slots_resource_time ON time_slots(resource_id, start_time, end_time)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON bookings(time_slot_id)",
		"CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)",
	}

	for _, index := range indexes {
		_, err := db.ExecContext(ctx, index)
		if err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}
