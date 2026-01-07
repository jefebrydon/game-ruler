"use client";

import { cn } from "@/lib/utils";

type ToggleOption = {
  value: string;
  label: string;
};

type ToggleProps = {
  options: [ToggleOption, ToggleOption];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function Toggle({ options, value, onChange, className }: ToggleProps): React.ReactElement {
  return (
    <div className={cn("brass-gradient-static inline-flex rounded-[16px] p-[3px]", className)}>
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "h-9 px-6 rounded-[13px] font-body text-base font-bold transition-colors",
              isSelected
                ? "bg-white text-brass-400"
                : "bg-transparent text-white hover:bg-white/10"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

