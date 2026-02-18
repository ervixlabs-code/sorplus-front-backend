"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Shield,
  Mail,
  User2,
  RefreshCcw,
  Phone,
  MapPin,
} from "lucide-react"
import { useToast } from "@/components/admin/Toast"

const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() || "http://localhost:3002"

type ApiError = Error & { status?: number; data?: any }

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

function getToken(): string | null {
  try {
    return (
      localStorage.getItem("sv_admin_token") ||
      localStorage.getItem("ADMIN_TOKEN") ||
      localStorage.getItem("token") ||
      null
    )
  } catch {
    return null
  }
}

async function api<T>(path: string, init?: RequestInit & { json?: any }): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(init?.headers as any),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let body = init?.body
  if ((init as any)?.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify((init as any).json)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body,
    cache: "no-store",
  })

  const data = await safeJson(res)

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) || `HTTP ${res.status}`

    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(" • ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ========= Types (API) ========= */
type ApiUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null // ✅ NEW
  city?: string | null // ✅ NEW
  role?: string | null
  isActive?: boolean
  createdAt?: string
  kvkkApproved?: boolean
}

function fmtDateTR(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

function fullName(u: ApiUser) {
  const fn = (u.firstName || "").trim()
  const ln = (u.lastName || "").trim()
  const s = `${fn} ${ln}`.trim()
  return s || "—"
}

function badgeStatus(isActive?: boolean) {
  return isActive
    ? "bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15"
    : "bg-rose-600/10 text-rose-800 ring-1 ring-rose-600/15"
}

function badgeKvkk(ok: boolean) {
  return ok
    ? "bg-blue-600/10 text-blue-800 ring-1 ring-blue-600/15"
    : "bg-slate-900/6 text-slate-600 ring-1 ring-slate-900/10"
}

function prettyPhone(p?: string | null) {
  const s = (p || "").trim()
  return s || "—"
}

function prettyCity(c?: string | null) {
  const s = (c || "").trim()
  if (!s) return "—"
  // küçük yazdıysa da düzgün gözüksün
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AdminUserDetailPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const params = useParams()
  const id = String((params as any)?.id || "")

  const [mounted, setMounted] = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)

  const [loading, setLoading] = useState<null | "fetch" | "toggle">(null)
  const [notFound, setNotFound] = useState(false)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setTokenMissing(!getToken())
  }, [])

  async function fetchUser() {
    setLoading("fetch")
    setError(null)
    setNotFound(false)
    try {
      const data = await api<ApiUser>(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "GET",
      })
      setUser(data)
    } catch (e: any) {
      if (e?.status === 404) setNotFound(true)
      setError(e?.message || "Detay alınamadı.")
      setUser(null)
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const isActive = !!user?.isActive
  const canToggle = useMemo(
    () => !!user && loading === null && mounted && !tokenMissing,
    [user, loading, mounted, tokenMissing]
  )

  async function toggleActive(nextActive: boolean) {
    if (!user) return

    setLoading("toggle")
    setError(null)

    const next = Boolean(nextActive)

    try {
      await api(`/api/admin/users/${encodeURIComponent(id)}/active`, {
        method: "PATCH",
        json: { isActive: next },
      })

      setUser((p) => (p ? { ...p, isActive: next } : p))

      showToast(
        "success",
        next ? "Kullanıcı aktif edildi" : "Kullanıcı engellendi",
        next ? "Bu kullanıcı tekrar giriş yapabilir." : "Bu kullanıcı artık pasif/banlı."
      )
    } catch (e: any) {
      const msg = e?.message || "İşlem başarısız."
      showToast("error", "İşlem başarısız", msg)
      setError(msg)
    } finally {
      setLoading(null)
    }
  }

  if (!mounted) return null

  if (loading === "fetch" && !user && !notFound) {
    return <div className="text-sm text-slate-600">Yükleniyor…</div>
  }

  if (notFound || !user) {
    return (
      <div className="space-y-3">
        <div className="text-xl font-semibold">Kullanıcı bulunamadı</div>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/admin/users")}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            Listeye dön
          </button>

          <button
            onClick={fetchUser}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
          Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya
          ADMIN_TOKEN/token) ile kaydetmelisin.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-800">
          <div className="font-semibold">Hata</div>
          <div className="mt-1">{error}</div>
        </div>
      ) : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kullanıcı Detayı</h1>
          <p className="text-slate-500 mt-1">
            <span className="font-semibold text-slate-900">{user.id}</span> • {fmtDateTR(user.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <ArrowLeft size={18} className="text-slate-700" />
            Geri
          </button>

          {isActive ? (
            <button
              onClick={() => toggleActive(false)}
              disabled={!canToggle}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                canToggle ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              <Ban size={18} />
              {loading === "toggle" ? "Engelleniyor…" : "Kullanıcıyı Engelle"}
            </button>
          ) : (
            <button
              onClick={() => toggleActive(true)}
              disabled={!canToggle}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                canToggle ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              <CheckCircle2 size={18} />
              {loading === "toggle" ? "Aktif ediliyor…" : "Aktif Et"}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                  <User2 size={18} className="text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">Ad Soyad</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{fullName(user)}</div>
                  <div className="mt-1 text-xs text-slate-500">Rol: {user.role || "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                  <Mail size={18} className="text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">E-posta</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{user.email}</div>
                </div>
              </div>
            </div>

            {/* ✅ NEW: Telefon + Şehir */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    <Phone size={18} className="text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">Telefon</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{prettyPhone(user.phone)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    <MapPin size={18} className="text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-600">Şehir</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{prettyCity(user.city)}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Not: Eski kullanıcılar migration sırasında default değer almış olabilir.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                  <Shield size={18} className="text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">KVKK</div>
                  <div className="mt-2">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                        badgeKvkk(!!user.kvkkApproved)
                      )}
                    >
                      {user.kvkkApproved ? "Onaylı" : "Onaysız"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Backend bu alanı dönmüyorsa “Onaysız” görünür.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Durum</div>
              <div className="mt-3 flex items-center justify-between">
                <span
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                    badgeStatus(!!user.isActive)
                  )}
                >
                  {!!user.isActive ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                  {!!user.isActive ? "Aktif" : "Engelli"}
                </span>

                <div className="text-xs text-slate-500">Admin</div>
              </div>

              <div className="mt-4">
                <button
                  onClick={fetchUser}
                  disabled={loading !== null}
                  className={clsx(
                    "w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold border shadow-sm transition",
                    loading !== null
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : "bg-white/80 border-slate-200/80 hover:bg-white"
                  )}
                >
                  <RefreshCcw size={18} className="text-slate-700" />
                  Yenile
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Aksiyon:{" "}
                <span className="font-semibold text-slate-900">
                  PATCH /api/admin/users/:id/active
                </span>{" "}
                (body:{" "}
                <span className="font-semibold text-slate-900">{`{ isActive: boolean }`}</span>)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
