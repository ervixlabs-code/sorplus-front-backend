// src/app/admin/(auth)/login/page.tsx
"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import clsx from "clsx"
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react"

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3002").replace(/\/+$/, "")

const TOKEN_KEY = "sv_admin_token"
const USER_KEY = "sv_admin_user"

type Role = "ADMIN" | "MODERATOR" | "USER"

function safeNextUrl(next?: string | null) {
  if (!next) return "/admin/complaints"
  if (next.startsWith("/") && !next.startsWith("//")) return next
  return "/admin/complaints"
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

function roleAllowed(role?: string): role is "ADMIN" | "MODERATOR" {
  return role === "ADMIN" || role === "MODERATOR"
}

export default function AdminLoginPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const nextUrl = useMemo(() => safeNextUrl(sp.get("next")), [sp])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const e1 = email.trim().toLowerCase()
    if (!e1 || !e1.includes("@")) return setError("Geçerli bir e-posta gir.")
    if (!password || password.length < 6) return setError("Şifre en az 6 karakter olmalı.")

    setLoading(true)
    try {
      // 1) LOGIN
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e1, password }),
      })

      const data = await safeJson(res)

      if (!res.ok) {
        // backend mesajı varsa göster
        const msg =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data && typeof data === "object" && ("message" in data ? (data as any).message : null)) ||
          "Giriş başarısız. E-posta/şifre kontrol et."
        setError(Array.isArray(msg) ? msg.join(", ") : String(msg))
        return
      }

      const accessToken = data?.accessToken as string | undefined
      const user = data?.user as
        | { id: string; email: string; firstName?: string; lastName?: string; role?: Role }
        | undefined

      if (!accessToken || !user?.role) {
        setError("Login yanıtı eksik (token/role). Backend response’unu kontrol et.")
        return
      }

      // 2) ROLE CHECK: sadece ADMIN veya MODERATOR
      if (!roleAllowed(user.role)) {
        // token saklama — güvenlik için saklamıyoruz
        setError("Bu panele erişim yetkin yok. (Sadece ADMIN / MODERATOR)")
        return
      }

      // 3) TOKEN’ı sakla (panel isteklerinde kullanacağız)
      try {
        localStorage.setItem(TOKEN_KEY, accessToken)
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } catch {
        // storage kapalıysa bile login devam etsin
      }

      router.push(nextUrl)
    } catch {
      setError("Sunucuya bağlanılamadı. Backend çalışıyor mu? (3002)")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-orange-500/25 via-indigo-500/15 to-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-sky-500/15 via-fuchsia-500/10 to-orange-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_52%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left / brand */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-slate-200 w-fit">
              <Sparkles className="h-4 w-4 text-orange-300" />
              ŞikayetVar Admin • Güvenli Yönetim Paneli
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Deneyimleri <span className="text-orange-300">yönet</span>, kaliteyi{" "}
              <span className="text-indigo-300">koru</span>.
            </h1>

            <p className="mt-3 max-w-md text-slate-300">
              Şikayetleri incele, durumlandır, moderasyon ve aksiyonları tek yerden yönet.
            </p>

            <div className="mt-7 grid max-w-md grid-cols-1 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <div className="text-sm font-medium">Rol bazlı erişim</div>
                    <div className="text-sm text-slate-300">
                      Sadece <span className="text-slate-100 font-semibold">ADMIN</span> ve{" "}
                      <span className="text-slate-100 font-semibold">MODERATOR</span> girebilir.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 text-sky-300" />
                  <div>
                    <div className="text-sm font-medium">JWT ile güvenli oturum</div>
                    <div className="text-sm text-slate-300">
                      Token’ı panel isteklerinde kullanacağız.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-slate-400">
              Backend: <span className="text-slate-200">{API_BASE}</span>
            </div>
          </div>

          {/* Right / form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-300">Admin Girişi</div>
                  <div className="mt-1 text-2xl font-semibold">Hoş geldin 👋</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <Shield className="h-6 w-6 text-orange-300" />
                </div>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {error && (
                  <div className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                    <div>{error}</div>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-300">
                    E-posta
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 focus-within:border-orange-300/40">
                    <Mail className="h-4 w-4 text-slate-300" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="admin@site.com"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[12px] font-medium text-slate-300">
                    Şifre
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 focus-within:border-orange-300/40">
                    <Lock className="h-4 w-4 text-slate-300" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="rounded-lg p-1 text-slate-300 hover:bg-white/5"
                      aria-label="Şifreyi göster/gizle"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={clsx(
                    "group flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    loading
                      ? "bg-white/10 text-slate-300"
                      : "bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 hover:opacity-95"
                  )}
                >
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  {!loading && (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Yetkin yoksa erişemezsin.</span>
                  <Link href="/" className="text-slate-200 hover:text-orange-300">
                    Siteye dön
                  </Link>
                </div>
              </form>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
                <div className="font-medium text-slate-200">Not</div>
                <div className="mt-1 text-slate-400">
                  Giriş başarılı olsa bile rolün <span className="text-slate-200">USER</span> ise panele
                  alınmaz.
                </div>
              </div>

              <div className="mt-4 text-center text-[11px] text-slate-500">
                © {new Date().getFullYear()} ŞikayetVar Admin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
