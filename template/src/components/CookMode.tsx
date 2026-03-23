"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChefHat, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  instructions: string[];
  recipeTitle: string;
}

export default function CookMode({ instructions, recipeTitle }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const total = instructions.length;

  const close = useCallback(() => {
    setIsOpen(false);
    setCurrentStep(0);
    setShowDone(false);
  }, []);

  const prev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const next = useCallback(() => {
    if (currentStep < total - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      // Last step — show done message
      setShowDone(true);
      setTimeout(() => {
        close();
      }, 2000);
    }
  }, [currentStep, total, close]);

  // Wake Lock
  useEffect(() => {
    if (!isOpen) return;

    let lock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
          wakeLockRef.current = lock;
        }
      } catch {
        // Wake Lock not supported or denied — ignore
      }
    }

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, prev, next, close]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <ChefHat className="h-4 w-4" />
        Start Cooking
      </button>
    );
  }

  const progress = ((currentStep + 1) / total) * 100;

  if (showDone) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center px-6">
          <div className="text-6xl mb-4">&#127860;</div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Done! Enjoy your meal!</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Closing cook mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-900">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
            {recipeTitle}
          </p>
          <p className="text-xs text-slate-400">
            Step {currentStep + 1} of {total}
          </p>
        </div>
        <button
          onClick={close}
          className="ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close cook mode"
        >
          <X className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-primary-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-8 sm:px-12">
        <div className="max-w-2xl text-center">
          <span
            className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500 text-lg font-bold text-white"
          >
            {currentStep + 1}
          </span>
          <p className="mt-4 text-2xl leading-relaxed text-slate-800 dark:text-slate-200 md:text-3xl md:leading-relaxed">
            {instructions[currentStep]}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-4 sm:px-6">
        <button
          onClick={prev}
          disabled={currentStep === 0}
          className="flex h-12 min-w-[100px] items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous step"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Step dots */}
        <div className="hidden items-center gap-1.5 sm:flex">
          {instructions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentStep
                  ? "scale-110 bg-primary-500"
                  : i < currentStep
                    ? "bg-slate-300"
                    : "bg-slate-200"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-sm text-slate-400 sm:hidden">
          {currentStep + 1} / {total}
        </span>

        <button
          onClick={next}
          className="flex h-12 min-w-[100px] items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 text-sm font-bold text-white transition-colors hover:opacity-90"
          aria-label={currentStep === total - 1 ? "Finish cooking" : "Next step"}
        >
          {currentStep === total - 1 ? "Finish" : "Next"}
          {currentStep < total - 1 && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
