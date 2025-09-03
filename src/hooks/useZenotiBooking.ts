import { useState, useEffect } from 'react';

export interface ZenotiGuest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: {
    country_id: number;
    number: string;
  };
}

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
  date: string;
  time: string;
  therapist_id: string;
  therapist_name: string;
  available: boolean;
}

// Global dummy guest storage
// We'll create ONE dummy guest and reuse its ID for all bookings
let globalDummyGuest: ZenotiGuest | null = {
  id: import.meta.env.VITE_ZENOTI_GUEST_ID || '7ab2f13d-dc76-4390-b54e-baa055f8a0fc',
  first_name: 'Dummy',
  last_name: 'Guest',
  email: 'dummy.guest@example.com',
  mobile_phone: {
    country_id: 1,
    number: '5551234567'
  }
};

export const useZenotiBooking = () => {
  const [webGuest, setWebGuest] = useState<ZenotiGuest | null>(null);
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create service booking draft
  const createServiceBooking = async (
    centerId: string, 
    guestId: string, 
    serviceId: string,
    appointmentDate: string,
    serviceDuration: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 Creating booking draft for guest:', guestId);
      
      const bookingData = {
        center_id: centerId,
        start_time: `${appointmentDate}T09:00:00Z`,
        guests: [{
          id: guestId,
          items: [{
            service_id: serviceId,  // This is the selected service_id
            duration: serviceDuration
          }]
        }]
      };

      console.log('📤 Booking payload with IDs:');
      console.log('  🏢 Center ID:', centerId);
      console.log('  👤 Guest ID:', guestId);
      console.log('  💉 Service ID:', serviceId);
      console.log('  ⏱️ Duration:', serviceDuration);
      console.log('  📅 Date:', appointmentDate);
      console.log('  📋 Full payload:', JSON.stringify(bookingData, null, 2));

      const response = await fetch(`https://api.zenoti.com/v1/bookings?is_double_booking_enabled=true`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
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
      
      // Extract booking ID from response structure
      const bookingId = bookingResponse.booking_id;
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
          service_id: serviceId,
          duration: serviceDuration
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
  const getAvailableSlots = async (bookingId: string, startDate: string, endDate: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🕐 Fetching slots for booking:', bookingId);
      
      const url = `https://api.zenoti.com/v1/bookings/${bookingId}/slots?start_date=${startDate}&end_date=${endDate}`;
      
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

      const slotsData = await response.json();
      console.log('✅ Retrieved slots:', slotsData.slots?.length || 0, 'slots found');
      
      // Transform the response to our format
      const slots: AvailableSlot[] = slotsData.slots || [];
      setAvailableSlots(slots);
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
    appointmentDate: string,
    serviceDuration: number
  ) => {
    try {
      console.log('🚀 Initializing booking flow...');
      
      // Step 1: Use existing dummy guest
      const guest = globalDummyGuest;
      if (!guest) {
        console.error('❌ No dummy guest available');
        setError('No guest available for booking');
        return null;
      }

      // Step 2: Create service booking
      const booking = await createServiceBooking(centerId, guest.id, serviceId, appointmentDate, serviceDuration);
      if (!booking || !booking.booking_id) {
        console.error('❌ Booking creation failed or returned invalid ID');
        return null;
      }

      // Step 3: Get available slots
      const slots = await getAvailableSlots(booking.booking_id, appointmentDate, appointmentDate);
      
      console.log('✅ Booking flow completed successfully');
      return { guest, booking, slots };
    } catch (err) {
      console.error('❌ Error in booking flow:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize booking flow');
      return null;
    }
  };

  return {
    webGuest,
    booking,
    availableSlots,
    isLoading,
    error,
    createServiceBooking,
    getAvailableSlots,
    initializeBookingFlow
  };
};