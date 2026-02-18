/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import clsx from "clsx"
import { ChevronLeft, ChevronRight, Plus, RefreshCcw, Search, SlidersHorizontal, Trash2, Pencil, Eye, Tags } from "lucide-react"

/** ================== CONFIG ================== */
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
    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(", ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ================== TYPES ================== */
type FaqCategoryRow = {
  id: string
  name: string
  createdAt?: string | null
  updatedAt?: string | null
}

type ApiFaqCategory =
  | {
      id: string | number
      name?: string | null
      createdAt?: string | null
      updatedAt?: string | null
    }
  | any

type ApiListResp =
  | { items: ApiFaqCategory[]; total: number; take?: number; skip?: number }
  | { data: ApiFaqCategory[]; total: number; take?: number; skip?: number }
  | ApiFaqCategory[]

function formatTR(iso?: string | null) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function mapCat(x: ApiFaqCategory): FaqCategoryRow {
  return {
    id: String((x as any).id),
    name: String((x as any).name || "—"),
    createdAt: (x as any).createdAt ?? null,
    updatedAt: (x as any).updatedAt ?? null,
  }
}

/** ================== Toast ================== */
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

/** ================== Page ================== */
export default function AdminFaqCategoriesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const tokenMissing = !getToken()

  // Query state
  const q = sp.get("q") ?? ""
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const pageSize = 10
  const skip = (page - 1) * pageSize
  const take = pageSize

  const [items, setItems] = useState<FaqCategoryRow[]>([])
  const [total, setTotal] = useState(0)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // local input state
  const [searchInput, setSearchInput] = useState(q)
  useEffect(() => setSearchInput(q), [q])

  function setQuery(next: Record<string, string | number | undefined>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === "") params.delete(k)
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

  async function fetchList() {
    setLoading(true)
    setError(null)

    try {
      // 1) Önce backend param destekliyorsa server-side dene
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("skip", String(skip))
      params.set("take", String(take))

      let data: ApiListResp | null = null

      try {
        data = await api<ApiListResp>(`/api/admin/faq-categories?${params.toString()}`, { method: "GET" })
      } catch (e: any) {
        // param desteklemiyorsa ikinci deneme: querysiz çek, client-side filtre/paginate
        data = await api<ApiListResp>(`/api/admin/faq-categories`, { method: "GET" })
      }

      let raw: ApiFaqCategory[] = []
      let rawTotal = 0

      if (Array.isArray(data)) {
        raw = data
        rawTotal = raw.length
      } else if (data && typeof data === "object" && "items" in data && Array.isArray((data as any).items)) {
        raw = (data as any).items
        rawTotal = Number((data as any).total ?? raw.length)
      } else if (data && typeof data === "object" && "data" in data && Array.isArray((data as any).data)) {
        raw = (data as any).data
        rawTotal = Number((data as any).total ?? raw.length)
      }

      // Eğer querysiz çektiysek client-side filtre/paginate
      const mappedAll = raw.map(mapCat)

      const filteredAll = (() => {
        const qq = q.trim().toLowerCase()
        if (!qq) return mappedAll
        return mappedAll.filter((c) => `${c.id} ${c.name}`.toLowerCase().includes(qq))
      })()

      // Eğer backend total/skip/take sağladıysa, skip/take zaten server-side olabilir
      // Ama querysiz fallback yaptığımızda kendimiz paginate edeceğiz:
      const isServerPaged = Array.isArray(data) ? false : (data as any)?.skip !== undefined || (data as any)?.take !== undefined
      const finalItems = isServerPaged
        ? mappedAll
        : filteredAll.slice(skip, skip + take)

      const finalTotal = isServerPaged ? rawTotal : filteredAll.length

      setItems(finalItems)
      setTotal(finalTotal)
    } catch (e: any) {
      setItems([])
      setTotal(0)
      setError(e?.message || "SSS kategorileri alınamadı.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenMissing) return
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, skip, take])

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
  const allOnPageSelected = items.length > 0 && items.every((i) => selected[i.id])

  useEffect(() => {
    setSelected({})
  }, [safePage, q])

  // Toast
  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3800) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  // Undo delete (UI-only)
  const undoTimer = useRef<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ snapshot: FaqCategoryRow[]; open: boolean; count: number } | null>(null)

  function queueUndo(snapshot: FaqCategoryRow[], count: number) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setPendingDelete({ snapshot, open: true, count })
    showToast("success", "Silme işlemi uygulandı", "Backend hard delete. UNDO sadece UI içindir.", 5000)
    undoTimer.current = window.setTimeout(() => setPendingDelete(null), 5000)
  }

  function undoDeleteUIOnly() {
    if (!pendingDelete) return
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setItems(pendingDelete.snapshot)
    setPendingDelete(null)
    showToast("info", "UI geri alındı", "Backend tarafında silme geri alınamaz (hard delete).")
  }

  async function deleteOne(id: string) {
    const snap = [...items]
    try {
      // optimistic
      setItems((p) => p.filter((x) => x.id !== id))

      await api(`/api/admin/faq-categories/${encodeURIComponent(id)}`, { method: "DELETE" })

      showToast("success", "Kategori silindi")
      queueUndo(snap, 1)
      fetchList()
    } catch (e: any) {
      setItems(snap)

      // backend "kullanımda" diye 400/409 dönerse burada yakalayıp mesajı güzel gösterelim
      const msg = e?.message || "Bir hata oluştu."
      const statusCode = e?.status

      if (statusCode === 409 || statusCode === 400) {
        showToast("error", "Silinemez", msg)
      } else {
        showToast("error", "Silme başarısız", msg)
      }
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return
    const snap = [...items]

    try {
      setItems((p) => p.filter((x) => !selectedIds.includes(x.id)))

      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api(`/api/admin/faq-categories/${encodeURIComponent(id)}`, { method: "DELETE" })
      }

      setSelected({})
      showToast("success", "Kategoriler silindi", `${selectedIds.length} kayıt silindi.`)
      queueUndo(snap, selectedIds.length)
      fetchList()
    } catch (e: any) {
      setItems(snap)
      showToast("error", "Toplu silme başarısız", e?.message || "Bir hata oluştu.")
    }
  }

  if (tokenMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
        Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile kaydetmelisin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toast
        state={toast}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        action={pendingDelete?.open ? { label: "UNDO (UI)", onClick: undoDeleteUIOnly } : undefined}
      />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SSS Kategorileri</h1>
          <p className="text-slate-500 mt-1">SSS içerikleri için kategori oluştur ve yönet</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/admin/sss-kategoriler/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-orange-400 transition"
          >
            <Plus size={18} />
            Kategori Ekle
          </Link>

          <button
            onClick={() => {
              fetchList()
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
                  onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  placeholder="ID veya kategori adı ara..."
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
              Not:
            </div>
            <div className="text-xs text-slate-600">
              Silme kuralı (kullanımda olan kategori) backend tarafından kontrol edilir.
            </div>

            {selectedIds.length > 0 ? (
              <div className="ml-auto flex items-center gap-2">
                <div className="text-sm text-slate-600">
                  Seçili: <span className="font-semibold text-slate-900">{selectedIds.length}</span>
                </div>
                <button
                  onClick={bulkDelete}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
                >
                  <Trash2 size={16} className="text-slate-700" />
                  Sil (hard)
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-800">
              <div className="font-semibold">Hata</div>
              <div className="mt-1">{error}</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Kayıtlar</div>
          <div className="text-xs text-slate-500">{loading ? "Yükleniyor…" : `Sayfa ${safePage} / ${totalPages}`}</div>
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
                <th className="px-5 py-3">Kategori</th>
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
                        <Tags size={18} className="text-slate-700" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{c.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{c.id}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm text-slate-700">{formatTR(c.updatedAt ?? c.createdAt)}</div>
                  </td>

                  <td className="px-5 py-4 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/admin/sss-kategoriler/${encodeURIComponent(c.id)}`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Detay"
                      >
                        <Eye size={18} className="text-slate-700" />
                      </Link>

                      <Link
                        href={`/admin/sss-kategoriler/${encodeURIComponent(c.id)}/edit`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Pencil size={18} className="text-slate-700" />
                      </Link>

                      <button
                        onClick={() => deleteOne(c.id)}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Sil (hard)"
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
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
