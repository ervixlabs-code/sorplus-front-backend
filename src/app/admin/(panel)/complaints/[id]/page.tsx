/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/complaints/[id]/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  Shield,
  Star,
  XCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import StatusBadge, { ComplaintStatus } from "@/components/admin/StatusBadge"
import { useToast } from "@/components/admin/Toast"

/** ================== CONFIG ================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() ||
  "http://localhost:3002"

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

async function api<T>(
  path: string,
  init?: RequestInit & { json?: any }
): Promise<T> {
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
    body,
    headers,
    cache: "no-store",
  })

  const data = await safeJson(res)

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      `HTTP ${res.status}`

    const err: ApiError = new Error(
      Array.isArray(msg) ? msg.join(", ") : String(msg)
    )
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ================== TYPES ================== */
type ApiComplaint = {
  id: string
  title: string
  body?: string
  detail?: string
  status: string
  priority?: "LOW" | "NORMAL" | "HIGH" | string
  createdAt?: string
  isAnonymous?: boolean
  anonymous?: boolean
  brandName?: string | null
  hasCompanyMention?: boolean
  category?: { id: string; name: string; slug?: string } | string | null
  user?: { id: string; firstName?: string; lastName?: string; email?: string } | null
  reporter?: { name: string; email?: string }
}

function isAnon(c: ApiComplaint) {
  if (typeof c.isAnonymous === "boolean") return c.isAnonymous
  if (typeof c.anonymous === "boolean") return c.anonymous
  return false
}

function detailText(c: ApiComplaint | null) {
  if (!c) return ""
  return (c.body ?? c.detail ?? "").toString()
}

function formatTRDateShort(iso?: string) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
  } catch {
    return "—"
  }
}

function reporterName(c: ApiComplaint) {
  if (isAnon(c)) return "Anonim Kullanıcı"
  if (c.user) {
    const full = `${c.user.firstName || ""} ${c.user.lastName || ""}`.trim()
    return full || c.user.email || "Kullanıcı"
  }
  if (c.reporter?.name) return c.reporter.name
  return "Kullanıcı"
}

function reporterEmail(c: ApiComplaint) {
  if (isAnon(c)) return undefined
  return c.user?.email || c.reporter?.email
}

function categoryLabel(c: ApiComplaint | null) {
  if (!c) return "—"
  if (typeof c.category === "string") return c.category
  if (c.category && typeof c.category === "object") return c.category.name
  return "—"
}

function normalizeStatus(raw: any): ComplaintStatus {
  const s = String(raw || "").toUpperCase()

  if (
    s === "YENI" ||
    s === "INCELEMEDE" ||
    s === "YAYINDA" ||
    s === "COZULDU" ||
    s === "REDDEDILDI"
  ) return s as ComplaintStatus

  if (s === "PENDING" || s === "DRAFT") return "INCELEMEDE"
  if (s === "APPROVED") return "YAYINDA"
  if (s === "REJECTED") return "REDDEDILDI"

  return "INCELEMEDE"
}

export default function AdminComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { showToast } = useToast()

  const [item, setItem] = useState<ApiComplaint | null>(null)
  const [status, setStatus] = useState<ComplaintStatus>("INCELEMEDE")
  const [loading, setLoading] = useState<
    null | "fetch" | "reject" | "hold" | "accept"
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [errorMeta, setErrorMeta] = useState<{ status?: number } | null>(null)

  const tokenMissing = !getToken()

  const hasCompanyMention = useMemo(() => {
    if (!item) return false
    if (typeof item.hasCompanyMention === "boolean") return item.hasCompanyMention
    return !!item.brandName?.trim()
  }, [item])

  async function fetchDetail() {
    setLoading("fetch")
    setError(null)
    setErrorMeta(null)

    try {
      const data = await api<ApiComplaint>(
        `/api/admin/complaints/${encodeURIComponent(id)}`,
        { method: "GET" }
      )
      setItem(data)
      setStatus(normalizeStatus(data.status))
    } catch (e: any) {
      setItem(null)
      setError(e?.message || "Detay alınamadı.")
      setErrorMeta({ status: e?.status })
    } finally {
      setLoading(null)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleAction(kind: "reject" | "hold" | "accept") {
    if (loading !== null) return

    setLoading(kind)
    setError(null)
    setErrorMeta(null)

    // ✅ Toast: aksiyona basınca hemen geri bildirim
    if (kind === "reject") showToast("Reddediliyor…", "info")
    if (kind === "accept") showToast("Yayına alınıyor…", "info")
    if (kind === "hold") showToast("Beklemeye alındı ⏸️", "success")

    try {
      if (kind === "reject") {
        await api(`/api/admin/complaints/${encodeURIComponent(id)}/reject`, {
          method: "PATCH",
          json: { reason: "Uygun değil" },
        })
        setStatus("REDDEDILDI")
        setItem((p) => (p ? { ...p, status: "REJECTED" } : p))
        showToast("Şikayet reddedildi ❌", "success")
        return
      }

      if (kind === "accept") {
        await api(`/api/admin/complaints/${encodeURIComponent(id)}/approve`, {
          method: "PATCH",
          json: {},
        })
        setStatus("YAYINDA")
        setItem((p) => (p ? { ...p, status: "APPROVED" } : p))
        showToast("Şikayet yayına alındı ✅", "success")
        return
      }

      // Beklet: backend endpoint yok → UI-only
      setStatus("INCELEMEDE")
      setItem((p) => (p ? { ...p, status: "PENDING" } : p))
      // hold toast zaten atıldı
    } catch (e: any) {
      setError(e?.message || "İşlem başarısız.")
      setErrorMeta({ status: e?.status })

      // ✅ Toast: error
      const code = e?.status ? ` (HTTP ${e.status})` : ""
      showToast(`İşlem başarısız${code}: ${e?.message || "Hata"}`, "error")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
              title="Geri"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="text-sm text-slate-500">Şikayet Detayı</div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {item?.id || id}
              </h1>
            </div>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div>
            <div className="font-semibold">Token bulunamadı</div>
            <div className="mt-1">
              Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya burada kontrol ettiğin key) ile kaydet.
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-800 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold">
              Hata{errorMeta?.status ? ` (HTTP ${errorMeta.status})` : ""}
            </div>
            <div className="mt-1">{error}</div>

            <button
              onClick={fetchDetail}
              className="mt-3 inline-flex items-center justify-center rounded-xl bg-rose-600 text-white px-3 py-2 text-xs font-semibold hover:bg-rose-700"
              disabled={loading !== null}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      ) : null}

      {/* CONTENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT / META */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Shield size={18} />
              Meta Bilgiler
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <Meta label="Kategori" value={categoryLabel(item)} />
              <Meta label="Tarih" value={formatTRDateShort(item?.createdAt)} />
              <Meta label="Öncelik" value={String(item?.priority || "NORMAL")} />
              <Meta
                label="Anonim"
                value={item ? (isAnon(item) ? "Evet" : "Hayır") : "—"}
              />
              <Meta label="Marka" value={String(item?.brandName || "—")} />
            </div>

            {hasCompanyMention ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15 px-3 py-1 text-xs font-semibold">
                <Star size={14} />
                Firma adı geçti
              </div>
            ) : null}
          </div>
        </div>

        {/* CENTER / CONTENT */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {item?.title || (loading === "fetch" ? "Yükleniyor…" : "—")}
            </h2>

            <div className="mt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {item
                ? (detailText(item) || "—")
                : loading === "fetch"
                ? "Detay alınıyor…"
                : "—"}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/70 text-sm text-slate-600">
              Kullanıcı:{" "}
              <span className="font-semibold text-slate-900">
                {item ? reporterName(item) : "—"}
              </span>
              {item && reporterEmail(item) ? ` • ${reporterEmail(item)}` : ""}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900 mb-4">
              Moderasyon Aksiyonları
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                disabled={loading !== null}
                onClick={() => handleAction("reject")}
                className={clsx(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  "bg-rose-600 text-white hover:bg-rose-700",
                  loading !== null && "opacity-60 cursor-not-allowed"
                )}
              >
                <XCircle size={18} />
                {loading === "reject" ? "Reddediliyor…" : "Reddet"}
              </button>

              <button
                disabled={loading !== null}
                onClick={() => handleAction("hold")}
                className={clsx(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  "bg-amber-500 text-white hover:bg-amber-600",
                  loading !== null && "opacity-60 cursor-not-allowed"
                )}
              >
                <PauseCircle size={18} />
                {loading === "hold" ? "Bekletiliyor…" : "Beklet"}
              </button>

              <button
                disabled={loading !== null}
                onClick={() => handleAction("accept")}
                className={clsx(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition",
                  "bg-emerald-600 text-white hover:bg-emerald-700",
                  loading !== null && "opacity-60 cursor-not-allowed"
                )}
              >
                <CheckCircle2 size={18} />
                {loading === "accept" ? "Yayına Alınıyor…" : "Kabul Et"}
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              • Reddet → Canlıya düşmez<br />
              • Beklet → Taslakta / incelemede kalır<br />
              • Kabul Et → Direkt yayına alınır
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  )
}
