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
import { bookingService } from './services/bookingService';
import { BottomLeftOverlay } from './components/ImageOverlay';

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
  
  // Confirmation details
  const [confirmationDetails, setConfirmationDetails] = useState<{
    confirmationNumber?: string;
    bookingId?: string;
  } | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      // Store the slot information for reservation
      setSelectedSlotInfo({
        bookingId: slotInfo.BookingId || 'placeholder-booking-id',
        centerId: slotInfo.CenterId || 'placeholder-center-id',
        serviceId: slotInfo.ServiceId || 'placeholder-service-id',
        priority: slotInfo.Priority || 999
      });
      console.log('🎯 Time selected with slot info:', time, slotInfo);
    } else {
      console.log('🎯 Time selected without slot info:', time);
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


  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUserInfoSubmit = (userData: UserInfo) => {
    setUserInfo(userData);
    // Move to confirmation step
    setCurrentStep(5);
  };

  const handleBookingConfirm = async () => {
    if (!userInfo) {
      alert('User information is missing. Please go back and try again.');
      return;
    }

    try {
      // Find the highest priority slot for the selected time
      const slotInfo = await findHighestPrioritySlot();
      
      if (!slotInfo) {
        throw new Error('No available slot found for the selected time');
      }
      
      // Reserve the slot
      const reservationResult = await bookingService.reserveSlot({
        bookingId: slotInfo.bookingId,
        userInfo: userInfo,
        selectedServices: selectedServices.map(service => ({
          id: service.id,
          name: service.name
        })),
        selectedDate: selectedDate?.toISOString().split('T')[0] || '',
        selectedTime: selectedTime || '',
        address,
        zipCode
      });
      
      if (reservationResult.success) {
        console.log('✅ Slot reserved successfully:', reservationResult);
        
        // Confirm the booking
        const confirmationResult = await bookingService.confirmBooking(reservationResult.bookingId!);
        
        if (confirmationResult.success) {
          console.log('✅ Booking confirmed successfully:', confirmationResult);
          
          // Store confirmation details
          setConfirmationDetails({
            confirmationNumber: confirmationResult.confirmationNumber || reservationResult.confirmationNumber,
            bookingId: confirmationResult.bookingId || reservationResult.bookingId
          });
          
          // Move to final confirmation page
          setCurrentStep(6);
        } else {
          throw new Error(confirmationResult.message || 'Booking confirmation failed');
        }
      } else {
        throw new Error(reservationResult.message || 'Reservation failed');
      }
      
    } catch (error) {
      console.error('❌ Reservation failed:', error);
      alert(`Reservation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Helper function to find the highest priority slot
  const findHighestPrioritySlot = async () => {
    if (!selectedDate || !selectedTime) {
      return null;
    }
    
    // Use the stored slot information if available
    if (selectedSlotInfo) {
      console.log('🔍 Using stored slot info:', selectedSlotInfo);
      return selectedSlotInfo;
    }
    
    // Fallback: search through available slots data
    console.log('🔍 Searching for highest priority slot for:', selectedDate, selectedTime);
    
    // TODO: Implement fallback slot finding logic if needed
    // This would search through the available slots data and return the slot
    // with the highest priority (lowest priority number) for the selected time
    
    return {
      bookingId: 'fallback-booking-id',
      centerId: 'fallback-center-id',
      serviceId: 'fallback-service-id',
      priority: 1
    };
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
              onClick={() => setCurrentStep(3)}
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
              selectedServices={selectedServices}
              onDateSelect={handleDateSelect}
              onTimeSelect={handleTimeSelect}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
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
              onClick={() => setCurrentStep(4)}
              disabled={!selectedDate || !selectedTime}
              variant={selectedDate && selectedTime ? "black" : "disabled"}
            >
              <span>Next</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
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
          onNext={handleUserInfoSubmit}
          onBack={handleBack}
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
          setConfirmationDetails(null);
        }}
      />
    </AppWrapper>
  );
};

export default App;
