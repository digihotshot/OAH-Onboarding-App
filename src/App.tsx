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

// Common wrapper component with navigation, main image, and content
const AppWrapper: React.FC<{ children: React.ReactNode; currentStep: number }> = ({ children, currentStep }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#F5F1ED]">
      {/* Main Image - Positioned on top of navbar with rounded corner */}
      <div className="fixed top-0 right-0 w-[35%] h-screen z-[100]">
        <div className="w-full h-full relative">
          <div className="h-full overflow-hidden "style={{ borderTopLeftRadius: '250px' }}>
          <img
            src="/Main Image.jpg"
            alt="Oli At Home Service"
            className="w-full h-full object-cover"
          />
          </div>
          {/* Overlay blocks positioned absolutely over the image */}
          
          <BottomLeftOverlay />
        </div>
      </div>
      
      {/* Navigation Bar */}
      <NavigationBar currentStep={currentStep} />
      
      {/* Bottom Left Blur Effect */}
      <div 
        className="fixed z-[60]"
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
      
      {/* Main Layout Container */}
      <div className="flex py-[150px] min-h-screen relative z-[80]">
        {/* Left Side - Form Content */}
         <div className="flex-1 w-[50%] max-w-[55%] relative z-[70] px-[3%]" >
          {children}
        </div>
        
        {/* Right Side - Spacer for image */}
        <div className="w-[35%] h-screen">
          {/* This div acts as a spacer since the image is positioned absolutely */}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
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

  // Convert unified call response to Calendar-compatible format
  

  // Get providers from middleware API (only for Step 1 validation)
  const { providers: availableProviders } = useMiddlewareProviders(zipCode);
  
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
      setCurrentStep(currentStep - 1);
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
      const message =
        error instanceof Error ? error.message : 'Unable to reserve your appointment. Please try again.';
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
        <div className="min-h-screen flex flex-col">

          {/* Step Text */}
          <div className="mb-8">
            <StepText>STEP 1 OF 4</StepText>
            <Heading>Enter your address</Heading>
          </div>

          {/* Address Input */}
          <div className="max-w-lg w-full mb-12">
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
          <div className="max-w-lg w-full flex justify-start items-center gap-12">
            <Button variant="ghost">
              Back
            </Button>
            <Button size="default"
              onClick={() => {
                if (zipCodeValidation?.isValid) {
                  setCurrentStep(2);
                }
              }}
              disabled={!zipCodeValidation?.isValid}
              variant={zipCodeValidation?.isValid ? "black" : "disabled"}
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
          <div className="mb-12">
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
          <div className="max-w-lg w-full flex justify-start items-center gap-12">
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
          <div className="mb-12">
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
          <div className="max-w-6xl w-full flex justify-start items-center gap-12">
            <Button
              onClick={() => setCurrentStep(2)}
              variant="ghost"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Button>
            <Button
              onClick={handleProviderSelection}
              disabled={!selectedDate || !selectedTime || isSelectingProvider}
              variant={selectedDate && selectedTime && !isSelectingProvider ? "black" : "disabled"}
            >
              {isSelectingProvider ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 
                </>
              ) : (
                <>
                  <span>Next</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
    return (
      <AppWrapper currentStep={currentStep}>
        <UserInfoForm
          onNext={handleUserInfoNext}
          onBack={handleBack}
          isSubmitting={isReserving}
          errorMessage={reservationError}
        />
      </AppWrapper>
    );
  }

  // Step 5: Booking Confirmation
  if (currentStep === 5) {
    return (
      <AppWrapper currentStep={currentStep}>
        <BookingConfirmation
          userInfo={userInfo!}
          selectedServices={selectedServices}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          address={address}
          selectedProvider={selectedProvider}
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
