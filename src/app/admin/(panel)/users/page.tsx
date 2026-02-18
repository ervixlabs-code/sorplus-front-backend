/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Shield,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react"
import { useToast } from "@/components/admin/Toast"

/** ================== CONFIG ================== */
const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() ||
  "http://localhost:3002"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api<T>(path: string, init?: RequestInit & { json?: any }): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(init?.headers as any),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let body = init?.body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((init as any)?.json !== undefined) {
    headers["Content-Type"] = "application/json"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      (data && typeof data === "object" && (data.message || data.error)) ||
      `HTTP ${res.status}`

    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(", ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ================== TYPES ================== */
type UserStatus = "ACTIVE" | "BLOCKED"

type UserRow = {
  id: string
  fullName: string
  email: string
  kvkkApproved: boolean
  status: UserStatus
  createdAt: string
  role?: string
  isActive?: boolean
}

type ApiUser = {
  id: string
  email?: string | null
  fullName?: string | null
  firstName?: string | null
  lastName?: string | null
  role?: string | null
  isActive?: boolean | null
  active?: boolean | null
  kvkkApproved?: boolean | null
  createdAt?: string | null
}

type ApiUsersResponse =
  | { items: ApiUser[]; total: number; take?: number; skip?: number }
  | { data: ApiUser[]; total: number; take?: number; skip?: number }
  | ApiUser[] // bazı backendler direkt array dönebilir

function formatTR(iso?: string | null) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function makeFullName(u: ApiUser) {
  const fn = `${u.firstName || ""} ${u.lastName || ""}`.trim()
  const name = (u.fullName || fn || "").trim()
  return name || "—"
}

function mapUser(u: ApiUser): UserRow {
  const active = (u.isActive ?? u.active ?? true) === true
  return {
    id: String(u.id),
    fullName: makeFullName(u),
    email: String(u.email || "—"),
    kvkkApproved: (u.kvkkApproved ?? false) === true,
    status: active ? "ACTIVE" : "BLOCKED",
    createdAt: formatTR(u.createdAt),
    role: u.role || undefined,
    isActive: active,
  }
}

/** ===================== UI helpers ===================== */
function badgeStatus(status: UserStatus) {
  return status === "ACTIVE"
    ? "bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15"
    : "bg-rose-600/10 text-rose-800 ring-1 ring-rose-600/15"
}
function labelStatus(status: UserStatus) {
  return status === "ACTIVE" ? "Aktif" : "Engelli"
}
function badgeKvkk(ok: boolean) {
  return ok
    ? "bg-blue-600/10 text-blue-800 ring-1 ring-blue-600/15"
    : "bg-slate-900/6 text-slate-600 ring-1 ring-slate-900/10"
}
function labelKvkk(ok: boolean) {
  return ok ? "Onaylı" : "Onaysız"
}

/* ===================== Page ===================== */
export default function AdminUsersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const { showToast } = useToast()

  // Query state
  const q = sp.get("q") ?? ""
  const role = sp.get("role") ?? "ALL"
  const isActive = sp.get("isActive") ?? "ALL" // ALL | YES | NO
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10))
  const pageSize = 10
  const skip = (page - 1) * pageSize
  const take = pageSize

  const [items, setItems] = useState<UserRow[]>([])
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

  // fetch list
  async function fetchList() {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("skip", String(skip))
      params.set("take", String(take))
      if (role !== "ALL") params.set("role", role)
      if (isActive !== "ALL") params.set("isActive", isActive === "YES" ? "true" : "false")

      const data = await api<ApiUsersResponse>(`/api/admin/users?${params.toString()}`, { method: "GET" })

      let rawItems: ApiUser[] = []
      let rawTotal = 0

      if (Array.isArray(data)) {
        rawItems = data
        rawTotal = data.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ("items" in data && Array.isArray((data as any).items)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawItems = (data as any).items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawTotal = Number((data as any).total ?? rawItems.length)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ("data" in data && Array.isArray((data as any).data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawItems = (data as any).data
        rawTotal = Number((data as any).total ?? rawItems.length)
      } else {
        rawItems = []
        rawTotal = 0
      }

      setItems(rawItems.map(mapUser))
      setTotal(rawTotal)
    } catch (e: any) {
      setItems([])
      setTotal(0)
      setError(e?.message || "Kullanıcılar alınamadı.")
      showToast("error", "Liste alınamadı", e?.message || "Bir hata oluştu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, isActive, skip, take])

  // selection
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected])
  const allOnPageSelected = items.length > 0 && items.every((i) => selected[i.id])

  useEffect(() => {
    setSelected({})
  }, [safePage, q, role, isActive])

  // Undo delete (UI-only)
  const undoTimer = useRef<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{
    snapshot: UserRow[]
    open: boolean
    count: number
  } | null>(null)

  function queueUndo(snapshot: UserRow[], count: number) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setPendingDelete({ snapshot, open: true, count })
    showToast("success", "Silme işlemi uygulandı", "Backend hard delete. Bu UNDO sadece UI içindir.", 5000)
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
      // Optimistic UI
      setItems((p) => p.filter((x) => x.id !== id))

      await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" })

      showToast("success", "Kullanıcı silindi")
      queueUndo(snap, 1)

      // total/ pagination refresh
      fetchList()
    } catch (e: any) {
      setItems(snap)
      showToast("error", "Silme başarısız", e?.message || "Bir hata oluştu.")
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return
    const snap = [...items]

    try {
      // Optimistic remove from current page
      setItems((p) => p.filter((x) => !selectedIds.includes(x.id)))

      // Hard delete sequential (basit & stabil)
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await api(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" })
      }

      setSelected({})
      showToast("success", "Kullanıcılar silindi", `${selectedIds.length} kayıt silindi.`)
      queueUndo(snap, selectedIds.length)

      fetchList()
    } catch (e: any) {
      setItems(snap)
      showToast("error", "Toplu silme başarısız", e?.message || "Bir hata oluştu.")
    }
  }

  async function toggleActive(u: UserRow) {
    const nextActive = !(u.isActive ?? (u.status === "ACTIVE"))
    const snap = [...items]

    try {
      // Optimistic
      setItems((p) =>
        p.map((x) =>
          x.id === u.id
            ? {
                ...x,
                isActive: nextActive,
                status: nextActive ? "ACTIVE" : "BLOCKED",
              }
            : x
        )
      )

      await api(`/api/admin/users/${encodeURIComponent(u.id)}/active`, {
        method: "PATCH",
        json: { isActive: nextActive },
      })

      showToast("success", nextActive ? "Kullanıcı aktif edildi" : "Kullanıcı pasif edildi")
      fetchList()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setItems(snap)
      showToast("error", "İşlem başarısız", e?.message || "Bir hata oluştu.")
    }
  }

  function cxBtn(active: boolean) {
    return clsx(
      "rounded-2xl px-3 py-2 text-sm font-semibold border shadow-sm transition",
      active
        ? "bg-slate-900 text-white border-slate-900"
        : "bg-white/80 border-slate-200/80 hover:bg-white"
    )
  }

  const tokenMissing = !getToken()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kullanıcılar</h1>
          <p className="text-slate-500 mt-1">Kullanıcı oluştur, düzenle, görüntüle ve yönet</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/admin/users/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-orange-400 transition"
          >
            <Plus size={18} />
            Kullanıcı Ekle
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

      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
          Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile kaydetmelisin.
        </div>
      ) : null}

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
                  placeholder="ID, ad soyad veya e-posta ara..."
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

            <button className={cxBtn(isActive === "ALL")} onClick={() => setQuery({ isActive: "ALL", page: 1 })}>
              Tümü
            </button>
            <button className={cxBtn(isActive === "YES")} onClick={() => setQuery({ isActive: "YES", page: 1 })}>
              Aktif
            </button>
            <button className={cxBtn(isActive === "NO")} onClick={() => setQuery({ isActive: "NO", page: 1 })}>
              Engelli
            </button>

            <div className="ml-auto flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-600 inline-flex items-center gap-2">
                <Shield size={16} />
                Role:
              </div>
              <select
                value={role}
                onChange={(e) => setQuery({ role: e.target.value, page: 1 })}
                className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
              >
                <option value="ALL">Tümü</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
                <option value="MODERATOR">MODERATOR</option>
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
                  Sil (hard)
                </button>
                {pendingDelete?.open ? (
                  <button
                    onClick={undoDeleteUIOnly}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                  >
                    UNDO (UI)
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

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
          <div className="text-xs text-slate-500">
            {loading ? "Yükleniyor…" : `Sayfa ${safePage} / ${totalPages}`}
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
                <th className="px-5 py-3">Kullanıcı</th>
                <th className="px-5 py-3">E-posta</th>
                <th className="px-5 py-3">KVKK</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3">Tarih</th>
                <th className="px-5 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70">
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-5 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={!!selected[u.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [u.id]: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                        {u.status === "BLOCKED" ? (
                          <Ban size={18} className="text-rose-600" />
                        ) : (
                          <CheckCircle2 size={18} className="text-emerald-600" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{u.fullName}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {u.id}
                          {u.role ? <span className="ml-2 rounded-full bg-slate-900/5 px-2 py-0.5">{u.role}</span> : null}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm font-semibold text-slate-800">{u.email}</div>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                        badgeKvkk(u.kvkkApproved)
                      )}
                    >
                      {labelKvkk(u.kvkkApproved)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                        badgeStatus(u.status)
                      )}
                    >
                      {u.status === "ACTIVE" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {labelStatus(u.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 align-top">
                    <div className="text-sm text-slate-700">{u.createdAt}</div>
                  </td>

                  <td className="px-5 py-4 align-top text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className="h-10 px-3 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition text-sm font-semibold"
                        title="Aktif/Pasif"
                      >
                        {u.status === "ACTIVE" ? "Pasif" : "Aktif"}
                      </button>

                      <Link
                        href={`/admin/users/${encodeURIComponent(u.id)}`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Detay"
                      >
                        <Eye size={18} className="text-slate-700" />
                      </Link>

                      <Link
                        href={`/admin/users/${encodeURIComponent(u.id)}/edit`}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Pencil size={18} className="text-slate-700" />
                      </Link>

                      <button
                        onClick={() => deleteOne(u.id)}
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
                  <td colSpan={7} className="px-5 py-10 text-center">
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
