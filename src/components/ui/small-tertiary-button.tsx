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
      className={`inline-flex items-center gap-1 rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-600 transition-colors hover:border-stone-400 hover:bg-stone-50 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

SmallTertiaryButton.displayName = "SmallTertiaryButton";


