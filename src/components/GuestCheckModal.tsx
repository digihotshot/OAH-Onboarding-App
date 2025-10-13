import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface GuestCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { email?: string; phone?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
  initialEmail?: string;
  initialPhone?: string;
  error?: string | null;
}

const phoneSanitizer = (value: string) => value.replace(/[^\d+]/g, '');

export const GuestCheckModal: React.FC<GuestCheckModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialEmail = '',
  initialPhone = '',
  error = null,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [touched, setTouched] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setPhone(initialPhone);
      setTouched(false);
    }
  }, [isOpen, initialEmail, initialPhone]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isMounted || !isOpen) {
    return null;
  }

  const sanitizedPhone = phoneSanitizer(phone);
  const emailValid = email.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid = sanitizedPhone.length === 0 || sanitizedPhone.length >= 10;
  const hasIdentifier = email.trim().length > 0 || sanitizedPhone.length > 0;
  const identifierError = touched && !hasIdentifier;
  const canSubmit = hasIdentifier && emailValid && phoneValid && !isSubmitting;

  const content = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Verify Your Details</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter an email or phone number so we can confirm if you are already a member.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="guest-check-email" className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="guest-check-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value.trimStart());
                setTouched(true);
              }}
              placeholder="Enter your email"
              className={`w-full ${touched && email.trim().length > 0 && !emailValid ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {touched && email.trim().length > 0 && !emailValid && (
              <p className="mt-2 text-sm text-red-600">Please enter a valid email address.</p>
            )}
          </div>

          <div>
            <label htmlFor="guest-check-phone" className="mb-2 block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <Input
              id="guest-check-phone"
              type="tel"
              value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/[^\d+\-()\s]/g, ''));
                  setTouched(true);
                }}
                placeholder="Enter your phone number"
                className={`w-full ${touched && sanitizedPhone.length > 0 && !phoneValid ? 'border-red-300 focus:border-red-500' : ''}`}
            />
            {touched && sanitizedPhone.length > 0 && !phoneValid && (
              <p className="mt-2 text-sm text-red-600">Phone number must be at least 10 digits.</p>
            )}
          </div>
        </div>

        {identifierError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Please provide at least an email or a phone number.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Skip
          </Button>
          <Button
            type="button"
            onClick={async () => {
              setTouched(true);
              if (!canSubmit) {
                return;
              }
              await onSubmit({
                email: email.trim() || undefined,
                phone: sanitizedPhone || undefined,
              });
            }}
            disabled={!canSubmit}
            variant={canSubmit ? 'black' : 'disabled'}
          >
            {isSubmitting ? 'Checking…' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default GuestCheckModal;

