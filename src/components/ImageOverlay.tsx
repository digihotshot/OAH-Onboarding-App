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

// Bottom left overlay (matching the image description)
export const BottomLeftOverlay: React.FC = () => {
  return (
    <ImageOverlay >
      <div 
        className="bg-white p-6 max-w-sm"
        style={{ 
          borderTopLeftRadius: '0px',
          borderBottomLeftRadius: '0px',
          borderTopRightRadius: '50px',
          borderBottomRightRadius: '0px',
          border: '1px solid #C2A88F',
          marginLeft: '-20%',
          marginBottom: '5%'
          
        }}
      >
        <div className="text-left text-[#71430C]">
          <div className="text-2xl font-bold">
            50,000+
          </div>
          <div className="text-xl">
            customers transformed their skin, right from the privacy of their home
          </div>
        </div>
      </div>
    </ImageOverlay>
  );
};
