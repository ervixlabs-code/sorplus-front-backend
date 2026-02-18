// src/app/admin/complaints/page.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import clsx from "clsx"
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  SlidersHorizontal,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock3,
  Send,
  RefreshCcw,
  Star,
} from "lucide-react"
import StatusBadge, { ComplaintStatus as StatusBadgeStatus } from "@/components/admin/StatusBadge"

/* ================== CONFIG ================== */
const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3002").replace(/\/+$/, "")

const TOKEN_KEY = "sv_admin_token"

/* ================== TYPES ================== */
type ComplaintStatus = StatusBadgeStatus | "DRAFT"

// Backend shape (tahmini; ufak fark olursa map’te düzeltiriz)
type ApiCategory = {
  id: string
  name: string
  slug?: string | null
  isActive?: boolean
  sortOrder?: number
}

type ApiComplaint = {
  id: string
  title: string
  detail?: string | null
  summary?: string | null
  status: string // e.g. PENDING/APPROVED/REJECTED etc
  createdAt: string
  updatedAt?: string
  category?: { id: string; name: string } | null
  categoryId?: string | null
  anonymous?: boolean
  brandName?: string | null
  hasCompanyMention?: boolean
  reporter?: { name?: string; email?: string } | null
  user?: { id: string; firstName?: string; lastName?: string; email?: string } | null
  priority?: "LOW" | "NORMAL" | "HIGH"
}

type ComplaintsListResponse =
  | { items: ApiComplaint[]; total: number; take?: number; skip?: number }
  | ApiComplaint[] // bazı backendler direkt array dönebilir

type ComplaintRow = {
  id: string
  title: string
  summary: string
  category: string
  categoryId?: string | null
  status: ComplaintStatus
  createdAt: string
  reporter: { name: string; email?: string }
  hasCompanyMention: boolean
  priority: "LOW" | "NORMAL" | "HIGH"
}

/* ================== HELPERS ================== */
async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ""
  } catch {
    return ""
  }
}

function formatTRDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

function normalizeStatus(apiStatus?: string): ComplaintStatus {
  const s = (apiStatus || "").toUpperCase()

  // kendi backend status adların farklıysa burayı map’le
  if (s === "DRAFT") return "DRAFT"
  if (s === "PENDING") return "INCELEMEDE" // moderasyon kuyruğu
  if (s === "IN_REVIEW") return "INCELEMEDE"
  if (s === "NEW") return "YENI"
  if (s === "APPROVED" || s === "PUBLISHED") return "YAYINDA"
  if (s === "RESOLVED") return "COZULDU"
  if (s === "REJECTED") return "REDDEDILDI"

  // default
  return "INCELEMEDE"
}

function toSummary(c: ApiComplaint) {
  const raw =
    c.summary ||
    (c.detail ? c.detail.slice(0, 120) : "") ||
    ""
  return raw.length > 0 ? raw : "—"
}

function inferHasCompanyMention(c: ApiComplaint) {
  if (typeof c.hasCompanyMention === "boolean") return c.hasCompanyMention
  return !!(c.brandName && c.brandName.trim().length > 0)
}

function inferReporter(c: ApiComplaint) {
  // backend’te owner user bilgisi varsa onu kullan
  if (c.user) {
    const name =
      [c.user.firstName, c.user.lastName].filter(Boolean).join(" ").trim() ||
      (c.user.email ? c.user.email.split("@")[0] : "Kullanıcı")
    return { name, email: c.user.email }
  }
  if (c.reporter?.name || c.reporter?.email) {
    return { name: c.reporter.name || "Kullanıcı", email: c.reporter.email }
  }
  return { name: c.anonymous ? "Anonim" : "Kullanıcı", email: undefined }
}

function inferPriority(c: ApiComplaint): "LOW" | "NORMAL" | "HIGH" {
  if (c.priority === "LOW" || c.priority === "NORMAL" || c.priority === "HIGH") return c.priority
  return inferHasCompanyMention(c) ? "HIGH" : "NORMAL"
}

function mapComplaintRow(c: ApiComplaint): ComplaintRow {
  return {
    id: c.id,
    title: c.title || "—",
    summary: toSummary(c),
    category: c.category?.name || "—",
    categoryId: c.category?.id || c.categoryId || null,
    status: normalizeStatus(c.status),
    createdAt: formatTRDate(c.createdAt),
    reporter: inferReporter(c),
    hasCompanyMention: inferHasCompanyMention(c),
    priority: inferPriority(c),
  }
}

function pillPriority(p: ComplaintRow["priority"]) {
  return p === "HIGH"
    ? "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15"
    : p === "LOW"
      ? "bg-slate-900/6 text-slate-600 ring-1 ring-slate-900/10"
      : "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15"
}
function priorityLabel(p: ComplaintRow["priority"]) {
  return p === "HIGH" ? "Yüksek" : p === "LOW" ? "Düşük" : "Normal"
}

function cxBtn(active: boolean) {
  return clsx(
    "rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
    active
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-white/80 border-slate-200/80 hover:bg-white"
  )
}

function DraftBadge() {
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/20">
      Beklemede
    </span>
  )
}

/* ================== TOAST ================== */
type ToastState =
  | null
  | {
      type: "success" | "error"
      message: string
      actionLabel?: string
      onAction?: () => void
    }

function Toast({ t, onClose }: { t: NonNullable<ToastState>; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <div
        className={clsx(
          "rounded-2xl px-4 py-3 shadow-xl border text-sm font-semibold flex items-center gap-3",
          t.type === "success"
            ? "bg-emerald-600 text-white border-emerald-500/40"
            : "bg-rose-600 text-white border-rose-500/40"
        )}
      >
        <div className="max-w-[360px]">{t.message}</div>

        {t.actionLabel && t.onAction ? (
          <button
            onClick={() => {
              t.onAction?.()
              onClose()
            }}
            className="rounded-xl bg-white/15 hover:bg-white/20 px-3 py-1 text-xs font-semibold"
          >
            {t.actionLabel}
          </button>
        ) : null}

        <button
          onClick={onClose}
          className="rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs font-semibold"
          aria-label="Toast kapat"
          title="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/* ================== PAGE ================== */
export default function AdminComplaintsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Query state
  const q = sp.get("q") ?? ""
  const status = (sp.get("status") ?? "ALL") as ComplaintStatus | "ALL"
  const categoryId = sp.get("categoryId") ?? "ALL"
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const pageSize = 10

  // Local input state
  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => setSearchInput(q), [q])

  // Data state
  const [items, setItems] = useState<ComplaintRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Categories
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [catLoading, setCatLoading] = useState(true)

  // Toast
  const [toast, setToast] = useState<ToastState>(null)
  const toastTimerRef = useRef<number | null>(null)
  function showToast(t: NonNullable<ToastState>, autoCloseMs = 3000) {
    setToast(t)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), autoCloseMs)
  }

  // Send menu open/close
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuWrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!openMenuId) return
      const target = e.target as Node
      if (menuWrapRef.current && !menuWrapRef.current.contains(target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", onDocDown)
    return () => document.removeEventListener("mousedown", onDocDown)
  }, [openMenuId])

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
  const allOnPageSelected = items.length > 0 && items.every((i) => selected[i.id])

  useEffect(() => {
    setSelected({})
  }, [page, q, status, categoryId])

  function setQuery(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "ALL") params.delete(k)
      else params.set(k, String(v))
    })
    router.push(`${pathname}?${params.toString()}`)
  }

  function applySearch() {
    setQuery({ q: searchInput, page: 1 })
  }

  function resetFilters() {
    router.push(pathname)
  }

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize))
  const safePage = Math.min(page, totalPages)

  /* ================== API CALLS ================== */
  async function fetchCategories() {
    setCatLoading(true)
    try {
      const token = getToken()
      if (!token) throw new Error("Token yok. Lütfen tekrar giriş yap.")
      const res = await fetch(`${API_BASE}/api/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data = await safeJson(res)
      if (!res.ok) {
        const msg = data?.message || "Kategoriler alınamadı."
        throw new Error(String(msg))
      }
      setCategories(Array.isArray(data) ? data : (data?.items || []))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      showToast({ type: "error", message: e?.message || "Kategoriler alınamadı." })
      setCategories([])
    } finally {
      setCatLoading(false)
    }
  }

  async function fetchComplaints() {
    setLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) {
        router.push(`/admin/login?next=${encodeURIComponent(pathname + "?" + sp.toString())}`)
        return
      }

      const params = new URLSearchParams()
      params.set("take", String(pageSize))
      params.set("skip", String((safePage - 1) * pageSize))

      if (q.trim()) params.set("q", q.trim())

      // status filtre (backend param adın farklıysa burada değiştir)
      if (status !== "ALL") params.set("status", status)

      // category filtre (categoryId)
      if (categoryId !== "ALL") params.set("categoryId", categoryId)

      const res = await fetch(`${API_BASE}/api/admin/complaints?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const data: ComplaintsListResponse = await safeJson(res)

      if (!res.ok) {
        const msg =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data as any)?.message ||
          "Şikayetler alınamadı. Yetki/token kontrol et."
        throw new Error(String(msg))
      }

      let list: ApiComplaint[] = []
      let t = 0

      if (Array.isArray(data)) {
        list = data
        t = data.length
      } else {
        list = data.items || []
        t = Number(data.total || 0)
      }

      setItems(list.map(mapComplaintRow))
      setTotal(t)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message || "Şikayetler alınamadı.")
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  async function approveComplaint(id: string) {
    const token = getToken()
    if (!token) return showToast({ type: "error", message: "Token yok. Tekrar giriş yap." })
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(id)}/approve`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await safeJson(res)
    if (!res.ok) {
      const msg = data?.message || "Onaylanamadı."
      throw new Error(String(msg))
    }
  }

  async function rejectComplaint(id: string) {
    const token = getToken()
    if (!token) return showToast({ type: "error", message: "Token yok. Tekrar giriş yap." })
    const res = await fetch(`${API_BASE}/api/admin/complaints/${encodeURIComponent(id)}/reject`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await safeJson(res)
    if (!res.ok) {
      const msg = data?.message || "Reddedilemedi."
      throw new Error(String(msg))
    }
  }

  useEffect(() => {
    // ilk yüklemede kategoriler + şikayetler
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchComplaints()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, categoryId, safePage])

  /* ================== ACTIONS ================== */
  async function setRowStatus(id: string, next: ComplaintStatus) {
    try {
      if (next === "YAYINDA") {
        await approveComplaint(id)
        showToast({ type: "success", message: `Onaylandı: ${id}` })
      } else if (next === "REDDEDILDI") {
        await rejectComplaint(id)
        showToast({ type: "success", message: `Reddedildi: ${id}` })
      } else if (next === "DRAFT") {
        // backend endpoint listende yok → UI-only
        showToast({
          type: "error",
          message: "Beklet (DRAFT) için backend endpoint yok. İstersen /hold ekleyelim.",
        })
        return
      } else {
        showToast({ type: "error", message: "Bu durum aksiyonu için endpoint tanımlı değil." })
        return
      }

      // hızlı UI güncelle + refetch
      setItems((prev) => prev.map((r) => (r.id === id ? { ...r, status: next } : r)))
      fetchComplaints()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      showToast({ type: "error", message: e?.message || `Durum güncellenemedi: ${id}` })
    }
  }

  function deleteRowWithUndo(_id: string) {
    showToast({
      type: "error",
      message: "Silme endpoint’i yok (Admin Complaints DELETE). İstersen ekleyelim.",
    })
  }

  function bulkAction(kind: "delete" | "solve" | "reject") {
    if (selectedIds.length === 0) return

    if (kind === "delete") {
      showToast({ type: "error", message: "Toplu silme için backend endpoint gerekli." })
      return
    }

    // çöz / reddet toplu: sırayla patch atalım
    ;(async () => {
      try {
        for (const id of selectedIds) {
          if (kind === "solve") await approveComplaint(id)
          if (kind === "reject") await rejectComplaint(id)
        }
        showToast({ type: "success", message: `Toplu işlem başarılı: ${selectedIds.length} kayıt` })
        fetchComplaints()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        showToast({ type: "error", message: e?.message || "Toplu işlem başarısız." })
      }
    })()
  }

  /* ================== UI ================== */
  return (
    <div className="space-y-6">
      {toast ? <Toast t={toast} onClose={() => setToast(null)} /> : null}

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Şikayetler</h1>
          <p className="text-slate-500 mt-1">Kayıtları filtrele, incele ve durum güncelle</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/admin/complaints/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-orange-400 transition"
          >
            + Şikayet Ekle
          </Link>

          <button
            onClick={() => {
              resetFilters()
              fetchComplaints()
              fetchCategories()
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Yenile
          </button>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            Dashboard
            <ChevronRight size={18} className="text-orange-300" />
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch()
                  }}
                  placeholder="ID, başlık, kullanıcı, kategori ara..."
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                />
              </div>
            </div>

            <button
              onClick={applySearch}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
            >
              Ara
            </button>

            <button
              onClick={resetFilters}
              className="inline-flex items-center justify-center rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            >
              Temizle
            </button>
          </div>

          {/* Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <SlidersHorizontal size={16} />
              Hızlı filtre:
            </div>

            <button className={cxBtn(status === "ALL")} onClick={() => setQuery({ status: "ALL", page: 1 })}>
              Tümü
            </button>
            <button className={cxBtn(status === "YENI")} onClick={() => setQuery({ status: "YENI", page: 1 })}>
              Yeni
            </button>
            <button className={cxBtn(status === "DRAFT")} onClick={() => setQuery({ status: "DRAFT", page: 1 })}>
              Beklemede
            </button>
            <button
              className={cxBtn(status === "INCELEMEDE")}
              onClick={() => setQuery({ status: "INCELEMEDE", page: 1 })}
            >
              İncelemede
            </button>
            <button className={cxBtn(status === "YAYINDA")} onClick={() => setQuery({ status: "YAYINDA", page: 1 })}>
              Yayında
            </button>
            <button className={cxBtn(status === "COZULDU")} onClick={() => setQuery({ status: "COZULDU", page: 1 })}>
              Çözüldü
            </button>
            <button
              className={cxBtn(status === "REDDEDILDI")}
              onClick={() => setQuery({ status: "REDDEDILDI", page: 1 })}
            >
              Reddedildi
            </button>

            {/* Category dropdown */}
            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2">
                <Filter size={16} />
                Kategori:
              </div>
              <select
                value={categoryId}
                disabled={catLoading}
                onChange={(e) => setQuery({ categoryId: e.target.value, page: 1 })}
                className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
              >
                <option value="ALL">Tümü</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Result meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="text-slate-600">
              Toplam <span className="font-semibold text-slate-900">{total}</span> kayıt
              {q ? (
                <>
                  {" "}
                  • Arama: <span className="font-semibold text-slate-900">{q}</span>
                </>
              ) : null}
              {loading ? <span className="ml-2 text-slate-400">• yükleniyor…</span> : null}
              {error ? <span className="ml-2 text-rose-600 font-semibold">• {error}</span> : null}
            </div>

            {selectedIds.length > 0 ? (
              <div className="flex items-center gap-2">
                <div className="text-slate-600">
                  Seçili: <span className="font-semibold text-slate-900">{selectedIds.length}</span>
                </div>
                <button
                  onClick={() => bulkAction("solve")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-emerald-700 transition"
                >
                  <CheckCircle2 size={16} />
                  Kabul Et
                </button>
                <button
                  onClick={() => bulkAction("reject")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-rose-700 transition"
                >
                  <XCircle size={16} />
                  Reddet
                </button>
                <button
                  onClick={() => bulkAction("delete")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
                >
                  <Trash2 size={16} className="text-slate-700" />
                  Sil
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Kayıtlar</div>
          <div className="text-xs text-slate-500">
            Sayfa {safePage} / {totalPages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-5 py-3 w-[44px]">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => {
                      const v = e.target.checked
                      const next: Record<string, boolean> = {}
                      items.forEach((i) => (next[i.id] = v))
                      setSelected(next)
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                </th>
                <th className="px-5 py-3">Şikayet</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Öncelik</th>
                <th className="px-5 py-3">Tarih</th>
                <th className="px-5 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={!!selected[c.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [c.id]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                        <Clock3 size={18} className="text-slate-700" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{c.id}</div>
                          {c.hasCompanyMention ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/15 px-2 py-1 text-xs font-semibold">
                              <Star size={14} />
                              Firma adı geçti
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                        <div className="mt-1 text-xs text-slate-500 line-clamp-1">{c.summary}</div>

                        <div className="mt-2 text-xs text-slate-500">
                          Kullanıcı: <span className="font-semibold text-slate-800">{c.reporter.name}</span>
                          {c.reporter.email ? ` • ${c.reporter.email}` : ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-800">{c.category}</div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    {c.status === "DRAFT" ? <DraftBadge /> : <StatusBadge status={c.status as StatusBadgeStatus} />}
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                        pillPriority(c.priority)
                      )}
                    >
                      {priorityLabel(c.priority)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm text-slate-700">{c.createdAt}</div>
                  </td>

                  <td className="px-5 py-4 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/complaints/${encodeURIComponent(c.id)}`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Detay"
                      >
                        <Eye size={18} className="text-slate-700" />
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={() => deleteRowWithUndo(c.id)}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">Kayıt bulunamadı</div>
                    <div className="mt-1 text-sm text-slate-500">Filtreleri temizleyip tekrar deneyebilirsin.</div>
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          resetFilters()
                          fetchComplaints()
                        }}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                      >
                        Filtreleri Sıfırla
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}

              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">Yükleniyor…</div>
                    <div className="mt-1 text-sm text-slate-500">Şikayetler çekiliyor.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 flex items-center justify-between border-t border-slate-200/70 bg-white/60">
          <div className="text-sm text-slate-600">
            Gösterilen:{" "}
            <span className="font-semibold text-slate-900">
              {total === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, total)}
            </span>{" "}
            / <span className="font-semibold text-slate-900">{total}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={safePage <= 1}
              onClick={() => setQuery({ page: safePage - 1 })}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
                safePage <= 1
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white/80 border-slate-200/80 hover:bg-white"
              )}
            >
              <ChevronLeft size={18} />
              Önceki
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const start = Math.max(1, safePage - 2)
                const p = Math.min(totalPages, start + i)
                const active = p === safePage
                return (
                  <button
                    key={p}
                    onClick={() => setQuery({ page: p })}
                    className={clsx(
                      "h-10 w-10 rounded-2xl text-sm font-semibold border shadow-sm transition",
                      active
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white/80 border-slate-200/80 hover:bg-white"
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <button
              disabled={safePage >= totalPages}
              onClick={() => setQuery({ page: safePage + 1 })}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
                safePage >= totalPages
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white/80 border-slate-200/80 hover:bg-white"
              )}
            >
              Sonraki
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
