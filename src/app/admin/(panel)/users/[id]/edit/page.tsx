"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  Check,
  Sparkles,
  Shield,
  RefreshCcw,
  Ban,
  CheckCircle2,
  Phone,
  MapPin,
  Mail,
  User2,
} from "lucide-react"
import { useToast } from "@/components/admin/Toast"

const API_BASE = (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() || "http://localhost:3002"

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
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `HTTP ${res.status}`

    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(" • ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ===== API Types ===== */
type ApiUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  phone?: string | null // ✅ NEW
  city?: string | null // ✅ NEW
  role?: string | null
  isActive?: boolean
  kvkkApproved?: boolean
  createdAt?: string
}

function fullName(u: ApiUser) {
  const fn = (u.firstName || "").trim()
  const ln = (u.lastName || "").trim()
  const s = `${fn} ${ln}`.trim()
  return s || "—"
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

function prettyPhone(p?: string | null) {
  const s = (p || "").trim()
  return s || "—"
}

function prettyCity(c?: string | null) {
  const s = (c || "").trim()
  if (!s) return "—"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AdminUserEditPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const params = useParams()
  const id = String((params as any)?.id || "")

  const [mounted, setMounted] = useState(false)
  const [tokenMissing, setTokenMissing] = useState(false)

  const [loading, setLoading] = useState<null | "fetch" | "save">(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<ApiUser | null>(null)

  // editable fields (API supports these)
  const [role, setRole] = useState<string>("USER")
  const [isActive, setIsActive] = useState<boolean>(true)

  // original snapshot to compute dirty
  const [originalRole, setOriginalRole] = useState<string>("USER")
  const [originalActive, setOriginalActive] = useState<boolean>(true)

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

      const r = (data.role || "USER").toUpperCase()
      const a = Boolean(data.isActive)

      setRole(r)
      setIsActive(a)

      setOriginalRole(r)
      setOriginalActive(a)
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

  const isDirty = useMemo(() => role !== originalRole || isActive !== originalActive, [
    role,
    originalRole,
    isActive,
    originalActive,
  ])

  const canSave = useMemo(() => mounted && !tokenMissing && loading === null && !!user && isDirty, [
    mounted,
    tokenMissing,
    loading,
    user,
    isDirty,
  ])

  async function onSave() {
    if (!user) return
    if (!canSave) {
      showToast("info", "Değişiklik yok", "Kaydetmek için önce role/aktiflik değiştir.")
      return
    }

    setLoading("save")
    setError(null)

    try {
      // 1) role değiştiyse
      if (role !== originalRole) {
        await api(`/api/admin/users/${encodeURIComponent(id)}/role`, {
          method: "PATCH",
          json: { role },
        })
      }

      // 2) aktiflik değiştiyse
      if (isActive !== originalActive) {
        await api(`/api/admin/users/${encodeURIComponent(id)}/active`, {
          method: "PATCH",
          json: { isActive: Boolean(isActive) },
        })
      }

      showToast("success", "Kaydedildi", "Değişiklikler başarıyla uygulandı.")
      setOriginalRole(role)
      setOriginalActive(isActive)

      // ekranda güncel görünsün
      setUser((p) => (p ? { ...p, role, isActive } : p))
    } catch (e: any) {
      const msg = e?.message || "Kaydetme başarısız."
      setError(msg)
      showToast("error", "Kaydedilemedi", msg)
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
          Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> ile kaydetmelisin.
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
          <h1 className="text-2xl font-semibold tracking-tight">Kullanıcı Düzenle</h1>
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

          <button
            onClick={onSave}
            disabled={!canSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
            )}
          >
            <Check size={18} className={clsx(canSave ? "text-orange-300" : "text-slate-400")} />
            {loading === "save" ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            {/* Identity */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                  <User2 size={18} className="text-slate-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-600">Ad Soyad</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{fullName(user)}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Not: Bu sayfada ad soyad / e-posta / telefon / şehir edit yok (backend update endpoint’i yok).
                  </div>
                </div>
              </div>
            </div>

            {/* Email */}
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

            {/* ✅ NEW: Phone + City */}
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

            {/* Role */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="text-xs font-semibold text-slate-600 mb-2">Rol</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="USER">USER</option>
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <div className="mt-2 text-xs text-slate-500">PATCH /api/admin/users/:id/role</div>
            </div>

            {/* Active */}
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
              <div className="text-xs font-semibold text-slate-600 mb-2">Aktiflik</div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">{isActive ? "Aktif" : "Engelli"}</div>

                <button
                  type="button"
                  onClick={() => setIsActive((p) => !p)}
                  disabled={loading !== null || tokenMissing}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
                    loading !== null || tokenMissing
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      : isActive
                      ? "bg-white/80 border-slate-200/80 hover:bg-white"
                      : "bg-rose-600 text-white border-rose-600 hover:bg-rose-700"
                  )}
                >
                  {isActive ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Ban size={18} />}
                  {isActive ? "Engelle" : "Aktif Et"}
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-500">PATCH /api/admin/users/:id/active (body: isActive)</div>
            </div>

            {!isDirty ? (
              <div className="text-xs text-slate-500">Henüz değişiklik yok.</div>
            ) : (
              <div className="text-xs font-semibold text-orange-600">Değişiklik var • Kaydet butonu aktif</div>
            )}
          </div>

          {/* Right preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Önizleme</div>
                  <div className="mt-1 text-xs text-slate-500">Kullanıcı kartı</div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/15 flex items-center justify-center">
                  <Sparkles size={18} className="text-orange-600" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                <div className="text-sm font-semibold text-slate-900">{fullName(user)}</div>
                <div className="mt-1 text-xs text-slate-500">{user.email}</div>

                {/* ✅ NEW: phone + city preview */}
                <div className="mt-2 text-xs text-slate-500">
                  {prettyPhone(user.phone)} • {prettyCity(user.city)}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      "bg-blue-600/10 text-blue-800 ring-blue-600/15"
                    )}
                  >
                    Rol: {role}
                  </span>

                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      isActive
                        ? "bg-emerald-600/10 text-emerald-800 ring-emerald-600/15"
                        : "bg-rose-600/10 text-rose-800 ring-rose-600/15"
                    )}
                  >
                    {isActive ? "Aktif" : "Engelli"}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Bu sayfada yalnızca <span className="font-semibold text-slate-900">Rol</span> ve{" "}
                <span className="font-semibold text-slate-900">Aktiflik</span> düzenlenir.
              </div>
            </div>

            <button
              onClick={fetchUser}
              disabled={loading !== null}
              className={clsx(
                "mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold border shadow-sm transition",
                loading !== null
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white/80 border-slate-200/80 hover:bg-white"
              )}
            >
              <RefreshCcw size={18} className="text-slate-700" />
              Yenile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
