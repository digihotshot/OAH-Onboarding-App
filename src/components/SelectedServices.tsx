import React from 'react';
import { UniversalService } from '../hooks/useUniversalCategories';

interface SelectedServicesProps {
  selectedServices: UniversalService[];
}

export const SelectedServices: React.FC<SelectedServicesProps> = ({
  selectedServices
}) => {
  // Calculate total price
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  // Format price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (selectedServices.length === 0) {
    return null; // Don't render anything if no services selected
  }

  return (
    <div className="bg-[#F5F1ED] rounded-lg p-6 mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Services</h3>
      
      <div className="space-y-3">
        {/* Header Row */}
        <div className="flex justify-between items-center py-2 border-b border-gray-300">
          <span className="font-semibold text-gray-900">Description</span>
          <span className="font-semibold text-gray-900">Amount</span>
        </div>
        
        {/* Service Rows */}
        {selectedServices.map((service) => (
          <div key={service.id} className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-900">
              {service.name}
            </span>
            <span className="text-gray-900 font-medium">
              {formatPrice(service.price)}
            </span>
          </div>
        ))}
        
        {/* Total Row */}
        <div className="flex justify-between items-center py-3 border-t-2 border-gray-400">
          <span className="text-gray-600 font-medium">Total</span>
          <span className="text-gray-600 font-semibold text-lg">
            {formatPrice(totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};
