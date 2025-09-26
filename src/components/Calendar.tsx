import React, { useState, useEffect } from 'react';
import { useOptimizedSlots } from '../hooks/useOptimizedSlots';

interface CalendarProps {
  selectedServices: any[];
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string, slotInfo?: any) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

// Remove local AvailableSlots interface - now using the one from useOptimizedSlots

export const Calendar: React.FC<CalendarProps> = ({
  selectedServices,
  onDateSelect,
  onTimeSelect,
  selectedDate,
  selectedTime
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Use optimized slots hook (backend handles 28-day limit)
  const { 
    availableSlots, 
    loading
  } = useOptimizedSlots({ 
    selectedServices, 
    dateRange: 28 
  });

  // Debug: Log available slots data
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`📅 Calendar received availableSlots:`, {
        totalSlots: availableSlots.length,
        slotsWithAvailability: availableSlots.filter(s => s.hasSlots).length,
        availableDates: availableSlots.filter(s => s.hasSlots).map(s => s.date),
        sampleSlot: availableSlots.find(s => s.hasSlots),
        sampleSlotCenters: availableSlots.find(s => s.hasSlots)?.centers
      });
    }
  }, [availableSlots]);

  // Slots are now fetched automatically by useOptimizedSlots hook

  // Generate calendar days for monthly view
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next28Days = new Date(today);
    next28Days.setDate(today.getDate() + 28);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < today;
      const isWithinNext28Days = date >= today && date <= next28Days;
      
      const dateStr = date.toISOString().split('T')[0];
      const slotInfo = availableSlots.find(slot => slot.date === dateStr);
      const hasSlots = isWithinNext28Days ? (slotInfo?.hasSlots || false) : false;
      
      // Debug logging for date matching
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && (dateStr === '2025-09-30' || dateStr === '2025-10-01')) {
        console.log(`🔍 Date matching for ${dateStr}:`, {
          dateStr,
          slotInfo,
          hasSlots,
          isWithinNext28Days,
          availableSlotsDates: availableSlots.map(s => s.date),
          availableSlotsWithSlots: availableSlots.filter(s => s.hasSlots).map(s => s.date)
        });
      }
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isSelected,
        isPast,
        hasSlots
      });
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return; // Don't allow past dates
    onDateSelect(date);
  };

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: Date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    const slotInfo = availableSlots.find(slot => slot.date === dateStr);
    
    if (!slotInfo || !slotInfo.hasSlots) return [];
    
    // Extract time slots from the nested structure
    // The API response has slots under: slots_by_date[date].centers[].hourly_slots[].slots[]
    const timeSlots: any[] = [];
    
    if (slotInfo.centers && slotInfo.centers.length > 0) {
      slotInfo.centers.forEach(center => {
        if (center.hourly_slots) {
          center.hourly_slots.forEach((hourlySlot: any) => {
            if (hourlySlot.slots) {
              timeSlots.push(...hourlySlot.slots);
            }
          });
        }
      });
    }
    
    console.log(`🔍 Time slots for ${dateStr}:`, timeSlots);
    return timeSlots;
  };

  const timeSlotsForSelectedDate = selectedDate ? getTimeSlotsForDate(selectedDate) : [];

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];


  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row h-[auto] ">
        {/* Calendar Section */}
        <div className="bg-white lg:w-2/3 p-6 flex flex-col border border-[#C2A88F80] relative">
          
          

          {/* Calendar Navigation */}
          <div className={` w-full flex items-center justify-between mb-6 ${loading ? 'blur-sm' : ''}`}>
            <h3 className="text-xl font-semibold text-gray-900" style={{
              fontFamily: 'Work Sans',
              fontWeight: 600,
              fontSize: '20px',
              lineHeight: '137%',
              letterSpacing: '0%'
            }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className={`w-full grid grid-cols-7 gap-2 mb-4 ${loading ? 'blur-sm' : ''}`}>
            {dayNames.map(day => (
              <div key={day} className="text-center flex items-center justify-center" style={{
                fontFamily: 'Work Sans',
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '137%',
                letterSpacing: '0%',
                color: '#C5A88C',
                width: '40px',
                height: '40px'
              }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`w-full grid grid-cols-7 gap-2 ${loading ? 'blur-sm' : ''}`}>
            {generateCalendarDays().map((day, index) => (
              <button
                key={index}
                onClick={() => handleDateClick(day.date)}
                disabled={day.isPast || !day.isCurrentMonth}
                className={`
                  relative flex items-center justify-center
                  ${!day.isCurrentMonth 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : day.isPast 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : day.isSelected
                        ? 'text-white' // Selected date styling
                        : day.isToday
                          ? 'text-white' // Current date styling
                          : (day.hasSlots && day.isCurrentMonth && !day.isPast)
                            ? 'text-white hover:opacity-80 cursor-pointer' // Available slots styling
                            : 'text-gray-500 hover:bg-gray-100 cursor-pointer hover:text-gray-700'
                  }
                `}
                style={{
                  fontFamily: 'Work Sans',
                  fontWeight: 500,
                  fontSize: '16px',
                  letterSpacing: '0%',
                  width: (day.isToday || (day.hasSlots && day.isCurrentMonth && !day.isPast) || (day.isSelected && day.isCurrentMonth && !day.isPast)) ? '40px' : '40px',
                  height: (day.isToday || (day.hasSlots && day.isCurrentMonth && !day.isPast) || (day.isSelected && day.isCurrentMonth && !day.isPast)) ? '40px' : '40px',
                  borderRadius: (day.isToday || (day.hasSlots && day.isCurrentMonth && !day.isPast) || (day.isSelected && day.isCurrentMonth && !day.isPast)) ? '50%' : '8px',
                  backgroundColor: day.isSelected && day.isCurrentMonth && !day.isPast
                    ? '#C5A88C' // Light brown for selected (only if not disabled)
                    : day.isToday 
                      ? '#8B4513' // Dark brown for today
                      : (day.hasSlots && day.isCurrentMonth && !day.isPast) 
                        ? '#4CAF50' // Green for available slots
                        : 'transparent'
                }}
              >
                {day.date.getDate()}
              </button>
            ))}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C2A88F] mx-auto"></div>
                <p className="text-sm text-gray-600 mt-3">Loading available dates...</p>
              </div>
            </div>
          )}

          
        </div>

        {/* Time Slots Container */}
        <div className="bg-white lg:w-1/3 p-6 flex flex-col border border-[#C2A88F80] h-[449px]">
          {!selectedDate ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500" style={{
                  fontFamily: 'Work Sans',
                  fontWeight: 400,
                  fontSize: '16px',
                  lineHeight: '137%',
                  letterSpacing: '0%'
                }}>
                  Select a date to show time slots
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Date Header */}
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900" >
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </h3>
              </div>
              
              {/* Time Slots List */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {timeSlotsForSelectedDate.length > 0 ? (
                  <div className="space-y-3">
                    {timeSlotsForSelectedDate.map((slot, index) => {
                      // Debug: Log the slot structure to understand the data format
                      console.log('Time slot data:', slot);
                      
                      // Try different possible time properties
                      const timeValue = slot.time || slot.Time || slot.startTime || slot.start_time || slot.slotTime || slot.time_slot || 'No time';
                      
                      // Format time if it's an ISO string
                      const formatTime = (timeStr: string) => {
                        if (timeStr === 'No time') return timeStr;
                        
                        try {
                          // If it's an ISO string, format it
                          if (timeStr.includes('T') || timeStr.includes(':')) {
                            const date = new Date(timeStr);
                            return date.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          }
                          return timeStr;
                        } catch (e) {
                          return timeStr;
                        }
                      };
                      
                      const displayTime = formatTime(timeValue);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => onTimeSelect(timeValue, slot)}
                          className={`w-full p-3 text-center border transition-all duration-200 ${
                            selectedTime === timeValue
                              ? 'border-[#C2A88F80] bg-[#C2A88F] text-white'
                              : 'border-[#C2A88F80] bg-white text-gray-700 hover:bg-[#F5F1ED]'
                          }`}
                          style={{
                            fontFamily: 'Work Sans',
                            fontWeight: 500,
                            fontSize: '16px',
                            lineHeight: '137%',
                            letterSpacing: '0%'
                          }}
                        >
                          {displayTime}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No available time slots for this date</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        
      </div>
    </div>
  );
};