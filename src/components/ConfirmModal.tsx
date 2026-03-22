"use client";

/**
 * Reusable confirmation dialog that replaces window.confirm().
 * Usage:
 *   const [confirm, ConfirmDialog] = useConfirm();
 *   ...
 *   const ok = await confirm({ title: "Delete?", description: "This cannot be undone.", confirmLabel: "Delete", danger: true });
 *   if (ok) { ... }
 *   ...
 *   return <>{ConfirmDialog}</>;
 */

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirm(): [
  (opts: ConfirmOptions) => Promise<boolean>,
  React.ReactNode
] {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...opts, resolve });
    });
  }, []);

  function answer(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  const dialog = state ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") answer(false);
        if (e.key === "Enter") answer(true);
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => answer(false)}
      />
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" role="dialog" aria-modal="true">
        <button
          onClick={() => answer(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {state.danger && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
        )}

        <h2 className="text-base font-semibold text-foreground">{state.title}</h2>
        {state.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{state.description}</p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            autoFocus
            onClick={() => answer(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
          >
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => answer(true)}
            className={
              state.danger
                ? "rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                : "rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            }
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return [confirm, dialog];
}
