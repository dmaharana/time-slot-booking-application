export interface Resource {
  id: string;
  name: string;
  type: 'doctor' | 'court' | 'facility';
  description: string;
  location: string;
  capacity: number;
  operating_hours: {
    open: string;
    close: string;
  };
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  id: string;
  resource_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_available: boolean;
  price?: number;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  resource_id: string;
  time_slot_id: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  total_amount?: number;
  created_at: string;
  updated_at: string;
  // Populated fields
  resource?: Resource;
  time_slot?: TimeSlot;
}

export interface CreateBookingRequest {
  resource_id: string;
  time_slot_id: string;
  notes?: string;
}

export interface CreateTimeSlotRequest {
  start_time: string;
  end_time: string;
  capacity: number;
  price?: number;
}

export interface AvailabilityRequest {
  start_date: string;
  end_date: string;
}