<>
                      <div className="flex items-center justify-between">
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
                  centerId={selectedProvider?.provider_id || ''} // Use selected provider for services fetching
                  isOpen={openCategories.has(category.id)}
                  onToggle={() => toggleCategory(category.id)}
                  onServiceSelect={(serviceId, duration) => handleServiceSelect(category.id, serviceId, duration)}
                  selectedServiceId={selectedServices[category.id]?.serviceId}
                />
              ))}
            </div>

            {/* Action Buttons */}
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

        {/* Right Side - Image and Rating */}
        <div className="hidden lg:flex flex-1 relative">
          {/* Background Image */}
          <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent">
            <img
              src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Professional skincare treatment"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Rating Card */}
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

          {/* Decorative Elements */}
          <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#C2A88F]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-20 w-32 h-32 bg-[#C2A88F]/15 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );
  }

  // Step 3: Date & Time Selection
  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-8">
                <div className="text-2xl font-light text-gray-800 tracking-wide">
                  Oli.
                </div>
                
                {/* Navigation Icons */}
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

              {/* Sign In Button */}
              <Button className="bg-[#C2A88F] hover:bg-[#C2A88F]/90 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                Sign In
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="relative flex min-h-[calc(100vh-80px)]">
          {/* Left Side - Date & Time Selection */}
          <div className="flex-1 flex items-start justify-start px-6 lg:px-16 py-8">
            <div className="w-full max-w-4xl">
              {/* Step Indicator */}
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

              {/* Booking Error */}
              {bookingError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    Error loading availability: {bookingError}
                  </p>
                </div>
              )}

              {/* Calendar and Time Slots */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Calendar */}
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  availableDates={availableDates}
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />

                {/* Time Slots */}
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

              {/* Action Buttons */}
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

          {/* Right Side - Image and Stats */}
          <div className="hidden lg:flex flex-1 relative">
            {/* Background Image */}
            <div className="absolute inset-0 bg-gradient-to-l from-gray-900/20 to-transparent">
              <img
                src="https://images.pexels.com/photos/5069432/pexels-photo-5069432.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Professional skincare appointment"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Stats Card */}
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

            {/* Decorative Elements */}
            <div className="absolute top-1/4 -left-20 w-40 h-40 bg-[#C2A88F]/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 -right-20 w-32 h-32 bg-[#C2A88F]/15 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>
    );
  }
};