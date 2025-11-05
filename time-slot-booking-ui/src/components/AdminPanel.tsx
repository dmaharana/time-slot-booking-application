import { useState } from 'react';
import type { Resource, CreateTimeSlotRequest } from '../types';
import { createTimeSlot } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Clock, Users, DollarSign, Plus } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from '../hooks/use-toast';

interface AdminPanelProps {
  resources: Resource[];
  onTimeSlotCreated: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ resources, onTimeSlotCreated }) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedResourceId || !startTime || !endTime) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const timeSlotData: CreateTimeSlotRequest = {
        start_time: startTime,
        end_time: endTime,
        capacity: capacity,
        price: price ? parseFloat(price) : undefined,
      };

      await createTimeSlot(selectedResourceId, timeSlotData);
      
      toast({
        title: "Success!",
        description: "Time slot has been created successfully.",
      });

      // Reset form
      setStartTime('');
      setEndTime('');
      setCapacity(1);
      setPrice('');
      
      onTimeSlotCreated();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create time slot",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Create Time Slot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create Time Slot</span>
          </CardTitle>
          <CardDescription>
            Create new available time slots for resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Resource Selection */}
            <div className="space-y-2">
              <Label htmlFor="resource">Select Resource *</Label>
              <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a resource to create time slot for" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      <div className="flex items-center space-x-2">
                        <span>{getResourceIcon(resource.type)}</span>
                        <span>{resource.name}</span>
                        <Badge variant="outline" className="ml-2 capitalize">
                          {resource.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedResource && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <span>{getResourceIcon(selectedResource.type)}</span>
                      <span className="font-medium">{selectedResource.name}</span>
                    </div>
                    <div className="text-gray-600">
                      {selectedResource.description}
                    </div>
                    <div className="flex items-center space-x-4 text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>📍</span>
                        <span>{selectedResource.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>Max Capacity: {selectedResource.capacity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Time Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time *</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(new Date(e.target.value).toISOString())}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time *</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(new Date(e.target.value).toISOString())}
                  required
                />
              </div>
            </div>

            {/* Capacity and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max={selectedResource?.capacity || 10}
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  required
                />
                {selectedResource && (
                  <p className="text-xs text-gray-500">
                    Resource maximum capacity: {selectedResource.capacity}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (Optional)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Preview */}
            {startTime && endTime && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>
                      {new Date(startTime).toLocaleDateString()} - {new Date(endTime).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span>
                      {new Date(startTime).toLocaleTimeString()} - {new Date(endTime).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Capacity: {capacity}</span>
                  </div>
                  {price && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span>Price: ${price}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !selectedResourceId || !startTime || !endTime}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Time Slot'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How to create time slots:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Select a resource from the dropdown</li>
              <li>Set the start and end times for the time slot</li>
              <li>Specify the capacity (number of people that can book)</li>
              <li>Optional: Set a price for the time slot</li>
              <li>Click "Create Time Slot" to make it available for booking</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Time slots must be created by admins before users can book them. 
              Each time slot represents a specific time period during which users can make reservations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;