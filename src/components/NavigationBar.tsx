import React from 'react';

interface NavigationBarProps {
  currentStep: number;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ currentStep }) => {
  const steps = [
    { number: 1, icon: '/step-indicator/location.svg', label: 'Address' },
    { number: 2, icon: '/step-indicator/service.svg', label: 'Services' },
    { number: 3, icon: '/step-indicator/calendar.svg', label: 'Schedule' },
    { number: 4, icon: '/step-indicator/account.svg', label: 'Details' }
  ];

  return (
    <>
      {/* Mobile Navigation (md:hidden) */}
      <nav className="relative top-0 left-0 right-0 z-[90] bg-transparent md:hidden">
        <div className="w-full max-w-6xl mx-auto px-4 py-2">
          {/* Top Row: Centered Logo */}
          <div className="flex justify-center">
            <img
              src="/OLI logo.png"
              alt="Oli Logo"
              className="w-[64px] h-auto"
            />
          </div>

          {/* Step Tracker: centered below logo on mobile */}
          <div className="flex items-center justify-center mt-2">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.number
                      ? 'bg-[#C5A88C] border-2 border-[#C5A88C]'
                      : 'bg-[#F9F9F9] border-2 border-[#F1E6DA]'
                  }`}
                >
                  <img
                    src={step.icon}
                    alt={step.label}
                    className={`w-5 h-5 ${currentStep >= step.number ? 'filter brightness-0 invert' : ''}`}
                  />
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-[40px] h-[2px] ${currentStep > step.number ? 'bg-[#C5A88C]' : 'bg-[#F1E6DA]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop/Tablet Navigation (hidden on mobile) */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-[90] backdrop-blur-sm border-b border-gray-200" style={{ background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(255, 255, 255, 0.3) 65.35%)' }}>
        <div className="flex items-center justify-center py-1 md:w-[65%] w-full md:pl-[3%] pl-4 pr-4">
          {/* Logo and Step Tracker */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img
                src="/OLI logo.png"
                alt="Oli Logo"
                className="w-[64px] h-[auto]"
              />
            </div>

            {/* Vertical Line */}
            <div className="hidden md:block w-[1px] h-[50px] bg-[#C5A88C]"></div>

            {/* Step Tracker */}
            <div className="hidden md:flex items-center">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  {/* Step Circle with Icon */}
                  <div className={`w-[46px] h-[46px] rounded-full flex items-center justify-center transition-colors ${
                    currentStep >= step.number
                      ? 'bg-[#C5A88C] border-2 border-[#C5A88C]'
                      : 'bg-[#F9F9F9] border-2 border-[#F1E6DA]'
                  }`}>
                    <img
                      src={step.icon}
                      alt={step.label}
                      className={`w-6 h-6 ${
                        currentStep >= step.number ? 'filter brightness-0 invert' : ''
                      }`}
                    />
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`w-[64px] h-[2px] ${
                      currentStep > step.number ? 'bg-[#C5A88C]' : 'bg-[#F1E6DA]'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
