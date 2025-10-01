import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ServerAddressInput } from './components/ServerAddressInput';
import { validateZipCode, ValidationResult } from './utils/zipCodeValidation';
import { useMiddlewareProviders } from './hooks/useMiddlewareProviders';
import { useUniversalCategories, UniversalService } from './hooks/useUniversalCategories';
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
import { bookingService, type ReservationRequest } from './services/bookingService';
import { usePersistedBookingState } from './hooks/usePersistedBookingState';

// Common wrapper component with navigation, main image, and content
const AppWrapper: React.FC<{ children: React.ReactNode; currentStep: number }> = ({ children, currentStep }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#F5F1ED]">
      {/* Main Image - hide on small screens, fixed on md+ */}
      <div className="hidden md:block fixed top-0 right-0 w-[35%] h-screen z-[100]">
        <div className="w-full h-full relative">
          <div className="h-full overflow-hidden " style={{ borderTopLeftRadius: '250px' }}>
            <img
              src="/Main Image.jpg"
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
  
  // User information state
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  // Selected provider state
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  
  // Selected slot information for reservation
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{
    bookingId: string;
    centerId: string;
    serviceId: string;
    priority: number;
  } | null>(null);
  
  // Booking ID from provider selection (preferred over slot info)
  const [providerBookingId, setProviderBookingId] = useState<string | null>(null);
  
  // Provider selection loading state
  const [isSelectingProvider, setIsSelectingProvider] = useState(false);
  
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

  const transformedSelectedServices = useMemo(() => 
    selectedServices.map(service => ({
      id: service.id,
      centerIds: service.centerIds || [],
    })),
    [selectedServices]
  );

  const {
    availableSlots,
    bookingMap,
    metadata: slotsMetadata,
    dateAvailability,
    loading: isUnifiedCallLoading,
    refetch: fetchUnifiedSlots,
  } = useOptimizedSlots({
    selectedServices: transformedSelectedServices,
    weeks: 4,
    disabled: selectedServices.length === 0,
    autoFetch: false,
  });

  // Get providers from middleware API (moved to top to fix hooks order)
  const { providers: availableProviders } = useMiddlewareProviders(zipCode);
  
  // Get available providers for the selected slot (moved to top to fix hooks order)
  const availableProvidersForSlot = useMemo((): Array<Provider & { bookingId: string; priority: number }> => {
    if (!selectedDate || !selectedTime) return [];
    
    const isoDate = selectedDate.toISOString().split('T')[0];
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
  }, [selectedDate, selectedTime, bookingMap, availableProviders]);

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
      setUserInfo(restoredState.userInfo || null);
      console.log('🔄 Restored userInfo:', restoredState.userInfo);
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
      userInfo,
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
    userInfo,
    selectedProvider,
    selectedSlotInfo,
    providerBookingId,
    guestId,
    saveState,
  ]);

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

  const handleProviderSelection = async () => {
    if (!selectedDate || !selectedTime || !selectedSlotInfo) {
      alert('Please select a date and time before proceeding.');
      return;
    }

    setIsSelectingProvider(true);
    
    try {
      console.log('🔄 Selecting provider for slot:', selectedSlotInfo);
      
      const dateString = selectedDate.toISOString().split('T')[0];
      
      const bookingsForDate = bookingMap.filter(booking => booking.date === dateString);
      
      if (bookingsForDate.length === 0) {
        console.error('❌ No booking data found for selected date:', {
          selectedDate: dateString,
          availableBookingDates: Array.from(new Set(bookingMap.map(b => b.date)))
        });
        throw new Error('No booking data available for the selected date. Please go back to step 2 and try again.');
      }
      
      console.log('✅ Using booking map from optimized slots - no extra API call needed!');
      console.log('📊 Booking map snapshot:', {
        selectedDate: dateString,
        totalBookings: bookingMap.length,
        bookingsForSelectedDate: bookingsForDate
      });
      
      // Find the booking ID for the selected slot
      let foundBookingId = null;
      let selectedCenterId = null;
      
      // Look for the booking ID in the slot info first
      if (selectedSlotInfo.bookingId && selectedSlotInfo.bookingId !== 'placeholder-booking-id') {
        foundBookingId = selectedSlotInfo.bookingId;
        selectedCenterId = selectedSlotInfo.centerId;
        console.log('🎯 Using booking ID from slot info:', foundBookingId, 'center:', selectedCenterId);
      } else {
        // Fallback: find the highest priority booking from cached booking_mapping
        const sortedBookings = bookingsForDate.sort((a, b) => {
          if (a.priority !== undefined && b.priority !== undefined) {
            return a.priority - b.priority;
          }
          return a.centerId.localeCompare(b.centerId);
        });
        
        if (sortedBookings.length > 0) {
          const selectedBooking = sortedBookings[0]; // Take the first one (highest priority)
          foundBookingId = selectedBooking.bookingId;
          selectedCenterId = selectedBooking.centerId;
          console.log('🎯 Using highest priority booking from booking map:', foundBookingId, 'center:', selectedCenterId);
        }
      }
      
      if (!foundBookingId) {
        throw new Error('No booking ID found for the selected slot');
      }
      
      // Store the booking ID
      setProviderBookingId(foundBookingId);
      console.log('🎯 Captured booking ID for provider selection:', foundBookingId);

      // Persist center details alongside the slot info for reservation
      setSelectedSlotInfo(prev => {
        const fallbackPriority = bookingsForDate.find(booking => booking.bookingId === foundBookingId)?.priority ?? prev?.priority ?? 999;
        const resolvedCenterId = selectedCenterId ?? prev?.centerId ?? 'placeholder-center-id';
        const resolvedServiceId = prev?.serviceId ?? 'placeholder-service-id';
        return {
          bookingId: foundBookingId,
          centerId: resolvedCenterId,
          serviceId: resolvedServiceId,
          priority: fallbackPriority,
        };
      });

      // Update the selected provider, prefer actual provider data when available
      const matchedProvider = selectedCenterId
        ? availableProviders.find(provider => provider.provider_id === selectedCenterId)
        : undefined;

      setSelectedProvider(
        matchedProvider ?? {
          provider_id: selectedCenterId || 'unknown',
          name: `Center ${selectedCenterId || 'Unknown'}`,
          description: 'Selected based on priority',
          address: '',
          city: '',
          state: '',
          zipcode: '',
          phone: '',
        }
      );
      
      // Proceed to next step
      setCurrentStep(4);
      
    } catch (error) {
      console.error('❌ Provider selection failed:', error);
      alert(`Provider selection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSelectingProvider(false);
    }
  };





  const handleServiceSelect = (service: UniversalService) => {
    console.log('🎯 Service selected:', service);
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) {
        // Remove service if already selected
        return prev.filter(s => s.id !== service.id);
      } else {
        // Add service if not selected
        return [...prev, service];
      }
    });
  };

  const handleServiceSelectionNext = async () => {
    if (selectedServices.length === 0) {
      alert('Please select at least one service before proceeding.');
      return;
    }

    console.log('🔄 Starting unified slot fetch from Step 2 Next click');

    // Reset state related to previous selections
    setSelectedDate(undefined);
    setSelectedTime(undefined);
    setSelectedSlotInfo(null);
    setProviderBookingId(null);  // Also reset providerBookingId
    setGuestId(null);

    // Move to step 3 immediately (calendar view)
    setCurrentStep(3);

    // Trigger unified fetch for the selected services
    fetchUnifiedSlots().catch(error => {
      console.error('❌ Failed to fetch optimized slot data:', error);
    });
  };


  const handleBack = () => {
    if (currentStep > 1) {
      const previousStep = currentStep - 1;
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

      const initialCenterId = selectedSlotInfo?.centerId ?? selectedProvider?.provider_id ?? undefined;

      if (!initialCenterId) {
        throw new Error('Center information is missing for guest creation.');
      }

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
      setConfirmationDetails(null);

      const isoDate = selectedDate.toISOString().split('T')[0];

      const serviceIds = selectedServices
        .map(service => service.id)
        .filter((id): id is string => Boolean(id));

      if (serviceIds.length === 0) {
        throw new Error('At least one service must be selected to reserve a slot.');
      }

      const bookingsForDate = bookingMap.filter(booking => booking.date === isoDate);

      if (bookingsForDate.length === 0) {
        throw new Error('No booking data available for the selected date. Please restart the selection process.');
      }

      const uniqueCenters = Array.from(new Set(bookingsForDate.map(booking => booking.centerId)));

      let finalBookingId = providerBookingId ?? selectedSlotInfo?.bookingId ?? null;
      let finalCenterId = initialCenterId;
      let finalPriority = selectedSlotInfo?.priority;
      let finalServiceId = selectedSlotInfo?.serviceId ?? serviceIds[0];
      let slotDetailsForReservation = selectedSlotInfo;

      try {
        const providerSelectionResult = await bookingService.selectProvider({
          date: isoDate,
          slotTime: selectedTime,
          bookingId: finalBookingId ?? undefined,
          centers: uniqueCenters,
          services: serviceIds,
          guestId: preparedGuestId,
          bookings: bookingsForDate.map(booking => ({
            centerId: booking.centerId,
            centerName:
              availableProviders.find(provider => provider.provider_id === booking.centerId)?.name ??
              `Center ${booking.centerId}`,
            bookingId: booking.bookingId,
            success: true,
          })),
          dateAvailability: dateAvailability?.[isoDate], // Pass date availability for the selected date
        });

        const selectedProviderInfo = providerSelectionResult.data?.selectedProvider ?? null;
        const rawSelectedProvider =
          (providerSelectionResult.rawResponse as Record<string, any> | undefined)?.data?.selectedProvider ??
          (providerSelectionResult.rawResponse as Record<string, any> | undefined)?.selectedProvider ??
          undefined;
        const rawData = providerSelectionResult.rawResponse as Record<string, any> | undefined;
        const resolvedBookingId =
          providerSelectionResult.bookingId ??
          selectedProviderInfo?.bookingId ??
          rawSelectedProvider?.booking_id ??
          rawData?.data?.booking_id ??
          rawData?.data?.bookingId ??
          rawData?.booking_id ??
          rawData?.bookingId ??
          null;

        if (!resolvedBookingId) {
          throw new Error('Provider selection did not return a booking ID.');
        }

        const resolvedCenterFromSelection =
          providerSelectionResult.selectedCenterId ??
          selectedProviderInfo?.centerId ??
          rawSelectedProvider?.center_id ??
          rawData?.data?.center_id ??
          rawData?.data?.centerId ??
          rawData?.center_id ??
          rawData?.centerId ??
          finalCenterId;

        finalBookingId = resolvedBookingId;
        finalCenterId = resolvedCenterFromSelection ?? finalCenterId;

        const bookingDetailsForCenter = bookingsForDate.find(booking => booking.centerId === finalCenterId);
        const resolvedPriority = bookingDetailsForCenter?.priority ?? finalPriority ?? 999;
        finalPriority = resolvedPriority;
        finalServiceId = finalServiceId ?? serviceIds[0];

        if (!finalBookingId) {
          throw new Error('Provider selection did not return a booking ID.');
        }

        const updatedSlotDetails = {
          bookingId: finalBookingId,
          centerId: finalCenterId,
          serviceId: finalServiceId,
          priority: finalPriority,
        };

        slotDetailsForReservation = updatedSlotDetails;
        setSelectedSlotInfo(updatedSlotDetails);
        setProviderBookingId(finalBookingId);

        if (finalCenterId) {
          const matchedProvider = availableProviders.find(provider => provider.provider_id === finalCenterId);
          setSelectedProvider(
            matchedProvider ?? {
              provider_id: finalCenterId,
              name: `Center ${finalCenterId}`,
              description: 'Selected based on priority',
              address: '',
              city: '',
              state: '',
              zipcode: '',
              phone: '',
            }
          );
        }
      } catch (error) {
        console.error('❌ Provider selection after guest creation failed:', error);
        throw new Error(
          error instanceof Error
            ? error.message
            : 'Unable to select provider for reservation. Please try again.'
        );
      }

      if (!finalBookingId) {
        throw new Error('Missing booking ID for reservation.');
      }

      const ensuredBookingId = finalBookingId;

      if (!finalCenterId) {
        throw new Error('Missing center information for reservation.');
      }

      const ensuredCenterId = finalCenterId;

      if (!finalServiceId) {
        throw new Error('Missing service information for reservation.');
      }

      const ensuredServiceId = finalServiceId;

      const priorityForReservation = finalPriority ?? 999;

      if (!slotDetailsForReservation) {
        slotDetailsForReservation = {
          bookingId: ensuredBookingId,
          centerId: ensuredCenterId,
          serviceId: ensuredServiceId,
          priority: priorityForReservation,
        };
        setSelectedSlotInfo(slotDetailsForReservation);
      }

      const reservationRequest: ReservationRequest = {
        bookingId: ensuredBookingId,
        providerBookingId: ensuredBookingId,
        userInfo: userData,
        selectedServices: selectedServices.map(service => ({
          id: service.id,
          name: service.name,
        })),
        selectedDate: isoDate,
        selectedTime,
        date: isoDate,
        time: selectedTime,
        address,
        zipCode,
        centerId: ensuredCenterId,
        slotPriority: priorityForReservation,
        serviceIds,
        guestId: preparedGuestId,
      };

      const response = await bookingService.reserveSlot(reservationRequest);

      if (!response.success) {
        throw new Error(response.message || 'Reservation failed.');
      }

      setConfirmationDetails({
        bookingId: response.bookingId,
        confirmationNumber: response.confirmationNumber,
      });
      if (response.guestId) {
        setGuestId(response.guestId);
      } else if (response.guest?.id) {
        setGuestId(response.guest.id);
      }

      setCurrentStep(5);
    } catch (error) {
      console.error('❌ Reservation failed:', error);
      
      // Check for duplicate mobile number error
      let message = 'Unable to reserve your appointment. Please try again.';
      
      if (error instanceof Error) {
        try {
          // Try to parse the error as JSON to check for specific error codes
          const errorData = JSON.parse(error.message);
          if (errorData.details && errorData.details.code === 417 && 
              errorData.details.message === 'duplicate mobile_number') {
            message = 'Contact no. already exist.';
          } else {
            message = error.message;
          }
        } catch (parseError) {
          // If not JSON, check for string patterns
          if (error.message.includes('duplicate mobile_number') || 
              error.message.includes('code": 417') ||
              error.message.includes('Request failed with status code 400')) {
            message = 'Contact no. already exist.';
          } else {
            message = error.message;
          }
        }
      }
      
      setReservationError(message);
      alert(`Reservation failed: ${message}`);
    } finally {
      setIsReserving(false);
    }
  };

  const handleBookingConfirm = async () => {
    if (!userInfo || !confirmationDetails?.bookingId) {
      alert('Booking information is missing. Please go back and try again.');
      return;
    }

    setIsConfirming(true);

    try {
      console.log('📋 Confirming booking with ID:', confirmationDetails.bookingId);
      
      // Call the confirmation API endpoint: POST /api/bookings/:bookingId/confirm
      const confirmationResult = await bookingService.confirmBooking(confirmationDetails.bookingId);
      
      if (confirmationResult.success) {
        console.log('✅ Booking confirmed successfully:', confirmationResult);
        
        // Update confirmation details with final confirmation info
        setConfirmationDetails(prev => ({
          ...prev,
          confirmationNumber: confirmationResult.confirmationNumber || prev?.confirmationNumber,
          bookingId: confirmationResult.bookingId || prev?.bookingId
        }));
        
        // Clear persisted state since booking is complete
        clearState();
        console.log('🗑️ Cleared persisted state after successful booking confirmation');
        
        // Move to final confirmation page
        setCurrentStep(6);
      } else {
        throw new Error(confirmationResult.message || 'Booking confirmation failed');
      }
      
    } catch (error) {
      console.error('❌ Confirmation failed:', error);
      alert(`Confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
              onServiceSelect={handleServiceSelect}
              isLoading={universalCategoriesLoading}
            />
            
          </div>

          {/* Pricing Calculator */}
          <div className="max-w-4xl mb-12 w-full">
            <PricingCalculator selectedServices={selectedServices} />
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
            <Heading>Select date & time</Heading>
            
          </div>

          {/* Calendar Component */}
          <div className="max-w-6xl w-full mb-12">
            <Calendar
              onDateSelect={handleDateSelect}
              onTimeSelect={handleTimeSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              isLoading={isUnifiedCallLoading}
              availableSlots={availableSlots}
              availableDatesCount={slotsMetadata?.availableDates?.filter(date => {
                return bookingMap.some(booking => booking.date === date);
              }).length || 0}
              futureDaysCount={slotsMetadata?.futureDaysCount || 0}
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
              onClick={handleProviderSelection}
              disabled={!selectedDate || !selectedTime || isSelectingProvider}
              variant={selectedDate && selectedTime && !isSelectingProvider ? "black" : "disabled"}
              className="w-full md:w-auto"
            >
              {isSelectingProvider ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 
                </>
              ) : (
                <>
                  <span>Next</span>
                  
                </>
              )}
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
          onEditProvider={() => setCurrentStep(1)}
          onSkipToFinal={() => setCurrentStep(6)}
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
          setIsSelectingProvider(false);
        }}
      />
    </AppWrapper>
  );
};

export default App;
