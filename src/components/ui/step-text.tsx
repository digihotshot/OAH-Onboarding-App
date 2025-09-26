import React from 'react';
import { cn } from '../../lib/utils';

interface StepTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const StepText: React.FC<StepTextProps> = ({ 
  className, 
  children, 
  ...props 
}) => {
  return (
    <p
      className={cn(
        "text-[14px] leading-[137%] tracking-[0%] uppercase tracking-wider font-medium mb-2",
        className
      )}
      style={{
        fontFamily: 'Work Sans, sans-serif',
        fontWeight: 500,
        fontStyle: 'normal',
        fontSize: '14px',
        lineHeight: '137%',
        letterSpacing: '0%',
        color: '#C5A88C'
      }}
      {...props}
    >
      {children}
    </p>
  );
};
