"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import {
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Undo2,
  Shield,
  Search,
  Filter,
} from "lucide-react"

/* ================== API ================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_API_BASE?.trim?.() ||
  (process.env as any)?.EXPO_PUBLIC_API_BASE?.trim?.() ||
  "http://localhost:3002"

function normalizeBase(raw: string) {
  return (raw || "").trim().replace(/\/+$/, "")
}

function getToken() {
  if (typeof window === "undefined") return ""
  const candidates = ["sv_admin_token", "ADMIN_TOKEN", "token"]
  for (const key of candidates) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const obj = JSON.parse(raw)
      const t = obj?.token || obj?.accessToken || obj
      if (typeof t === "string" && t.length > 10) return t
    } catch {
      if (raw.length > 10) return raw
    }
  }
  return ""
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

async function apiGet(path: string) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && ((data as any).message || (data as any).error)) || `GET ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

async function apiPatch(path: string, body?: any) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && ((data as any).message || (data as any).error)) || `PATCH ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

async function apiDelete(path: string) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && ((data as any).message || (data as any).error)) || `DELETE ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ================== TYPES ================== */
type SecuritySectionLevel = "ZORUNLU" | "BILGI" | "NOT"

type SecuritySection = {
  id: string
  category: string
  title: string
  desc: string
  bullets: string[]
  level: SecuritySectionLevel
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type ToastKind = "success" | "error"
type ToastState = {
  open: boolean
  kind: ToastKind
  title: string
  desc?: string
  actionLabel?: string
  onAction?: () => void
}

function Toast({ state, onClose }: { state: ToastState; onClose: () => void }) {
  if (!state.open) return null
  const base =
    "fixed z-[100] bottom-4 right-4 w-[420px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_16px_60px_rgba(15,23,42,0.22)] overflow-hidden"
  const style =
    state.kind === "success"
      ? "bg-emerald-600 text-white border-emerald-500/30"
      : "bg-rose-600 text-white border-rose-500/30"

  return (
    <div className={clsx(base, style)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{state.title}</div>
            {state.desc ? <div className="mt-1 text-xs text-white/85">{state.desc}</div> : null}
          </div>

          <div className="flex items-center gap-2">
            {state.actionLabel && state.onAction ? (
              <button
                onClick={state.onAction}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold"
              >
                <Undo2 size={14} />
                {state.actionLabel}
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs font-semibold"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtTR(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function levelPill(level?: SecuritySectionLevel) {
  const lv = level || "BILGI"
  if (lv === "ZORUNLU")
    return "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20"
  if (lv === "NOT")
    return "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20"
  return "bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10"
}

function levelLabel(level?: SecuritySectionLevel) {
  const lv = level || "BILGI"
  if (lv === "ZORUNLU") return "Zorunlu"
  if (lv === "NOT") return "Not"
  return "Bilgi"
}

export default function AdminSecurityListPage() {
  const router = useRouter()

  const [items, setItems] = useState<SecuritySection[]>([])
  const [loading, setLoading] = useState(true)

  // filters
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<string>("")
  const [activeOnly, setActiveOnly] = useState(false)

  // pagination
  const [take, setTake] = useState(20)
  const [skip, setSkip] = useState(0)
  const [total, setTotal] = useState(0)

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const toastTimer = useRef<number | null>(null)

  const showToast = (next: ToastState, autoCloseMs = 3200) => {
    setToast({ ...next, open: true })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (autoCloseMs > 0) {
      toastTimer.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), autoCloseMs)
    }
  }

  const pendingDeleteRef = useRef<{ id: string; item: SecuritySection; timer: number } | null>(null)

  const page = Math.floor(skip / take) + 1
  const totalPages = Math.max(1, Math.ceil((total || 0) / take))

  function buildQuery() {
    const sp = new URLSearchParams()
    if (q.trim()) sp.set("q", q.trim())
    if (category.trim()) sp.set("category", category.trim())
    if (activeOnly) sp.set("activeOnly", "true")
    sp.set("take", String(take))
    sp.set("skip", String(skip))
    return sp.toString()
  }

  async function refresh(silent = false) {
    try {
      setLoading(true)
      const qs = buildQuery()
      const data = await apiGet(`/api/admin/security?${qs}`)
      const arr = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data) ? data : []
      setItems(arr)
      setTotal(Number((data as any)?.total ?? arr.length ?? 0))
      if (!silent) showToast({ kind: "success", title: "Güncellendi" })
    } catch (e: any) {
      showToast({ kind: "error", title: "Liste alınamadı", desc: e?.message || "Bir hata oluştu." })
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take, skip])

  // filter changes -> reset to first page but don't spam
  const filterTimer = useRef<number | null>(null)
  useEffect(() => {
    if (filterTimer.current) window.clearTimeout(filterTimer.current)
    filterTimer.current = window.setTimeout(() => {
      setSkip(0)
      refresh(true)
    }, 350)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, activeOnly])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) if (it.category) set.add(it.category)
    return Array.from(set).sort((a, b) => a.localeCompare(b, "tr"))
  }, [items])

  const sorted = useMemo(() => {
    // backend already orders, but we keep it stable and nicer in UI:
    return [...items].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0)
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
    })
  }, [items])

  async function toggleStatus(it: SecuritySection) {
    const next = !it.isActive
    // optimistic
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, isActive: next } : x)))
    try {
      await apiPatch(`/api/admin/security/${encodeURIComponent(it.id)}/status`, { isActive: next })
      showToast({
        kind: "success",
        title: next ? "Aktif edildi" : "Pasife alındı",
        desc: `${it.title} • ${it.category}`,
      })
    } catch (e: any) {
      // rollback
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, isActive: !next } : x)))
      showToast({ kind: "error", title: "Durum güncellenemedi", desc: e?.message || "Bir hata oluştu." })
    }
  }

  function deleteWithUndo(id: string) {
    const target = items.find((x) => x.id === id)
    if (!target) return

    if (pendingDeleteRef.current) {
      window.clearTimeout(pendingDeleteRef.current.timer)
      pendingDeleteRef.current = null
    }

    setItems((prev) => prev.filter((x) => x.id !== id))
    setTotal((t) => Math.max(0, (t || 0) - 1))

    const timer = window.setTimeout(async () => {
      try {
        pendingDeleteRef.current = null
        await apiDelete(`/api/admin/security/${encodeURIComponent(id)}`)
        showToast({ kind: "success", title: "Silindi", desc: "Kayıt kalıcı olarak silindi." })
      } catch (e: any) {
        setItems((prev) => [target, ...prev])
        setTotal((t) => (t || 0) + 1)
        showToast({ kind: "error", title: "Silinemedi", desc: e?.message || "Bir hata oluştu." })
      }
    }, 5000)

    pendingDeleteRef.current = { id, item: target, timer }

    showToast(
      {
        kind: "success",
        title: "Silindi (geri alınabilir)",
        desc: "5 saniye içinde geri alabilirsin.",
        actionLabel: "Undo",
        onAction: () => {
          if (!pendingDeleteRef.current) return
          window.clearTimeout(pendingDeleteRef.current.timer)
          const restore = pendingDeleteRef.current.item
          pendingDeleteRef.current = null
          setItems((prev) => [restore, ...prev])
          setTotal((t) => (t || 0) + 1)
          showToast({ kind: "success", title: "Geri alındı", desc: "Kayıt geri getirildi." })
        },
      },
      5200
    )
  }

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Güvenlik Bölümleri</h1>
          <p className="text-slate-500 mt-1">
            “Güvenlik / Gizlilik” sayfasında görünecek bölümleri buradan yönet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Yenile
          </button>

          <Link
            href="/admin/security/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <Plus size={18} className="text-orange-300" />
            Yeni Bölüm
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ara: başlık, açıklama, kategori..."
                className="w-full sm:w-[340px] rounded-2xl border border-slate-200/80 bg-white px-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Kategori (örn: Genel)"
                list="security_categories"
                className="w-full sm:w-[240px] rounded-2xl border border-slate-200/80 bg-white px-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <datalist id="security_categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <button
              onClick={() => setActiveOnly((v) => !v)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold border shadow-sm transition",
                activeOnly
                  ? "bg-emerald-600 text-white border-emerald-500/30 hover:bg-emerald-700"
                  : "bg-white/80 text-slate-800 border-slate-200/80 hover:bg-white"
              )}
              title="Sadece aktifleri göster"
            >
              {activeOnly ? <CheckCircle2 size={18} /> : <XCircle size={18} className="text-slate-600" />}
              Aktif Only
            </button>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="text-xs text-slate-500">
              {loading ? "Yükleniyor..." : `Toplam: ${total}`}
            </div>

            <select
              value={take}
              onChange={(e) => {
                setTake(Number(e.target.value || 20))
                setSkip(0)
              }}
              className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none"
              title="Sayfa başına"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/sayfa
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Kayıtlar</div>
          <div className="text-xs text-slate-500">
            {loading ? "Yükleniyor..." : `Sayfa: ${page}/${totalPages}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-5 py-3">Başlık</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3">Seviye</th>
                <th className="px-5 py-3">Sıra</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Güncellendi</th>
                <th className="px-5 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70">
              {sorted.map((it) => {
                const isActive = !!it.isActive
                return (
                  <tr key={it.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{it.title}</div>
                      <div className="mt-1 text-xs text-slate-500 line-clamp-1">{it.desc}</div>
                      <div className="mt-1 text-xs text-slate-400">ID: {it.id}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 px-3 py-1 text-xs font-semibold">
                        {it.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                          levelPill(it.level)
                        )}
                      >
                        {levelLabel(it.level)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 px-3 py-1 text-xs font-semibold">
                        {it.sortOrder ?? 0}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 px-3 py-1 text-xs font-semibold">
                          <CheckCircle2 size={14} />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 px-3 py-1 text-xs font-semibold">
                          <XCircle size={14} />
                          Pasif
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-700">{fmtTR(it.updatedAt || it.createdAt)}</div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(it)}
                          className={clsx(
                            "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold shadow-sm transition",
                            isActive
                              ? "bg-slate-900 text-white hover:bg-slate-800"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          )}
                          title={isActive ? "Pasife Al" : "Aktif Yap"}
                        >
                          <Shield size={16} />
                          {isActive ? "Pasif" : "Aktif"}
                        </button>

                        <button
                          onClick={() => router.push(`/admin/security/${encodeURIComponent(it.id)}/edit`)}
                          className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                          title="Düzenle"
                        >
                          <Pencil size={18} className="text-slate-700" />
                        </button>

                        <button
                          onClick={() => deleteWithUndo(it.id)}
                          className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                          title="Sil (Undo)"
                        >
                          <Trash2 size={18} className="text-slate-700" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!loading && sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">Henüz kayıt yok</div>
                    <div className="mt-1 text-sm text-slate-500">“Yeni Bölüm” ile ilk kaydı ekleyebilirsin.</div>
                    <div className="mt-4">
                      <Link
                        href="/admin/security/create"
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                      >
                        <Plus size={18} className="text-orange-300" />
                        Yeni Bölüm
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-4 flex items-center justify-between border-t border-slate-200/70 bg-white/60">
          <div className="text-xs text-slate-500">
            {loading ? "..." : `Gösterilen: ${Math.min(skip + 1, total)}–${Math.min(skip + take, total)} / ${total}`}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSkip((s) => Math.max(0, s - take))}
              disabled={skip <= 0 || loading}
              className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm transition",
                skip <= 0 || loading
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
              )}
            >
              Önceki
            </button>

            <button
              onClick={() => setSkip((s) => s + take)}
              disabled={skip + take >= total || loading}
              className={clsx(
                "rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm transition",
                skip + take >= total || loading
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
              )}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
