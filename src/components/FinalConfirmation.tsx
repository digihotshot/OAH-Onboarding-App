import React from 'react';
import { Button } from './ui/button';
import { UserInfo } from './UserInfoForm';
import { UniversalService } from '../hooks/useUniversalCategories';
import { Heading } from './ui/heading';

interface FinalConfirmationProps {
  userInfo: UserInfo;
  selectedServices: UniversalService[];
  selectedDate?: Date;
  selectedTime?: string;
  address: string;
  zipCode: string;
  confirmationNumber?: string;
  bookingId?: string;
  onStartNewBooking: () => void;
  providerName?: string;
  providerImageUrl?: string;
}

export const FinalConfirmation: React.FC<FinalConfirmationProps> = ({
  providerName = "Loreal US",
  providerImageUrl
}) => {
  return (
    <div>
      <div className="rounded-sm bg-white border border-[#C2A88F80]  mt-10 p-12 max-w-xl w-full text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <img 
            src="/success-icon.svg" 
            alt="Success" 
            className="w-15 h-15"
            style={{ width: '60px', height: '60px' }}
          />
        </div>

        {/* Main Heading */}
        <Heading className="text-2xl font-bold text-black mb-4">
          Appointment Confirmed!!
        </Heading>

        {/* Provider Image and Name */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {providerImageUrl && (
            <img
              src={providerImageUrl}
              alt={providerName}
              className="w-12 h-12 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <p className="text-black font-semibold">
            {providerName}
          </p>
        </div>

        {/* Confirmation Message */}
        <p className="text-black mb-4">
          Your appointment is confirmed.
        </p>

        {/* Links */}
        <div className="mb-9">
          <a 
            href="#" 
            className="text-black underline hover:text-gray-800"
          >
            Appointment Details
          </a>
          <span className="text-gray-400 mx-2">|</span>
          <a 
            href="#" 
            className="text-black underline hover:text-gray-800"
          >
            Cancellation Policy
          </a>
        </div>

        {/* Save to Calendar Button */}
        <Button 
          className="bg-black border text-white hover:bg-gray-800 py-3 px-6 rounded-lg font-medium"
        >
          Save to Calendar
        </Button>
      </div>

{/* Account Creation Prompt */}
<div className="mt-8 rounded-sm border border-[#C2A88F80] max-w-xl w-full bg-[#F1E6DA] py-3 text-center">
  <p className="text-[#71430C] text-sm">
    <a 
      href="#" 
      className="underline hover:text-gray-800 transition-colors"
    >
      Create an account
    </a> to manage or reschedule easily
  </p>
</div>
     
      </div>
  );
};
