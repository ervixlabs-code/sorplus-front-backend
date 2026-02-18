"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { ArrowLeft, Save, Loader2, PlusCircle, Tag, HelpCircle } from "lucide-react"

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

type FaqCategory = { id: string; name: string }

export default function AdminFaqCreatePage() {
  const router = useRouter()

  const tokenMissing = !getToken()

  const [cats, setCats] = useState<FaqCategory[]>([])
  const [loadingCats, setLoadingCats] = useState(true)

  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [status, setStatus] = useState<FaqStatus>("ACTIVE")
  const [saving, setSaving] = useState(false)

  /** Toast */
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
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs font-semibold"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    )
  }

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3200) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  useEffect(() => {
    if (tokenMissing) return

    ;(async () => {
      try {
        setLoadingCats(true)
        const res = await api<FaqCategory[]>(`/api/admin/faq-categories`, { method: "GET" })
        const sorted = [...res].sort((a, b) => a.name.localeCompare(b.name, "tr"))
        setCats(sorted)
      } catch (err: any) {
        const detail =
          err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
        showToast("error", "Kategoriler yüklenemedi", detail || err?.message || "Bir hata oluştu.")
      } finally {
        setLoadingCats(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenMissing])

  const canSave = useMemo(() => {
    return (
      question.trim().length >= 5 &&
      answer.trim().length >= 10 &&
      !!categoryId &&
      !saving &&
      !loadingCats &&
      !tokenMissing
    )
  }, [question, answer, categoryId, saving, loadingCats, tokenMissing])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return

    try {
      setSaving(true)

      // ✅ Backend DTO genelde bunu bekler:
      // { question, answer, categoryId, status }
      // createdAt/updatedAt/id göndermiyoruz (backend üretir)
      await api(`/api/admin/faqs`, {
        method: "POST",
        json: {
          question: question.trim(),
          answer: answer.trim(),
          categoryId,
          status,
        },
      })

      showToast("success", "Kaydedildi", "SSS kaydı oluşturuldu.")
      router.push("/admin/sss")
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Kaydedilemedi", detail || err?.message || "Bir hata oluştu.")
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
              href="/admin/sss"
              className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
              title="Geri"
            >
              <ArrowLeft size={18} className="text-slate-700" />
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SSS Ekle</h1>
              <p className="text-slate-500 mt-1">Yeni soru-cevap içeriği oluştur</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="submit"
            form="faq-form"
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
        <form id="faq-form" onSubmit={onSubmit} className="p-5 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Soru</label>
              <div className="mt-2 relative">
                <HelpCircle size={18} className="absolute left-3 top-3 text-slate-400" />
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Örn: Şikayetim ne zaman yayınlanır?"
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">Minimum 5 karakter. Net ve kullanıcı diliyle yaz.</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Kategori</label>
              <div className="mt-2 relative">
                <Tag size={18} className="absolute left-3 top-3 text-slate-400" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={loadingCats}
                  className={clsx(
                    "w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200",
                    loadingCats ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  <option value="">{loadingCats ? "Yükleniyor..." : "Kategori seç"}</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label className="text-xs font-semibold text-slate-600">Durum</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FaqStatus)}
                  className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="PASSIVE">Pasif</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Cevap</label>
            <div className="mt-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={8}
                placeholder="Cevabı buraya yaz..."
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-200 shadow-sm"
              />
            </div>
            <div className="mt-2 text-xs text-slate-500">Minimum 10 karakter. Kısa paragraf, net anlatım.</div>
          </div>

          {/* Mobile actions */}
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
              href="/admin/sss"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            >
              <PlusCircle size={18} className="text-slate-700" />
              Vazgeç
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
