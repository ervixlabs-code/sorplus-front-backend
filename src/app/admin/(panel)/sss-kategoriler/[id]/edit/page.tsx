"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { ArrowLeft, Save, Loader2, Tags, Trash2 } from "lucide-react"

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

/** ================== Types ================== */
type FaqCategory = { id: string; name: string; createdAt?: string; updatedAt?: string }

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
          <button onClick={onClose} className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs">
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

export default function AdminFaqCategoryEditPage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = String((params as any)?.id ?? "")

  const [loading, setLoading] = useState(true)
  const [initial, setInitial] = useState<FaqCategory | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const tokenMissing = !getToken()

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3400) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  // ✅ Backend'te "faq items by category" endpoint yoksa usage'ı şimdilik 0 gösteriyoruz
  // Eğer /api/admin/faqs gibi bir endpoint varsa söyle, gerçek usage'a bağlayalım.
  const usage = 0

  // Undo delete (UI koruyalım)
  const undoTimer = useRef<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ open: boolean } | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)

        // API'de GET /faq-categories/{id} yok => listeden bul
        const list = await api<FaqCategory[]>(`/api/admin/faq-categories`, { method: "GET" })
        const found = list.find((c) => String(c.id) === String(id))

        if (!found) {
          showToast("error", "Kayıt bulunamadı", "Listeye yönlendirildin.")
          router.push("/admin/sss-kategoriler")
          return
        }

        setInitial(found)
        setName(found.name ?? "")
      } catch (err: any) {
        const detail =
          err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
        showToast("error", "Bir hata oluştu", detail || err?.message || "Yüklenemedi.")
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dirty = useMemo(() => {
    if (!initial) return false
    return name.trim() !== (initial.name ?? "").trim()
  }, [initial, name])

  const canSave = useMemo(
    () => name.trim().length >= 2 && dirty && !saving && !tokenMissing,
    [name, dirty, saving, tokenMissing]
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || !initial) return

    try {
      setSaving(true)

      // ✅ Backend validation hatası almamak için sadece "name" gönderiyoruz
      await api(`/api/admin/faq-categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: { name: name.trim() },
      })

      showToast("success", "Güncellendi", "Kategori güncellendi.")
      router.push("/admin/sss-kategoriler")
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Bir hata oluştu", detail || err?.message || "Kaydedilemedi.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteThis() {
    if (usage > 0) {
      showToast("error", "Silinemez", `Bu kategori ${usage} adet SSS kaydı tarafından kullanılıyor.`)
      return
    }

    try {
      // UI: undo hissi (gerçekte API delete geri alınamaz — ama aynı UX'i koruyalım)
      if (undoTimer.current) window.clearTimeout(undoTimer.current)
      setPendingDelete({ open: true })
      showToast("info", "Silme hazırlanıyor", "5 saniye içinde UNDO dersen iptal olur.", 5000)

      undoTimer.current = window.setTimeout(async () => {
        try {
          await api(`/api/admin/faq-categories/${encodeURIComponent(id)}`, { method: "DELETE" })
          showToast("success", "Silindi", "Kategori silindi.")
          router.push("/admin/sss-kategoriler")
        } catch (err: any) {
          const detail =
            err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
          showToast("error", "Bir hata oluştu", detail || err?.message || "Silinemedi.")
        } finally {
          setPendingDelete(null)
        }
      }, 5000)
    } catch {
      showToast("error", "Bir hata oluştu", "Silinemedi.")
    }
  }

  function undoDelete() {
    if (undoTimer.current) window.clearTimeout(undoTimer.current)
    setPendingDelete(null)
    showToast("success", "İptal edildi", "Silme işlemi iptal edildi.")
  }

  if (tokenMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
        Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile
        kaydetmelisin.
      </div>
    )
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Yükleniyor…</div>
  }

  if (!initial) {
    return (
      <div className="space-y-3">
        <div className="text-xl font-semibold">Kategori bulunamadı</div>
        <button
          onClick={() => router.push("/admin/sss-kategoriler")}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
        >
          Listeye dön
        </button>
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
          <div className="flex items-center gap-3">
            <Link
              href="/admin/sss-kategoriler"
              className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
              title="Geri"
            >
              <ArrowLeft size={18} className="text-slate-700" />
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Kategori Düzenle</h1>
              <p className="text-slate-500 mt-1">Kategori adını güncelle</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={deleteThis}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition border",
              usage > 0
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white/80 border-slate-200/80 hover:bg-white"
            )}
            disabled={usage > 0}
            title={usage > 0 ? "Kullanımda olduğu için silinemez" : "Sil (Undo)"}
          >
            <Trash2 size={18} className={usage > 0 ? "text-slate-400" : "text-slate-700"} />
            Sil
          </button>

          <button
            type="submit"
            form="cat-form"
            disabled={!canSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              canSave ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Kaydet
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <form id="cat-form" onSubmit={onSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Kategori Adı</label>
              <div className="mt-2 relative">
                <Tags size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Ödeme & İade"
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">Minimum 2 karakter. Aynı isim tekrar edemez.</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Kullanım</label>
              <div className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">{usage} kayıt</div>
                <div className="mt-1 text-xs text-slate-600">{usage > 0 ? "Kullanımda → silinemez" : "Silinebilir"}</div>
              </div>
            </div>
          </div>

          <div className="sm:hidden flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={deleteThis}
              disabled={usage > 0}
              className={clsx(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition border",
                usage > 0
                  ? "bg-slate-100 text-slate-400 border-slate-200"
                  : "bg-white/80 border-slate-200/80 hover:bg-white"
              )}
            >
              <Trash2 size={18} className={usage > 0 ? "text-slate-400" : "text-slate-700"} />
              Sil
            </button>

            <button
              type="submit"
              disabled={!canSave}
              className={clsx(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                canSave ? "bg-orange-500 text-white hover:bg-orange-400" : "bg-slate-100 text-slate-400"
              )}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
