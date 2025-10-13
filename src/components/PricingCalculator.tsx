import React from 'react';
import { UniversalAddOn, UniversalService } from '../hooks/useUniversalCategories';
import { H2Heading } from './ui/h2-heading';

interface PricingCalculatorProps {
  selectedServices: UniversalService[];
  selectedAddOns: Record<string, UniversalAddOn[]>;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
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
    <div className="mt-8">
      {/* Heading outside wrapper */}
      <H2Heading className="mb-4">Selected Services</H2Heading>
      
      {/* Services wrapper */}
      <div className="bg-white border border-[#C2A88F80]">
        <div className="space-y-0">
          {/* 1st Row Wrapper - Header */}
          <div className="flex justify-between items-center py-4 border-b px-6" style={{borderColor: '#C2A88F80'}}>
            <span className="font-semibold text-gray-900">Description</span>
            <span className="font-semibold text-gray-900">Amount</span>
          </div>
          
          {/* 2nd Row Wrapper - Services */}
          <div className="flex flex-col px-6 py-4 space-y-4">
            {selectedServices.map((service) => {
              const addOnsForService = selectedAddOns[service.id] ?? [];
              return (
                <div key={service.id} className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="text-base font-medium text-gray-900">
                        {service.name}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-gray-900 text-base">
                        {formatPrice(service.price)}
                      </div>
                    </div>
                  </div>

                  {addOnsForService.length > 0 && (
                    <div className="mt-2 space-y-2 border-l border-[#C2A88F40] pl-4 ml-2">
                      {addOnsForService.map(addOn => (
                        <div key={addOn.id} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-sm text-gray-800">
                              {addOn.name}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {formatPrice(addOn.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 3rd Row Wrapper - Total */}
          <div className="py-4 border-t px-6" style={{borderColor: '#C2A88F80'}}>
            <div className="flex justify-between items-center">
              <span 
                className="text-gray-600"
                style={{
                  fontFamily: 'Work Sans',
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '137%',
                  letterSpacing: '-3%',
                  color: '#C5A88C'
                }}
              >
                Total
              </span>
              <span 
                className="text-gray-600"
                style={{
                  fontFamily: 'Work Sans',
                  fontWeight: 600,
                  fontSize: '18px',
                  lineHeight: '137%',
                  letterSpacing: '-3%',
                  color: '#C5A88C'
                }}
              >
                {formatPrice(totalPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
