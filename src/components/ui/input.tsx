import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[48px] md:h-[60px] w-full border-[1px] border-gray-200 bg-white px-4 py-4 text-base input-typography text-gray-900 transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#C2A88F] hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
