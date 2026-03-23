"use client";

import { useState, FormEvent } from "react";
import { Check } from "lucide-react";
import { siteConfig } from "@/lib/config";

interface NewsletterSignupProps {
  variant?: "inline" | "banner";
}

export default function NewsletterSignup({ variant = "inline" }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (!validateEmail(email)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");

    try {
      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem("newsletter_subscribers") || "[]");
      existing.push({ email, date: new Date().toISOString() });
      localStorage.setItem("newsletter_subscribers", JSON.stringify(existing));

      // Fire-and-forget POST if newsletterUrl is configured
      if (siteConfig.newsletterUrl) {
        fetch(siteConfig.newsletterUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {
          // fire-and-forget — don't block on errors
        });
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={variant === "banner" ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl p-6" : ""}>
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          <span className={variant === "banner" ? "text-green-700 font-medium" : "text-green-400 text-sm"}>
            You&apos;re subscribed!
          </span>
        </div>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-900/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Get Our Best Recipes Weekly</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          Join our newsletter for new recipes, tips, and cooking inspiration.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            disabled={status === "submitting"}
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="px-6 py-2.5 rounded-lg bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {status === "submitting" ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
        {status === "error" && errorMsg && (
          <p className="mt-2 text-sm text-red-600">{errorMsg}</p>
        )}
      </div>
    );
  }

  // Inline variant (for footer)
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={status === "submitting"}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          {status === "submitting" ? "..." : "Subscribe"}
        </button>
      </form>
      {status === "error" && errorMsg && (
        <p className="mt-1.5 text-sm text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
