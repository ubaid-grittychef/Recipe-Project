import Link from "next/link";
import { ChefHat } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500">
        <ChefHat className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-center text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-600"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
