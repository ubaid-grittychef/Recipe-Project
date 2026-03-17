"use client";
import { ReactNode } from "react";

interface Props {
  href: string;
  type: "amazon" | "hellofresh" | "skimlinks";
  label?: string;
  className?: string;
  children: ReactNode;
}

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; }
}

export default function AffiliateLink({ href, type, label, className, children }: Props) {
  function handleClick() {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "affiliate_click", { affiliate_type: type, affiliate_label: label ?? type, affiliate_url: href });
    }
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
