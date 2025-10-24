import React, { useEffect, useRef } from 'react';
import { UserInfo } from './UserInfoForm';
import { UniversalAddOn, UniversalService } from '../hooks/useUniversalCategories';
import { Button, OrangeButton } from './ui/button';
import { Heading } from './ui/heading';
import { StepText } from './ui/step-text';
import { Provider } from '../types/middleware';

interface BookingConfirmationProps {
  userInfo: UserInfo;
  selectedServices: UniversalService[];
  selectedAddOns?: Record<string, UniversalAddOn[]>;
  selectedDate?: Date;
  selectedTime?: string;
  address: string;
  selectedProvider: Provider | null;
  // NOTE: availableProviders now contains only providers that service the exact time slot
  // (date + time), not just the date. This is controlled by FILTER_PROVIDERS_BY_TIME_SLOT
  // flag in App.tsx. To revert to date-only filtering, set the flag to false.
  availableProviders?: Array<Provider & { bookingId: string; priority: number }>;
  onProviderChange?: (providerId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  onEditAddress: () => void;
  onEditTreatment: () => void;
  onEditDateTime: () => void;
  isConfirming?: boolean;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  selectedServices,
  selectedAddOns = {},
  selectedDate,
  selectedTime,
  address,
  selectedProvider,
  availableProviders = [],
  onProviderChange,
  onConfirm,
  onBack,
  onEditAddress,
  onEditTreatment,
  onEditDateTime,
  isConfirming = false,
}) => {
  // Track if we've already auto-selected a provider to prevent infinite loops
  const hasAutoSelectedRef = useRef(false);

  // Auto-select the highest priority provider (lowest priority number = highest priority)
  useEffect(() => {
    // Only auto-select if:
    // 1. We haven't already auto-selected
    // 2. No provider is currently selected
    // 3. We have available providers
    // 4. We have a callback to change the provider
    if (
      !hasAutoSelectedRef.current &&
      !selectedProvider &&
      availableProviders.length > 0 &&
      onProviderChange
    ) {
      // Sort by priority (ascending) and take the first one (highest priority)
      const sortedProviders = [...availableProviders].sort((a, b) => a.priority - b.priority);
      const highestPriorityProvider = sortedProviders[0];
      
      console.log('🎯 Auto-selecting highest priority provider:', {
        provider: highestPriorityProvider.name,
        providerId: highestPriorityProvider.provider_id,
        priority: highestPriorityProvider.priority,
        bookingId: highestPriorityProvider.bookingId
      });
      
      onProviderChange(highestPriorityProvider.provider_id);
      hasAutoSelectedRef.current = true;
    }
  }, [selectedProvider, availableProviders, onProviderChange]);

  // Reset the auto-selection flag when component unmounts or when we navigate away
  useEffect(() => {
    return () => {
      hasAutoSelectedRef.current = false;
    };
  }, []);
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
        {/* Step Text */}
        <div className="mb-8 text-center md:text-left">
          <StepText>STEP 4 OF 4</StepText>
          <Heading>Booking Summary</Heading>
        </div>

        {/* {guestVerification && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">Guest Status</p>
            <p className="text-sm text-gray-600">
              {guestVerification.status === 'authenticated'
                ? 'We found an existing guest profile matching the details provided.'
                : guestVerification.status === 'unauthenticated'
                  ? guestVerification.message || 'No existing guest profile was found. We will create a new one when you continue.'
                  : null}
            </p>
            {(guestVerification.email || guestVerification.phone) && (
              <p className="mt-2 text-xs text-gray-500">
                {guestVerification.email && <span>Email: {guestVerification.email}</span>}
                {guestVerification.email && guestVerification.phone && <span className="mx-2">•</span>}
                {guestVerification.phone && <span>Phone: {guestVerification.phone}</span>}
              </p>
            )}
          </div>
        )} */}

        {/* Booking Summary */}
        <div className="max-w-2xl w-full mb-8">
            <div className="bg-white   border border-[#C2A88F80] overflow-hidden">
              {/* Provider Details */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  {/* Provider Image */}
                  <div className="w-16 h-16 bg-[#F5F1ED] rounded-full flex items-center justify-center flex-shrink-0">
                    {selectedProvider ? (
                      <div className="w-12 h-12 bg-[#C2A88F] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {selectedProvider.name.charAt(0)}
                        </span>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 font-semibold text-lg">?</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Provider Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#8B4513] truncate">
                      {selectedProvider?.name || 'Provider Not Selected'}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
            <div className="p-6 border-gray-200">
              
              <div className="flex justify-between items-center gap-4 mb-9">
                <div>
                  <p className="text-sm text-gray-500">Location (we come to you!)</p>
                  <p className="font-medium text-gray-900">
                    {address}
                  </p>
                </div>
                <OrangeButton onClick={onEditAddress}>
                  Edit Address
                </OrangeButton>
              </div>

               <div className="flex justify-between items-center gap-4 mb-9">
                 <div className="flex-1">
                   <p className="text-sm text-gray-500">Treatment</p>
                   <div className="space-y-1">
                    {selectedServices.length > 0 ? (
                      selectedServices.map((service) => (
                         <div key={service.id} className="space-y-2">
                           <p className="font-medium text-gray-900">
                             {service.name}
                           </p>
                           {(selectedAddOns[service.id]?.length ?? 0) > 0 && (
                             <div className="space-y-1 border-l border-[#C2A88F40] pl-3 ml-2">
                               {selectedAddOns[service.id]!.map(addOn => (
                                 <p key={addOn.id} className="text-sm text-gray-800">
                                   {addOn.name}
                                 </p>
                               ))}
                             </div>
                           )}
                         </div>
                       ))
                     ) : (
                       <p className="font-medium text-gray-500">No services selected</p>
                     )}
                   </div>
                 </div>
                 <OrangeButton onClick={onEditTreatment}>
                   Edit Treatment
                 </OrangeButton>
               </div>

                <div className="flex justify-between items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <div>
                      {selectedDate && selectedTime ? (
                        <p className="font-medium text-gray-900">
                          {formatDate(selectedDate)} at {formatTime(selectedTime)}
                        </p>
                      ) : selectedDate ? (
                        <p className="font-medium text-gray-900">
                          {formatDate(selectedDate)}
                        </p>
                      ) : selectedTime ? (
                        <p className="font-medium text-gray-900">
                          {formatTime(selectedTime)}
                        </p>
                      ) : (
                        <p className="font-medium text-gray-500">No date or time selected</p>
                      )}
                    </div>
                  </div>
                  <OrangeButton onClick={onEditDateTime}>
                    Edit Date / Time
                  </OrangeButton>
                </div>

               
            </div>

            

            
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="max-w-lg w-full flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-12">
          <Button
            onClick={onBack}
            variant="ghost"
            disabled={isConfirming}
          >
            Back
          </Button>
          <Button
            onClick={onConfirm}
            variant={isConfirming ? "disabled" : "black"}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Confirming...
              </>
            ) : (
              'Confirm'
            )}
          </Button>
          
          
        </div>

        
    </div>
  );
};
