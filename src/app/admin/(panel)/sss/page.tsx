"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import clsx from "clsx"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Pencil,
  Eye,
  HelpCircle,
  Tag,
} from "lucide-react"

/** ================== API ================== */
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

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body, cache: "no-store" })
  const data = await safeJson(res)

  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `HTTP ${res.status}`
    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(", ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ================== Types ================== */
type FaqStatus = "ACTIVE" | "PASSIVE"

type FaqCategory = {
  id: string
  name: string
}

type FaqItem = {
  id: string
  question: string
  answer: string
  categoryId: string
  status: FaqStatus
  createdAt?: string
  updatedAt?: string
}

/** ===================== UI helpers ===================== */
function badgeStatus(status: FaqStatus) {
  return status === "ACTIVE"
    ? "bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15"
    : "bg-slate-900/6 text-slate-600 ring-1 ring-slate-900/10"
}
function labelStatus(status: FaqStatus) {
  return status === "ACTIVE" ? "Aktif" : "Pasif"
}

/** ===================== Toast ===================== */
type ToastKind = "success" | "error" | "info"
type ToastState = { open: boolean; kind: ToastKind; title: string; desc?: string }

function Toast({
  state,
  onClose,
  action,
}: {
  state: ToastState
  onClose: () => void
  action?: { label: string; onClick: () => void }
}) {
  if (!state.open) return null

  const base =
    "fixed z-[100] bottom-4 right-4 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_16px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl overflow-hidden"
  const style =
    state.kind === "success"
      ? "bg-emerald-600 text-white border-emerald-500/30"
      : state.kind === "error"
      ? "bg-rose-600 text-white border-rose-500/30"
      : "bg-slate-900 text-white border-white/10"

  return (
    <div className={clsx(base, style)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{state.title}</div>
            {state.desc ? <div className="mt-1 text-xs text-white/85">{state.desc}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs font-semibold"
            aria-label="Kapat"
          >
            Kapat
          </button>
        </div>

        {action ? (
          <div className="mt-3 flex items-center justify-end">
            <button
              onClick={action.onClick}
              className="rounded-xl bg-white/15 hover:bg-white/20 px-3 py-2 text-xs font-extrabold tracking-tight"
            >
              {action.label}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** ===================== Page ===================== */
export default function AdminFaqPage() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Query state
  const q = sp.get("q") ?? ""
  const status = (sp.get("status") ?? "ALL") as FaqStatus | "ALL"
  const cat = (sp.get("cat") ?? "ALL") as string | "ALL"
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const pageSize = 10

  const tokenMissing = !getToken()

  // Data state
  const [cats, setCats] = useState<FaqCategory[]>([])
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)

  // local input state
  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => setSearchInput(q), [q])

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

  // Toast
  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3800) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  async function fetchAll() {
    try {
      setLoading(true)
      const [catsRes, faqsRes] = await Promise.all([
        api<FaqCategory[]>(`/api/admin/faq-categories`, { method: "GET" }),
        api<FaqItem[]>(`/api/admin/faqs`, { method: "GET" }),
      ])

      setCats([...catsRes].sort((a, b) => a.name.localeCompare(b.name, "tr")))

      // newest first: updatedAt -> createdAt -> id fallback
      const sorted = [...faqsRes].sort((a, b) => {
        const da = (a.updatedAt || a.createdAt || "") + ""
        const db = (b.updatedAt || b.createdAt || "") + ""
        if (da && db && da !== db) return db.localeCompare(da)
        return String(b.id).localeCompare(String(a.id))
      })
      setItems(sorted)
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Yüklenemedi", detail || err?.message || "Bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenMissing) return
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenMissing])

  const catMap = useMemo(() => {
    const m = new Map<string, string>()
    cats.forEach((c) => m.set(c.id, c.name))
    return m
  }, [cats])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return items.filter((it) => {
      if (status !== "ALL" && it.status !== status) return false
      if (cat !== "ALL" && it.categoryId !== cat) return false
      if (!qq) return true
      const hay = `${it.id} ${it.question} ${it.answer} ${catMap.get(it.categoryId) ?? ""}`.toLowerCase()
      return hay.includes(qq)
    })
  }, [items, q, status, cat, catMap])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage])

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((i) => selected[i.id])

  useEffect(() => {
    setSelected({})
  }, [safePage, q, status, cat])

  // Undo delete (API'de gerçek undo yok → 5 sn boyunca DELETE çağrısını geciktiriyoruz)
  const undoTimer = useRef<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; open: boolean } | null>(null)

  async function commitDelete(ids: string[]) {
    // sırayla sil (backend batch yok)
    for (const id of ids) {
      await api(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: "DELETE" })
    }
  }

  function deleteOne(id: string) {
    try {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)

      // UI'da hemen kaldır
      setItems((prev) => prev.filter((x) => x.id !== id))
      setPendingDelete({ ids: [id], open: true })
      showToast("success", "SSS silindi", "5 saniye içinde geri alabilirsin.", 5000)

      undoTimer.current = window.setTimeout(async () => {
        try {
          await commitDelete([id])
        } catch (err: any) {
          const detail =
            err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
          showToast("error", "Silinemedi", detail || err?.message || "Bir hata oluştu.")
          // Silinemediyse listeyi yeniden çekelim
          fetchAll()
        } finally {
          setPendingDelete(null)
        }
      }, 5000)
    } catch {
      showToast("error", "Bir hata oluştu", "SSS silinemedi.")
    }
  }

  function bulkDelete() {
    if (selectedIds.length === 0) return

    try {
      if (undoTimer.current) window.clearTimeout(undoTimer.current)

      const ids = [...selectedIds]
      setSelected({})
      setItems((prev) => prev.filter((x) => !ids.includes(x.id)))
      setPendingDelete({ ids, open: true })
      showToast(
        "success",
        "SSS kayıtları silindi",
        `${ids.length} kayıt silindi. 5 saniye içinde geri alabilirsin.`,
        5000
      )

      undoTimer.current = window.setTimeout(async () => {
        try {
          await commitDelete(ids)
        } catch (err: any) {
          const detail =
            err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
          showToast("error", "Toplu silme başarısız", detail || err?.message || "Bir hata oluştu.")
          fetchAll()
        } finally {
          setPendingDelete(null)
        }
      }, 5000)
    } catch {
      showToast("error", "Bir hata oluştu", "Toplu silme başarısız.")
    }
  }

  function undoDelete() {
    if (!pendingDelete) return
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setPendingDelete(null)
    showToast("success", "Geri alındı")
    // En garanti: server'ı tekrar çek
    fetchAll()
  }

  function cxBtn(active: boolean) {
    return clsx(
      "rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
      active ? "bg-slate-900 text-white border-slate-900" : "bg-white/80 border-slate-200/80 hover:bg-white"
    )
  }

  if (tokenMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
        Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile
        kaydetmelisin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toast
        state={toast}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        action={pendingDelete?.open ? { label: "UNDO", onClick: undoDelete } : undefined}
      />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SSS</h1>
          <p className="text-slate-500 mt-1">Soru-cevap içeriklerini kategoriye göre yönet</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/admin/sss/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-orange-400 transition"
          >
            <Plus size={18} />
            SSS Ekle
          </Link>

          <button
            onClick={() => {
              fetchAll()
              showToast("success", "Yenilendi")
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Yenile
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch()
                  }}
                  placeholder="ID, soru, cevap veya kategori ara..."
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
              <SlidersHorizontal size={16} />
              Hızlı filtre:
            </div>

            <button className={cxBtn(status === "ALL")} onClick={() => setQuery({ status: "ALL", page: 1 })}>
              Tümü
            </button>
            <button className={cxBtn(status === "ACTIVE")} onClick={() => setQuery({ status: "ACTIVE", page: 1 })}>
              Aktif
            </button>
            <button className={cxBtn(status === "PASSIVE")} onClick={() => setQuery({ status: "PASSIVE", page: 1 })}>
              Pasif
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2">
                <Tag size={16} />
                Kategori:
              </div>
              <select
                value={cat}
                onChange={(e) => setQuery({ cat: e.target.value, page: 1 })}
                className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="ALL">Tümü</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-600">
                Seçili: <span className="font-semibold text-slate-900">{selectedIds.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={bulkDelete}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
                >
                  <Trash2 size={16} className="text-slate-700" />
                  Sil (Undo)
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Kayıtlar</div>
          <div className="text-xs text-slate-500">
            {loading ? "Yükleniyor…" : `Sayfa ${safePage} / ${totalPages}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-5 py-3 w-[44px]">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={(e) => {
                      const v = e.target.checked
                      const next: Record<string, boolean> = {}
                      pageItems.forEach((i) => (next[i.id] = v))
                      setSelected(next)
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900"
                  />
                </th>
                <th className="px-5 py-3">Soru</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Tarih</th>
                <th className="px-5 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70">
              {pageItems.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={!!selected[it.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [it.id]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                        <HelpCircle size={18} className="text-slate-700" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-2">{it.question}</div>
                        <div className="mt-1 text-xs text-slate-500">{it.id}</div>
                        <div className="mt-2 text-xs text-slate-600 line-clamp-2">
                          {it.answer?.trim() ? it.answer : "—"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-600/10 text-blue-800 ring-1 ring-blue-600/15">
                      {catMap.get(it.categoryId) ?? "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", badgeStatus(it.status))}>
                      {labelStatus(it.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm text-slate-700">{(it.updatedAt as any) ?? (it.createdAt as any) ?? "—"}</div>
                  </td>

                  <td className="px-5 py-4 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/sss/${encodeURIComponent(it.id)}`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Detay"
                      >
                        <Eye size={18} className="text-slate-700" />
                      </Link>

                      <Link
                        href={`/admin/sss/${encodeURIComponent(it.id)}/edit`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Pencil size={18} className="text-slate-700" />
                      </Link>

                      <button
                        onClick={() => deleteOne(it.id)}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Sil (Undo)"
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">Kayıt bulunamadı</div>
                    <div className="mt-1 text-sm text-slate-500">Filtreleri temizleyip tekrar deneyebilirsin.</div>
                    <div className="mt-4">
                      <button
                        onClick={resetFilters}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                      >
                        Filtreleri Sıfırla
                      </button>
                    </div>
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
