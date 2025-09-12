import React from 'react';
import { Clock } from 'lucide-react';

interface TimeSlot {
  time: string;
  available: boolean;
  centerId?: string;
  providerName?: string;
}

interface TimeSlotsProps {
  selectedDate: Date | null;
  timeSlots: TimeSlot[];
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  isLoading?: boolean;
}

export const TimeSlots: React.FC<TimeSlotsProps> = ({
  selectedDate,
  timeSlots,
  selectedTime,
  onTimeSelect,
  isLoading = false
}) => {
  // Don't render anything if no date is selected
  if (!selectedDate) {
    return null;
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeSlot = (time: string) => {
    // Assuming time comes in HH:MM format, convert to readable format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {formatDate(selectedDate)}
        </h3>
        <p className="text-sm text-gray-600">
          Select your preferred time
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* No Slots Available */}
      {!isLoading && timeSlots.length === 0 && (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No available times for this date</p>
        </div>
      )}

      {/* Time Slots */}
      {!isLoading && timeSlots.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {timeSlots.map((slot, index) => (
            <button
              key={index}
              onClick={() => slot.available && onTimeSelect(slot.time)}
              disabled={!slot.available}
              className={`
                w-full p-4 rounded-lg border text-left transition-colors
                ${selectedTime === slot.time
                  ? 'bg-[#C2A88F] text-white border-[#C2A88F]'
                  : slot.available
                    ? 'bg-white border-gray-200 hover:border-[#C2A88F] hover:bg-[#C2A88F]/5'
                    : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {formatTimeSlot(slot.time)}
                  </div>
                  {slot.providerName && (
                    <div className="text-sm opacity-75 mt-1">
                      with {slot.providerName}
                    </div>
                  )}
                </div>
                {slot.available && (
                  <Clock className="w-4 h-4 opacity-50" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};