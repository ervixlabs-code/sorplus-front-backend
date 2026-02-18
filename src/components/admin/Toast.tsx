"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import clsx from "clsx"

type ToastType = "success" | "error" | "info"

type ToastItem = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Date.now()
      setToasts((prev) => [...prev, { id, message, type }])

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    },
    []
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Stack */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

function Toast({ item }: { item: ToastItem }) {
  const icon =
    item.type === "success" ? (
      <CheckCircle2 size={18} />
    ) : item.type === "error" ? (
      <XCircle size={18} />
    ) : item.type === "info" ? (
      <Info size={18} />
    ) : (
      <AlertTriangle size={18} />
    )

  return (
    <div
      className={clsx(
        "flex items-start gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium backdrop-blur",
        item.type === "success" &&
          "bg-emerald-600 text-white border-emerald-700",
        item.type === "error" &&
          "bg-rose-600 text-white border-rose-700",
        item.type === "info" &&
          "bg-slate-900 text-white border-slate-800"
      )}
    >
      {icon}
      <span className="leading-snug">{item.message}</span>
    </div>
  )
}
