"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import NewsletterSignup from "./NewsletterSignup";

const DISMISS_KEY = "newsletter_banner_dismissed";
const SUBSCRIBERS_KEY = "newsletter_subscribers";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function NewsletterBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Check if already subscribed
    try {
      const subscribers = JSON.parse(localStorage.getItem(SUBSCRIBERS_KEY) || "[]");
      if (subscribers.length > 0) {
        setShouldRender(false);
        return;
      }
    } catch {
      // ignore parse errors
    }

    // Check if dismissed within the last 7 days
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt).getTime();
        if (Date.now() - dismissedTime < SEVEN_DAYS_MS) {
          setShouldRender(false);
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (dismissed) return;
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (scrollPercent > 0.3) {
      setVisible(true);
    }
  }, [dismissed]);

  useEffect(() => {
    if (!shouldRender) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [shouldRender, handleScroll]);

  function handleDismiss() {
    setDismissed(true);
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    } catch {
      // ignore storage errors
    }
  }

  if (!shouldRender || dismissed) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-2xl">
        <div className="mx-auto max-w-2xl px-4 py-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Dismiss newsletter banner"
          >
            <X className="w-5 h-5" />
          </button>
          <NewsletterSignup variant="banner" />
        </div>
      </div>
    </div>
  );
}
