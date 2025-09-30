import {
  AvailableSlots,
  BookingMapEntry,
  CalendarCenterAvailability,
  CalendarSlot,
  TransformedUnifiedSlots,
  UnifiedCenterAvailability,
  UnifiedDateAvailability,
  UnifiedSlotsData,
  UnifiedSlotsResponse,
} from '../types/slots';

interface TransformOptions {
  centerId?: string;
  serviceId?: string;
}

const flattenSlots = (
  date: string,
  center: UnifiedCenterAvailability,
): CalendarSlot[] => {
  const hourlySlots = center.hourly_slots ?? [];
  const halfHourSlots = center.slots ?? [];

  const hourly: CalendarSlot[] = hourlySlots.map((slot) => ({
    time: `${date}T${slot.time}:00`,
    centerId: center.id,
    bookingId: center.booking_id,
    priority: center.priority,
    available: slot.available,
    count: slot.count,
  }));

  const perSlot: CalendarSlot[] = halfHourSlots.map((slot) => ({
    time: slot.time,
    centerId: center.id,
    bookingId: center.booking_id,
    priority: center.priority,
    available: true,
    count: 1,
  }));

  return [...perSlot, ...hourly];
};

const transformCenter = (
  date: string,
  center: UnifiedCenterAvailability,
): CalendarCenterAvailability => ({
  id: center.id,
  bookingId: center.booking_id,
  priority: center.priority,
  totalSlots: center.no_of_slots,
  hourlySlots: center.hourly_slots ?? [],
  slots: flattenSlots(date, center),
});

const transformDate = (
  date: string,
  availability: UnifiedDateAvailability,
): AvailableSlots => {
  const centers = availability.center_ids.map((center) => transformCenter(date, center));
  const slots = centers.flatMap((center) => center.slots);

  return {
    date,
    hasSlots: availability.hasSlots,
    slotsCount: slots.length,
    totalAvailableSlots: availability.totalAvailableSlots,
    slots,
    centers,
  };
};

const transformBookingMap = (
  date: string,
  centers: UnifiedCenterAvailability[],
): BookingMapEntry[] =>
  centers.map((center) => ({
    date,
    centerId: center.id,
    bookingId: center.booking_id,
    priority: center.priority,
    totalSlots: center.no_of_slots,
  }));

const extractRequestedIds = (
  responseData: UnifiedSlotsData,
  options?: TransformOptions,
) => {
  const requestedCenters: string[] | undefined = options?.centerId
    ? [options.centerId]
    : responseData.centers;
  const requestedServices: string[] | undefined = options?.serviceId
    ? [options.serviceId]
    : responseData.services;

  return {
    requestedCenters,
    requestedServices,
  };
};

export const transformUnifiedSlotsResponse = (
  response: UnifiedSlotsResponse,
  options?: TransformOptions,
): TransformedUnifiedSlots | null => {
  if (!response.success || !response.data) {
    return null;
  }

  const {
    date_availability,
    available_dates,
    centers,
    services,
    processing_time_ms,
    future_days_count,
    week_info,
    mode,
  } = response.data;

  const dates = Object.keys(date_availability);

  const availableSlots: AvailableSlots[] = dates.map((date) =>
    transformDate(date, date_availability[date]),
  );

  const bookingMap: BookingMapEntry[] = dates.flatMap((date) =>
    transformBookingMap(date, date_availability[date].center_ids),
  );

  const { requestedCenters, requestedServices } = extractRequestedIds(response.data, options);

  return {
    availableSlots,
    bookingMap,
    availableDates: available_dates,
    centers,
    services,
    processingTimeMs: processing_time_ms,
    futureDaysCount: future_days_count,
    weekInfo: week_info,
    mode,
    requestedCenters,
    requestedServices,
    dateAvailability: date_availability, // Include raw date availability for provider selection
  };
};

