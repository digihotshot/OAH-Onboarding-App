import { useState, useEffect, useCallback } from 'react';
import { UniversalAddOn, UniversalService } from './useUniversalCategories';
import { UserInfo } from '../components/UserInfoForm';
import { Provider } from '../types/middleware';
import { ValidationResult } from '../utils/zipCodeValidation';

const STORAGE_KEY = 'oah_booking_state';
const STORAGE_VERSION = '1.0'; // Increment this if state structure changes

export interface PersistedBookingState {
  version: string;
  currentStep: number;
  address: string;
  zipCode: string;
  zipCodeValidation: ValidationResult | null;
  selectedDate: string | null; // ISO string
  selectedTime: string | undefined;
  selectedServices: UniversalService[];
  selectedAddOns: Record<string, UniversalAddOn[]>;
  userInfo: UserInfo | null;
  guestVerification?: {
    email?: string;
    phone?: string;
    status: 'authenticated' | 'unauthenticated';
    guest?: unknown;
    message?: string;
  } | null;
  selectedProvider: Provider | null;
  selectedSlotInfo: {
    bookingId: string;
    centerId: string;
    serviceId: string;
    priority: number;
  } | null;
  providerBookingId: string | null;
  guestId: string | null;
  timestamp: number; // When state was saved
}

// Check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

// Save state to localStorage
export const saveBookingState = (state: Partial<PersistedBookingState>): void => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available, state will not be persisted');
    return;
  }

  try {
    const currentState = loadBookingState() || ({} as PersistedBookingState);
    const newState: PersistedBookingState = {
      version: STORAGE_VERSION,
      ...currentState,
      ...state,
      timestamp: Date.now(),
    };

    newState.selectedAddOns =
      state.selectedAddOns ?? currentState.selectedAddOns ?? {};
    if (state.guestVerification === null) {
      newState.guestVerification = null;
    } else if (state.guestVerification) {
      newState.guestVerification = state.guestVerification;
    } else if (!newState.guestVerification && currentState.guestVerification) {
      newState.guestVerification = currentState.guestVerification;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    console.log('💾 Booking state saved:', {
      step: newState.currentStep,
      hasServices: newState.selectedServices.length > 0,
      hasDate: !!newState.selectedDate,
      hasUserInfo: !!newState.userInfo,
    });
  } catch (error) {
    console.error('Failed to save booking state:', error);
  }
};

// Load state from localStorage
export const loadBookingState = (): PersistedBookingState | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed: PersistedBookingState = JSON.parse(stored);
    
    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Stored state version mismatch, clearing old state');
      clearBookingState();
      return null;
    }

    // Check if state is too old (e.g., older than 24 hours)
    const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (parsed.timestamp && Date.now() - parsed.timestamp > MAX_AGE) {
      console.warn('Stored state is too old, clearing');
      clearBookingState();
      return null;
    }

    console.log('📂 Booking state loaded:', {
      step: parsed.currentStep,
      hasServices: parsed.selectedServices?.length > 0,
      hasDate: !!parsed.selectedDate,
      hasUserInfo: !!parsed.userInfo,
    });

    if (!parsed.selectedAddOns || typeof parsed.selectedAddOns !== 'object') {
      parsed.selectedAddOns = {};
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load booking state:', error);
    clearBookingState();
    return null;
  }
};

// Clear state from localStorage
export const clearBookingState = (): void => {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Booking state cleared');
  } catch (error) {
    console.error('Failed to clear booking state:', error);
  }
};

// Hook to use persisted state
export const usePersistedBookingState = () => {
  const [isStateRestored, setIsStateRestored] = useState(false);

  const restoreState = useCallback(() => {
    const restoredState = loadBookingState();
    setIsStateRestored(true);
    return restoredState;
  }, []);

  const saveState = useCallback((state: Partial<PersistedBookingState>) => {
    saveBookingState(state);
  }, []);

  const clearState = useCallback(() => {
    clearBookingState();
  }, []);

  return {
    restoreState,
    saveState,
    clearState,
    isStateRestored,
  };
};

