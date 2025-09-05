import { useState, useEffect } from 'react';

export interface ZenotiBooking {
  booking_id: string;
  center_id: string;
  guest_id: string;
  requested_services: Array<{
    service_id: string;
    therapist_id?: string;
    duration?: number;
  }>;
}

export interface AvailableSlot {
  Time: string;
  Warnings: any;
  Priority: number;
  Available: boolean;
  SalePrice: any;
}

export interface FutureDay {
  Day: string;
  IsAvailable: boolean;
  HolidayType: any;
}

export interface SlotsResponse {
  slots: AvailableSlot[];
  future_days: FutureDay[];
  next_available_day: string;
  Error: any;
}

export const useZenotiBooking = () => {
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [futureDays, setFutureDays] = useState<FutureDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create service booking draft
  const createServiceBooking = async (
    centerId: string, 
    guestId: string, 
    serviceId: string,
    appointmentDate: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 Creating booking draft for guest:', guestId);
      
      const bookingData = {
        center_id: centerId,
        date: appointmentDate,
        guests: [{
          id: guestId,
          items: [{
            item: { id: serviceId }
          }]
        }]
      };

      console.log('📤 Booking payload:', JSON.stringify(bookingData, null, 2));

      const response = await fetch(`https://api.zenoti.com/v1/bookings?is_double_booking_enabled=false`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Booking creation failed:', response.status, errorText);
        throw new Error(`Failed to create booking: ${response.status} - ${errorText}`);
      }

      const bookingResponse: ZenotiBooking = await response.json();
      console.log('✅ API Response:', JSON.stringify(bookingResponse, null, 2));
      
      // Extract booking ID from response
      const bookingId = bookingResponse.id;
      console.log('✅ Extracted booking ID:', bookingId);
      
      // Validate that we received a valid booking ID
      if (!bookingId || typeof bookingId !== 'string' || bookingId.trim() === '') {
        console.error('❌ Invalid booking ID received:', bookingId);
        throw new Error('Invalid booking ID received from Zenoti API');
      }
      
      // Create our booking object with the extracted ID
      const booking: ZenotiBooking = {
        booking_id: bookingId,
        center_id: centerId,
        guest_id: guestId,
        requested_services: [{
          service_id: serviceId
        }]
      };
      
      setBooking(booking);
      return booking;

    } catch (err) {
      console.error('❌ Error creating service booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to create service booking');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Retrieve available slots
  const getAvailableSlots = async (bookingId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🕐 Fetching slots for booking:', bookingId);
      
      const url = `https://api.zenoti.com/v1/bookings/${bookingId}/slots?check_future_day_availability=true`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Slots fetch failed:', response.status, errorText);
        throw new Error(`Failed to get available slots: ${response.status} - ${errorText}`);
      }

      const slotsData: SlotsResponse = await response.json();
      console.log('✅ Retrieved slots response:', slotsData);
      console.log('✅ Available slots:', slotsData.slots?.length || 0, 'slots found');
      console.log('✅ Future days:', slotsData.future_days?.length || 0, 'days found');
      
      const slots = slotsData.slots || [];
      const futureDaysData = slotsData.future_days || [];
      setAvailableSlots(slots);
      setFutureDays(futureDaysData);
      return slots;

    } catch (err) {
      console.error('❌ Error getting available slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to get available slots');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Complete flow: create guest -> create booking -> get slots
  const initializeBookingFlow = async (
    centerId: string, 
    serviceId: string, 
    appointmentDate: string
  ) => {
    try {
      console.log('🚀 Initializing booking flow...');
      
      // Use guest ID from environment
      const guestId = import.meta.env.VITE_ZENOTI_GUEST_ID;
      if (!guestId) {
        console.error('❌ No guest ID found in environment');
        setError('No guest ID configured');
        return null;
      }

      // Step 1: Create service booking
      const booking = await createServiceBooking(centerId, guestId, serviceId, appointmentDate);
      if (!booking || !booking.booking_id) {
        console.error('❌ Booking creation failed or returned invalid ID');
        return null;
      }

      // Step 2: Get available slots
      const slots = await getAvailableSlots(booking.booking_id);
      
      console.log('✅ Booking flow completed successfully');
      return { booking, slots };
    } catch (err) {
      console.error('❌ Error in booking flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize booking flow');
      return null;
    }
  };

  return {
    booking,
    availableSlots,
    futureDays,
    isLoading,
    error,
    createServiceBooking,
    getAvailableSlots,
    initializeBookingFlow
  };
};