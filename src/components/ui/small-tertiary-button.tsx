import { forwardRef } from "react";

type SmallTertiaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export const SmallTertiaryButton = forwardRef<
  HTMLButtonElement,
  SmallTertiaryButtonProps
>(({ children, className = "", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

SmallTertiaryButton.displayName = "SmallTertiaryButton";


