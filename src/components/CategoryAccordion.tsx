import React, { useState } from 'react';
import { UniversalCategory, UniversalService } from '../hooks/useUniversalCategories';

interface CategoryAccordionProps {
  categories: UniversalCategory[];
  categoryServices: Record<string, UniversalService[]>;
  selectedServices: UniversalService[];
  onServiceSelect: (service: UniversalService) => void;
  isLoading?: boolean;
}

export const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  categories,
  categoryServices,
  selectedServices,
  onServiceSelect,
  isLoading = false
}) => {
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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
                      return (
                        <label
                          key={service.id}
                          className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onServiceSelect(service)}
                                className="sr-only"
                              />
                              <div 
                                className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-colors ${
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
                              </div>
                            </div>
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
                              ${service.price.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center justify-end mt-1">
                              
                              {service.duration}min
                            </div>
                          </div>
                        </label>
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
