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
  id: string;
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
let globalDummyGuest: ZenotiGuest | null = null;

export const useZenotiBooking = () => {
  const [webGuest, setWebGuest] = useState<ZenotiGuest | null>(null);
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create the global dummy guest
  const getOrCreateDummyGuest = async (centerId: string) => {
    // If we already have a global dummy guest, return it
    if (globalDummyGuest) {
      console.log('♻️ Reusing existing dummy guest:', globalDummyGuest.id);
      setWebGuest(globalDummyGuest);
      return globalDummyGuest;
    }

    // Create new dummy guest if none exists
    return await createWebGuest(centerId);
  };

  // Create web guest (only called once)
  const createWebGuest = async (centerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🆕 Creating new dummy guest...');
      
      const guestData = {
        personal_info: {
          first_name: "Dummy",
          last_name: "WebGuest",
          email: `dummy.webguest.${Date.now()}@oliathome.com`,
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
        throw new Error(`Failed to create guest: ${response.status} - ${errorText}`);
      }

      const guest: ZenotiGuest = await response.json();
      console.log('✅ Created dummy guest:', guest.id);
      
      // Store globally for reuse
      globalDummyGuest = guest;
      setWebGuest(guest);
      return guest;

    } catch (err) {
      console.error('❌ Error creating web guest:', err);
      setError(err instanceof Error ? err.message : 'Failed to create web guest');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Create service booking draft
  const createServiceBooking = async (
    centerId: string, 
    guestId: string, 
    serviceId: string,
    serviceDuration: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📝 Creating booking draft for guest:', guestId);
      
      const bookingData = {
        center_id: centerId,
        guest_id: guestId,
        requested_services: [
          {
            service_id: serviceId,
            duration: serviceDuration
          }
        ]
      };

      const response = await fetch(`https://api.zenoti.com/v1/bookings`, {
        method: 'POST',
        headers: {
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
      console.log('✅ Created booking draft:', bookingResponse.id);
      setBooking(bookingResponse);
      return bookingResponse;

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
    startDate: string, 
    endDate: string
  ) => {
    try {
      console.log('🚀 Initializing booking flow...');
      
      // Step 1: Get or create dummy guest
      const guest = await getOrCreateDummyGuest(centerId);
      if (!guest) return null;

      // Step 2: Create service booking
      const booking = await createServiceBooking(centerId, guest.id, serviceId, serviceDuration);
      if (!booking) return null;

      // Step 3: Get available slots
      const slots = await getAvailableSlots(booking.id, startDate, endDate);
      
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
    getOrCreateDummyGuest,
    createServiceBooking,
    getAvailableSlots,
    initializeBookingFlow
  };
};