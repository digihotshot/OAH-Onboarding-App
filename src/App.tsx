import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ServerAddressInput } from './components/ServerAddressInput';
import { validateZipCode, ValidationResult } from './utils/zipCodeValidation';
import { useMiddlewareProviders } from './hooks/useMiddlewareProviders';
import { useUniversalCategories, UniversalAddOn, UniversalService } from './hooks/useUniversalCategories';
import { Provider } from './types/middleware';
import { CategoryAccordion } from './components/CategoryAccordion';
import { PricingCalculator } from './components/PricingCalculator';
import { Calendar } from './components/Calendar';
import { UserInfoForm, UserInfo } from './components/UserInfoForm';
import { BookingConfirmation } from './components/BookingConfirmation';
import { FinalConfirmation } from './components/FinalConfirmation';
import { NavigationBar } from './components/NavigationBar';
import { Button } from './components/ui/button';
import { Heading } from './components/ui/heading';
import { StepText } from './components/ui/step-text';
import { useOptimizedSlots } from './hooks/useOptimizedSlots';
import { BottomLeftOverlay } from './components/ImageOverlay';
import { bookingService, GuestAuthStatus } from './services/bookingService';
import { usePersistedBookingState } from './hooks/usePersistedBookingState';
import { GuestCheckModal } from './components/GuestCheckModal';
import { getUserFriendlyErrorMessage, parseApiError } from './utils/errorMessages';

const normalizeGuest = (
  guest: any,
  fallback: { email?: string; phone?: string }
): { id: string | null; name: string; email: string; phone: string } => {
  const candidate = guest || {};
  const email =
    candidate.email ||
    candidate.personal_info?.email ||
    candidate.contact?.email ||
    fallback.email ||
    '';
  const phone =
    candidate.phone ||
    candidate.personal_info?.mobile_phone?.number ||
    candidate.contact?.phone ||
    fallback.phone ||
    '';
  const firstName =
    candidate.firstName ||
    candidate.first_name ||
    candidate.personal_info?.first_name ||
    candidate.contact?.first_name ||
    '';
  const lastName =
    candidate.lastName ||
    candidate.last_name ||
    candidate.personal_info?.last_name ||
    candidate.contact?.last_name ||
    '';
  const nameFromParts = [firstName, lastName].filter(Boolean).join(' ').trim();
  const name = nameFromParts || email || phone || 'Guest';
  const id =
    candidate.id ||
    candidate.Id ||
    candidate.ID ||
    candidate.guest_id ||
    candidate.guestId ||
    candidate.GuestId ||
    candidate.GuestID ||
    candidate.data?.guestId ||
    candidate.data?.guest_id ||
    candidate.personal_info?.guest_id ||
    candidate.personal_info?.guestId ||
    null;

  return {
    id: typeof id === 'string' ? id.toLowerCase() : null,
    name,
    email,
    phone,
  };
};

// Common wrapper component with navigation, main image, and content
const AppWrapper: React.FC<{ children: React.ReactNode; currentStep: number }> = ({ children, currentStep }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#F5F1ED]">
      {/* Main Image - hide on small screens, fixed on md+ */}
      <div className="hidden md:block fixed top-0 right-0 w-[35%] h-screen z-[100]">
        <div className="w-full h-full relative">
          <div className="h-full overflow-hidden " style={{ borderTopLeftRadius: '250px' }}>
            <img
              src="/Main Image.webp"
              alt="Oli At Home Service"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Overlay blocks positioned absolutely over the image */}
          <BottomLeftOverlay currentStep={currentStep} />
        </div>
      </div>

      {/* Navigation Bar */}
      <NavigationBar currentStep={currentStep} />

      {/* Bottom Left Blur Effect - hide on small to reduce clutter */}
      <div
        className="hidden md:block fixed z-[60]"
        style={{
          bottom: '-20%',
          left: '-10%',
          width: '350px',
          height: '350px',
          opacity: 0.6,
          borderRadius: '50%',
          background: '#FAB86F',
          filter: 'blur(150px)'
        }}
      />

      {/* Mobile Top Right Blur Effect */}
      <div
        className="md:hidden fixed z-[60]"
        style={{
          top: '-10%',
          right: '-20%',
          width: '250px',
          height: '250px',
          opacity: 0.5,
          borderRadius: '50%',
          background: '#FAB86F',
          filter: 'blur(120px)'
        }}
      />

      {/* Main Layout Container */}
      <div className="flex flex-col md:flex-row md:py-[150px] py-10 min-h-screen relative z-[80]">
        {/* Left Side - Form Content */}
        <div className="flex-1 md:w-[50%] md:max-w-[55%] w-full relative z-[70] md:px-[3%] px-4 md:pt-0" >
          {children}
        </div>

        {/* Right Side - Spacer for image (md+) */}
        <div className="hidden md:block w-[35%] h-screen" />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // ========== FEATURE FLAG ==========
  // Set to true to filter providers by exact time slot (date + time)
  // Set to false to filter providers by date only (original behavior)
  // This allows easy rollback if needed
  const FILTER_PROVIDERS_BY_TIME_SLOT = true;
  // ==================================
  
  // Persistence hook
  const { restoreState, saveState, clearState } = usePersistedBookingState();
  
  // State management for the booking flow
  const [currentStep, setCurrentStep] = useState(1);
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [zipCodeValidation, setZipCodeValidation] = useState<ValidationResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  
  // Category selection state
  const [selectedServices, setSelectedServices] = useState<UniversalService[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, UniversalAddOn[]>>({});
  
  // User information state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [guestVerification, setGuestVerification] = useState<{
    email?: string;
    phone?: string;
    status: GuestAuthStatus;
    guest?: unknown;
    message?: string;
  } | null>(null);
  const [isGuestCheckModalOpen, setIsGuestCheckModalOpen] = useState(false);
  const [isGuestCheckSubmitting, setIsGuestCheckSubmitting] = useState(false);
  const [guestCheckError, setGuestCheckError] = useState<string | null>(null);
  const [guestCheckDismissed, setGuestCheckDismissed] = useState(false);
  
  // Selected provider state
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerViewOpen, setProviderViewOpen] = useState(false);
  
  // Selected slot information for reservation
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{
    bookingId: string;
    centerId: string;
    serviceId: string;
    priority: number;
  } | null>(null);
  
  // Booking ID from provider selection (preferred over slot info)
  const [providerBookingId, setProviderBookingId] = useState<string | null>(null);
  
  // Confirmation details
  const [confirmationDetails, setConfirmationDetails] = useState<{
    confirmationNumber?: string;
    bookingId?: string;
  } | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  const [isReserving, setIsReserving] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const isMountedRef = useRef(true);
  const hasRestoredStateRef = useRef(false);
  const guestCheckTimerRef = useRef<number | null>(null);

  const transformedSelectedServices = useMemo(() => {
    return selectedServices.map(service => ({
      id: service.id,
      centerIds: service.centerIds || [],
    }));
  }, [selectedServices]);

  const filteredSelectedServices = useMemo(() => {
    if (!selectedProvider) {
      return transformedSelectedServices;
    }

    const providerId = selectedProvider.provider_id;
    return transformedSelectedServices.map(service => ({
      ...service,
      centerIds: service.centerIds.includes(providerId)
        ? [providerId]
        : service.centerIds,
    }));
  }, [transformedSelectedServices, selectedProvider]);

  const {
    availableSlots,
    bookingMap,
    metadata: slotsMetadata,
    loading: isUnifiedCallLoading,
    refetch: fetchUnifiedSlots,
  } = useOptimizedSlots({
    selectedServices: filteredSelectedServices,
    weeks: 4,
    disabled: selectedServices.length === 0,
    autoFetch: false,
  });

  // Get providers from middleware API (moved to top to fix hooks order)
  const { providers: availableProviders, isLoading: providersLoading } = useMiddlewareProviders(zipCode);

  const providerFilteredSlots = useMemo(() => {
    if (!selectedProvider) {
      return availableSlots;
    }

    const providerId = selectedProvider.provider_id;

    return availableSlots.map(slot => {
      const centers = (slot.centers || []).filter(center => center.id === providerId);
      const providerSlots = centers.flatMap(center => center.slots || []);

      return {
        ...slot,
        hasSlots: centers.length > 0 && providerSlots.length > 0,
        slotsCount: providerSlots.length,
        totalAvailableSlots: providerSlots.length,
        slots: providerSlots,
        centers,
      };
    });
  }, [availableSlots, selectedProvider]);

  const providerFilteredBookingForDates = useMemo(() => {
    if (!selectedProvider) {
      return bookingMap;
    }

    const providerId = selectedProvider.provider_id;
    const providerSlotDates = new Set(
      providerFilteredSlots.filter(slot => slot.hasSlots).map(slot => slot.date)
    );

    return bookingMap.filter(entry => entry.centerId === providerId && providerSlotDates.has(entry.date));
  }, [bookingMap, selectedProvider, providerFilteredSlots]);
  
  // Get available providers for the selected slot (moved to top to fix hooks order)
  const availableProvidersForSlot = useMemo((): Array<Provider & { bookingId: string; priority: number }> => {
    if (!selectedDate || !selectedTime) return [];
    
    const isoDate = selectedDate.toISOString().split('T')[0];
    
    if (FILTER_PROVIDERS_BY_TIME_SLOT) {
      // NEW BEHAVIOR: Filter by exact time slot (date + time)
      // Find the slot data for the selected date
      const slotForDate = availableSlots.find(slot => slot.date === isoDate);
      
      if (!slotForDate || !slotForDate.centers) {
        console.log('🔍 No slot data found for date:', isoDate);
        return [];
      }
      
      // Find which centers have slots for the selected time
      const centersWithSelectedTime = slotForDate.centers
        .filter(center => {
          // Check if this center has a slot matching the selected time
          return center.slots?.some(slot => slot.time === selectedTime);
        })
        .map(center => ({
          centerId: center.id,
          bookingId: center.bookingId,
          priority: center.priority
        }));
      
      console.log('🎯 Centers with selected time:', {
        selectedTime,
        centersFound: centersWithSelectedTime.length,
        centerIds: centersWithSelectedTime.map(c => c.centerId)
      });
      
      // Map center IDs to provider objects
      return centersWithSelectedTime
        .map(centerInfo => {
          const provider = availableProviders.find(p => p.provider_id === centerInfo.centerId);
          return provider ? {
            ...provider,
            bookingId: centerInfo.bookingId,
            priority: centerInfo.priority
          } : null;
        })
        .filter((provider): provider is NonNullable<typeof provider> => provider !== null)
        .sort((a, b) => a.priority - b.priority); // Sort by priority
    } else {
      // ORIGINAL BEHAVIOR: Filter by date only
      const bookingsForDate = bookingMap.filter(booking => booking.date === isoDate);
      
      // Map center IDs to provider objects
      return bookingsForDate
        .map(booking => {
          const provider = availableProviders.find(p => p.provider_id === booking.centerId);
          return provider ? {
            ...provider,
            bookingId: booking.bookingId,
            priority: booking.priority
          } : null;
        })
        .filter((provider): provider is NonNullable<typeof provider> => provider !== null)
        .sort((a, b) => a.priority - b.priority); // Sort by priority
    }
  }, [selectedDate, selectedTime, bookingMap, availableProviders, availableSlots, FILTER_PROVIDERS_BY_TIME_SLOT]);

  // Remove the useEffect that sets serviceBookingId to bookingMap[0]
  // useEffect(() => {
  //   if (bookingMap.length > 0 && !serviceBookingId) {
  //     setServiceBookingId(bookingMap[0].bookingId);
  //   }
  // }, [bookingMap, serviceBookingId]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (hasRestoredStateRef.current) {
      return;
    }

    const restoredState = restoreState();
    if (restoredState) {
      console.log('🔄 Restoring booking state from localStorage');
      
      // Restore all state
      setCurrentStep(restoredState.currentStep || 1);
      setAddress(restoredState.address || '');
      setZipCode(restoredState.zipCode || '');
      setZipCodeValidation(restoredState.zipCodeValidation || null);
      
      // Restore date from ISO string
      if (restoredState.selectedDate) {
      setSelectedDate(new Date(restoredState.selectedDate));
      }
      
      setSelectedTime(restoredState.selectedTime);
      setSelectedServices(restoredState.selectedServices || []);
      setSelectedAddOns(restoredState.selectedAddOns || {});
      setUserInfo(restoredState.userInfo || null);
      console.log('🔄 Restored userInfo:', restoredState.userInfo);
      setGuestVerification(restoredState.guestVerification ?? null);
      setSelectedProvider(restoredState.selectedProvider || null);
      setSelectedSlotInfo(restoredState.selectedSlotInfo || null);
      setProviderBookingId(restoredState.providerBookingId || null);
      setGuestId(restoredState.guestId || null);

      console.log('✅ State restored successfully to step', restoredState.currentStep);
    }
    
    hasRestoredStateRef.current = true;
  }, [restoreState]);

  // Scroll to top whenever step changes for better UX
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Save state to localStorage whenever key state changes
  useEffect(() => {
    // Don't save until initial state restoration is complete
    if (!hasRestoredStateRef.current) {
      return;
    }

    saveState({
      currentStep,
      address,
      zipCode,
      zipCodeValidation,
      selectedDate: selectedDate ? selectedDate.toISOString() : null,
      selectedTime,
      selectedServices,
      selectedAddOns,
      userInfo,
      guestVerification,
      selectedProvider,
      selectedSlotInfo,
      providerBookingId,
      guestId,
    });
  }, [
    currentStep,
    address,
    zipCode,
    zipCodeValidation,
    selectedDate,
    selectedTime,
    selectedServices,
    selectedAddOns,
    userInfo,
    guestVerification,
    selectedProvider,
    selectedSlotInfo,
    providerBookingId,
    guestId,
    saveState,
  ]);

  useEffect(() => {
    const clearTimer = () => {
      if (guestCheckTimerRef.current !== null) {
        clearTimeout(guestCheckTimerRef.current);
        guestCheckTimerRef.current = null;
      }
    };

    if (currentStep !== 1) {
      clearTimer();
      setIsGuestCheckModalOpen(false);
      return undefined;
    }

    if (guestVerification?.status === 'authenticated' || guestCheckDismissed) {
      clearTimer();
      return undefined;
    }

    clearTimer();
    guestCheckTimerRef.current = window.setTimeout(() => {
      setGuestCheckError(null);
      setIsGuestCheckModalOpen(true);
      setGuestCheckDismissed(false);
    }, 2000);

    return () => {
      clearTimer();
    };
  }, [currentStep, guestVerification?.status, guestCheckDismissed]);

  const handleGuestCheckClose = () => {
    setIsGuestCheckModalOpen(false);
    setGuestCheckDismissed(true);
    setGuestCheckError(null);
  };

  const handleGuestCheckSubmit = async ({ email, phone }: { email?: string; phone?: string }) => {
    setGuestCheckError(null);
    setIsGuestCheckSubmitting(true);

    try {
      console.log('🔍 Guest check: verifying guest credentials', { email, phone });

      const response = await bookingService.searchGuest({ email, phone });

      const nextState = {
        email,
        phone,
        status: response.status,
        guest: response.guest ?? undefined,
        message: response.message,
      } as const;

      setGuestVerification(nextState);

      if (response.status === 'authenticated') {
        console.log('🔍 Raw guest response from API:', response.guest);
        
        // Extract the actual guest object from the response
        // API returns {guests: [...]} structure, we need guests[0]
        let actualGuest = response.guest;
        if (actualGuest && typeof actualGuest === 'object' && 'guests' in actualGuest && Array.isArray(actualGuest.guests)) {
          actualGuest = actualGuest.guests[0];
          console.log('🔍 Extracted guest from guests array:', actualGuest);
        }
        
        const normalized = normalizeGuest(actualGuest, { email, phone });
        console.log('🔍 Normalized guest data:', normalized);
        
        if (normalized.id) {
          console.log('✅ Setting guestId from modal:', normalized.id);
          setGuestId(normalized.id);
        } else {
          console.error('❌ Guest ID not found in normalized data!');
        }
        
        setUserInfo({
          name: normalized.name,
          email: normalized.email,
          phone: normalized.phone,
        });
        setIsGuestCheckModalOpen(false);
        setGuestCheckDismissed(false);
      } else {
        setGuestCheckError(response.message || 'Guest not found. Please continue with booking.');
      }
    } catch (error) {
      console.error('❌ Guest check failed:', error);
      
      // Parse the error and get user-friendly message
      const apiError = parseApiError(error);
      const message = getUserFriendlyErrorMessage(apiError);
      
      setGuestCheckError(message);
    } finally {
      setIsGuestCheckSubmitting(false);
    }
  };

  // Auto-refetch slots when entering Step 3 (calendar) with selected services but no slot data
  useEffect(() => {
    // Only run after state restoration is complete
    if (!hasRestoredStateRef.current) {
      console.log('⏳ Waiting for state restoration to complete...');
      return;
    }

    console.log('🔍 Calendar auto-fetch check:', {
      currentStep,
      selectedServicesCount: selectedServices.length,
      availableSlotsCount: availableSlots.length,
      isUnifiedCallLoading,
      shouldFetch: currentStep === 3 && selectedServices.length > 0 && availableSlots.length === 0 && !isUnifiedCallLoading
    });

    // If we're on step 3 and have selected services but no available slots, fetch them
    if (currentStep === 3 && selectedServices.length > 0 && availableSlots.length === 0 && !isUnifiedCallLoading) {
      console.log('🔄 Auto-fetching slots for step 3 (page refresh or back navigation)');
      fetchUnifiedSlots().catch(error => {
        console.error('❌ Failed to fetch slots on step 3:', error);
      });
    }
  }, [currentStep, selectedServices, availableSlots.length, isUnifiedCallLoading, fetchUnifiedSlots]);

  // Additional effect: Force fetch slots when on Step 3 with services (more aggressive)
  useEffect(() => {
    if (!hasRestoredStateRef.current) {
      return;
    }

    if (currentStep === 3 && selectedServices.length > 0 && !isUnifiedCallLoading) {
      // Add a small delay to ensure other effects have run
      const timeoutId = setTimeout(() => {
        if (availableSlots.length === 0) {
          console.log('🔄 Force-fetching slots for step 3 (delayed check)');
          fetchUnifiedSlots().catch(error => {
            console.error('❌ Failed to force-fetch slots on step 3:', error);
          });
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, selectedServices.length, availableSlots.length, isUnifiedCallLoading, fetchUnifiedSlots]);

  // Refetch slots when provider is selected
  useEffect(() => {
    if (!hasRestoredStateRef.current) {
      return;
    }

    // Only refetch if we're on the calendar step and a provider is selected
    if (currentStep === 3 && selectedProvider && selectedServices.length > 0) {
      console.log('🔄 Provider selected - refetching slots filtered by provider:', selectedProvider.name);
      fetchUnifiedSlots().catch(error => {
        console.error('❌ Failed to refetch slots for selected provider:', error);
      });
    }
  }, [selectedProvider, currentStep, selectedServices.length, fetchUnifiedSlots]);

  // Convert unified call response to Calendar-compatible format
  

  // Get providers from middleware API (moved to top)
  
  // Stable provider IDs to prevent infinite re-renders
  const prevProviderIdsRef = useRef<string[]>([]);
  const providerIds = useMemo(() => {
    if (!zipCodeValidation?.isValid || availableProviders.length === 0) {
      console.log('🔍 Provider IDs: No valid zipcode or no providers available');
      return [];
    }
    
    const currentIds = availableProviders.map(p => p.provider_id).sort();
    const prevIds = prevProviderIdsRef.current.sort();
    
    // Only update if the IDs actually changed
    if (currentIds.join(',') !== prevIds.join(',')) {
      console.log('🔍 Provider IDs changed:', { from: prevIds, to: currentIds });
      prevProviderIdsRef.current = currentIds;
      return currentIds;
    }
    
    console.log('🔍 Provider IDs unchanged:', currentIds);
    return prevProviderIdsRef.current;
  }, [zipCodeValidation?.isValid, availableProviders]);

  // Fetch categories and services (unified)
  const { 
    categories: universalCategories, 
    categoryServices, 
    isLoading: universalCategoriesLoading, 
    error: universalCategoriesError 
  } = useUniversalCategories(providerIds);
  
  // Booking functionality
  // const { createBooking, getUnifiedSlots, isLoading: isBookingLoading, error: bookingApiError } = useBooking();

  const providerKey = useMemo(() => providerIds.join(','), [providerIds]);

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }

    // Reset selected services when provider set changes
      setSelectedServices([]);
      setSelectedAddOns({});
    
    // Select the first provider (highest priority) when providers are available
    if (availableProviders.length > 0) {
      setSelectedProvider(availableProviders[0]);
    } else {
      setSelectedProvider(null);
    }
  }, [providerKey, availableProviders]);


  // Debug logging (only in development) - wrapped in useEffect to prevent continuous logging
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('🔍 App state update:', {
        currentStep,
        zipCode,
        providerCount: availableProviders.length,
        providerIds: providerIds.length,
        zipCodeValidation: zipCodeValidation?.isValid,
        categoriesCount: universalCategories.length,
        selectedServicesCount: selectedServices.length,
        availableProviders: availableProviders.map(p => ({ id: p.provider_id, name: p.name })),
        providerIdsArray: providerIds
      });
    }
  }, [
    currentStep,
    zipCode,
    availableProviders.length,
    providerIds.length,
    zipCodeValidation?.isValid,
    universalCategories.length,
    selectedServices.length
  ]);

  // Handler functions
  const handleAddressSelect = async (selectedAddress: string, zipcode: string) => {
    console.log('🎯 Address selected:', selectedAddress, 'Zipcode:', zipcode);
    setAddress(selectedAddress);
    setZipCode(zipcode);
    
    try {
      const validation = await validateZipCode(zipcode);
      setZipCodeValidation(validation);
      console.log('✅ Zipcode validation result:', validation);
    } catch (error) {
      console.error('Error validating zipcode:', error);
      setZipCodeValidation({
        isValid: false,
        availableProviders: [],
        message: 'Unable to verify service area. Please try again.'
      });
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(undefined); // Reset time when date changes
  };

  const handleTimeSelect = (time: string, slotInfo?: any) => {
    setSelectedTime(time);
    
    if (slotInfo) {
      // Debug: Log the complete slot structure to understand what fields are available
      console.log('🔍 Complete slot structure:', JSON.stringify(slotInfo, null, 2));
      console.log('🔍 Available slot keys:', Object.keys(slotInfo));
      
      // Look for booking ID in various possible field names
      const possibleBookingIdFields = [
        'BookingId', 'bookingId', 'booking_id', 'id', 'ID', 'slotId', 'slot_id',
        'reservationId', 'reservation_id', 'appointmentId', 'appointment_id'
      ];
      
      let foundBookingId = null;
      for (const field of possibleBookingIdFields) {
        if (slotInfo[field] && slotInfo[field] !== 'placeholder-booking-id') {
          foundBookingId = slotInfo[field];
          console.log(`✅ Found booking ID in field '${field}':`, foundBookingId);
          break;
        }
      }
      
      // Store the slot information for reservation
      setSelectedSlotInfo({
        bookingId: foundBookingId || 'placeholder-booking-id',
        centerId: slotInfo.CenterId || slotInfo.centerId || slotInfo.center_id || 'placeholder-center-id',
        serviceId: slotInfo.ServiceId || slotInfo.serviceId || slotInfo.service_id || 'placeholder-service-id',
        priority: slotInfo.Priority || slotInfo.priority || 999
      });
      
      console.log('🎯 Time selected with slot info:', time, slotInfo);
      console.log('🎯 Final extracted slot info:', {
        bookingId: foundBookingId || 'placeholder-booking-id',
        centerId: slotInfo.CenterId || slotInfo.centerId || slotInfo.center_id || 'placeholder-center-id',
        serviceId: slotInfo.ServiceId || slotInfo.serviceId || slotInfo.service_id || 'placeholder-service-id',
        priority: slotInfo.Priority || slotInfo.priority || 999
      });
    } else {
      console.log('🎯 Time selected without slot info:', time);
    }
  };

  const handleProviderSelection = useCallback(() => {
    if (!zipCode) {
      alert('Please enter your address first.');
      return;
    }

    console.log('📋 Opening provider selection list');
    setProviderViewOpen(true);

    setSelectedSlotInfo(null);
    setProviderBookingId(null);
    setSelectedProvider(null);
  }, [zipCode]);

  const handleCalendarProviderSelect = useCallback((provider: Provider) => {
    console.log('🎯 Provider selected from calendar view:', provider);
    setSelectedProvider(provider);
    setProviderViewOpen(false);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setSelectedSlotInfo(null);
    setProviderBookingId(null);
    // Note: Slot refetch will be triggered by the useEffect watching selectedProvider
  }, []);






  const handleServiceSelect = (service: UniversalService) => {
    console.log('🎯 Service selected:', service);
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        setSelectedAddOns(current => {
          if (!current[service.id]) {
            return current;
          }
          const { [service.id]: _removed, ...rest } = current;
          return rest;
        });
        return prev.filter(s => s.id !== service.id);
      } else {
        const alreadyExists = prev.some(existing => existing.id === service.id);
        if (alreadyExists) {
          return prev;
        }
        return [...prev, service];
      }
    });
  };

  const handleAddOnToggle = (
    service: UniversalService,
    addOn: UniversalAddOn,
    isCurrentlySelected: boolean
  ) => {
    setSelectedAddOns(prev => {
      const currentAddOns = prev[service.id] || [];
      let updatedForService: UniversalAddOn[];

      if (isCurrentlySelected) {
        updatedForService = currentAddOns.filter(item => item.id !== addOn.id);
      } else {
        updatedForService = [...currentAddOns, addOn];
      }

      const nextState = { ...prev };
      if (updatedForService.length === 0) {
        delete nextState[service.id];
      } else {
        nextState[service.id] = updatedForService;
      }
      return nextState;
    });
  };

  const handleServiceSelectionNext = async () => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service before proceeding.');
      return;
    }

    console.log('🔄 Starting unified slot fetch from Step 2 Next click');
    console.log('🔍 Current authentication state before advancing:', {
      guestId,
      guestVerificationStatus: guestVerification?.status,
      willPreserveGuestId: !!(guestId && guestVerification?.status === 'authenticated')
    });

    // Reset state related to previous selections
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setSelectedSlotInfo(null);
    setProviderBookingId(null);  // Also reset providerBookingId

    setGuestId(prev => {
      if (prev && guestVerification?.status === 'authenticated') {
        console.log('✅ Preserving authenticated guestId:', prev);
        return prev;
      }
      console.log('ℹ️ Clearing guestId (guest not authenticated)');
      return null;
    });

    // Move to step 3 immediately (calendar view)
    setCurrentStep(3);

    // Trigger unified fetch for the selected services
    fetchUnifiedSlots().catch(error => {
      console.error('❌ Failed to fetch optimized slot data:', error);
    });
  };


  const handleBack = () => {
    if (currentStep > 1) {
      let previousStep = currentStep - 1;
      
      // Skip user info step (4) when going back if guest is authenticated
      if (currentStep === 5 && guestVerification?.status === 'authenticated' && guestId) {
        previousStep = 3; // Go directly to calendar
        console.log('✅ Authenticated guest - skipping back to calendar (step 3)');
      }
      
      setCurrentStep(previousStep);
      
      // If going back to step 3 (calendar) and we have services but no slots, refetch
      if (previousStep === 3 && selectedServices.length > 0 && availableSlots.length === 0) {
        console.log('🔄 Refetching slots when navigating back to calendar');
        fetchUnifiedSlots().catch(error => {
          console.error('❌ Failed to fetch slots when navigating back:', error);
        });
      }
    }
  };


  const handleUserInfoNext = async (userData: UserInfo) => {
    setReservationError(null);
    setIsReserving(true);

    try {
      if (!selectedDate || !selectedTime) {
        throw new Error('Selected date or time is missing.');
      }
      const sanitizedPhone = userData.phone.replace(/[^\d+]/g, '').replace(/\D/g, '');

      if (guestId) {
        setUserInfo(userData);
        setGuestVerification(prev => ({
          email: userData.email,
          phone: sanitizedPhone || userData.phone,
          status: 'authenticated',
          guest: prev?.guest,
          message: prev?.message ?? 'Guest already selected.',
        }));
        setCurrentStep(5);
        return;
      }

      let foundExistingGuest = false;

      try {
        const searchResponse = await bookingService.searchGuest({
          email: userData.email,
          phone: sanitizedPhone || undefined,
        });

        if (searchResponse.status === 'authenticated' && searchResponse.guest) {
          // Extract the actual guest object from the response
          // API returns {guests: [...]} structure, we need guests[0]
          let actualGuest = searchResponse.guest;
          if (actualGuest && typeof actualGuest === 'object' && 'guests' in actualGuest && Array.isArray(actualGuest.guests)) {
            actualGuest = actualGuest.guests[0];
          }
          
          const normalized = normalizeGuest(actualGuest, {
            email: userData.email,
            phone: sanitizedPhone || userData.phone,
          });

          if (normalized.id) {
            const resolvedUserInfo: UserInfo = {
              name: userData.name || normalized.name,
              email: normalized.email || userData.email,
              phone: userData.phone || normalized.phone,
            };

            setGuestId(normalized.id);
            setUserInfo(resolvedUserInfo);
            setGuestVerification({
              email: resolvedUserInfo.email,
              phone: normalized.phone || sanitizedPhone || undefined,
              status: 'authenticated',
              guest: searchResponse.guest ?? undefined,
              message: searchResponse.message || 'Guest found.',
            });

            foundExistingGuest = true;
          }
        }
      } catch (searchError) {
        console.warn('ℹ️ Guest search failed, proceeding to create guest.', searchError);
        
        // Parse the error to check if it's a network issue
        const apiError = parseApiError(searchError);
        // If it's a DNS/network error, throw it to show to the user
        if (apiError.message && (apiError.message.includes('ENOTFOUND') || apiError.message.includes('getaddrinfo'))) {
          throw searchError;
        }
        // Otherwise, continue to create guest (guest might not exist yet)
      }

      if (foundExistingGuest) {
        setIsReserving(false);
        setCurrentStep(5);
        return;
      }

      const initialCenterId = selectedSlotInfo?.centerId ?? selectedProvider?.provider_id ?? undefined;

      if (!initialCenterId) {
        throw new Error('Center information is missing for guest creation.');
      }

      // Only create guest - no select-provider or reserve calls
      const preparedGuestId = await bookingService.createGuest(
        userData,
        guestId ?? undefined,
        initialCenterId
      );

      if (!preparedGuestId) {
        throw new Error('Failed to create guest profile. Please try again.');
      }

      setGuestId(preparedGuestId);
      setUserInfo(userData);

      // Move to next step (booking confirmation)
      setCurrentStep(5);
    } catch (error) {
      console.error('❌ Guest creation failed:', error);
      
      // Parse the error and get user-friendly message
      const apiError = parseApiError(error);
      const message = getUserFriendlyErrorMessage(apiError);
      
      setReservationError(message);
    } finally {
      setIsReserving(false);
    }
  };

  const handleBookingConfirm = async () => {
    if (!userInfo || !selectedProvider || !selectedDate || !selectedTime || !guestId) {
      alert('Booking information is missing. Please go back and try again.');
      return;
    }

    setIsConfirming(true);

    try {
      console.log('📋 Step 1: Calling select-provider endpoint');
      console.log('📋 Selected provider:', selectedProvider);
      
      // Step 1: Call select-provider endpoint with selected provider, guest_id, and service IDs
      const dateString = selectedDate.toISOString().split('T')[0];
      const serviceIds = selectedServices.map(service => service.id);
      
      // Construct dateAvailability object with the selected center_id
      const dateAvailability = {
        center_ids: [selectedProvider.provider_id],
        date: dateString
      };
      
      const providerSelectionResult = await bookingService.selectProvider({
        date: dateString,
        slotTime: selectedTime,
        centerId: selectedProvider.provider_id,
        centers: [selectedProvider.provider_id],
        services: serviceIds,
        guestId: guestId,
        bookings: [],
        dateAvailability: dateAvailability
      });
      
      if (!providerSelectionResult.success || !providerSelectionResult.bookingId) {
        throw new Error(providerSelectionResult.message || 'Failed to select provider');
      }
      
      const bookingId = providerSelectionResult.bookingId;
      console.log('✅ Step 1 complete: Provider selected, booking ID:', bookingId);
      
      // Step 2: Call reserve endpoint with the booking_id
      console.log('📋 Step 2: Calling reserve endpoint with booking ID:', bookingId);
      
      const reservationResult = await bookingService.reserveSlot({
        providerBookingId: bookingId,
        userInfo: {
          name: userInfo.name,
          email: userInfo.email,
          phone: userInfo.phone
        },
        selectedServices: selectedServices.map(service => ({
          id: service.id,
          name: service.name
        })),
        selectedDate: dateString,
        selectedTime: selectedTime,
        address: address,
        zipCode: zipCode,
        guestId: guestId
      });
      
      if (!reservationResult.success) {
        throw new Error(reservationResult.message || 'Reservation failed');
      }
      
      console.log('✅ Step 2 complete: Slot reserved successfully');
      console.log('✅ Reservation details:', reservationResult);
      
      // Step 3: Call confirm endpoint with the booking ID
      // According to Zenoti documentation, only accepts optional notes and group_name fields
      console.log('📋 Step 3: Calling confirm endpoint with booking ID:', bookingId);
      
      const confirmationResult = await bookingService.confirmBooking(bookingId);
      
      if (!confirmationResult.success) {
        throw new Error(confirmationResult.message || 'Confirmation failed');
      }
      
      console.log('✅ Step 3 complete: Booking confirmed successfully');
      console.log('✅ Confirmation details:', confirmationResult);
      
      // Step 4: Update confirmation details and move to final confirmation
      setConfirmationDetails({
        confirmationNumber: confirmationResult.confirmationNumber || reservationResult.confirmationNumber,
        bookingId: confirmationResult.bookingId || reservationResult.bookingId || bookingId
      });
      
      // Clear persisted state since booking is complete
      clearState();
      console.log('🗑️ Cleared persisted state after successful booking');
      
      // Move to final confirmation page
      setCurrentStep(6);
      
    } catch (error) {
      console.error('❌ Booking confirmation failed:', error);
      alert(`Booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConfirming(false);
    }
  };

  // Step 1: Address Input
  if (currentStep === 1) {
    return (
      <AppWrapper currentStep={currentStep}>
        <div className="min-h-screen flex flex-col items-center md:items-stretch">

          {/* Step Text */}
          <div className="mb-8 text-center md:text-left">
            <StepText>STEP 1 OF 4</StepText>
            <Heading>Enter your address</Heading>
          </div>

          {/* Address Input */}
          <div className="w-full max-w-lg mb-6 md:mb-12 mx-auto md:mx-0">
            <ServerAddressInput
              value={address}
              onChange={setAddress}
              onAddressSelect={handleAddressSelect}
              placeholder="1493 Providence Lane, Springfield, IL, USA"
            />
          </div>

          {/* Validation Message - Only show errors */}
          {zipCodeValidation && !zipCodeValidation.isValid && zipCodeValidation.message && (
            <div className="max-w-lg w-full p-6 rounded-xl mb-12 bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">
                {zipCodeValidation.message}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="w-full max-w-lg mx-auto md:mx-0 flex justify-center md:justify-start items-center gap-6 md:gap-12">
            
            <Button size="default"
              onClick={() => {
                if (zipCodeValidation?.isValid) {
                  setCurrentStep(2);
                }
              }}
              disabled={!zipCodeValidation?.isValid}
              variant={zipCodeValidation?.isValid ? "black" : "disabled"}
              className="w-full md:w-auto"
            >
              Next
            </Button>
          </div>
        </div>

        <GuestCheckModal
          isOpen={isGuestCheckModalOpen}
          onClose={handleGuestCheckClose}
          onSubmit={handleGuestCheckSubmit}
          isSubmitting={isGuestCheckSubmitting}
          initialEmail={guestVerification?.email}
          initialPhone={guestVerification?.phone}
          error={guestCheckError}
        />
      </AppWrapper>
    );
  }

  // Step 2: Service Selection with Categories
  if (currentStep === 2) {
    return (
      <AppWrapper currentStep={currentStep}>
        <div className="min-h-screen flex flex-col">

          {/* Step Text */}
          <div className="mb-8 text-center md:text-left">
            <StepText>STEP 2 OF 4</StepText>
            <Heading>Choose your treatment</Heading>
            </div>

          {/* Categories and Services List */}
          <div className="max-w-4xl w-full mb-8">
            {universalCategoriesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700">Error loading categories: {universalCategoriesError}</p>
            </div>
          )}

            <CategoryAccordion
              categories={universalCategories}
              categoryServices={categoryServices}
              selectedServices={selectedServices}
              selectedAddOns={selectedAddOns}
              onServiceSelect={handleServiceSelect}
              onAddOnToggle={handleAddOnToggle}
              isLoading={universalCategoriesLoading}
            />
            
          </div>

          {/* Pricing Calculator */}
          <div className="max-w-4xl mb-12 w-full">
            <PricingCalculator
              selectedServices={selectedServices}
              selectedAddOns={selectedAddOns}
            />
            </div>

          {/* Navigation Buttons */}
          <div className="max-w-lg w-full flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-12">
            <Button
              onClick={handleBack}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              onClick={handleServiceSelectionNext}
              disabled={selectedServices.length === 0}
              variant={selectedServices.length > 0 ? "black" : "disabled"}
              className="w-full md:w-auto"
            >
              Next
            </Button>
          </div>
      </div>
      </AppWrapper>
    );
  }

  // Step 3: Calendar Selection
  if (currentStep === 3) {
    return (
      <AppWrapper currentStep={currentStep}>
        <div className="min-h-screen">
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <StepText>STEP 3 OF 4</StepText>
            <Heading>
              {providerViewOpen ? 'Available Providers' : 'Select date & time'}
            </Heading>
          </div>

          {/* Calendar Component */}
          <div className="max-w-6xl w-full mb-12">
            <Calendar
              onDateSelect={handleDateSelect}
              onTimeSelect={handleTimeSelect}
              onProviderSelect={handleCalendarProviderSelect}
              onBackToCalendar={() => {
                setProviderViewOpen(false);
                setSelectedProvider(null);
                setSelectedSlotInfo(null);
                setSelectedTime(undefined);
              }}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedProviderId={selectedProvider?.provider_id ?? null}
              isLoading={isUnifiedCallLoading}
              availableSlots={providerViewOpen ? providerFilteredSlots : availableSlots}
              availableDatesCount={slotsMetadata?.availableDates?.filter(date => {
                const targetBookingMap = providerViewOpen ? providerFilteredBookingForDates : bookingMap;
                return targetBookingMap.some(booking => booking.date === date);
              }).length || 0}
              futureDaysCount={slotsMetadata?.futureDaysCount || 0}
              providers={availableProviders}
              providersLoading={providersLoading}
              showProviderList={providerViewOpen}
              zipCode={zipCode}
              onToggleProviderList={setProviderViewOpen}
              providerEmptyMessage={zipCode ? `No providers found for ${zipCode}. Please try a different address.` : 'Enter your address to view providers.'}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="max-w-6xl w-full flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-12">
            <Button
              onClick={() => setCurrentStep(2)}
              variant="ghost"
            >
              
              <span>Back</span>
            </Button>
            <Button
              onClick={() => {
                if (!selectedDate || !selectedTime) {
                  alert('Please select a date and time to continue.');
                  return;
                }
                setCurrentStep(4);
              }}
              disabled={!selectedDate || !selectedTime}
              variant={selectedDate && selectedTime ? "black" : "disabled"}
              className="w-full md:w-auto"
            >
              <span>Next</span>
            </Button>
          </div>
        </div>
      </AppWrapper>
    );
  }

  // Step 4: User Information Input
  if (currentStep === 4) {
    console.log('🔄 Rendering UserInfoForm with userInfo:', userInfo);
    return (
      <AppWrapper currentStep={currentStep}>
        <UserInfoForm
          onNext={handleUserInfoNext}
          onBack={handleBack}
          isSubmitting={isReserving}
          errorMessage={reservationError}
          initialValues={userInfo}
          onUserInfoChange={setUserInfo}
        />
      </AppWrapper>
    );
  }

  // Step 5: Booking Confirmation
  if (currentStep === 5) {

    const handleProviderChange = (providerId: string) => {
      const newProvider = availableProvidersForSlot.find(p => p.provider_id === providerId);
      if (newProvider) {
        setSelectedProvider(newProvider);
        setProviderBookingId(newProvider.bookingId);
        
        // Update selectedSlotInfo with new provider details
        setSelectedSlotInfo(prev => prev ? {
          ...prev,
          centerId: newProvider.provider_id,
          bookingId: newProvider.bookingId,
          priority: newProvider.priority
        } : null);
        
        console.log('🔄 Provider changed to:', newProvider.name, 'Booking ID:', newProvider.bookingId);
      }
    };

    return (
      <AppWrapper currentStep={currentStep}>
        <BookingConfirmation
          userInfo={userInfo!}
          selectedServices={selectedServices}
          selectedAddOns={selectedAddOns}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          address={address}
          selectedProvider={selectedProvider}
          availableProviders={availableProvidersForSlot}
          onProviderChange={handleProviderChange}
          onConfirm={handleBookingConfirm}
          onBack={handleBack}
          onEditAddress={() => setCurrentStep(1)}
          onEditTreatment={() => setCurrentStep(2)}
          onEditDateTime={() => setCurrentStep(3)}
          isConfirming={isConfirming}
        />
      </AppWrapper>
    );
  }

  // Step 6: Final Confirmation Page
  return (
    <AppWrapper currentStep={currentStep}>
      <FinalConfirmation
        userInfo={userInfo!}
        selectedServices={selectedServices}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        address={address}
        zipCode={zipCode}
        confirmationNumber={confirmationDetails?.confirmationNumber}
        bookingId={confirmationDetails?.bookingId}
        providerName={selectedProvider?.name}
        providerImageUrl={selectedProvider?.imageUrl}
        onStartNewBooking={() => {
          // Clear persisted state
          clearState();
          
          // Reset all state and start over
          setCurrentStep(1);
          setAddress('');
          setZipCode('');
          setZipCodeValidation(null);
          setSelectedDate(undefined);
          setSelectedTime(undefined);
          setSelectedServices([]);
          setUserInfo(null);
          setSelectedProvider(null);
          setSelectedSlotInfo(null);
          setProviderBookingId(null);
          setConfirmationDetails(null);
          setGuestId(null);
        }}
      />
    </AppWrapper>
  );
};

export default App;
