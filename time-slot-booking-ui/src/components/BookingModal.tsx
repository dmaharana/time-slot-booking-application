import { useState } from 'react';
import type { Resource, TimeSlot, CreateBookingRequest } from '../types';
import { createBooking } from '../services/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar, Clock, DollarSign, Users, MapPin } from 'lucide-react';
import { Badge } from './ui/badge';
import { format, parseISO } from 'date-fns';
import { toast } from '../hooks/use-toast';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource;
  timeSlot: TimeSlot;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  resource,
  timeSlot,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'PPP p');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingRequest: CreateBookingRequest = {
        resource_id: resource.id,
        time_slot_id: timeSlot.id,
        notes: notes.trim() || undefined,
      };

      await createBooking(bookingRequest);
      
      toast({
        title: "Success!",
        description: "Your booking has been confirmed.",
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription>
            Please review your booking details before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resource Details */}
          <div className="space-y-3">
            <h4 className="font-semibold">Resource Details</h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{resource.name}</span>
                <Badge variant="secondary" className="ml-auto capitalize">
                  {resource.type}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{resource.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{resource.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>Capacity: {resource.capacity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Slot Details */}
          <div className="space-y-3">
            <h4 className="font-semibold">Time Slot</h4>
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="font-medium">
                  {formatDateTime(timeSlot.start_time)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">
                  {format(parseISO(timeSlot.start_time), 'HH:mm')} - {format(parseISO(timeSlot.end_time), 'HH:mm')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3 text-green-600" />
                  <span className="text-sm">Capacity: {timeSlot.capacity}</span>
                </div>
                {timeSlot.price && (
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    <span className="font-semibold">${timeSlot.price}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;