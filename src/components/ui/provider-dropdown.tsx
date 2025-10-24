import React, { useState, useRef, useEffect } from 'react';
import { Provider } from '../../types/middleware';

interface ProviderDropdownProps {
  selectedProvider: Provider | null;
  availableProviders: Array<Provider & { bookingId: string; priority: number }>;
  onProviderChange: (providerId: string) => void;
  disabled?: boolean;
}

export const ProviderDropdown: React.FC<ProviderDropdownProps> = ({
  selectedProvider,
  availableProviders,
  onProviderChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProviderSelect = (providerId: string) => {
    onProviderChange(providerId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`
          inline-flex items-center text-[#71430C]  
          hover:opacity-80 transition-opacity duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span>Change Provider</span>
        <svg
          className={`w-5 h-5  transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 min-w-40 w-max mt-1 bg-white border border-[#C2A88F] left-1/2 transform -translate-x-1/2">
          <div >
            {availableProviders.map((provider) => (
              <button
                key={provider.provider_id}
                onClick={() => handleProviderSelect(provider.provider_id)}
                className={`
                  w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#F5F1ED] hover:text-black 
                  transition-colors duration-150 flex items-center gap-3
                  ${selectedProvider?.provider_id === provider.provider_id ? 'text-white bg-[#71430C] font-medium' : ''}
                `}
              >
                {provider.imageUrl ? (
                  <img
                    src={provider.imageUrl}
                    alt={provider.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${selectedProvider?.provider_id === provider.provider_id ? 'bg-white text-[#71430C]' : 'bg-[#F2E7DC] text-[#C2A88F]'}`}>
                    {provider.name.charAt(0)}
                  </div>
                )}
                <span className="flex-1">{provider.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
