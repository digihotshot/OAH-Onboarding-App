/**
 * Booking service for slot reservations
 */

import { API_CONFIG } from '../config/api';

export interface ReservationRequest {
  bookingId?: string;
  providerBookingId?: string;
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
  date?: string;
  time?: string;
  address: string;
  zipCode: string;
  centerId?: string;
  slotPriority?: number;
  serviceIds?: string[];
  guestId?: string;
}

export interface ReservationResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  confirmationNumber?: string;
  guestId?: string;
  guest?: GuestResponse;
  reservationStatus?: ReservationStatus;
  errors?: ReservationError[];
}

interface UpsertGuestRequest {
  guestId?: string;
  centerId?: string;
  guest: {
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
  };
}

interface GuestResponse {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
}

interface ReservationStatus {
  success: boolean;
  message?: string;
  confirmationNumber?: string;
}

interface ReservationError {
  code: string;
  message: string;
}

interface BookingsResponse {
  slotTime: string;
  date: string;
  bookings: Array<{
    centerId: string;
    centerName: string;
    bookingId: string;
    success: boolean;
  }>;
}

interface ServiceSelectionRequest {
  centers: string[];
  services: string[];
  date: string;
}

interface ServiceSelectionResponse {
  success: boolean;
  message?: string;
  bookingId?: string;
  data?: {
    bookingId: string;
    centers: string[];
    services: string[];
  };
}

interface ProviderSelectionRequest {
  date: string;
  slotTime: string;
  bookingId?: string;
  centers: string[];
  services: string[];
  guestId?: string;
  centerId?: string; // Specific center/provider ID to select
  bookings: Array<{
    centerId: string;
    centerName: string;
    bookingId: string;
    success: boolean;
  }>;
  dateAvailability?: any; // Date availability data from unified slots response
}

interface ProviderSelectionResponse {
  success: boolean;
  message?: string;
  data?: {
    selectedProvider: {
      centerId: string;
      centerName: string;
      priority: number;
      bookingId: string; // bookingId is now required in selectedProvider
      isFallback: boolean;
      totalOptions: number;
    };
    allBookings?: Array<{
      centerId: string;
      centerName: string;
      bookingId: string;
      success: boolean;
    }>;
    summary?: {
      totalBookings: number;
      successful: number;
      failed: number;
    };
  } | null;
  bookingId?: string;
  selectedCenterId?: string;
  isFallback?: boolean;
  totalOptions?: number;
  rawResponse?: unknown;
}

export type GuestAuthStatus = 'authenticated' | 'unauthenticated';

export interface GuestSearchRequest {
  email?: string;
  phone?: string;
}

export interface GuestSearchResponse<TGuest = any> {
  status: GuestAuthStatus;
  guest: TGuest | null;
  raw: unknown;
  message?: string;
}

export class BookingService {
  private readonly API_BASE_URL = API_CONFIG.BASE_URL;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000];
  private cachedGuestId: string | null = null;

  async searchGuest<TGuest = any>(request: GuestSearchRequest): Promise<GuestSearchResponse<TGuest>> {
    const { email, phone } = request;

    if (!email && !phone) {
      throw new Error('Either email or phone must be provided to search guest.');
    }

    const payload = {
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };

    const url = `${this.API_BASE_URL}/search-guest`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorData?.error || errorMessage;
        } catch {
          /* ignore JSON parse error */
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const normalizedGuest = this.extractGuestFromResponse<TGuest>(data);
      const status = this.resolveGuestStatus(data, normalizedGuest);
      const message = this.extractGuestMessage(data);

      return {
        status,
        guest: normalizedGuest,
        raw: data,
        message,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message || 'Failed to search guest.');
      }
      throw new Error('Failed to search guest.');
    }
  }

  /**
   * Reserve a slot using the booking ID from the highest priority center
   * New endpoint: POST /api/bookings/:bookingId/reserve?slot_time=TIMESTAMP
   * Uses bookingId from select-provider response
   */
  async reserveSlot(request: ReservationRequest): Promise<ReservationResponse> {
    const bookingIdentifier = request.providerBookingId ?? request.bookingId;
    const slotTime = request.selectedTime || request.time;

    if (!bookingIdentifier) {
      throw new Error('Booking ID is required for reservation');
    }

    if (!slotTime) {
      throw new Error('Slot time is required for reservation');
    }

    // New endpoint: POST /api/bookings/:bookingId/reserve?slot_time=TIMESTAMP
    const url = `${this.API_BASE_URL}/bookings/${bookingIdentifier}/reserve?slot_time=${encodeURIComponent(slotTime)}`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Reservation attempt ${attempt + 1}/${this.MAX_RETRIES} for booking ${bookingIdentifier} at ${slotTime}`);
        console.log(`📍 Using endpoint: POST /api/bookings/${bookingIdentifier}/reserve?slot_time=${slotTime}`);
        
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
        
        // Check for backend error
        if (data.error || (data.success === false && data.error)) {
          const errorMessage = data.error || data.message || 'Reservation failed';
          const errorDetails = data.details ? ` Details: ${JSON.stringify(data.details)}` : '';
          console.error(`❌ Backend error during reservation:`, {
            error: data.error,
            bookingId: data.booking_id || bookingIdentifier,
            details: data.details
          });
          throw new Error(`Backend error: ${errorMessage}${errorDetails}`);
        }
        
        const isSuccessful = data.success !== undefined ? data.success : true;
        const resolvedBookingId = data.bookingId || data.data?.bookingId || bookingIdentifier;
        const resolvedConfirmationNumber = data.confirmationNumber || data.data?.confirmationNumber;
        const resolvedMessage = data.message || 'Slot reserved successfully';
        const combinedGuest = data.guest || data.data?.guest;
        const reservationStatus: ReservationStatus | undefined = data.reservation_status || data.data?.reservationStatus;
        const errors: ReservationError[] | undefined = data.errors || data.data?.errors;

        if (combinedGuest?.id) {
          this.cachedGuestId = combinedGuest.id;
        }
        
        if (isSuccessful) {
          console.log(`✅ Successfully reserved slot`, {
            bookingId: resolvedBookingId,
            confirmationNumber: resolvedConfirmationNumber,
            guestId: combinedGuest?.id || data.guestId || data.data?.guestId,
            reservationStatus,
            errors,
          });
          return {
            success: true,
            message: resolvedMessage,
            bookingId: resolvedBookingId,
            confirmationNumber: resolvedConfirmationNumber,
            guestId: combinedGuest?.id || data.guestId || data.data?.guestId,
            guest: combinedGuest,
            reservationStatus,
            errors,
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

  async createGuest(
    userInfo: ReservationRequest['userInfo'],
    existingGuestId?: string,
    centerId?: string
  ): Promise<string | undefined> {
    if (!centerId) {
      throw new Error('Center information is required to create a guest profile.');
    }

    try {
      const guest = await this.ensureGuest({
        guestId: existingGuestId ?? this.cachedGuestId ?? undefined,
        centerId,
        guest: {
          firstName: this.extractFirstName(userInfo.name),
          lastName: this.extractLastName(userInfo.name),
          email: userInfo.email,
          phone: userInfo.phone,
        },
      });

      if (guest?.id) {
        this.cachedGuestId = guest.id;
        console.log(`✅ Guest ready with id ${guest.id}`);
        return guest.id;
      }

      if (existingGuestId ?? this.cachedGuestId) {
        const resolvedId = existingGuestId ?? this.cachedGuestId ?? undefined;
        console.warn('⚠️ Guest creation did not return a new id. Using existing id instead.');
        return resolvedId;
      }

      console.error('❌ Failed to prepare guest id.');
      return undefined;
    } catch (error) {
      // Re-throw the error so it can be handled by the calling function
      throw error;
    }
  }

  /**
   * Select provider based on priority for the selected time slot
   */
  async selectProvider(request: ProviderSelectionRequest): Promise<ProviderSelectionResponse> {
    const url = `${this.API_BASE_URL}/slots/select-provider`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Provider selection attempt ${attempt + 1}/${this.MAX_RETRIES} for centers:`, request.centers, 'services:', request.services);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slot_time: request.slotTime,
            date: request.date,
            service_ids: request.services,
            guest_id: request.guestId,
            center_id: request.centerId,
            date_availability: request.dateAvailability
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const selectedProvider = data?.data?.selectedProvider ?? null;
        const resolvedBookingId =
          selectedProvider?.bookingId ||
          selectedProvider?.booking_id ||
          data?.data?.bookingId ||
          data?.data?.booking_id ||
          data?.bookingId ||
          data?.booking_id ||
          null;
        const resolvedCenterId =
          selectedProvider?.centerId ||
          selectedProvider?.center_id ||
          data?.data?.centerId ||
          data?.data?.center_id ||
          null;
        const resolvedIsFallback =
          selectedProvider?.isFallback ??
          selectedProvider?.is_fallback ??
          data?.data?.isFallback ??
          data?.data?.is_fallback ??
          undefined;
        const resolvedTotalOptions =
          selectedProvider?.totalOptions ??
          selectedProvider?.total_options ??
          data?.data?.totalOptions ??
          data?.data?.total_options ??
          undefined;
        
        // Debug: Log the complete response structure to check for booking_id
        console.log(`🔍 Complete provider selection response:`, JSON.stringify(data, null, 2));
        console.log(`🔍 Response keys:`, Object.keys(data));
        if (data.data) {
          console.log(`🔍 Data keys:`, Object.keys(data.data));
          if (data.data.selectedProvider) {
            console.log(`🔍 SelectedProvider keys:`, Object.keys(data.data.selectedProvider));
            console.log(`🔍 SelectedProvider values:`, data.data.selectedProvider);
          }
          
          // Check for booking_id at data level
          console.log(`🔍 Checking for booking_id at data level...`);
          if (data.data.booking_id) {
            console.log(`✅ Found booking_id at data level:`, data.data.booking_id);
          }
        }
        
        // Check for booking_id at root level
        console.log(`🔍 Checking for booking_id at root level...`);
        if (data.booking_id) {
          console.log(`✅ Found booking_id at root level:`, data.booking_id);
        }
        
        if (data.success) {
          console.log(`✅ Successfully selected provider:`, data.data?.selectedProvider);
          return {
            success: true,
            message: data.message || 'Provider selected successfully',
            data: data.data ?? null,
            bookingId: resolvedBookingId ?? undefined,
            selectedCenterId: resolvedCenterId ?? undefined,
            isFallback: resolvedIsFallback,
            totalOptions: resolvedTotalOptions,
            rawResponse: data,
          };
        } else {
          throw new Error(data.message || 'Provider selection failed');
        }
        
      } catch (error) {
        console.error(`❌ Provider selection attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for provider selection');
  }

  /**
   * Create booking for selected services (Step 2)
   */
  async createBookingForServices(request: ServiceSelectionRequest): Promise<ServiceSelectionResponse> {
    const url = `${this.API_BASE_URL}/bookings`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Create booking attempt ${attempt + 1}/${this.MAX_RETRIES} for services:`, request.services, 'centers:', request.centers);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            centers: request.centers,
            serviceIds: request.services,
            date: request.date
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Debug: Log the complete response structure
        console.log(`🔍 Complete create booking response:`, JSON.stringify(data, null, 2));
        
        if (data.success || data.bookingId) {
          console.log(`✅ Successfully created booking for services:`, data);
          return {
            success: true,
            message: data.message || 'Booking created successfully',
            bookingId: data.bookingId,
            data: data.data
          };
        } else {
          throw new Error(data.message || 'Booking creation failed');
        }
        
      } catch (error) {
        console.error(`❌ Create booking attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for creating booking');
  }

  /**
   * Get bookings with respect to center
   */
  async getBookingsByCenter(centers: string[], services: string[], date: string): Promise<BookingsResponse> {
    const url = `${this.API_BASE_URL}/bookings`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Get bookings attempt ${attempt + 1}/${this.MAX_RETRIES} for centers:`, centers);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            centers: centers,
            services: services,
            date: date
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // The API returns the bookings directly without a success wrapper
        if (data.bookings && Array.isArray(data.bookings)) {
          console.log(`✅ Successfully fetched bookings for centers:`, data.bookings);
          return {
            slotTime: data.slotTime,
            date: data.date,
            bookings: data.bookings
          };
        } else {
          throw new Error('Invalid response format from bookings API');
        }
        
      } catch (error) {
        console.error(`❌ Get bookings attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.MAX_RETRIES - 1) {
          throw error; // Last attempt failed
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded for getting bookings');
  }

  /**
   * Confirm a booking using the booking ID
   * According to Zenoti documentation, only accepts:
   * - notes: Any notes added by the guest (optional)
   * - group_name: Name of the group appointment for group bookings (optional)
   */
  async confirmBooking(bookingId: string, options?: {
    notes?: string;
    group_name?: string;
  }): Promise<ReservationResponse> {
    const url = `${this.API_BASE_URL}/bookings/${bookingId}/confirm`;
    
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Confirmation attempt ${attempt + 1}/${this.MAX_RETRIES} for booking ${bookingId}`);
        
        // Only send notes and group_name if provided (both are optional)
        const requestBody: { notes?: string; group_name?: string } = {};
        if (options?.notes) {
          requestBody.notes = options.notes;
        }
        if (options?.group_name) {
          requestBody.group_name = options.group_name;
        }
        
        console.log('📤 Sending confirmation request with body:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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

  private extractFirstName(fullName: string): string {
    if (!fullName?.trim()) {
      return '';
    }
    return fullName.trim().split(/\s+/)[0];
  }

  private extractLastName(fullName: string): string | undefined {
    if (!fullName?.trim()) {
      return undefined;
    }
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(' ') : undefined;
  }

  private async ensureGuest(request: UpsertGuestRequest): Promise<GuestResponse | undefined> {
    const guestId = request.guestId ?? this.cachedGuestId;
    if (guestId) {
      console.log(`👤 Using existing guest_id ${guestId}`);
      return {
        id: guestId,
        firstName: request.guest.firstName,
        lastName: request.guest.lastName,
        email: request.guest.email,
        phone: request.guest.phone,
      };
    }

    const url = `${this.API_BASE_URL}/guests`;
    if (!request.centerId) {
      throw new Error('centerId is required to create or update a guest');
    }

    const payload = {
      provider_id: request.centerId,
      center_id: request.centerId,
      guest_id: request.guestId,
      first_name: request.guest.firstName,
      last_name: request.guest.lastName,
      email: request.guest.email,
      phone: request.guest.phone,
    };

    try {
      console.log(`🆕 Creating/updating guest`, payload);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error('❌ Guest API error details:', errorData);
          throw new Error(JSON.stringify(errorData));
        } catch (jsonError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      const normalizedGuest = this.normalizeGuestResponse(data, request);

      if (normalizedGuest?.id) {
        console.log(`✅ Guest upserted with id ${normalizedGuest.id}`);
        this.cachedGuestId = normalizedGuest.id;
        return normalizedGuest;
      }

      console.warn('⚠️ Guest upsert response missing guest payload', data);
      return undefined;
    } catch (error) {
      console.error('❌ Failed to upsert guest. Continuing without guest_id.', error);
      return undefined;
    }
  }

  private normalizeGuestResponse(data: any, request: UpsertGuestRequest): GuestResponse | undefined {
    const guestCandidates = [
      data?.guest,
      data?.data?.guest,
      data?.data,
      data,
    ];

    for (const candidate of guestCandidates) {
      if (candidate && typeof candidate === 'object') {
        const resolvedId =
          candidate.id ||
          candidate.Id ||
          candidate.guest_id ||
          candidate.guestId ||
          candidate.GuestId ||
          candidate.GuestID;
        if (resolvedId) {
          return {
            id: resolvedId,
            firstName: candidate.firstName || candidate.first_name || candidate.personal_info?.first_name || request.guest.firstName,
            lastName: candidate.lastName || candidate.last_name || candidate.personal_info?.last_name || request.guest.lastName,
            email: candidate.email || candidate.personal_info?.email || request.guest.email,
            phone: candidate.phone || candidate.personal_info?.mobile_phone?.number || request.guest.phone,
          };
        }
      }
    }

    const fallbackId =
      data?.guestId ||
      data?.guest_id ||
      data?.Id ||
      data?.id ||
      data?.data?.guestId ||
      data?.data?.guest_id ||
      data?.data?.Id ||
      data?.data?.id;

    if (fallbackId) {
      return {
        id: fallbackId,
        firstName: request.guest.firstName,
        lastName: request.guest.lastName,
        email: request.guest.email,
        phone: request.guest.phone,
      };
    }

    return undefined;
  }

  private extractGuestFromResponse<TGuest = any>(data: any): TGuest | null {
    if (!data) {
      return null;
    }

    const candidates = [
      data.guest,
      data.Guest,
      data.data?.guest,
      data.data?.Guest,
      data.data,
      data.result,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'object') {
        return candidate as TGuest;
      }
    }

    return null;
  }

  private resolveGuestStatus(data: any, guest: unknown): GuestAuthStatus {
    if (typeof data?.exists === 'boolean') {
      return data.exists ? 'authenticated' : 'unauthenticated';
    }

    if (typeof data?.found === 'boolean') {
      return data.found ? 'authenticated' : 'unauthenticated';
    }

    if (typeof data?.success === 'boolean') {
      if (data.success && guest) {
        return 'authenticated';
      }
      if (!data.success && !guest) {
        return 'unauthenticated';
      }
    }

    if (guest) {
      return 'authenticated';
    }

    return 'unauthenticated';
  }

  private extractGuestMessage(data: any): string | undefined {
    return data?.message || data?.error || data?.data?.message;
  }
}

// Export singleton instance
export const bookingService = new BookingService();
