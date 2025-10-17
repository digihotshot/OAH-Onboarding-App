import React, { useState } from 'react';
import {
  UniversalAddOn,
  UniversalCategory,
  UniversalService
} from '../hooks/useUniversalCategories';

interface CategoryAccordionProps {
  categories: UniversalCategory[];
  categoryServices: Record<string, UniversalService[]>;
  selectedServices: UniversalService[];
  selectedAddOns: Record<string, UniversalAddOn[]>;
  onServiceSelect: (service: UniversalService) => void;
  onAddOnToggle: (service: UniversalService, addOn: UniversalAddOn, isSelected: boolean) => void;
  isLoading?: boolean;
}

export const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  categories,
  categoryServices,
  selectedServices,
  selectedAddOns,
  onServiceSelect,
  onAddOnToggle,
  isLoading = false
}) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const formatPrice = (price: number) => {
    const resolvedPrice = Number.isFinite(price) ? price : 0;
    return `$${resolvedPrice.toFixed(2)}`;
  };


  const handleServiceSelection = (service: UniversalService) => {
    onServiceSelect(service);
  };


  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C2A88F] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isOpen = openCategories.has(category.id);
        const services = categoryServices[category.id] || [];

        return (
          <div
            key={category.id}
            className="bg-white overflow-hidden"
            style={{
              borderWidth: '1px',
              borderColor: '#C2A88F80'
            }}
          >
            {/* Category Header  */}
            <div
              className={`cursor-pointer transition-colors ${
                isOpen ? 'bg-[#C2A88F]' : 'bg-[#FFFFFF]'
              }`}
              style={{
                paddingTop: '16px',
                paddingRight: '20px',
                paddingBottom: '16px',
                paddingLeft: '20px'
              }}
              onClick={() => toggleCategory(category.id)}
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-base font-semibold ${
                  isOpen ? 'text-white' : 'text-gray-900'
                }`}>
                  {category.name}
                </h3>
                
                <svg 
                  className={`transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`} 
                  width="18" 
                  height="18" 
                  viewBox="0 0 18 18" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M3.6001 6.30078L9.0001 11.7008L14.4001 6.30078" stroke={isOpen ? "#FFFFFF" : "#737373"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Services List */}
            <div 
              className={`bg-white overflow-hidden transition-all duration-600 ease-in ${
                isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="bg-white">
                {services.length === 0 ? (
                  <div className="px-6 py-4">
                    <p className="text-sm text-gray-600">No services available</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {services.map((service) => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      const showAddOns = Boolean(isSelected && service.addOns && service.addOns.length > 0);
                      const selectedAddOnsForService = selectedAddOns[service.id] ?? [];
                      return (
                        <div
                          key={service.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#F5F1ED]' : 'bg-white'
                          }`}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleServiceSelection(service)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleServiceSelection(service);
                              }
                            }}
                            className="flex items-center justify-between px-6 py-4 cursor-pointer"
                            aria-pressed={isSelected}
                          >
                            <div className="flex items-center space-x-4">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleServiceSelection(service);
                                }}
                                className={`flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C5A88C] ${
                                  isSelected 
                                    ? 'bg-[#C5A88C] border-[#C5A88C]' 
                                    : 'border-[#C5A88C] bg-white'
                                }`}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderColor: '#C5A88C',
                                  borderRadius: '50%'
                                }}
                                aria-pressed={isSelected}
                              >
                                {isSelected && (
                                  <svg 
                                    width="12" 
                                    height="12" 
                                    viewBox="0 0 12 12" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path 
                                      d="M10 3L4.5 8.5L2 6" 
                                      stroke="white" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </button>
                              <div>
                                <div className="font-semibold text-gray-900 text-base">
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
                              <div className="font-bold text-gray-900 text-base">
                                {formatPrice(service.price)}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center justify-end mt-1">
                                {service.duration}min
                              </div>
                            </div>
                          </div>

                          {showAddOns && (
                            <div className="bg-[#F8F5F2] border-t border-gray-100 px-12 pb-3">
                              <div className="text-xs font-semibold text-[#A07C5A] uppercase tracking-wide py-3">
                                Add-on Services ({service.name})
                              </div>
                              <div className="mt-1 space-y-2">
                                {service.addOns?.map(addOn => {
                                  const isAddOnSelected = selectedAddOnsForService.some(selected => selected.id === addOn.id);
                                  return (
                                    <div
                                      key={addOn.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => onAddOnToggle(service, addOn, isAddOnSelected)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          onAddOnToggle(service, addOn, isAddOnSelected);
                                        }
                                      }}
                                      className="flex items-start justify-between py-2 cursor-pointer"
                                      aria-pressed={isAddOnSelected}
                                    >
                                      <div className="flex items-start space-x-4 pr-4">
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            onAddOnToggle(service, addOn, isAddOnSelected);
                                          }}
                                          className={`flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C5A88C] ${
                                            isAddOnSelected
                                              ? 'bg-[#C5A88C] border-[#C5A88C]'
                                              : 'border-[#C5A88C] bg-white'
                                          }`}
                                          style={{
                                            width: '20px',
                                            height: '20px',
                                            borderColor: '#C5A88C',
                                            borderRadius: '50%'
                                          }}
                                          aria-pressed={isAddOnSelected}
                                        >
                                          {isAddOnSelected && (
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M10 3L4.5 8.5L2 6"
                                                stroke="white"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          )}
                                        </button>
                                        <div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            {addOn.name}
                                          </div>
                                          {addOn.description && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {addOn.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right whitespace-nowrap">
                                        <div className="text-sm font-semibold text-gray-900">
                                          {formatPrice(addOn.price)}
                                        </div>
                                        {typeof addOn.duration === 'number' && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {addOn.duration}min
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
