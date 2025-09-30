import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Heading } from './ui/heading';
import { StepText } from './ui/step-text';

interface UserInfoFormProps {
  onNext: (userInfo: UserInfo) => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export interface UserInfo {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export const UserInfoForm: React.FC<UserInfoFormProps> = ({ onNext, onBack, isSubmitting = false, errorMessage }) => {
  const [formData, setFormData] = useState<UserInfo>({
    name: '',
    email: '',
    phone: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(cleanPhone) || cleanPhone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneChange = (value: string) => {
    // Allow empty input for deletion
    if (value === '') {
      handleInputChange('phone', '');
      return;
    }
    
    // Format phone number as user types
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    // Only format if we have digits
    if (cleaned.length > 0) {
      if (cleaned.length >= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 3) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      } else if (cleaned.length > 0) {
        formatted = `(${cleaned}`;
      }
    }
    
    handleInputChange('phone', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onNext(formData);
    } catch (error) {
      console.error('❌ Failed to submit user info:', error);
    }
  };

  const isFormValid = formData.name.trim() && formData.email.trim() && formData.phone.trim() && Object.keys(errors).length === 0;

  return (
    <div className="min-h-screen flex flex-col">
        {/* Step Text */}
        <div className="mb-12">
          <StepText>STEP 4 OF 4</StepText>
          <Heading>Enter your details</Heading>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-lg w-full">
          <div className="space-y-4 mb-12">
            {/* Name Field */}
            <div>
              
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={`w-full ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500' 
                    : ''
                }`}
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email address"
                className={`w-full ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : ''
                }`}
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                className={`w-full ${
                  errors.phone 
                    ? 'border-red-300 focus:border-red-500' 
                    : ''
                }`}
              />
              {errors.phone && (
                <p className="mt-2 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="mb-8 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-start items-center gap-12">
            <Button
              type="button"
              onClick={onBack}
              variant="ghost"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              variant={!isFormValid || isSubmitting ? "disabled" : "black"}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </form>

        
    </div>
  );
};
