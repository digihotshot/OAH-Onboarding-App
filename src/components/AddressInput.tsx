import React, { useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { useGooglePlaces } from '../hooks/useGooglePlaces';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  onChange,
  placeholder = "Enter your address",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, error, initializeAutocomplete } = useGooglePlaces();

  useEffect(() => {
    if (isLoaded && inputRef.current) {
      const cleanup = initializeAutocomplete(inputRef.current, (address) => {
        onChange(address);
      });

      return cleanup;
    }
  }, [isLoaded, initializeAutocomplete, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const renderIcon = () => {
    if (!isLoaded) {
      return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
    if (error) {
      return <MapPin className="w-5 h-5 text-red-400" />;
    }
    return <MapPin className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="relative space-y-3">
      <Input
        ref={inputRef}
        className="w-full h-14 px-4 pr-12 text-lg border-2 border-gray-200 focus:border-[#C2A88F] rounded-xl focus:ring-0 transition-colors bg-white shadow-sm"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        autoComplete="off"
      />
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
        {renderIcon()}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};