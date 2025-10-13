import React, { useState, useEffect } from 'react';
import type { AvailableSlots } from '../hooks/useOptimizedSlots';
import type { CalendarSlot } from '../types/slots';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string, slotInfo?: any) => void;
  selectedDate?: Date;
  selectedTime?: string;
  isLoading?: boolean;
  availableSlots?: AvailableSlots[];
  availableDatesCount?: number;
  futureDaysCount?: number;
}

interface ResolvedTimeSlot {
  slot: CalendarSlot;
  rawTime: string;
  displayTime: string;
  comparableValue: number;
}

// Remove local AvailableSlots interface - now using the one from useOptimizedSlots

export const Calendar: React.FC<CalendarProps> = ({
  onDateSelect,
  onTimeSelect,
  selectedDate,
  selectedTime,
  isLoading = false,
  availableSlots = [],
  availableDatesCount = 0,
  futureDaysCount = 0
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Debug: Log available slots data
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`📅 Calendar received availableSlots:`, {
        totalSlots: availableSlots.length,
        slotsWithAvailability: availableSlots.filter(s => s.hasSlots).length,
        availableDates: availableSlots.filter(s => s.hasSlots).map(s => s.date),
        sampleSlot: availableSlots.find(s => s.hasSlots),
        sampleSlotCenters: availableSlots.find(s => s.hasSlots)?.centers,
        availableDatesCount,
        futureDaysCount
      });
      
      // Check each available slot in detail
      availableSlots.forEach((slot, index) => {
        if (index < 5) { // Log first 5 for better debugging
          console.log(`🔍 Slot ${index}:`, {
            date: slot.date,
            hasSlots: slot.hasSlots,
            slotsCount: slot.slotsCount,
            centers: slot.centers?.length || 0,
            slots: slot.slots?.length || 0,
            fullSlot: slot
          });
        }
      });
      
      // Log any slots with issues
      const problematicSlots = availableSlots.filter(slot => 
        slot.hasSlots && (!slot.slots || slot.slots.length === 0) && (!slot.centers || slot.centers.length === 0)
      );
      if (problematicSlots.length > 0) {
        console.warn('⚠️ Found slots marked as available but with no actual slot data:', problematicSlots);
      }
    }
  }, [availableSlots, availableDatesCount, futureDaysCount]);

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
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < today;
      
      const dateStr = date.toISOString().split('T')[0];
      const slotInfo = availableSlots.find(slot => slot.date === dateStr);
      
      // More robust slot detection - check both existence and hasSlots property
      const hasSlots = slotInfo ? (slotInfo.hasSlots === true) : false;
      
      // Use the original logic but with better validation
      // If slotInfo exists and hasSlots is true, consider it valid
      const hasValidSlots = hasSlots;
      
      // Debug logging for date matching - check all dates in current month
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && isCurrentMonth && !isPast) {
        console.log(`🔍 Date matching for ${dateStr}:`, {
          dateStr,
          slotInfo,
          hasSlots,
          isCurrentMonth,
          isPast,
          willShowGreen: (hasSlots && isCurrentMonth && !isPast),
          availableSlotsDates: availableSlots.map(s => s.date),
          availableSlotsWithSlots: availableSlots.filter(s => s.hasSlots).map(s => s.date),
          note: 'API now only returns available dates, so slotInfo existence indicates availability'
        });
      }
      
      // Additional debug for any date with slots
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && slotInfo && slotInfo.hasSlots) {
        console.log(`🟢 Found slots for ${dateStr}:`, {
          dateStr,
          slotInfo,
          hasSlots,
          isCurrentMonth,
          isPast,
          willShowGreen: (hasSlots && isCurrentMonth && !isPast)
        });
      }
      
      days.push({
        date,
        isCurrentMonth,
        isToday,
        isSelected,
        isPast,
        hasSlots: hasValidSlots // Use the more robust validation
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

  const FALLBACK_TIME_KEYS = ['Time', 'startTime', 'start_time', 'slotTime', 'time_slot'] as const;

  const getRawTimeValue = (slot: CalendarSlot): string | undefined => {
    if (typeof slot.time === 'string' && slot.time.trim().length > 0) {
      return slot.time;
    }

    for (const key of FALLBACK_TIME_KEYS) {
      const value = slot[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  };

  const parseTimeString = (timeStr: string, referenceDate: Date): Date | null => {
    const trimmed = typeof timeStr === 'string' ? timeStr.trim() : '';
    if (!trimmed) {
      return null;
    }

    const parsedIso = Date.parse(trimmed);
    if (!Number.isNaN(parsedIso)) {
      return new Date(parsedIso);
    }

    const timePattern = /^\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\s*$/i;
    const match = trimmed.match(timePattern);

    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();

      if (meridiem === 'PM' && hours < 12) {
        hours += 12;
      } else if (meridiem === 'AM' && hours === 12) {
        hours = 0;
      }

      const comparableDate = new Date(referenceDate);
      comparableDate.setHours(hours, minutes, 0, 0);
      return comparableDate;
    }

    return null;
  };

  const createTimeKey = (timeStr: string, referenceDate: Date) => {
    const parsed = parseTimeString(timeStr, referenceDate);
    if (parsed) {
      const minutes = parsed.getHours() * 60 + parsed.getMinutes();
      return `minutes:${minutes}`;
    }
    return `raw:${timeStr}`;
  };

  const formatDisplayTime = (rawTime: string, parsed: Date | null) => {
    if (!rawTime || rawTime === 'No time') {
      return 'No time';
    }

    if (parsed) {
      return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return rawTime;
  };

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: Date): ResolvedTimeSlot[] => {
    if (!date) return [];

    const dateStr = date.toISOString().split('T')[0];
    const slotInfo = availableSlots.find(slot => slot.date === dateStr);

    if (!slotInfo || !slotInfo.hasSlots) return [];

    const timeSlots: CalendarSlot[] = [];

    if (slotInfo.centers && slotInfo.centers.length > 0) {
      slotInfo.centers.forEach(center => {
        if (center.slots) {
          timeSlots.push(...center.slots);
        }
      });
    }

    const dedupedByTime = new Map<string, { slot: CalendarSlot; rawTime: string; parsed: Date | null }>();
    let fallbackIndex = 0;

    timeSlots.forEach(slot => {
      const rawTime = getRawTimeValue(slot);
      const parsed = rawTime ? parseTimeString(rawTime, date) : null;
      const key = rawTime ? createTimeKey(rawTime, date) : `idx:${fallbackIndex++}`;
      const existing = dedupedByTime.get(key);

      if (!existing) {
        dedupedByTime.set(key, {
          slot,
          rawTime: rawTime ?? 'No time',
          parsed
        });
        return;
      }

      const existingPriority = existing.slot.priority ?? Number.MAX_SAFE_INTEGER;
      const currentPriority = slot.priority ?? Number.MAX_SAFE_INTEGER;

      if (currentPriority < existingPriority) {
        dedupedByTime.set(key, {
          slot,
          rawTime: rawTime ?? 'No time',
          parsed
        });
        return;
      }

      if (currentPriority === existingPriority) {
        const existingCount = existing.slot.count ?? 0;
        const currentCount = slot.count ?? 0;
        if (currentCount > existingCount) {
          dedupedByTime.set(key, {
            slot,
            rawTime: rawTime ?? 'No time',
            parsed
          });
        }
      }
    });

    return [...dedupedByTime.values()]
      .sort((a, b) => {
        const comparison = (a.parsed?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.parsed?.getTime() ?? Number.MAX_SAFE_INTEGER);
        if (comparison !== 0) {
          return comparison;
        }
        return a.rawTime.localeCompare(b.rawTime);
      })
      .map(entry => ({
        slot: entry.slot,
        rawTime: entry.rawTime,
        displayTime: formatDisplayTime(entry.rawTime, entry.parsed),
        comparableValue: entry.parsed?.getTime() ?? Number.MAX_SAFE_INTEGER
      }));
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
  const hasAvailableSlots = availableSlots.some(slot => slot.hasSlots);

  return (
    <div className="overflow-hidden">
      <div className="flex flex-col gap-4 lg:flex-row h-[auto] ">
        {/* Calendar Section */}
        <div className="bg-white lg:w-2/3 p-6 flex flex-col border border-[#C2A88F80] relative">
          
          

          {/* Calendar Navigation */}
          <div className={` w-full flex items-center justify-between mb-6 ${isLoading ? 'blur-sm' : ''}`}>
            <div>
              <h3 className="text-xl font-semibold text-gray-900" style={{
                fontFamily: 'Work Sans',
                fontWeight: 600,
                fontSize: '20px',
                lineHeight: '137%',
                letterSpacing: '0%'
              }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h3>
              
            </div>
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
          <div className={`w-full grid grid-cols-7 gap-2 mb-4 ${isLoading ? 'blur-sm' : ''}`}>
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

          {!isLoading && !hasAvailableSlots && (
            <div
              className="w-full mb-4 rounded border border-amber-200 bg-amber-50 p-4 text-amber-800"
              style={{
                fontFamily: 'Work Sans',
                fontWeight: 500,
                fontSize: '16px',
                lineHeight: '137%',
                letterSpacing: '0%'
              }}
            >
              We don't have slots for selected services. Please select another service.
            </div>
          )}

          {/* Calendar grid */}
          <div className={`w-full grid grid-cols-7 gap-2 ${isLoading ? 'blur-sm' : ''}`}>
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
                {day.hasSlots && day.isCurrentMonth && !day.isPast && !day.isSelected ? (
                  <span
                    className="flex items-center justify-center w-10 h-10 rounded-full text-white"
                    style={{ backgroundColor: '#4CAF50' }}
                  >
                    {day.date.getDate()}
                  </span>
                ) : (
                  day.date.getDate()
                )}
              </button>
            ))}
          </div>

          {isLoading && (
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
                    {timeSlotsForSelectedDate.map((resolvedSlot, index) => {
                      const { slot, displayTime } = resolvedSlot;

                      return (
                        <button
                          key={index}
                          onClick={() => onTimeSelect(resolvedSlot.rawTime, slot)}
                          className={`w-full p-3 text-center border transition-all duration-200 ${
                            selectedTime === resolvedSlot.rawTime
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