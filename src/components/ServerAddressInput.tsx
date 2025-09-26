import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { useServerAddress, AddressSuggestion } from '../hooks/useServerAddress';

interface ServerAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: string, zipcode: string) => void;
  placeholder?: string;
}

export const ServerAddressInput: React.FC<ServerAddressInputProps> = ({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your address",
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AddressSuggestion | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { getAddressSuggestions, validateAddress, isLoading, error } = useServerAddress();

  // Debounced search for suggestions
  useEffect(() => {
    // Don't search if we're in the middle of selecting a suggestion
    if (isSelecting) return;

    const timeoutId = setTimeout(async () => {
      if (value && value.length >= 3) {
        const newSuggestions = await getAddressSuggestions(value);
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value, getAddressSuggestions, isSelecting]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('📝 Input changed:', newValue);
    onChange(newValue);
    setSelectedSuggestion(null);
    setIsSelecting(false); // Reset selecting flag when user types
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: AddressSuggestion) => {
    console.log('🎯 Suggestion selected:', suggestion);
    
    // Set selecting flag to prevent search from running
    setIsSelecting(true);
    
    // Close dropdown immediately
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Set the input value to the selected address
    onChange(suggestion.description);
    setSelectedSuggestion(suggestion);

    // Validate the address
    const validation = await validateAddress(suggestion.description, suggestion.placeId);
    
    if (validation && onAddressSelect) {
      console.log('✅ Address validated, calling onAddressSelect:', validation);
      onAddressSelect(validation.formattedAddress, validation.zipcode);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (suggestions.length > 0 && !selectedSuggestion) {
      setShowSuggestions(true);
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const renderIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />;
    }
    if (error) {
      return (
        <img 
          src="/input-map-pin.svg" 
          alt="Map pin" 
          className="w-5 h-5" 
          style={{ 
            filter: 'brightness(0) saturate(100%) invert(27%) sepia(51%) saturate(2878%) hue-rotate(346deg) brightness(104%) contrast(97%)' // Red color
          }} 
        />
      );
    }
    return (
      <img 
        src="/input-map-pin.svg" 
        alt="Map pin" 
        className="w-5 h-5" 
        style={{ 
          filter: 'brightness(0) saturate(100%) invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)' // Gray color
        }} 
      />
    );
  };

  return (
    <div className="relative space-y-3">
      <div className="relative">
        <Input
          ref={inputRef}
          className="w-full h-16 pr-14 text-base"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
          {renderIcon()}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-center space-x-3">
                <img 
                  src="/input-map-pin.svg" 
                  alt="Map pin" 
                  className="w-4 h-4 flex-shrink-0" 
                  style={{ 
                    filter: 'brightness(0) saturate(100%) invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)' // Gray color
                  }} 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {suggestion.mainText}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {suggestion.secondaryText}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
