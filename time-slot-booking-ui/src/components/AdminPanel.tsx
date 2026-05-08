import { useState, useEffect } from 'react';
import type { Resource, TimeSlot, CreateTimeSlotRequest } from '../types';
import { createTimeSlot, createTimeSlotsBulk, deleteTimeSlot, getAvailability, type BulkTimeSlotRequest } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Clock, Users, DollarSign, Plus, Zap, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from '../hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { format, parseISO, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';

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

  const [existingSlots, setExistingSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSlots, setDeletingSlots] = useState(false);
  const [slotsToDelete, setSlotsToDelete] = useState<string[]>([]);

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  useEffect(() => {
    if (selectedResourceId) {
      loadExistingSlots(selectedResourceId);
      setSelectedSlots(new Set());
    } else {
      setExistingSlots([]);
      setSelectedSlots(new Set());
    }
  }, [selectedResourceId]);

  const loadExistingSlots = async (resourceId: string) => {
    setLoadingSlots(true);
    try {
      const startDate = format(new Date(), 'yyyy-MM-dd\'T\'HH:mm:ssXXX');
      const endDate = format(addDays(new Date(), 90), 'yyyy-MM-dd\'T\'HH:mm:ssXXX');
      const slots = await getAvailability(resourceId, startDate, endDate);
      setExistingSlots(slots);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load existing time slots",
        variant: "destructive",
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDeleteSingleSlot = (slotId: string) => {
    setSlotsToDelete([slotId]);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSelectedSlots = () => {
    if (selectedSlots.size === 0) return;
    setSlotsToDelete(Array.from(selectedSlots));
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSlots = async () => {
    setDeleteDialogOpen(false);
    setDeletingSlots(true);

    try {
      await Promise.all(slotsToDelete.map(id => deleteTimeSlot(id)));
      
      toast({
        title: "Success!",
        description: `${slotsToDelete.length} time slot(s) deleted successfully.`,
      });
      
      setSelectedSlots(new Set());
      if (selectedResourceId) {
        loadExistingSlots(selectedResourceId);
      }
      onTimeSlotCreated();
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete time slot(s)",
        variant: "destructive",
      });
    } finally {
      setDeletingSlots(false);
      setSlotsToDelete([]);
    }
  };

  const toggleSlotSelection = (slotId: string) => {
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(slotId)) {
      newSelected.delete(slotId);
    } else {
      newSelected.add(slotId);
    }
    setSelectedSlots(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSlots.size === existingSlots.length) {
      setSelectedSlots(new Set());
    } else {
      setSelectedSlots(new Set(existingSlots.map(slot => slot.id)));
    }
  };

  const [bulkStartTime, setBulkStartTime] = useState('');
  const [bulkDuration, setBulkDuration] = useState(60);
  const [bulkIncrement, setBulkIncrement] = useState(60);
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkCapacity, setBulkCapacity] = useState(1);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

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
        start_time: datetimeLocalToISO(startTime),
        end_time: datetimeLocalToISO(endTime),
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

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedResourceId || !bulkStartTime || bulkCount <= 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (bulkCount > 50) {
      toast({
        title: "Too Many Time Slots",
        description: "Maximum 50 time slots can be created at once",
        variant: "destructive",
      });
      return;
    }

    setBulkLoading(true);

    try {
      const bulkData: BulkTimeSlotRequest = {
        base_start_time: datetimeLocalToISO(bulkStartTime),
        duration: bulkDuration,
        increment: bulkIncrement,
        count: bulkCount,
        capacity: bulkCapacity,
        price: bulkPrice ? parseFloat(bulkPrice) : undefined,
      };

      await createTimeSlotsBulk(selectedResourceId, bulkData);
      
      toast({
        title: "Success!",
        description: `${bulkCount} time slots have been created successfully.`,
      });

      // Reset form
      setBulkStartTime('');
      setBulkDuration(60);
      setBulkIncrement(60);
      setBulkCount(1);
      setBulkCapacity(1);
      setBulkPrice('');
      
      onTimeSlotCreated();
    } catch (error) {
      toast({
        title: "Bulk Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create time slots",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
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

  const formatTimeDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Helper functions for datetime conversion
  const datetimeLocalToISO = (datetimeLocalValue: string): string => {
    if (!datetimeLocalValue) return '';
    // Convert YYYY-MM-DDTHH:mm to ISO format with UTC timezone
    return new Date(datetimeLocalValue).toISOString();
  };

  const getBulkPreview = () => {
    if (!bulkStartTime || bulkCount <= 0 || bulkDuration <= 0 || bulkIncrement <= 0) return null;
    
    const baseStart = new Date(bulkStartTime);
    const lastEnd = new Date(baseStart.getTime() + (bulkCount - 1) * bulkIncrement * 60000 + bulkDuration * 60000);
    
    return {
      firstSlot: {
        start: baseStart.toLocaleString(),
        end: new Date(baseStart.getTime() + bulkDuration * 60000).toLocaleTimeString()
      },
      lastSlot: {
        start: new Date(baseStart.getTime() + (bulkCount - 1) * bulkIncrement * 60000).toLocaleTimeString(),
        end: lastEnd.toLocaleTimeString()
      },
      totalRange: `${baseStart.toLocaleDateString()} - ${lastEnd.toLocaleDateString()}`
    };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Create Time Slots</span>
          </CardTitle>
          <CardDescription>
            Create new available time slots for resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single" className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Single Time Slot</span>
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Bulk Creation</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span>Manage Slots</span>
            </TabsTrigger>
          </TabsList>

            {/* Resource Selection - Common for both tabs */}
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

            {/* Single Time Slot Creation */}
            <TabsContent value="single">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Time Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time *</Label>
                    <Input
                      id="start-time"
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time *</Label>
                    <Input
                      id="end-time"
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
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
            </TabsContent>

            {/* Bulk Time Slot Creation */}
            <TabsContent value="bulk">
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {/* Bulk Creation Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-start-time">Start Time *</Label>
                    <Input
                      id="bulk-start-time"
                      type="datetime-local"
                      value={bulkStartTime}
                      onChange={(e) => setBulkStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-count">Number of Time Slots *</Label>
                    <Input
                      id="bulk-count"
                      type="number"
                      min="1"
                      max="50"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(parseInt(e.target.value))}
                      required
                    />
                    <p className="text-xs text-gray-500">Maximum 50 time slots at once</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-duration">Duration *</Label>
                    <Select value={bulkDuration.toString()} onValueChange={(value) => setBulkDuration(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-increment">Time Increment *</Label>
                    <Select value={bulkIncrement.toString()} onValueChange={(value) => setBulkIncrement(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">Every 15 minutes</SelectItem>
                        <SelectItem value="30">Every 30 minutes</SelectItem>
                        <SelectItem value="60">Every hour</SelectItem>
                        <SelectItem value="120">Every 2 hours</SelectItem>
                        <SelectItem value="180">Every 3 hours</SelectItem>
                        <SelectItem value="360">Every 6 hours</SelectItem>
                        <SelectItem value="720">Every 12 hours</SelectItem>
                        <SelectItem value="1440">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulk-capacity">Capacity *</Label>
                    <Input
                      id="bulk-capacity"
                      type="number"
                      min="1"
                      max={selectedResource?.capacity || 10}
                      value={bulkCapacity}
                      onChange={(e) => setBulkCapacity(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-price">Price (Optional)</Label>
                  <Input
                    id="bulk-price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                  />
                </div>

                {/* Bulk Preview */}
                {getBulkPreview() && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Bulk Creation Preview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span>Date Range: {getBulkPreview()?.totalRange}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span>Each slot: {formatTimeDuration(bulkDuration)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-green-600" />
                        <span>Increment: Every {formatTimeDuration(bulkIncrement)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-green-700">
                          First slot: {getBulkPreview()?.firstSlot.start} - {getBulkPreview()?.firstSlot.end}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-green-700">
                          Last slot: {getBulkPreview()?.lastSlot.start} - {getBulkPreview()?.lastSlot.end}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span>Capacity: {bulkCapacity}</span>
                        {bulkPrice && (
                          <div className="flex items-center space-x-1 ml-4">
                            <DollarSign className="h-3 w-3" />
                            <span>Price: ${bulkPrice}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-green-600 mt-2 p-2 bg-green-100 rounded">
                        <strong>Total: {bulkCount} time slots will be created</strong>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={bulkLoading || !selectedResourceId || !bulkStartTime || bulkCount <= 0}
                  className="w-full"
                >
                  {bulkLoading ? 'Creating Time Slots...' : `Create ${bulkCount} Time Slots`}
                </Button>
              </form>
            </TabsContent>

            {/* Manage Existing Slots */}
            <TabsContent value="manage">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-medium">Existing Time Slots</h3>
                    {selectedSlots.size > 0 && (
                      <Badge variant="secondary">
                        {selectedSlots.size} selected
                      </Badge>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {selectedSlots.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelectedSlots}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedSlots.size})
                      </Button>
                    )}
                    {selectedResourceId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadExistingSlots(selectedResourceId)}
                        disabled={loadingSlots}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loadingSlots ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    )}
                  </div>
                </div>

                {!selectedResourceId ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Select a resource to view and manage time slots</p>
                  </div>
                ) : loadingSlots ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading time slots...</p>
                  </div>
                ) : existingSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No time slots found for the next 90 days</p>
                    <p className="text-sm mt-1">Create some time slots using the other tabs</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={selectedSlots.size === existingSlots.length && existingSlots.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </div>
                    {existingSlots.map((slot) => (
                      <Card 
                        key={slot.id} 
                        className={`border-l-4 transition-all ${
                          selectedSlots.has(slot.id)
                            ? 'border-l-red-500 bg-red-50'
                            : 'border-l-blue-500'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <Checkbox
                                checked={selectedSlots.has(slot.id)}
                                onCheckedChange={() => toggleSlotSelection(slot.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-4 mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">
                                      {format(parseISO(slot.start_time), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-gray-500" />
                                    <span>
                                      {format(parseISO(slot.start_time), 'HH:mm')} - {format(parseISO(slot.end_time), 'HH:mm')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <Users className="h-3 w-3" />
                                    <span>Capacity: {slot.capacity}</span>
                                  </div>
                                  <Badge variant={slot.is_available ? "secondary" : "destructive"}>
                                    {slot.is_available ? 'Available' : 'Unavailable'}
                                  </Badge>
                                  {slot.price && (
                                    <div className="flex items-center space-x-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>${slot.price.toFixed(2)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSingleSlot(slot.id)}
                              className="ml-4"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>Confirm Deletion</span>
            </DialogTitle>
            <DialogDescription>
              {slotsToDelete.length === 1
                ? 'Are you sure you want to delete this time slot? This action cannot be undone and will remove the slot permanently.'
                : `Are you sure you want to delete ${slotsToDelete.length} time slots? This action cannot be undone and will remove all selected slots permanently.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingSlots}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSlots}
              disabled={deletingSlots}
            >
              {deletingSlots ? 'Deleting...' : `Delete ${slotsToDelete.length === 1 ? 'Slot' : `${slotsToDelete.length} Slots`}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">How to create time slots:</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-2">Single Creation:</h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Select a resource</li>
                  <li>Set start and end times</li>
                  <li>Specify capacity and price</li>
                  <li>Click "Create Time Slot"</li>
                </ol>
              </div>
              <div>
                <h5 className="font-medium text-sm text-gray-700 mb-2">Bulk Creation:</h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Select a resource</li>
                  <li>Set start time and number of slots</li>
                  <li>Choose duration and increment</li>
                  <li>Set capacity and price (optional)</li>
                  <li>Preview and create all slots</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Time slots must be created by admins before users can book them. 
              Use bulk creation to efficiently generate multiple recurring time slots (e.g., weekly appointments).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;