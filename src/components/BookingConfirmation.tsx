import React from 'react';
import { UserInfo } from './UserInfoForm';
import { UniversalService } from '../hooks/useUniversalCategories';
import { Button, OrangeButton } from './ui/button';
import { Heading } from './ui/heading';
import { StepText } from './ui/step-text';
import { Provider } from '../types/middleware';

interface BookingConfirmationProps {
  userInfo: UserInfo;
  selectedServices: UniversalService[];
  selectedDate?: Date;
  selectedTime?: string;
  address: string;
  selectedProvider: Provider | null;
  onConfirm: () => void;
  onBack: () => void;
  onEditAddress: () => void;
  onEditTreatment: () => void;
  onEditDateTime: () => void;
  onEditProvider: () => void;
  onSkipToFinal?: () => void; // Temporary prop for testing
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  selectedServices,
  selectedDate,
  selectedTime,
  address,
  selectedProvider,
  onConfirm,
  onBack,
  onEditAddress,
  onEditTreatment,
  onEditDateTime,
  onEditProvider,
  
}) => {
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
        <div className="mb-6">
          <StepText>STEP 4 OF 4</StepText>
          <Heading>Booking Summary</Heading>
        </div>

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
                    <p className="text-sm text-[#A0522D] truncate">
                      {selectedProvider?.description || 'Specializes in Beauty Treatments'}
                    </p>
                  </div>
                  
                  {/* Change Provider Button */}
                  <OrangeButton onClick={onEditProvider}>
                    Change Provider
                  </OrangeButton>
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
                       selectedServices.map((service, index) => (
                         <p key={index} className="font-medium text-gray-900">
                           {service.name}
                         </p>
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
        <div className="max-w-2xl w-full flex justify-start items-center gap-12">
          <Button
            onClick={onBack}
            variant="ghost"
          >
            Back
          </Button>
          <Button
            onClick={onConfirm}
            variant="black"
          >
            Confirm
          </Button>
          
          {/* Temporary link to final step - REMOVE LATER */}
          {/*onSkipToFinal && (
            <Button
              onClick={onSkipToFinal}
              variant="brown"
              className="ml-auto"
            >
              Skip to Final (TEMP)
            </Button>
          )*/}
          
        </div>

        
    </div>
  );
};
