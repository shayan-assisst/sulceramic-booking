"use client";
import * as React from "react";

type Toast = { id: number; message: string; tone?: "info" | "success" | "error" };
type Ctx = { toast: (msg: string, tone?: Toast["tone"]) => void };

const ToastContext = React.createContext<Ctx>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-md " +
              (t.tone === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : t.tone === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-cream-100 border-terracotta-200 text-clay-dark")
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
