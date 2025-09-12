import React from 'react';
import { MapPin, CalendarIcon, Home, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressInput } from '@/components/AddressInput';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { Calendar } from '@/components/Calendar';
import { TimeSlots } from '@/components/TimeSlots';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { useZenotiCategories } from '@/hooks/useZenotiCategories';
import { useZenotiBooking } from '@/hooks/useZenotiBooking';
import { providers } from '@/data/providers';

export const Box: React.FC = () => {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [address, setAddress] = React.useState('');
  const [showResults, setShowResults] = React.useState(false);
  const [matchedProviders, setMatchedProviders] = React.useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = React.useState<any>(null);
  const [selectedServices, setSelectedServices] = React.useState<{[categoryId: string]: {serviceId: string, duration: number}}>({});
  const [openCategories, setOpenCategories] = React.useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = React.useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [availableDates, setAvailableDates] = React.useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = React.useState<any[]>([]);
  const [centerSlots, setCenterSlots] = React.useState<{[centerId: string]: any}>({});

  const { searchAddress } = useGooglePlaces();
  const { categories, loading: categoriesLoading, error: categoriesError } = useZenotiCategories(selectedProvider?.provider_id || '');
  const { getAvailableSlots, loading: bookingLoading, error: bookingError } = useZenotiBooking();

  const handleNext = async () => {
    if (currentStep === 1) {
      setShowResults(true);
      
      try {
        const result = await searchAddress(address);
        console.log('🔍 Address search result:', result);
        
        if (result?.zipCode) {
          const matched = providers.filter(provider => 
            provider.zipCodes.includes(result.zipCode)
          );
          
          const providerNames = matched.map(p => p.name);
          setMatchedProviders(providerNames);
          
          if (matched.length > 0) {
            setSelectedProvider(matched[0]);
            console.log('✅ Selected provider:', matched[0]);
          }
        }
      } catch (error) {
        console.error('❌ Error searching address:', error);
        setMatchedProviders([]);
      }
      
      if (matchedProviders.length > 0) {
        setCurrentStep(2);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newOpenCategories = new Set(openCategories);
    if (newOpenCategories.has(categoryId)) {
      newOpenCategories.delete(categoryId);
    } else {
      newOpenCategories.add(categoryId);
    }
    setOpenCategories(newOpenCategories);
  };

  const handleServiceSelect = (categoryId: string, serviceId: string, duration: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [categoryId]: { serviceId, duration }
    }));
  };

  const handleNextFromStep2 = async () => {
    if (Object.keys(selectedServices).length > 0) {
      setCurrentStep(3);
      await fetchAvailableSlots();
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedProvider) return;

    console.log('🔄 Fetching available slots for all centers...');
    
    const allDatesSet = new Set<string>();
    const centerSlotsData: {[centerId: string]: any} = {};
    
    for (const provider of providers) {
      if (provider.name === selectedProvider.name) {
        console.log(`📍 Processing center: ${provider.name} (${provider.provider_id})`);
        
        try {
          const result = await getAvailableSlots(provider.provider_id);
          
          if (result?.slots && result.slots.length > 0) {
            centerSlotsData[provider.provider_id] = {
              slots: result.slots,
              providerName: provider.name
            };
            
            const filteredDates = result.slots
              .filter((slot: any) => slot.Available)
              .map((slot: any) => slot.Time.split('T')[0])
              .filter((date: string, index: number, self: string[]) => self.indexOf(date) === index);
            
            filteredDates.forEach(date => allDatesSet.add(date));
            console.log(`✅ Center ${provider.name}: ${result.slots.length} slots, ${filteredDates.length} available dates`);
          }
        } catch (error) {
          console.error(`❌ Error fetching slots for ${provider.name}:`, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setCenterSlots(centerSlotsData);
    
    const allAvailableDatesArray = Array.from(allDatesSet)
      .sort()
      .map(dateStr => new Date(dateStr + 'T00:00:00'));
    
    setAvailableDates(allAvailableDatesArray);
    
    console.log('🎯 Combined results:', {
      totalCenters: Object.keys(centerSlotsData).length,
      totalAvailableDates: allAvailableDatesArray.length,
      availableDates: allAvailableDatesArray
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const combinedSlots: any[] = [];
    
    Object.entries(centerSlots).forEach(([centerId, centerData]) => {
      const slotsForDate = centerData.slots
        .filter((slot: any) => slot.Available && slot.Time.startsWith(dateString))
        .map((slot: any) => ({
          time: slot.Time.split('T')[1].substring(0, 5),
          centerId: centerId,
          providerName: centerData.providerName,
          available: slot.Available,
          fullTime: slot.Time
        }));
      
      combinedSlots.push(...slotsForDate);
    });

    combinedSlots.sort((a, b) => a.time.localeCompare(b.time));
    setTimeSlots(combinedSlots);
    
    console.log(`📅 Selected date ${dateString}: ${combinedSlots.length} available slots from ${Object.keys(centerSlots).length} centers`);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    
    const selectedSlot = timeSlots.find(slot => slot.time === time);
    if (selectedSlot) {
      setSelectedCenter(selectedSlot.centerId);
      console.log(`🎯 Selected time ${time} from center: ${selectedSlot.providerName} (${selectedSlot.centerId})`);
    }
  };

  React.useEffect(() => {
    console.log('📝 Address value changed:', address);
    setShowResults(false);
  }, [address]);

  const canProceed = address.trim().length > 0;

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-2xl font-light text-gray-800 tracking-wide">
                  Oli.
                </div>
                
                <div className="hidden md:flex items-center space-x-6">
                  <button className="p-2 rounded-full bg-[#C2A88F]/20 text-[#C2A88F] hover:bg-[#C2A88F]/30 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <CalendarIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <Home className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <Button className="bg-[#C2A88F] hover:bg-[#C2A88F]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Sign In
              </Button>
            </div>
          </div>
        </header>

        <div className="relative flex min-h-[calc(100vh-80px)]">
          <div className="flex-1 flex items-center justify-start px-6 lg:px-16">
            <div className="w-full max-w-lg">
              <div className="mb-8">
                <p className="text-sm font-medium text-[#C2A88F] tracking-wider uppercase mb-2">
                  Step 1 of 4
                </p>
                <h1 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight">
                  Enter your address
                </h1>
              </div>

              <div className="mb-8">
                <AddressInput
                  value={address}
                  onChange={setAddress}
                  placeholder="Enter your address"
                />
                
                {showResults && matchedProviders.length > 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800 mb-2">
                      Available Providers:
                    </h3>
                    <ul className="space-y-1">
                      {matchedProviders.map((providerName, index) => (
                        <li key={index} className="text-sm text-green-700">
                          • {providerName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {showResults && address && matchedProviders.length === 0 && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-700">
                      Sorry, we don't currently serve your area. Please check back soon as we're expanding!
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
                  Back
                </button>
                <Button 
                  className={`px-8 py-3 rounded-xl font-medium transition-colors shadow-sm ${
                    canProceed 
                      ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!canProceed}
                  onClick={handleNext}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 relative">
            <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent">
              <img
                src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional skincare consultation"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  50,000+
                </div>
                <p className="text-gray-600 leading-relaxed">
                  customers transformed their skin, right from the privacy of their home
                </p>
              </div>
            </div>

            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#C2A88F]/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-32 h-32 bg-[#C2A88F]/15 rounded-full blur-2xl"></div>
          </div>
        </div>

        <div className="lg:hidden relative h-64 mx-6 mb-8 rounded-2xl overflow-hidden">
          <img
            src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=600"
            alt="Professional skincare consultation"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                50,000+
              </div>
              <p className="text-sm text-gray-600">
                customers transformed their skin from home
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-2xl font-light text-gray-800 tracking-wide">
                  Oli.
                </div>
                
                <div className="hidden md:flex items-center space-x-6">
                  <button className="p-2 rounded-full bg-[#C2A88F]/20 text-[#C2A88F] hover:bg-[#C2A88F]/30 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <CalendarIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <Home className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <Button className="bg-[#C2A88F] hover:bg-[#C2A88F]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Sign In
              </Button>
            </div>
          </div>
        </header>

        <div className="relative flex min-h-[calc(100vh-80px)]">
          <div className="flex-1 flex items-start justify-start px-6 lg:px-16 py-8">
            <div className="w-full max-w-lg">
              <div className="mb-8">
                <p className="text-sm font-medium text-[#C2A88F] tracking-wider uppercase mb-2">
                  Step 2 of 4
                </p>
                <h1 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight mb-4">
                  Choose your treatment
                </h1>
                {selectedProvider && (
                  <p className="text-lg text-gray-600">
                    with {selectedProvider.name}
                  </p>
                )}
              </div>

              <div className="mb-8 space-y-4">
                {categoriesLoading && (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-4">
                        <div className="animate-pulse flex items-center justify-between">
                          <div className="h-6 bg-gray-200 rounded w-32"></div>
                          <div className="h-5 w-5 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {categoriesError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      Error loading categories: {categoriesError}
                    </p>
                  </div>
                )}

                {!categoriesLoading && !categoriesError && categories.map((category) => (
                  <CategoryDropdown
                    key={category.id}
                    category={category}
                    centerId={selectedProvider?.provider_id || ''}
                    isOpen={openCategories.has(category.id)}
                    onToggle={() => toggleCategory(category.id)}
                    onServiceSelect={(serviceId, duration) => handleServiceSelect(category.id, serviceId, duration)}
                    selectedServiceId={selectedServices[category.id]?.serviceId}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back
                </button>
                <Button 
                  className="px-8 py-3 rounded-xl font-medium transition-colors shadow-sm bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleNextFromStep2}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 relative">
            <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent">
              <img
                src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional skincare treatment"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-3xl font-bold text-gray-900">4.8</span>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className="w-6 h-6 text-yellow-400 fill-current"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Rated by 1,200+ users across the country
                </p>
              </div>
            </div>

            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#C2A88F]/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-32 h-32 bg-[#C2A88F]/15 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <div className="text-2xl font-light text-gray-800 tracking-wide">
                  Oli.
                </div>
                
                <div className="hidden md:flex items-center space-x-6">
                  <button className="p-2 rounded-full bg-[#C2A88F]/20 text-[#C2A88F] hover:bg-[#C2A88F]/30 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <CalendarIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <Home className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                    <User className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <Button className="bg-[#C2A88F] hover:bg-[#C2A88F]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Sign In
              </Button>
            </div>
          </div>
        </header>

        <div className="relative flex min-h-[calc(100vh-80px)]">
          <div className="flex-1 flex items-start justify-start px-6 lg:px-16 py-8">
            <div className="w-full max-w-4xl">
              <div className="mb-8">
                <p className="text-sm font-medium text-[#C2A88F] tracking-wider uppercase mb-2">
                  Step 3 of 4
                </p>
                <h1 className="text-4xl lg:text-5xl font-light text-gray-900 leading-tight mb-4">
                  Select date & time
                </h1>
                {selectedProvider && (
                  <p className="text-lg text-gray-600">
                    with {selectedProvider.name}
                  </p>
                )}
              </div>

              {bookingError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    Error loading availability: {bookingError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  availableDates={availableDates}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />

                {selectedDate ? (
                  <TimeSlots
                    selectedDate={selectedDate}
                    timeSlots={timeSlots}
                    selectedTime={selectedTime}
                    onTimeSelect={handleTimeSelect}
                    isLoading={bookingLoading}
                  />
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Select a date to view available times</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back
                </button>
                <Button 
                  className={`px-8 py-3 rounded-xl font-medium transition-colors shadow-sm ${
                    selectedDate && selectedTime
                      ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!selectedDate || !selectedTime}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 relative">
            <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent">
              <img
                src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional skincare appointment"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  700+ slots
                </div>
                <p className="text-gray-600 leading-relaxed">
                  booked in last month
                </p>
              </div>
            </div>

            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#C2A88F]/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-32 h-32 bg-[#C2A88F]/15 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};