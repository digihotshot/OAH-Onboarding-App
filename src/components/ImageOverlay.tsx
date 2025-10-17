import React from 'react';

interface ImageOverlayProps {
  className?: string;
  children?: React.ReactNode;
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div 
      className={`absolute inset-0 flex items-end justify-start pointer-events-none ${className}`}
    >
      <div className="pointer-events-auto">
        {children}
      </div>
    </div>
  );
};

interface BottomLeftOverlayProps {
  currentStep: number;
}

// Bottom left overlay with step-based content
export const BottomLeftOverlay: React.FC<BottomLeftOverlayProps> = ({ currentStep }) => {
  const getOverlayContent = () => {
    switch (currentStep) {
      case 1: // Address step
        return {
          title: "Thousands Across Michigan Choose Oli."
        };
      case 2: // Service selection step - Rating display
        return {
          title: "5.0",
          subtitle: "Rated 5.0 stars by hundreds of patients across Michigan",
          showStars: true
        };
      case 3: // Calendar step
        return {
          title: "700+ slots",
          subtitle: "booked in last month."
        };
      case 4: // User info step
        return {
          title: "3k+ patients",
          subtitle: "across Michigan",
         
        };
      case 5: // Booking confirmation step
        return {
          title: "10 Years",
          subtitle: "Expert providers with experience of more than",
          subtitleFirst: true
        };
      case 6: // Final confirmation step
        return {
          title: "2.1M customers",
          subtitle: "Loved by over",
          subtitleFirst: true
        };
      default:
        return {
          title: "50,000+",
          subtitle: "customers transformed their skin, right from the privacy of their home"
        };
    }
  };

  const content = getOverlayContent();

  return (
    <ImageOverlay>
      <div 
        className="bg-white p-6 max-w-sm"
        style={{ 
          borderTopLeftRadius: '0px',
          borderBottomLeftRadius: '0px',
          borderTopRightRadius: '50px',
          borderBottomRightRadius: '0px',
          border: '1px solid #C2A88F',
          marginLeft: '-20%',
          marginBottom: '5%',
          minHeight:'5rem'
        }}
      >
        <div className="text-left text-[#71430C]">
          {content.subtitleFirst && (
            <div 
              className="mb-2"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontStyle: 'normal',
                fontSize: '18px',
                lineHeight: '137%',
                letterSpacing: '-3%'
              }}
            >
              {content.subtitle}
            </div>
          )}
          <div className="flex items-center">
            <div 
              className="mr-2"
              style={{
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: '28px',
                letterSpacing: '-3%'
              }}
            >
              {content.title}
            </div>
            {content.showStars && (
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-[#71430C] fill-current"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 18.896l-7.416 3.817 1.48-8.279L.001 9.306l8.332-1.151L12 .587z" />
                  </svg>
                ))}
              </div>
            )}
          </div>
          {!content.subtitleFirst && (
            <div 
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                fontStyle: 'normal',
                fontSize: '18px',
                lineHeight: '137%',
                letterSpacing: '-3%'
              }}
            >
              {content.subtitle}
            </div>
          )}
        </div>
      </div>
    </ImageOverlay>
  );
};
