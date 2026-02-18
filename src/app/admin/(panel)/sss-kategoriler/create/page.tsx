"use client"

import React, { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { ArrowLeft, Save, Loader2, Tags } from "lucide-react"

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

/** ================== Toast ================== */
type ToastKind = "success" | "error" | "info"
type ToastState = { open: boolean; kind: ToastKind; title: string; desc?: string }

function Toast({ state, onClose }: { state: ToastState; onClose: () => void }) {
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
      </div>
    </div>
  )
}

/** ================== Page ================== */
export default function AdminFaqCategoryCreatePage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  const tokenMissing = !getToken()

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3200) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  const canSave = useMemo(() => name.trim().length >= 2 && !saving && !tokenMissing, [name, saving, tokenMissing])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return

    try {
      setSaving(true)

      // ✅ Backend hangi alanı bekliyorsa onu gönder: sadece "name"
      // (createdAt/updatedAt/id backend üretsin)
      await api(`/api/admin/faq-categories`, {
        method: "POST",
        json: { name: name.trim() },
      })

      showToast("success", "Kaydedildi", "Kategori oluşturuldu.")
      router.push("/admin/sss-kategoriler")
    } catch (err: any) {
      const msg = err?.message || "Kaydedilemedi."
      // Backend validation array döndüyse daha okunaklı verelim
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Bir hata oluştu", detail || msg)
    } finally {
      setSaving(false)
    }
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
      <Toast state={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />

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
              <h1 className="text-2xl font-semibold tracking-tight">Kategori Ekle</h1>
              <p className="text-slate-500 mt-1">SSS için yeni kategori oluştur</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
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
          <div>
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
            <div className="mt-2 text-xs text-slate-500">Minimum 2 karakter. Kısa ve anlaşılır.</div>
          </div>

          <div className="sm:hidden flex items-center gap-2 pt-2">
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

            <Link
              href="/admin/sss-kategoriler"
              className="flex-1 inline-flex items-center justify-center rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            >
              Vazgeç
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
