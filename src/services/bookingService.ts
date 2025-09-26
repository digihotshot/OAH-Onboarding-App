/**
 * Booking service for slot reservations
 */

interface ReservationRequest {
  bookingId: string;
  userInfo: {
    name: string;
    email: string;
    phone: string;
  };
  selectedServices: Array<{
    id: string;
    name: string;
  }>;
  selectedDate: string;
  selectedTime: string;
  address: string;
  zipCode: string;
}

interface ReservationResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  confirmationNumber?: string;
}

class BookingService {
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 2000, 4000];

  /**
   * Reserve a slot using the booking ID from the highest priority center
   */
  async reserveSlot(request: ReservationRequest): Promise<ReservationResponse> {
    const url = `${this.API_BASE_URL}/bookings/${request.bookingId}/reserve`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Reservation attempt ${attempt + 1}/${this.MAX_RETRIES} for booking ${request.bookingId}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userInfo: request.userInfo,
            selectedServices: request.selectedServices,
            selectedDate: request.selectedDate,
            selectedTime: request.selectedTime,
            address: request.address,
            zipCode: request.zipCode
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ Successfully reserved slot for booking ${request.bookingId}`);
          return {
            success: true,
            message: data.message || 'Slot reserved successfully',
            bookingId: data.bookingId || request.bookingId,
            confirmationNumber: data.confirmationNumber
          };
        } else {
          throw new Error(data.message || 'Reservation failed');
        }
        
      } catch (error) {
        console.error(`❌ Reservation attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for reservation');
  }

  /**
   * Confirm a booking using the booking ID
   */
  async confirmBooking(bookingId: string): Promise<ReservationResponse> {
    const url = `${this.API_BASE_URL}/bookings/${bookingId}/confirm`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Confirmation attempt ${attempt + 1}/${this.MAX_RETRIES} for booking ${bookingId}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ Successfully confirmed booking ${bookingId}`);
          return {
            success: true,
            message: data.message || 'Booking confirmed successfully',
            bookingId: data.bookingId || bookingId,
            confirmationNumber: data.confirmationNumber
          };
        } else {
          throw new Error(data.message || 'Confirmation failed');
        }
        
      } catch (error) {
        console.error(`❌ Confirmation attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for confirmation');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const bookingService = new BookingService();
