import React from 'react';
import { UniversalAddOn, UniversalService } from '../hooks/useUniversalCategories';

interface SelectedServicesProps {
  selectedServices: UniversalService[];
  selectedAddOns: Record<string, UniversalAddOn[]>;
}

export const SelectedServices: React.FC<SelectedServicesProps> = ({
  selectedServices,
  selectedAddOns
}) => {
  // Calculate totals
  const servicesTotal = selectedServices.reduce((sum, service) => sum + service.price, 0);
  const addOnsTotal = Object.values(selectedAddOns)
    .flat()
    .reduce((sum, addOn) => sum + addOn.price, 0);
  const totalPrice = servicesTotal + addOnsTotal;

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
        {selectedServices.map((service) => {
          const addOnsForService = selectedAddOns[service.id] ?? [];
          return (
            <div key={service.id} className="py-2 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-900">
                  {service.name}
                </span>
                <span className="text-gray-900 font-medium">
                  {formatPrice(service.price)}
                </span>
              </div>

              {addOnsForService.length > 0 && (
                <div className="mt-2 space-y-2 border-l border-[#C2A88F40] pl-4 ml-2">
                  {addOnsForService.map(addOn => (
                    <div key={addOn.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-800">
                        {addOn.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(addOn.price)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
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
