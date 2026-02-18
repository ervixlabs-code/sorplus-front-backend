"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { Plus, Trash2, Pencil, CheckCircle2, RefreshCcw, Undo2 } from "lucide-react"

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
    const msg = (data && (data.message || data.error)) || `GET ${path} failed`
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
    const msg = (data && (data.message || data.error)) || `PATCH ${path} failed`
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
    const msg = (data && (data.message || data.error)) || `DELETE ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ================== TYPES ================== */
type GuideItem = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  content: any
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
    "fixed z-[100] bottom-4 right-4 w-[380px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_16px_60px_rgba(15,23,42,0.22)] overflow-hidden"
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

export default function AdminGuideListPage() {
  const router = useRouter()
  const [items, setItems] = useState<GuideItem[]>([])
  const [loading, setLoading] = useState(true)

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const toastTimer = useRef<number | null>(null)

  const showToast = (next: ToastState, autoCloseMs = 3200) => {
    setToast({ ...next, open: true })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (autoCloseMs > 0) {
      toastTimer.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), autoCloseMs)
    }
  }

  async function refresh() {
    try {
      setLoading(true)
      const data = (await apiGet("/api/admin/guides")) as GuideItem[]
      setItems(Array.isArray(data) ? data : [])
      showToast({ kind: "success", title: "Güncellendi" })
    } catch (e: any) {
      showToast({ kind: "error", title: "Liste alınamadı", desc: e?.message || "Bir hata oluştu." })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
  }, [items])

  // ✅ 5sn undo delete (delete’i 5 sn sonra API’ye atıyoruz)
  const pendingDeleteRef = useRef<{ id: string; item: GuideItem; timer: number } | null>(null)

  async function activate(id: string) {
    try {
      await apiPatch(`/api/admin/guides/${encodeURIComponent(id)}/activate`)
      // optimistik: listede tek aktif kalsın
      setItems((prev) => prev.map((x) => ({ ...x, isActive: x.id === id })))
      showToast({ kind: "success", title: "Aktif içerik güncellendi", desc: "Web /rehber sayfası artık bu kaydı kullanacak." })
    } catch (e: any) {
      showToast({ kind: "error", title: "Aktifleştirilemedi", desc: e?.message || "Bir hata oluştu." })
    }
  }

  function deleteWithUndo(id: string) {
    const target = items.find((x) => x.id === id)
    if (!target) return

    // önce eski pending varsa finalize et
    if (pendingDeleteRef.current) {
      window.clearTimeout(pendingDeleteRef.current.timer)
      pendingDeleteRef.current = null
    }

    // UI’dan kaldır (henüz API delete yok)
    setItems((prev) => prev.filter((x) => x.id !== id))

    const timer = window.setTimeout(async () => {
      try {
        pendingDeleteRef.current = null
        await apiDelete(`/api/admin/guides/${encodeURIComponent(id)}`)
        showToast({ kind: "success", title: "Silindi", desc: "Kayıt kalıcı olarak silindi." })
      } catch (e: any) {
        // delete fail olursa: listede geri gösterelim
        setItems((prev) => [target, ...prev])
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
          <h1 className="text-2xl font-semibold tracking-tight">Rehber İçerikleri</h1>
          <p className="text-slate-500 mt-1">Rehber sayfasında yayınlanacak içeriği buradan yönet</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Yenile
          </button>

          <Link
            href="/admin/guide/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <Plus size={18} className="text-orange-300" />
            Yeni İçerik
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Kayıtlar</div>
          <div className="text-xs text-slate-500">
            {loading ? "Yükleniyor..." : `Toplam: ${sorted.length}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold text-slate-600">
                <th className="px-5 py-3">Başlık</th>
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
                      <div className="mt-1 text-xs text-slate-500">ID: {it.id}</div>
                    </td>

                    <td className="px-5 py-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 px-3 py-1 text-xs font-semibold">
                          <CheckCircle2 size={14} />
                          Aktif (Yayında)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10 px-3 py-1 text-xs font-semibold">
                          Pasif
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-700">{fmtTR(it.updatedAt || it.createdAt)}</div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!isActive ? (
                          <button
                            onClick={() => activate(it.id)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-emerald-700 transition"
                            title="Aktif Yap"
                          >
                            <CheckCircle2 size={16} />
                            Yayına Al
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 pr-2">Yayında</span>
                        )}

                        <button
                          onClick={() => router.push(`/admin/guide/${encodeURIComponent(it.id)}/edit`)}
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
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <div className="text-sm font-semibold text-slate-900">Henüz içerik yok</div>
                    <div className="mt-1 text-sm text-slate-500">“Yeni İçerik” ile rehber içeriğini ekleyebilirsin.</div>
                    <div className="mt-4">
                      <Link
                        href="/admin/guide/create"
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                      >
                        <Plus size={18} className="text-orange-300" />
                        Yeni İçerik
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
