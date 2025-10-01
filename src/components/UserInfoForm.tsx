import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Heading } from './ui/heading';
import { StepText } from './ui/step-text';

interface UserInfoFormProps {
  onNext: (userInfo: UserInfo) => Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  initialValues?: UserInfo | null;
  onUserInfoChange?: (userInfo: UserInfo) => void;
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

export const UserInfoForm: React.FC<UserInfoFormProps> = ({ 
  onNext, 
  onBack, 
  isSubmitting = false, 
  errorMessage,
  initialValues,
  onUserInfoChange
}) => {
  const [formData, setFormData] = useState<UserInfo>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: initialValues?.phone || ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Update form data when initialValues change (e.g., when navigating back)
  useEffect(() => {
    if (initialValues) {
      console.log('🔄 UserInfoForm: Updating form with initial values:', initialValues);
      setFormData({
        name: initialValues.name || '',
        email: initialValues.email || '',
        phone: initialValues.phone || ''
      });
      // Clear any existing errors when restoring values
      setErrors({});
    } else if (initialValues === null) {
      // If explicitly null, reset to empty
      console.log('🔄 UserInfoForm: Initial values are null, resetting form');
      setFormData({
        name: '',
        email: '',
        phone: ''
      });
      setErrors({});
    }
    // If undefined, keep current state (don't reset)
  }, [initialValues]);

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
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Also update the parent component's state as user types
    // This ensures the data is saved to localStorage immediately
    if (onUserInfoChange) {
      onUserInfoChange(newFormData);
    }
    console.log('📝 UserInfoForm: Input changed, updating parent state:', newFormData);
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
        <div className="mb-8 text-center md:text-left">
          <StepText>STEP 4 OF 4</StepText>
          <Heading>Enter your details</Heading>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="max-w-lg w-full">
          <div className="space-y-2 md:space-y-4 mb-12">
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
          <div className="max-w-lg w-full flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-12">
          
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
