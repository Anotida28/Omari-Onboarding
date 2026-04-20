"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert, AlertDescription, AlertTitle } from "components/ui/alert";
import { cn } from "lib/utils";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = { id, title, description, variant };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3400);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            variant={toast.variant}
            className={cn(
              "min-w-[300px] shadow-lg dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
            )}
          >
            <AlertTitle>{toast.title}</AlertTitle>
            {toast.description && (
              <AlertDescription>{toast.description}</AlertDescription>
            )}
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
