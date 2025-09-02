import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, Clock, DollarSign } from 'lucide-react';
import { ZenotiCategory } from '../hooks/useZenotiCategories';
import { useZenotiServices } from '../hooks/useZenotiServices';

interface CategoryDropdownProps {
  category: ZenotiCategory;
  centerId: string;
  isOpen: boolean;
  onToggle: () => void;
  onServiceSelect?: (serviceId: string) => void;
  selectedServiceId?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  category,
  centerId,
  isOpen,
  onToggle,
  onServiceSelect,
  selectedServiceId
}) => {
  const { services, isLoading, error } = useZenotiServices(
    isOpen ? centerId : null, 
    isOpen ? category.id : null
  );

  const formatPrice = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getServicePrice = (service: any) => {
    // Try different possible price fields from the API response
    const priceFields = ['final_price', 'price', 'base_price'];
    
    for (const field of priceFields) {
      const priceData = service[field];
      if (priceData && typeof priceData === 'object' && priceData.amount !== undefined) {
        return {
          amount: priceData.amount,
          currency: priceData.currency || 'USD'
        };
      }
    }
    
    // If no structured price object, check for direct amount field
    if (service.amount !== undefined) {
      return {
        amount: service.amount,
        currency: service.currency || 'USD'
      };
    }
    
    return null;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Category Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 bg-white hover:bg-gray-50 flex items-center justify-between transition-colors"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg font-medium text-gray-900">
            {category.name}
          </span>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>
        
        <div className="flex items-center">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Dropdown Content - Services */}
      {isOpen && (
        <div className="bg-white border-t border-gray-200">
          {isLoading && (
            <div className="px-4 py-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="px-4 py-3">
              <p className="text-sm text-red-600">
                Error loading services: {error}
              </p>
            </div>
          )}

          {!isLoading && !error && services.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-sm text-gray-600">
                No services available in this category.
              </p>
            </div>
          )}

          {!isLoading && !error && services.length > 0 && (
            <div className="divide-y divide-gray-100">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name={`category-${category.id}`}
                      value={service.id}
                      checked={selectedServiceId === service.id}
                      onChange={() => onServiceSelect?.(service.id)}
                      className="w-4 h-4 text-[#C2A88F] border-gray-300 focus:ring-[#C2A88F] focus:ring-2"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {service.name}
                      </div>
                      {service.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {(() => {
                      const priceInfo = getServicePrice(service);
                      return (
                        <div className="font-semibold text-gray-900">
                          {priceInfo ? 
                            formatPrice(priceInfo.amount, priceInfo.currency) : 
                            'Price not available'
                          }
                        </div>
                      );
                    })()}
                    <div className="text-sm text-gray-600 flex items-center justify-end mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(service.duration)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};