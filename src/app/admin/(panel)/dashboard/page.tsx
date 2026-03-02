// src/app/admin/page.tsx
"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Sparkles,
  Tag,
  MessageSquareWarning,
  ChevronRight,
  RefreshCcw,
} from "lucide-react"
import Link from "next/link"
import clsx from "clsx"

/** ================== CONFIG ================== */
const API_BASE = "https://sorplus-admin-backend.onrender.com/"

function normalizeApiBase(raw?: string) {
  const base = (raw || "").trim()
  const noTrail = base.replace(/\/+$/, "")
  // sondaki /api varsa kırp (endpoint'ler zaten /api/... diye gidiyor)
  return noTrail.endsWith("/api") ? noTrail.slice(0, -4) : noTrail
}
const BASE = normalizeApiBase(API_BASE)

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

type ApiError = Error & { status?: number; data?: any }

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

  const res = await fetch(`${BASE}${path}`, {
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

/** ================== DASH UI TYPES ================== */
type Status = "YENI" | "INCELEMEDE" | "YAYINDA" | "COZULDU" | "REDDEDILDI"

const STATUS_LABEL: Record<Status, string> = {
  YENI: "Yeni",
  INCELEMEDE: "İncelemede",
  YAYINDA: "Yayında",
  COZULDU: "Çözüldü",
  REDDEDILDI: "Reddedildi",
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === "COZULDU"
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15"
      : status === "YAYINDA"
      ? "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15"
      : status === "INCELEMEDE"
      ? "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/15"
      : status === "REDDEDILDI"
      ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/15"
      : "bg-slate-900/6 text-slate-700 ring-1 ring-slate-900/10"

  return (
    <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", styles)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
      <div className="p-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  hint,
  delta,
  icon,
}: {
  title: string
  value: string
  hint: string
  delta: { dir: "up" | "down"; value: string; label: string }
  icon: React.ReactNode
}) {
  const up = delta.dir === "up"
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl p-5 shadow-[0_14px_50px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_70px_rgba(15,23,42,0.12)] transition">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold text-slate-600">{title}</div>
        <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ring-1",
            up ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15" : "bg-rose-500/10 text-rose-700 ring-rose-500/15"
          )}
        >
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta.value}
        </span>
        <span className="text-slate-500">{delta.label}</span>
      </div>
    </div>
  )
}

/** Super simple “micro chart” bars (no library) */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v / max) * 48))
        return (
          <div
            key={i}
            className="w-2.5 rounded-full bg-slate-900/10 overflow-hidden ring-1 ring-slate-900/10"
            title={`${v}`}
          >
            <div className="w-full rounded-full bg-orange-500/70" style={{ height: h }} />
          </div>
        )
      })}
    </div>
  )
}

/** ================== API SHAPES (esnek) ================== */
type ApiCategory = { id: string | number; name?: string; title?: string }
type ApiComplaint = {
  id: string | number
  title?: string | null
  detail?: string | null
  createdAt?: string | null
  status?: string | null
  categoryId?: string | number | null
  category?: { id?: string | number; name?: string | null; title?: string | null } | null
}

type ApiList<T> =
  | { items: T[]; total?: number; take?: number; skip?: number }
  | { data: T[]; total?: number; take?: number; skip?: number }
  | T[]

function extractList<T>(data: ApiList<T> | any): { items: T[]; total: number } {
  if (Array.isArray(data)) return { items: data as T[], total: data.length }

  if (data && typeof data === "object") {
    const anyData = data as any
    if (Array.isArray(anyData.items))
      return {
        items: anyData.items as T[],
        total: Number(anyData.total ?? anyData.items.length),
      }

    if (Array.isArray(anyData.data))
      return {
        items: anyData.data as T[],
        total: Number(anyData.total ?? anyData.data.length),
      }
  }

  return { items: [] as T[], total: 0 }
}

function toIsoDateKey(d: Date) {
  // YYYY-MM-DD
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseDate(s?: string | null) {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function mapStatus(raw?: string | null): Status {
  const s = String(raw || "").toUpperCase()

  // olası backend status isimleri:
  // PENDING -> incelemede, APPROVED -> yayında, REJECTED -> reddedildi, RESOLVED/SOLVED/CLOSED -> çözüldü
  if (s.includes("REJECT")) return "REDDEDILDI"
  if (s.includes("APPROV") || s.includes("PUBLISH")) return "YAYINDA"
  if (s.includes("RESOLV") || s.includes("SOLV") || s.includes("CLOSE") || s.includes("DONE")) return "COZULDU"
  if (s.includes("PEND") || s.includes("REVIEW") || s.includes("INCELE")) return "INCELEMEDE"

  // fallback
  return "YENI"
}

function formatRelativeTR(d?: Date | null) {
  if (!d) return "—"
  try {
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    if (diffDay === 0) {
      // bugün
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      return `Bugün ${hh}:${mm}`
    }
    if (diffDay === 1) {
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      return `Dün ${hh}:${mm}`
    }
    if (diffDay < 7) return `${diffDay} gün önce`
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

/** ================== PAGE ================== */
export default function AdminDashboardPage() {
  const tokenMissing = !getToken()

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [complaints, setComplaints] = useState<ApiComplaint[]>([])
  const [complaintsTotal, setComplaintsTotal] = useState<number>(0)
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string>>({})

  async function fetchAll() {
    setLoading(true)
    setErr(null)

    try {
      // categories
      let catMap: Record<string, string> = {}
      try {
        const catsRaw = await api<ApiList<ApiCategory>>(`/api/admin/categories`, { method: "GET" })
        const { items: cats } = extractList<ApiCategory>(catsRaw)
        cats.forEach((c) => {
          const id = String((c as any).id)
          const name = String((c as any).name || (c as any).title || "—")
          catMap[id] = name
        })
      } catch {
        // kategori çekilemezse problem değil (complaint içinden okuruz)
        catMap = {}
      }
      setCategoriesMap(catMap)

      // complaints (önce query ile dene)
      let compRaw: any = null
      try {
        compRaw = await api<ApiList<ApiComplaint>>(`/api/admin/complaints?skip=0&take=500`, { method: "GET" })
      } catch {
        // backend query desteklemiyorsa plain dene
        compRaw = await api<ApiList<ApiComplaint>>(`/api/admin/complaints`, { method: "GET" })
      }

      const { items, total } = extractList<ApiComplaint>(compRaw)
    setComplaints(items)
    setComplaintsTotal(total)
    } catch (e: any) {
      setComplaints([])
      setComplaintsTotal(0)
      setErr(e?.message || "Dashboard verileri alınamadı.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** ====== Derived dashboard data ====== */
  const derived = useMemo(() => {
    // sort newest first
    const list = [...complaints].sort((a, b) => {
      const da = parseDate(a.createdAt)?.getTime() ?? 0
      const db = parseDate(b.createdAt)?.getTime() ?? 0
      return db - da
    })

    // recent (first 5)
    const recent = list.slice(0, 5).map((c) => {
      const id = String(c.id)
      const title = String(c.title || "—")
      const createdAt = formatRelativeTR(parseDate(c.createdAt))
      const status = mapStatus(c.status)

      const catNameFromObj =
        (c.category && ((c.category as any).name || (c.category as any).title)) || null
      const catName =
        String(catNameFromObj || (c.categoryId != null ? categoriesMap[String(c.categoryId)] : "") || "—")

      return { id, title, category: catName, status, createdAt }
    })

    // last 7 days buckets
    const last7Days: string[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      last7Days.push(toIsoDateKey(d))
    }

    const countsByDay: Record<string, number> = {}
    last7Days.forEach((k) => (countsByDay[k] = 0))

    list.forEach((c) => {
      const d = parseDate(c.createdAt)
      if (!d) return
      const key = toIsoDateKey(d)
      if (key in countsByDay) countsByDay[key] += 1
    })

    const last7 = last7Days.map((k) => countsByDay[k] || 0)

    // KPIs
    const todayKey = toIsoDateKey(today)
    const todayIncoming = countsByDay[todayKey] || 0

    // open = solved/rejected dışı
    const openCount = list.filter((c) => {
      const s = mapStatus(c.status)
      return s !== "COZULDU" && s !== "REDDEDILDI"
    }).length

    // resolved this week (last 7 days + status solved)
    const resolvedThisWeek = list.filter((c) => {
      const s = mapStatus(c.status)
      if (s !== "COZULDU") return false
      const d = parseDate(c.createdAt)
      if (!d) return false
      const key = toIsoDateKey(d)
      return last7Days.includes(key)
    }).length

    // avg resolution days (backend resolvedAt yoksa hesaplayamayız)
    // şimdilik "—"
    const avgResolutionDays = "—"

    // category distribution (last 30 days)
    const last30 = new Date()
    last30.setDate(today.getDate() - 30)

    const catCounts: Record<string, number> = {}
    let total30 = 0
    list.forEach((c) => {
      const d = parseDate(c.createdAt)
      if (!d || d < last30) return
      total30 += 1

      const catId = c.categoryId != null ? String(c.categoryId) : ""
      const catFromObj =
        (c.category && String((c.category as any).name || (c.category as any).title || "")) || ""

      const name = (catFromObj || (catId && categoriesMap[catId]) || "Diğer").trim()
      catCounts[name] = (catCounts[name] || 0) + 1
    })

    const categories = Object.entries(catCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: total30 > 0 ? Math.round((count / total30) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Alerts (basit türetim)
    const inReviewCount = list.filter((c) => mapStatus(c.status) === "INCELEMEDE").length
    const alerts = [
      {
        icon: <ShieldCheck size={16} className="text-slate-700" />,
        title: "Moderasyon kuyruğu",
        desc: `İncelemede statüsünde ${inReviewCount} kayıt var.`,
        tone: "amber",
      },
      {
        icon: <Clock size={16} className="text-slate-700" />,
        title: "Ortalama yanıt süresi",
        desc: `Backend resolvedAt olmadığı için hesaplanamıyor (şimdilik).`,
        tone: "slate",
      },
      {
        icon: <Sparkles size={16} className="text-slate-700" />,
        title: "AI etiket önerileri",
        desc: "Dashboard hazır — istersen tag önerilerini de burada gösterebiliriz.",
        tone: "emerald",
      },
    ] as const

    // KPI delta'lar: gerçek kıyas için dün/prev7 gerek. Şimdilik basit placeholder.
    const kpiDelta = {
      todayIncoming: { dir: "up" as const, value: "—", label: "düne göre" },
      openCount: { dir: "down" as const, value: "—", label: "son 7 gün" },
      resolvedThisWeek: { dir: "up" as const, value: "—", label: "son 7 gün" },
      avgResolutionDays: { dir: "down" as const, value: "—", label: "iyileşme" },
    }

    return {
      last7,
      categories,
      recent,
      alerts,
      totals: { todayIncoming, openCount, resolvedThisWeek, avgResolutionDays, total30 },
      deltas: kpiDelta,
    }
  }, [complaints, categoriesMap])

  const total7 = derived.last7.reduce((a, b) => a + b, 0)
  const peak7 = Math.max(...derived.last7, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Moderasyon, kalite ve operasyon metrikleri</p>
          <p className="text-xs text-slate-400 mt-1">
            API: <span className="font-mono">{BASE}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/complaints"
            className="hidden sm:inline-flex items-center justify-center rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            Şikayetleri Gör
            <ChevronRight size={18} className="ml-1" />
          </Link>

          <button
            onClick={fetchAll}
            className="inline-flex items-center justify-center rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            title="Yenile"
          >
            <RefreshCcw size={18} className="mr-2 text-slate-700" />
            Yenile
          </button>
        </div>
      </div>

      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
          Admin token bulunamadı. Admin endpoint’leri için login sonrası token’ı localStorage’a{" "}
          <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile kaydetmelisin.
        </div>
      ) : null}

      {err ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-800">
          <div className="font-semibold">Hata</div>
          <div className="mt-1">{err}</div>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Bugün Gelen"
          value={loading ? "…" : String(derived.totals.todayIncoming)}
          hint="Son 24 saat"
          delta={derived.deltas.todayIncoming}
          icon={<MessageSquareWarning size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Açık Şikayet"
          value={loading ? "…" : String(derived.totals.openCount)}
          hint="Çözülmedi / reddedilmedi"
          delta={derived.deltas.openCount}
          icon={<Clock size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Çözülen"
          value={loading ? "…" : String(derived.totals.resolvedThisWeek)}
          hint="Son 7 gün (status=COZULDU map)"
          delta={derived.deltas.resolvedThisWeek}
          icon={<ShieldCheck size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Ortalama Çözüm"
          value={loading ? "…" : String(derived.totals.avgResolutionDays)}
          hint="resolvedAt yoksa hesaplanamaz"
          delta={derived.deltas.avgResolutionDays}
          icon={<Sparkles size={18} className="text-slate-800" />}
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity / Trend */}
        <Card
          title="Son 7 Gün Trend"
          subtitle="Günlük gelen şikayet sayısı"
          right={
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-900/6 ring-1 ring-slate-900/10 text-slate-700">
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.5)]" />
              Canlı görünüm
            </span>
          }
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Son 7 gün toplam:{" "}
              <span className="font-semibold text-slate-900">{loading ? "…" : total7}</span>
            </div>
            <div className="text-xs text-slate-500">
              Tepe gün:{" "}
              <span className="font-semibold text-slate-900">{loading ? "…" : peak7}</span>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <MiniBars values={derived.last7.length ? derived.last7 : [0, 0, 0, 0, 0, 0, 0]} />
            <div className="flex-1 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-xs font-semibold text-slate-700">Toplam kayıt</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">{loading ? "…" : complaintsTotal}</div>
              <div className="mt-2 text-xs text-slate-500">
                Son 30 gün:{" "}
                <span className="font-semibold text-slate-900">{loading ? "…" : derived.totals.total30}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-orange-500/80 rounded-full"
                  style={{ width: loading ? "35%" : "85%" }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Categories */}
        <Card
          title="Kategori Dağılımı"
          subtitle={loading ? "Yükleniyor…" : `Son 30 gün (toplam ${derived.totals.total30})`}
          right={
            <Link
              href="/admin/categories"
              className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition"
            >
              Yönet →
            </Link>
          }
        >
          <div className="space-y-3">
            {(derived.categories.length ? derived.categories : [{ name: "—", count: 0, pct: 0 }]).map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Tag size={16} className="text-slate-800" />
                    </span>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-500">{loading ? "…" : `${c.count} kayıt`}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{loading ? "…" : `${c.pct}%`}</div>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-orange-500/75 rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card title="Operasyon Notları" subtitle="Sistem sağlığı & öneriler">
          <div className="space-y-3">
            {derived.alerts.map((a, i) => (
              <div
                key={i}
                className={clsx(
                  "rounded-2xl border p-4 bg-white/70",
                  a.tone === "amber"
                    ? "border-amber-200/60"
                    : a.tone === "emerald"
                    ? "border-emerald-200/60"
                    : "border-slate-200/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    {a.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="mt-1 text-xs text-slate-500 leading-relaxed">{a.desc}</div>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/admin/complaints"
              className="inline-flex items-center justify-center w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
            >
              Moderasyon Kuyruğuna Git
              <ChevronRight size={18} className="ml-1" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent complaints */}
      <Card
        title="Son Şikayetler"
        subtitle="Hızlı aksiyon için en yeni kayıtlar"
        right={
          <Link href="/admin/complaints" className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition">
            Tümünü Gör →
          </Link>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/70">
          <div className="grid grid-cols-12 bg-slate-50 text-xs font-semibold text-slate-600">
            <div className="col-span-2 px-4 py-3">ID</div>
            <div className="col-span-6 px-4 py-3">Başlık</div>
            <div className="col-span-2 px-4 py-3">Kategori</div>
            <div className="col-span-2 px-4 py-3 text-right">Durum</div>
          </div>

          <div className="divide-y divide-slate-200/70 bg-white/80">
            {(derived.recent.length ? derived.recent : []).map((r) => (
              <Link
                href={`/admin/complaints/${encodeURIComponent(r.id)}`}
                key={r.id}
                className="grid grid-cols-12 items-center hover:bg-slate-50/70 transition"
              >
                <div className="col-span-2 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{r.id}</div>
                  <div className="text-xs text-slate-500">{r.createdAt}</div>
                </div>

                <div className="col-span-6 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">{r.title}</div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-1">Kullanıcı: anonim • Öncelik: normal</div>
                </div>

                <div className="col-span-2 px-4 py-3">
                  <div className="text-sm text-slate-700">{r.category}</div>
                </div>

                <div className="col-span-2 px-4 py-3 flex justify-end">
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}

            {!loading && derived.recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-semibold text-slate-900">Kayıt yok</div>
                <div className="mt-1 text-sm text-slate-500">Şu an listelenecek şikayet bulunamadı.</div>
              </div>
            ) : null}

            {loading ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-semibold text-slate-900">Yükleniyor…</div>
                <div className="mt-1 text-sm text-slate-500">Dashboard verileri çekiliyor.</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Hızlı aksiyonlar:</span>
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <Clock size={16} className="text-slate-700" />
            İncelemede olanları aç
          </Link>
          <Link
            href="/admin/complaints"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <ShieldCheck size={16} className="text-slate-700" />
            Çözülenleri gör
          </Link>
        </div>
      </Card>
    </div>
  )
}