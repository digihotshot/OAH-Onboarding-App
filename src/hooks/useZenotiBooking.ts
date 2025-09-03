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
let globalDummyGuest: ZenotiGuest | null = null;

export const useZenotiBooking = () => {
  const [webGuest, setWebGuest] = useState<ZenotiGuest | null>(null);
  const [booking, setBooking] = useState<ZenotiBooking | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create the global dummy guest
  const getOrCreateDummyGuest = async (centerId: string) => {
    // Check if we have a guest ID in env
    const existingGuestId = import.meta.env.VITE_ZENOTI_GUEST_ID;
    
    if (existingGuestId && globalDummyGuest?.id === existingGuestId) {
      console.log('♻️ Using existing dummy guest:', globalDummyGuest.id);
      setWebGuest(globalDummyGuest);
      return globalDummyGuest;
    }
    
    // If we have a guest ID in env but no global guest, reconstruct it
    if (existingGuestId) {
      const reconstructedGuest: ZenotiGuest = {
        id: existingGuestId,
        first_name: "Dummy",
        last_name: "WebGuest",
        email: "dummy.webguest@oliathome.com",
        mobile_phone: {
          country_id: 1,
          number: "5551234567"
        }
      };
      globalDummyGuest = reconstructedGuest;
      setWebGuest(reconstructedGuest);
      console.log('♻️ Reconstructed guest from env:', existingGuestId);
      return reconstructedGuest;
    }
    
    // Create new guest if none exists
    return await createWebGuest(centerId);
  };

  // Save guest ID to env file
  const saveGuestIdToEnv = async (guestId: string) => {
    try {
      // Read current .env file
      const response = await fetch('/.env');
      let envContent = '';
      
      if (response.ok) {
        envContent = await response.text();
      }
      
      // Check if VITE_ZENOTI_GUEST_ID already exists
      const lines = envContent.split('\n');
      const existingLineIndex = lines.findIndex(line => line.startsWith('VITE_ZENOTI_GUEST_ID='));
      
      if (existingLineIndex !== -1) {
        // Update existing line
        lines[existingLineIndex] = `VITE_ZENOTI_GUEST_ID=${guestId}`;
      } else {
        // Add new line
        lines.push(`VITE_ZENOTI_GUEST_ID=${guestId}`);
      }
      
      // Write back to .env file
      const newEnvContent = lines.join('\n');
      
      // Note: In a real environment, this would need server-side handling
      // For now, we'll just log the instruction
      console.log('💾 Guest ID to save to .env:', guestId);
      console.log('📝 Updated .env content would be:', newEnvContent);
      
    } catch (err) {
      console.error('❌ Error saving guest ID to env:', err);
    }
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
      
      // Save guest ID to env file
      await saveGuestIdToEnv(guest.id);
      
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
      const guest = await getOrCreateDummyGuest(centerId);
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
    getOrCreateDummyGuest,
    createServiceBooking,
    getAvailableSlots,
    initializeBookingFlow
  };
};