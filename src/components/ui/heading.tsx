import React from 'react';
import { cn } from '../../lib/utils';

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ 
  as: Component = 'h1', 
  className, 
  children, 
  ...props 
}) => {
  return (
    <Component
      className={cn(
        "font-normal text-[36px] leading-[137%] tracking-[0%] text-gray-900",
        className
      )}
      style={{
        fontFamily: 'DM Serif Display, serif',
        fontWeight: 400,
        fontStyle: 'normal',
        fontSize: '36px',
        lineHeight: '137%',
        letterSpacing: '0%'
      }}
      {...props}
    >
      {children}
    </Component>
  );
};
