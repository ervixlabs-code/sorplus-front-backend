// src/components/admin/Sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import {
  LayoutDashboard,
  MessageSquareWarning,
  Tags,
  Users,
  Settings,
  Book,
  FileQuestionIcon,
  HelpCircle,
  Info,
  Shield,
  FileText,
  Gavel,
} from "lucide-react"

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/complaints", label: "Şikayetler", icon: MessageSquareWarning },
  { href: "/admin/categories", label: "Kategoriler", icon: Tags },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/guide", label: "Kullanıcı Rehberi", icon: Book },

  // ✅ yeni: Hakkımızda
  { href: "/admin/about-us", label: "Hakkımızda", icon: Info },

  // ✅ yeni: KVKK
  { href: "/admin/kvkk", label: "KVKK", icon: Shield },

  // ✅ yeni: Gizlilik (Security)
  { href: "/admin/security", label: "Gizlilik", icon: Shield },

  { href: "/admin/rules", label: "Kurallar", icon: Gavel },
  { href: "/admin/terms-of-use", label: "Kullanım Şartları", icon: FileText },

  { href: "/admin/sss", label: "Sıkça Sorulan Sorular", icon: FileQuestionIcon },
  { href: "/admin/sss-kategoriler", label: "Sıkça Sorulan Sorular Kategorileri", icon: HelpCircle },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-[280px] md:flex-col relative">
      {/* sidebar bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
      <div className="absolute -top-24 left-10 h-44 w-44 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute -bottom-24 right-8 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute inset-0 border-r border-white/10" />

      <div className="relative h-16 px-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.55)]" />
          </div>
          <div className="leading-tight">
            <div className="text-white font-semibold tracking-tight">Sikayetvar</div>
            <div className="text-[11px] text-slate-300/80">Admin Control</div>
          </div>
        </div>
      </div>

      <nav className="relative px-3 pb-4 pt-2 space-y-1">
        {ADMIN_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-gradient-to-r from-white/14 to-white/6 text-white ring-1 ring-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  : "text-slate-200/80 hover:bg-white/8 hover:text-white"
              )}
            >
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

              <div className="flex-1">
                <div className="font-medium">{item.label}</div>
              </div>

              {active ? (
                <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.6)]" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-transparent" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="relative mt-auto p-4">
        <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
          <div className="text-white font-semibold text-sm">Moderasyon Modu</div>
          <div className="text-slate-200/70 text-xs mt-1 leading-relaxed">
            Şikayetleri hızlıca incele, durum güncelle ve kategorilere göre yönet.
          </div>
          <div className="mt-3 inline-flex items-center gap-2 text-xs text-orange-200">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            Sistem aktif
          </div>
        </div>
      </div>
    </aside>
  )
}
