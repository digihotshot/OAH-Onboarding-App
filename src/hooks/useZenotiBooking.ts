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
  }>;
}

export interface AvailableSlot {
  date: string;
  time: string;
  therapist_id: string;
  therapist_name: string;
  available: boolean;
}

export const useZenotiBooking = () => {
  const [webGuest, setWebGuest] = useState<ZenotiGuest | null>(null);
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create or get web guest
  const createWebGuest = async (centerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const guestData = {
        first_name: "Web",
        last_name: "Guest",
        email: `webguest_${Date.now()}@example.com`,
        mobile_phone: {
          country_id: 1, // US
          number: "1234567890"
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
        throw new Error(`Failed to create guest: ${response.status}`);
      }

      const guest: ZenotiGuest = await response.json();
      console.log('👤 Created web guest:', guest);
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
    serviceId: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const bookingData = {
        center_id: centerId,
        guest_id: guestId,
        requested_services: [
          {
            service_id: serviceId
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
        throw new Error(`Failed to create booking: ${response.status}`);
      }

      const bookingResponse: ZenotiBooking = await response.json();
      console.log('📅 Created service booking:', bookingResponse);
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
      const url = `https://api.zenoti.com/v1/bookings/${bookingId}/slots?start_date=${startDate}&end_date=${endDate}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `apikey ${import.meta.env.VITE_ZENOTI_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get available slots: ${response.status}`);
      }

      const slotsData = await response.json();
      console.log('🕐 Available slots:', slotsData);
      
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
    startDate: string, 
    endDate: string
  ) => {
    try {
      // Step 1: Create web guest
      const guest = await createWebGuest(centerId);
      if (!guest) return null;

      // Step 2: Create service booking
      const booking = await createServiceBooking(centerId, guest.id, serviceId);
      if (!booking) return null;

      // Step 3: Get available slots
      const slots = await getAvailableSlots(booking.id, startDate, endDate);
      
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