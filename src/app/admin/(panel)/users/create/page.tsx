"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { ArrowLeft, Check, Sparkles, Eye, EyeOff, Phone, MapPin } from "lucide-react"
import { useToast } from "@/components/admin/Toast"

/** ================== CONFIG ================== */
const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://sorplus-admin-backend.onrender.com").trim()

function normalizeApiBase(raw?: string) {
  const base = (raw || "").trim()
  const noTrail = base.replace(/\/+$/, "")
  return noTrail.endsWith("/api") ? noTrail.slice(0, -4) : noTrail
}
const API_BASE = normalizeApiBase(RAW_BASE)

type ApiError = Error & { status?: number; data?: any }

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

function readToken(): string | null {
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

/** fullName -> firstName/lastName
 * - tek kelime ise lastName "." yap (DTO lastName boş olamaz)
 */
function splitNameSmart(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: parts[0], lastName: "." }
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.slice(-1).join("") }
}

async function api<T>(
  path: string,
  init?: RequestInit & { json?: any },
  token?: string | null
): Promise<T> {
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
      (data && typeof data === "object" && ((data as any).message || (data as any).error)) ||
      `HTTP ${res.status}`

    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(" • ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

type Role = "USER" | "ADMIN" | "MODERATOR"

// E.164 basic: + ve 10-15 digit
function isValidE164(phone: string) {
  return /^\+\d{10,15}$/.test(phone.trim())
}

export default function AdminUserCreatePage() {
  const router = useRouter()
  const { showToast } = useToast()

  // hydration fix
  const [mounted, setMounted] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setToken(readToken())
  }, [])

  const tokenMissing = mounted && !token

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("") // ✅ yeni
  const [city, setCity] = useState("") // ✅ yeni
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)

  const [kvkkApproved, setKvkkApproved] = useState(false) // UI-only
  const [role, setRole] = useState<Role>("USER")
  const [saving, setSaving] = useState(false)

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    const name = fullName.trim()
    const mail = email.trim()
    const ph = phone.trim()
    const ct = city.trim()
    const pw = password

    if (name.length < 3) e.fullName = "Ad soyad en az 3 karakter olmalı."
    if (!/^\S+@\S+\.\S+$/.test(mail)) e.email = "Geçerli bir e-posta gir."
    if (ct.length < 2) e.city = "Şehir zorunlu."
    if (!isValidE164(ph)) e.phone = "Telefon E.164 formatında olmalı. Örn: +905551112233"
    if (typeof pw !== "string" || pw.length < 6) e.password = "Şifre en az 6 karakter olmalı."

    return e
  }, [fullName, email, phone, city, password])

  const canSave = useMemo(
    () => mounted && !!token && Object.keys(errors).length === 0 && !saving,
    [mounted, token, errors, saving]
  )

  async function onSave() {
    if (!mounted) return

    if (!token) {
      showToast("Token yok. Admin login token’ı bulunamadı.", "error")
      return
    }

    if (Object.keys(errors).length > 0) {
      showToast("Eksik/Hatalı alan var. Formu kontrol edip tekrar dene.", "error")
      return
    }

    setSaving(true)
    try {
      const mail = email.trim().toLowerCase()
      const ph = phone.trim()
      const ct = city.trim()
      const { firstName, lastName } = splitNameSmart(fullName)

      // ✅ backend istiyor: phone + city
      const payload: any = {
        email: mail,
        firstName,
        lastName,
        password: String(password),
        role,
        phone: ph,
        city: ct,
        // kvkkApproved backend DTO’da varsa açarız; şimdilik göndermiyoruz
      }

      console.log("[AdminUserCreate] API_BASE:", API_BASE)
      console.log("[AdminUserCreate] POST:", `${API_BASE}/api/admin/users`, payload)

      await api(`/api/admin/users`, { method: "POST", json: payload }, token)

      showToast(
        `Kullanıcı eklendi. ${kvkkApproved ? "KVKK: Onaylı • " : ""}Listeye yönlendiriliyorsun…`,
        "success"
      )

      router.push("/admin/users")
      router.refresh()
    } catch (e: any) {
      const status = e?.status
      const raw = e?.data

      const msg =
        raw?.message && Array.isArray(raw.message)
          ? raw.message.join(" • ")
          : e?.message || "Kullanıcı kaydedilemedi."

      if (status === 400) showToast(`Bad Request (400). ${msg}`, "error")
      else if (status === 409) showToast(`Çakışma (409). ${msg}`, "error")
      else if (status === 401) showToast("Yetkisiz (401). Token expired olabilir. Tekrar login ol.", "error")
      else showToast(`Bir hata oluştu. ${msg}`, "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kullanıcı Ekle</h1>
          <p className="text-slate-500 mt-1">Yeni kullanıcı oluştur</p>
          <p className="text-xs text-slate-400 mt-1">
            API: <span className="font-mono">{API_BASE}</span>
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
            disabled={!canSave}
            onClick={onSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
            )}
          >
            <Check size={18} className="text-orange-300" />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>

      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
          Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile
          kaydetmelisin.
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Ad Soyad</div>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Örn: Ali Veli"
                className={clsx(
                  "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                  errors.fullName ? "border-rose-300" : "border-slate-200/80"
                )}
              />
              {errors.fullName ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.fullName}</div> : null}
              <div className="mt-2 text-xs text-slate-500">
                Not: Tek kelime yazarsan soyad otomatik <b>.</b> olur (backend zorunlu).
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">E-posta</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="örn: user@mail.com"
                className={clsx(
                  "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                  errors.email ? "border-rose-300" : "border-slate-200/80"
                )}
              />
              {errors.email ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.email}</div> : null}
            </div>

            {/* ✅ Telefon */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Telefon</div>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Örn: +905551112233"
                  className={clsx(
                    "w-full rounded-2xl border bg-white/80 pl-10 pr-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                    errors.phone ? "border-rose-300" : "border-slate-200/80"
                  )}
                />
              </div>
              {errors.phone ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.phone}</div> : null}
              <div className="mt-2 text-xs text-slate-500">Format: <b>+90</b> ile başla, boşluk/(-) kullanma.</div>
            </div>

            {/* ✅ Şehir */}
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Şehir</div>
              <div className="relative">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Örn: İstanbul"
                  className={clsx(
                    "w-full rounded-2xl border bg-white/80 pl-10 pr-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                    errors.city ? "border-rose-300" : "border-slate-200/80"
                  )}
                />
              </div>
              {errors.city ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.city}</div> : null}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Şifre</div>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  placeholder="En az 6 karakter"
                  className={clsx(
                    "w-full rounded-2xl border bg-white/80 px-4 py-3 pr-12 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                    errors.password ? "border-rose-300" : "border-slate-200/80"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl bg-white/70 border border-slate-200/70 hover:bg-white flex items-center justify-center"
                  title={showPw ? "Gizle" : "Göster"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.password}</div> : null}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Rol</div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="USER">USER</option>
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
              <input
                type="checkbox"
                checked={kvkkApproved}
                onChange={(e) => setKvkkApproved(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">KVKK Onayı</div>
                <div className="mt-1 text-xs text-slate-500">UI bilgisi. Backend DTO’da alan yoksa gönderilmiyor.</div>
              </div>
            </label>
          </div>

          {/* Right preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Önizleme</div>
                  <div className="mt-1 text-xs text-slate-500">Listede böyle görünecek</div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/15 flex items-center justify-center">
                  <Sparkles size={18} className="text-orange-600" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                <div className="text-sm font-semibold text-slate-900">{fullName.trim() || "Ad Soyad"}</div>
                <div className="mt-1 text-xs text-slate-500">{email.trim() || "user@mail.com"}</div>

                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Telefon:</span> {phone.trim() || "—"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">Şehir:</span> {city.trim() || "—"}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      kvkkApproved
                        ? "bg-blue-600/10 text-blue-800 ring-blue-600/15"
                        : "bg-slate-900/6 text-slate-600 ring-slate-900/10"
                    )}
                  >
                    KVKK: {kvkkApproved ? "Onaylı" : "Onaysız"}
                  </span>

                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                    Aktif
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Rol: <span className="font-semibold text-slate-900">{role}</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Kaydet dersen kullanıcı <span className="font-semibold text-slate-900">POST /api/admin/users</span> ile oluşturulur.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}