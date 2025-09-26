import React from 'react';
import { cn } from '../../lib/utils';

interface H2HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const H2Heading: React.FC<H2HeadingProps> = ({ 
  children, 
  className, 
  ...props 
}) => {
  return (
    <h2 
      className={cn("", className)}
      style={{
        fontFamily: 'DM Serif Display',
        fontWeight: 400,
        fontSize: '20px',
        lineHeight: '137%'
      }}
      {...props}
    >
      {children}
    </h2>
  );
};
