"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, X, AlertCircle, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  dismissible?: boolean;
}

const TOAST_LIMIT = 3;
const TOAST_DURATION = 3500;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const toastStore = {
  toasts: [] as Toast[],
  listeners: [] as Array<(toasts: Toast[]) => void>,

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  },

  notify() {
    this.listeners.forEach((l) => l(this.toasts));
  },

  add(toast: Omit<Toast, "id">) {
    const newToast = { ...toast, id: generateId() };
    this.toasts = [...this.toasts.slice(-TOAST_LIMIT + 1), newToast];
    this.notify();

    if (toast.dismissible !== false && toast.type !== "loading") {
      setTimeout(() => this.dismiss(newToast.id), TOAST_DURATION);
    }

    return newToast.id;
  },

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  },

  dismissAll() {
    this.toasts = [];
    this.notify();
  },

  // Dismiss all loading toasts (used when operation completes with success/error)
  dismissLoading() {
    this.toasts = this.toasts.filter((t) => t.type !== "loading");
    this.notify();
  },
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastStore.toasts);

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  const dismiss = useCallback((id: string) => toastStore.dismiss(id), []);
  const dismissAll = useCallback(() => toastStore.dismissAll(), []);
  const dismissLoading = useCallback(() => toastStore.dismissLoading(), []);

  const success = useCallback((message: string, dismissible = true) => {
    toastStore.dismissLoading();
    toastStore.add({ type: "success", message, dismissible });
  }, []);
  const error = useCallback((message: string, dismissible = true) => {
    toastStore.dismissLoading();
    toastStore.add({ type: "error", message, dismissible });
  }, []);
  const info = useCallback((message: string, dismissible = true) =>
    toastStore.add({ type: "info", message, dismissible }), []);
  const loading = useCallback((message: string) =>
    toastStore.add({ type: "loading", message, dismissible: false }), []);

  return { toasts, dismiss, dismissAll, dismissLoading, success, error, info, loading };
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <Check className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  error: <X className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  info: <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />,
  loading: <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" aria-hidden="true" />,
};

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  error: "bg-red-500/20 text-red-300 border-red-500/40",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  loading: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

const ROLES: Record<ToastType, "status" | "alert"> = {
  success: "status",
  error: "alert",
  info: "status",
  loading: "status",
};

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 min-w-[280px] max-w-[400px] shadow-lg animate-in slide-in-from-right-4 duration-200 ${COLORS[toast.type]}`}
          role={ROLES[toast.type]}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
        >
          {ICONS[toast.type]}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          {toast.dismissible && (
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}