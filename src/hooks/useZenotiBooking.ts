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

// Function to create dummy guest ONCE
const createDummyGuestOnce = async (centerId: string): Promise<ZenotiGuest | null> => {
  // If we already have a dummy guest, return it
  if (globalDummyGuest) {
    console.log('♻️ Using existing dummy guest ID:', globalDummyGuest.id);
    return globalDummyGuest;
  }

  try {
    console.log('🆕 Creating NEW dummy guest...');
    
    const guestData = {
      personal_info: {
        first_name: "Dummy",
        last_name: "Guest",
        email: `dummy.guest.${Date.now()}@example.com`,
        mobile_phone: {
          country_id: 1, // US
          number: `555${Math.floor(1000000 + Math.random() * 9000000)}`
        }
      },
      center_id: centerId
    };

    const response = await fetch(`https://api.zenoti.com/v1/guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
      },
      body: JSON.stringify(guestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Guest creation failed:', response.status, errorText);
      throw new Error(`Failed to create guest: ${response.status}`);
    }

    const guest: ZenotiGuest = await response.json();
    
    // 🎯 THIS IS THE GUEST_ID WE CREATED!
    console.log('🎉 ===== DUMMY GUEST CREATED SUCCESSFULLY =====');
    console.log('🆔 GUEST_ID:', guest.id);
    console.log('📧 Email:', guest.email);
    console.log('📱 Phone:', guest.mobile_phone?.number);
    console.log('🏢 Center ID:', centerId);
    console.log('===============================================');
    
    // Store globally for reuse
    globalDummyGuest = guest;
    return guest;

  } catch (err) {
    console.error('❌ Error creating dummy guest:', err);
    return null;
  }
};

export const useZenotiBooking = () => {
  const [webGuest, setWebGuest] = useState<ZenotiGuest | null>(null);
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create web guest and save the ID
  const createWebGuest = async (centerId: string) => {
    setIsLoading(true);
    setError(null);

    const guest = await createDummyGuestOnce(centerId);
    setWebGuest(guest);
    setIsLoading(false);
    return guest;
  };

  // Create service booking draft
  const createServiceBooking = async (
    centerId: string, 
    guestId: string, 
    serviceId: string,
    serviceDuration: number,
    appointmentDate: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 Creating booking draft for guest:', guestId);
      
      const bookingData = {
        center_id: centerId,
        start_date: appointmentDate,
        guests: [{
          id: guestId,
          items: [{
            item: {
              id: serviceId
            },
            duration: serviceDuration
          }]
        }]
      };

      console.log('📤 Booking payload:', JSON.stringify(bookingData, null, 2));

      const response = await fetch(`https://api.zenoti.com/v1/bookings?is_double_booking_enabled=true`, {
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
      
      // Extract booking ID from nested response structure
      const bookingId = bookingResponse.booking?.id;
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
    serviceDuration: number,
    appointmentDate: string
  ) => {
    try {
      console.log('🚀 Initializing booking flow...');
      
      // Step 1: Get or create dummy guest
      const guest = await createWebGuest(centerId);
      if (!guest) return null;

      // Step 2: Create service booking
      const booking = await createServiceBooking(centerId, guest.id, serviceId, serviceDuration, appointmentDate);
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
    createWebGuest,
    createServiceBooking,
    getAvailableSlots,
    initializeBookingFlow
  };
};