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