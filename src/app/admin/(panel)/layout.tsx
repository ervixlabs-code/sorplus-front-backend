// src/app/admin/(panel)/layout.tsx
"use client"

import type { ReactNode } from "react"
import Sidebar from "@/components/admin/Sidebar"
import TopBar from "@/components/admin/TopBar"

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100" />
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-orange-200/40 blur-3xl" />
      <div className="absolute -bottom-52 -right-52 h-[620px] w-[620px] rounded-full bg-slate-200/60 blur-3xl" />
      <div className="absolute inset-0 admin-grain opacity-30 pointer-events-none" />

      <div className="relative flex min-h-screen">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <TopBar />
          <div className="px-6 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
