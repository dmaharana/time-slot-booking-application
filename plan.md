# Time Slot Booking Application - Implementation Plan

## Project Overview

### Core Use Cases
- **Doctor Appointments**: Multiple doctors with available time slots between start/end times
- **Sports Court Booking**: Badminton/tennis courts with operational hours and slot management  
- **Generic Time Slot System**: Flexible booking for any resource with time-based availability

### Technology Stack
- **Backend**: Golang with chi router and zerolog
- **Database**: PostgreSQL
- **Frontend**: React.js with shadcn/ui
- **Real-time**: WebSocket/SSE for live updates

## Implementation Phases

### Phase 1: Foundation Setup (Days 1-3)

#### 1.1 Project Structure
```
time-slot-booking/
├── backend/
│   ├── cmd/server/
│   ├── internal/
│   │   ├── config/
│   │   ├── db/
│   │   ├── handlers/
│   │   ├── models/
│   │   ├── services/
│   │   └── middleware/
│   └── migrations/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   └── public/
└── docker/
```

#### 1.2 Dependencies & Setup
- Initialize Go modules with chi, zerolog, pq (PostgreSQL driver)
- Set up React.js project with TypeScript and shadcn/ui
- Configure Docker for PostgreSQL development
- Set up environment configuration

### Phase 2: Database Design (Days 4-6)

#### 2.1 Schema Design

**Users Table**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'customer',
    phone VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Resources Table**
```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    type VARCHAR NOT NULL, -- 'doctor', 'court', 'facility'
    description TEXT,
    location VARCHAR,
    capacity INTEGER DEFAULT 1,
    operating_hours JSONB, -- {"monday": {"start": "09:00", "end": "17:00"}, ...}
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Time Slots Table**
```sql
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    capacity INTEGER DEFAULT 1,
    is_available BOOLEAN DEFAULT true,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
```

**Bookings Table**
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'confirmed', -- 'pending', 'confirmed', 'cancelled'
    notes TEXT,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_booking_per_slot CHECK (
        status IN ('pending', 'confirmed') 
    )
);
```

#### 2.2 Indexes
```sql
CREATE INDEX idx_time_slots_resource_time ON time_slots(resource_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_time_slot ON bookings(time_slot_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

### Phase 3: Backend Implementation (Days 7-12)

#### 3.1 API Structure

**Resource Management Endpoints**
```
GET    /api/resources              - List all resources
GET    /api/resources/{id}         - Get resource details
POST   /api/resources              - Create resource (admin)
PUT    /api/resources/{id}         - Update resource (admin)
DELETE /api/resources/{id}         - Delete resource (admin)
```

**Availability Endpoints**
```
GET    /api/resources/{id}/availability - Get available time slots
POST   /api/resources/{id}/availability - Create time slots (admin)
```

**Booking Endpoints**
```
GET    /api/bookings               - Get user bookings
POST   /api/bookings               - Create new booking
GET    /api/bookings/{id}          - Get booking details
PUT    /api/bookings/{id}/cancel   - Cancel booking
```

#### 3.2 Business Logic Components

**Booking Service**
- Time slot conflict detection
- Capacity validation
- Booking creation with transaction safety
- Automatic status updates

**Availability Service**
- Operating hours validation
- Blackout date handling
- Dynamic pricing support
- Bulk availability queries

**Validation Middleware**
- Request validation with go-playground/validator
- Authentication middleware
- Rate limiting
- CORS handling

#### 3.3 Key Implementation Details

**Conflict Detection**
```go
func (s *BookingService) CheckAvailability(resourceID uuid.UUID, start, end time.Time) error {
    // Query overlapping bookings
    // Check time slot capacity
    // Validate against operating hours
}
```

**Transaction Safety**
```go
func (s *BookingService) CreateBooking(ctx context.Context, booking *Booking) error {
    return s.db.WithTx(ctx, func(tx *sql.Tx) error {
        // Lock time slot row
        // Create booking
        // Update availability
    })
}
```

### Phase 4: Frontend Implementation (Days 13-18)

#### 4.1 Component Architecture

**Core Components**
- `ResourceCard`: Display resource information
- `TimeSlotPicker`: Interactive calendar/time selection
- `BookingForm`: User booking interface
- `BookingList`: User's booking history
- `AvailabilityCalendar`: Visual availability grid

**Layout Components**
- `Header`: Navigation and user menu
- `Sidebar`: Resource filtering and search
- `Dashboard`: Overview and quick actions

#### 4.2 Key Features

**Calendar Integration**
- Week/month view for time slot selection
- Real-time availability updates
- Color-coded status indicators
- Drag-and-drop booking creation

**User Experience**
- Responsive design for mobile/desktop
- Loading states and error handling
- Confirmation modals and notifications
- Search and filter functionality

#### 4.3 State Management
```typescript
// React Context for global state
interface AppState {
  user: User | null;
  resources: Resource[];
  bookings: Booking[];
  selectedResource: Resource | null;
}
```

### Phase 5: Real-time Features (Days 19-21)

#### 5.1 WebSocket Implementation
- Real-time availability updates
- Live booking notifications
- Multi-user conflict resolution
- Automatic UI refresh

#### 5.2 Event Types
```typescript
type BookingEvent = 
  | { type: 'booking_created', data: Booking }
  | { type: 'booking_cancelled', data: Booking }
  | { type: 'availability_updated', data: TimeSlot[] };
```

### Phase 6: Authentication & Security (Days 22-24)

#### 6.1 Authentication System
- JWT token-based authentication
- Role-based access control (admin, provider, customer)
- Session management
- Password hashing with bcrypt

#### 6.2 Security Features
- Input sanitization
- SQL injection prevention
- Rate limiting
- HTTPS enforcement
- CORS configuration

### Phase 7: Testing & Polish (Days 25-28)

#### 7.1 Testing Strategy
- Unit tests for business logic (>80% coverage)
- Integration tests for API endpoints
- Frontend component testing with React Testing Library
- E2E testing with Playwright
- Load testing for concurrency

#### 7.2 Performance Optimization
- Database query optimization
- Frontend bundle optimization
- Caching strategies (Redis for sessions)
- Image optimization and CDN setup

#### 7.3 Documentation
- API documentation with Swagger
- User manual and admin guide
- Deployment instructions
- Architecture diagrams

## Technical Considerations

### Time Zone Handling
- Store all timestamps in UTC
- Convert to user's local timezone for display
- Handle daylight saving time transitions
- Support multiple time zones for resources

### Concurrency & Locking
- Use database-level locks for booking creation
- Implement optimistic locking for updates
- Handle race conditions gracefully
- Prevent double-booking with constraints

### Scalability
- Horizontal scaling with load balancers
- Database read replicas for availability queries
- Caching layer (Redis) for frequently accessed data
- Microservices migration path

### Monitoring & Logging
- Structured logging with zerolog
- Performance metrics collection
- Health check endpoints
- Error tracking and alerting

## Deployment Strategy

### Development Environment
- Docker Compose for local development
- Hot reload for both frontend and backend
- Database seeding scripts
- Environment-specific configurations

### Production Environment
- Containerized deployment with Docker
- Reverse proxy with Nginx
- SSL/TLS termination
- Database migration automation
- Backup and recovery procedures

## Success Metrics

### Technical Metrics
- API response time < 200ms (95th percentile)
- 99.9% uptime
- Database query time < 100ms
- Frontend load time < 3 seconds

### Business Metrics
- Successful booking rate > 95%
- User registration conversion rate
- Average booking completion time
- Customer satisfaction score

This comprehensive plan provides a structured approach to building a robust, scalable time slot booking application that can handle various use cases while maintaining performance and reliability.
