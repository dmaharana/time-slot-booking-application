import { useState, useEffect } from 'react';
import type { Resource, TimeSlot, Booking } from './types';
import { getResources, getAvailability, getBookings } from './services/api';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { toast } from './hooks/use-toast';
import { format, parseISO, addDays, startOfDay } from 'date-fns';
import BookingModal from './components/BookingModal';
import MyBookings from './components/MyBookings';
import AdminPanel from './components/AdminPanel';
import { Toaster } from './components/ui/toaster';

function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(startOfDay(new Date()), 'yyyy-MM-dd\'T\'HH:mm:ssXXX'));
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);

  // Load resources on component mount
  useEffect(() => {
    loadResources();
    loadMyBookings();
  }, []);

  // Load available slots when resource or date changes
  useEffect(() => {
    if (selectedResource) {
      loadAvailability();
    }
  }, [selectedResource, selectedDate]);

  const loadResources = async () => {
    try {
      const data = await getResources();
      setResources(data);
      if (data.length > 0 && !selectedResource) {
        setSelectedResource(data[0]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    }
  };

  const loadAvailability = async () => {
    if (!selectedResource) return;
    
    try {
      setLoading(true);
      const startDate = selectedDate;
      const endDate = format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd\'T\'HH:mm:ssXXX');
      const slots = await getAvailability(selectedResource.id, startDate, endDate);
      setAvailableSlots(slots.filter(slot => slot.is_available));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyBookings = async () => {
    try {
      const bookings = await getBookings();
      setMyBookings(bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const handleBookTimeSlot = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    setIsBookingModalOpen(false);
    setSelectedTimeSlot(null);
    loadMyBookings();
    loadAvailability(); // Refresh availability to show updated capacity
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

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'HH:mm');
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Time Slot Booking</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="book" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="book">Book Time Slot</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="admin">Admin Panel</TabsTrigger>
          </TabsList>

          <TabsContent value="book" className="space-y-6">
            {/* Resource Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Resource</CardTitle>
                <CardDescription>Choose a resource to view available time slots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resources.map((resource) => (
                    <Card
                      key={resource.id}
                      className={`cursor-pointer transition-all ${
                        selectedResource?.id === resource.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedResource(resource)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{getResourceIcon(resource.type)}</div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{resource.name}</h3>
                            <p className="text-sm text-gray-600 capitalize">{resource.type}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-4 w-4" />
                                <span>{resource.location}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>Capacity: {resource.capacity}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Date Selection */}
            {selectedResource && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Date</CardTitle>
                  <CardDescription>Choose a date to view available time slots</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <Input
                      type="datetime-local"
                      value={format(parseISO(selectedDate), "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => setSelectedDate(new Date(e.target.value).toISOString())}
                      className="w-auto"
                    />
                    <Badge variant="outline">
                      {formatDate(selectedDate)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Available Time Slots */}
            {selectedResource && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Available Time Slots - {selectedResource.name}
                  </CardTitle>
                  <CardDescription>
                    Select a time slot to book for {formatDate(selectedDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading availability...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No available time slots for this date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableSlots.map((slot) => (
                        <Card key={slot.id} className="border-l-4 border-l-green-500">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                  </span>
                                </div>
                                <Badge variant="secondary">Available</Badge>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>Capacity: {slot.capacity}</span>
                                {slot.price && (
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="h-3 w-3" />
                                    <span>{slot.price}</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                onClick={() => handleBookTimeSlot(slot)}
                                className="w-full"
                                size="sm"
                              >
                                Book Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <MyBookings bookings={myBookings} onBookingCancelled={loadMyBookings} />
          </TabsContent>

          <TabsContent value="admin">
            <AdminPanel resources={resources} onTimeSlotCreated={loadAvailability} />
          </TabsContent>
        </Tabs>

        {/* Booking Modal */}
        {selectedTimeSlot && selectedResource && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            resource={selectedResource}
            timeSlot={selectedTimeSlot}
            onSuccess={handleBookingSuccess}
          />
        )}
      </main>
      
      {/* Toast notifications */}
      <Toaster />
    </div>
  );
}

export default App;