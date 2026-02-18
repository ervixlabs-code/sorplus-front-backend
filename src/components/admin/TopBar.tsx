// src/components/admin/TopBar.tsx
"use client"

import { useState } from "react"
import { Search, Bell, LogOut, Menu } from "lucide-react"
import AdminMobileNav from "@/components/admin/AdminMobileNav"
import { ADMIN_NAV } from "@/components/admin/Sidebar"

export default function TopBar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-20">
        <div className="backdrop-blur-xl bg-white/70 border-b border-slate-200/70">
          <div className="h-16 px-4 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: hamburger + search */}
            <div className="flex items-center gap-3 w-full max-w-xl">
              <button
                onClick={() => setOpen(true)}
                className="md:hidden h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                aria-label="Menüyü aç"
              >
                <Menu size={18} className="text-slate-700" />
              </button>

              <div className="relative w-full">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  placeholder="Şikayet, kullanıcı, kategori ara..."
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                />
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-2 py-1">
                  ⌘K
                </span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <button className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center">
                <Bell size={18} className="text-slate-700" />
              </button>

              <div className="hidden sm:flex items-center gap-3 pl-2">
                <div className="text-right leading-tight">
                  <div className="text-sm font-semibold">Admin</div>
                  <div className="text-[11px] text-slate-500">
                    Moderator Panel
                  </div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  A
                </div>
                <button className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center">
                  <LogOut size={18} className="text-slate-700" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AdminMobileNav open={open} onClose={() => setOpen(false)} nav={ADMIN_NAV} />
    </>
  )
}
