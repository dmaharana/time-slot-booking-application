import type { Resource, Booking, TimeSlot, CreateBookingRequest, CreateTimeSlotRequest } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Network error' }));
    throw new ApiError(response.status, errorData.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// Resources
export async function getResources(): Promise<Resource[]> {
  const response = await fetch(`${API_BASE_URL}/resources`);
  return handleResponse<Resource[]>(response);
}

export async function getResource(id: string): Promise<Resource> {
  const response = await fetch(`${API_BASE_URL}/resources/${id}`);
  return handleResponse<Resource>(response);
}

export async function createResource(data: Omit<Resource, 'id' | 'created_at' | 'updated_at'>): Promise<Resource> {
  const response = await fetch(`${API_BASE_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Resource>(response);
}

// Time Slots / Availability
export async function getAvailability(resourceId: string, startDate: string, endDate: string): Promise<TimeSlot[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  const response = await fetch(`${API_BASE_URL}/availability/${resourceId}?${params}`);
  const data = await handleResponse<{ time_slots: TimeSlot[] }>(response);
  return data.time_slots;
}

export async function createTimeSlot(resourceId: string, data: CreateTimeSlotRequest): Promise<TimeSlot> {
  const response = await fetch(`${API_BASE_URL}/availability/${resourceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<TimeSlot>(response);
}

export async function updateTimeSlotAvailability(timeSlotId: string, isAvailable: boolean): Promise<TimeSlot> {
  const response = await fetch(`${API_BASE_URL}/availability/slot/${timeSlotId}/availability`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_available: isAvailable }),
  });
  return handleResponse<TimeSlot>(response);
}

// Bookings
export async function getBookings(): Promise<Booking[]> {
  const response = await fetch(`${API_BASE_URL}/bookings`);
  return handleResponse<Booking[]>(response);
}

export async function createBooking(data: CreateBookingRequest): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Booking>(response);
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/cancel`, {
    method: 'PUT',
  });
  return handleResponse<Booking>(response);
}

export async function checkBookingConflicts(resourceId: string, startTime: string, endTime: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/bookings/check-conflicts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resource_id: resourceId,
      start_time: startTime,
      end_time: endTime,
    }),
  });
  const data = await handleResponse<{ has_conflicts: boolean }>(response);
  return data.has_conflicts;
}