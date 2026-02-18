// src/components/admin/AdminMobileNav.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { X } from "lucide-react"
import { useEffect } from "react"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NavItem = { href: string; label: string; icon: any }

export default function AdminMobileNav({
  open,
  onClose,
  nav,
}: {
  open: boolean
  onClose: () => void
  nav: NavItem[]
}) {
  const pathname = usePathname()

  // ESC ile kapat
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  // açıkken body scroll kilitle
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-[100dvh] w-[86vw] max-w-[320px] md:hidden",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="relative h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
          <div className="absolute -top-24 left-10 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute inset-0 ring-1 ring-white/10" />

          <div className="relative h-16 px-4 flex items-center justify-between">
            <div>
              <div className="text-white font-semibold tracking-tight">
                Sikayetvar
              </div>
              <div className="text-[11px] text-slate-300/80">Admin Control</div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-white/8 ring-1 ring-white/10 hover:bg-white/12 transition flex items-center justify-center"
              aria-label="Menüyü kapat"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          <nav className="relative px-3 pt-2 space-y-1">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={clsx(
                    "relative overflow-hidden group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-gradient-to-r from-white/14 to-white/6 text-white ring-1 ring-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      : "text-slate-200/80 hover:bg-white/8 hover:text-white"
                  )}
                >
                  {active && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.6)]" />
                  )}

                  <div
                    className={clsx(
                      "h-9 w-9 rounded-xl flex items-center justify-center transition",
                      active
                        ? "bg-orange-500/15 ring-1 ring-orange-400/25"
                        : "bg-white/6 ring-1 ring-white/10 group-hover:bg-white/10"
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="relative mt-auto p-4">
            <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
              <div className="text-white font-semibold text-sm">
                Moderasyon Modu
              </div>
              <div className="text-slate-200/70 text-xs mt-1 leading-relaxed">
                Şikayetleri hızlıca incele, durum güncelle ve kategorilere göre
                yönet.
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-orange-200">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Sistem aktif
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
