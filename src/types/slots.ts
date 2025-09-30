export interface UnifiedHourlySlot {
  time: string;
  available: boolean;
  count: number;
}

export interface UnifiedSlotEntry {
  time: string;
}

export interface UnifiedCenterAvailability {
  id: string;
  no_of_slots: number;
  hourly_slots: UnifiedHourlySlot[];
  slots: UnifiedSlotEntry[];
  booking_id: string;
  priority: number;
}

export interface UnifiedDateAvailability {
  hasSlots: boolean;
  centersWithAvailability: number;
  totalAvailableSlots: number;
  center_ids: UnifiedCenterAvailability[];
}

export interface UnifiedSlotsData {
  date_availability: Record<string, UnifiedDateAvailability>;
  available_dates: string[];
  centers: string[];
  services: string[];
  processing_time_ms: number;
  future_days_count?: number;
  week_info?: Array<Record<string, unknown>>;
  mode?: string;
}

export interface UnifiedSlotsResponse {
  success: boolean;
  data: UnifiedSlotsData | null;
  message?: string;
}

export interface CalendarSlot {
  time: string;
  centerId: string;
  bookingId: string;
  priority: number;
  available: boolean;
  count: number;
  [key: string]: unknown;
}

export interface CalendarCenterAvailability {
  id: string;
  bookingId: string;
  priority: number;
  totalSlots: number;
  hourlySlots: UnifiedHourlySlot[];
  slots: CalendarSlot[];
}

export interface AvailableSlots {
  date: string;
  hasSlots: boolean;
  slotsCount: number;
  totalAvailableSlots: number;
  slots: CalendarSlot[];
  centers: CalendarCenterAvailability[];
}

export interface BookingMapEntry {
  date: string;
  centerId: string;
  bookingId: string;
  priority: number;
  totalSlots: number;
}

export interface TransformedUnifiedSlots {
  availableSlots: AvailableSlots[];
  bookingMap: BookingMapEntry[];
  availableDates: string[];
  centers: string[];
  services: string[];
  processingTimeMs: number;
  futureDaysCount?: number;
  weekInfo?: Array<Record<string, unknown>>;
  mode?: string;
  requestedCenters?: string[];
  requestedServices?: string[];
  dateAvailability?: Record<string, UnifiedDateAvailability>; // Raw date availability for provider selection
}

