import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        black:
          "bg-black text-white hover:bg-gray-900",
        brown:
          "bg-[#C2A88F] text-white hover:bg-[#B8A082] transition-colors",
        disabled:
          "bg-[#00000080] text-white cursor-not-allowed",
        ghost: "",
        orange: "bg-[#FFF3E7] text-gray-900 hover:bg-[#FFF0E0] border border-[#FFF3E7]",
      },
      size: {
        default: "h-12 px-8 rounded-lg py-4 text-base",
        sm: "h-10 rounded-lg px-4 text-sm",
        lg: "h-14 rounded-lg px-8 text-lg",
        icon: "h-12 w-12",
        ghost: "h-auto px-0 py-0 text-base",
        orange: "h-auto px-4 py-2 rounded-[80px] gap-2",
      },
    },
    defaultVariants: {
      variant: "black",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    // Automatically use ghost size when variant is ghost
    const effectiveSize = variant === "ghost" ? "ghost" : size;
    return (
      <Comp
        className={cn(buttonVariants({ variant, size: effectiveSize, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

// Specialized Edit Button Component
interface EditButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: React.ReactNode;
  iconSrc?: string;
  iconAlt?: string;
}

const OrangeButton = React.forwardRef<HTMLButtonElement, EditButtonProps>(
  ({ className, children, iconSrc = "/edit icon.svg", iconAlt = "Edit", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-[80px] bg-[#FFF3E7] text-gray-900 hover:bg-[#FFF0E0] transition-colors",
          "font-normal text-base leading-[137%] tracking-[-0.03em]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        <img 
          src={iconSrc} 
          alt={iconAlt} 
          className="w-4 h-4 flex-shrink-0" 
        />
        <span className="font-normal hidden md:inline text-base tracking-[-0.03em]" style={{ fontFamily: 'Work Sans' }}>
          {children}
        </span>
      </button>
    );
  }
);
OrangeButton.displayName = "OrangeButton";

export { Button, buttonVariants, OrangeButton };
