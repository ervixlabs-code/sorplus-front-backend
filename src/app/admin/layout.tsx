import type { ReactNode } from "react"
import { ToastProvider } from "@/components/admin/Toast"

export default function PanelLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
