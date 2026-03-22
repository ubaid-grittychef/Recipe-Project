"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav className="mb-10">
      <ol className="flex items-center">
        {steps.map((label, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={label}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isComplete && "bg-brand-500 text-white",
                    isCurrent &&
                      "border-2 border-brand-500 bg-brand-50 text-brand-600",
                    !isComplete &&
                      !isCurrent &&
                      "border-2 border-border bg-card text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium lg:block",
                    isCurrent ? "text-brand-600" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-3 h-0.5 flex-1",
                    isComplete ? "bg-brand-500" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
