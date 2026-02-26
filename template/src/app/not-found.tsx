import Link from "next/link";
import { ChefHat } from "lucide-react";
import { siteConfig } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-white"
        style={{ backgroundColor: siteConfig.primaryColor }}
      >
        <ChefHat className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-center text-slate-600">
        Oops! This recipe seems to have wandered off the menu. Let&apos;s get you
        back to the kitchen.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
      >
        Back to home
      </Link>
    </div>
  );
}
