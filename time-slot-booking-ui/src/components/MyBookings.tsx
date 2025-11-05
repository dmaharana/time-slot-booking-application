import type { Booking } from '../types';
import { cancelBooking } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Calendar, Clock, MapPin, Users, DollarSign, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '../hooks/use-toast';

interface MyBookingsProps {
  bookings: Booking[];
  onBookingCancelled: () => void;
}

const MyBookings: React.FC<MyBookingsProps> = ({ bookings, onBookingCancelled }) => {
  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'PPP p');
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'doctor':
        return '👨‍⚕️';
      case 'court':
        return '🏸';
      case 'facility':
        return '🏢';
      default:
        return '📍';
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
      });
      onBookingCancelled();
    } catch (error) {
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>View and manage your bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No bookings found</p>
            <p className="text-sm text-gray-500 mt-2">Start by booking a time slot from the main page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bookings</CardTitle>
        <CardDescription>View and manage your bookings ({bookings.length} total)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Resource Info */}
                    {booking.resource && (
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getResourceIcon(booking.resource.type)}</div>
                        <div>
                          <h3 className="font-semibold text-lg">{booking.resource.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{booking.resource.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>Capacity: {booking.resource.capacity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Time Slot Info */}
                    {booking.time_slot && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {formatDateTime(booking.time_slot.start_time)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {formatTime(booking.time_slot.start_time)} - {formatTime(booking.time_slot.end_time)}
                            </span>
                            {booking.time_slot.price && (
                              <div className="flex items-center space-x-1 ml-auto">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-semibold">${booking.time_slot.price}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking Details */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge variant={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                        {booking.total_amount && (
                          <span className="text-sm text-gray-600">
                            Total: ${booking.total_amount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        Booked on {formatDateTime(booking.created_at)}
                      </span>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm">
                          <span className="font-medium">Notes:</span> {booking.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {booking.status === 'confirmed' && (
                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MyBookings;