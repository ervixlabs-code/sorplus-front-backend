"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { ArrowLeft, Save, Loader2, Tag, HelpCircle, Trash2 } from "lucide-react"

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
type FaqItem = {
  id: string
  question: string
  answer: string
  categoryId: string
  status: FaqStatus
  createdAt: string
  updatedAt?: string
}

/* ===================== Toast ===================== */
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

export default function AdminFaqEditPage() {
  const params = useParams()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = String((params as any)?.id ?? "")

  const tokenMissing = !getToken()

  const [cats, setCats] = useState<FaqCategory[]>([])
  const [initial, setInitial] = useState<FaqItem | null>(null)

  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState<FaqStatus>("ACTIVE")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3200) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  // “Undo” API’de gerçek değil; toast action sadece bilgilendiriyor.
  const undoTimer = useRef<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<{ open: boolean } | null>(null)

  async function loadData() {
    if (tokenMissing) return
    try {
      setLoading(true)
      const [cc, found] = await Promise.all([
        api<FaqCategory[]>(`/api/admin/faq-categories`, { method: "GET" }),
        api<FaqItem>(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: "GET" }),
      ])

      setCats(cc)

      setInitial(found)
      setQuestion(found.question ?? "")
      setAnswer(found.answer ?? "")
      setCategoryId(found.categoryId ?? "")
      setStatus(found.status ?? "ACTIVE")
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Kayıt bulunamadı", detail || err?.message || "Listeye yönlendirildin.")
      router.push("/admin/sss")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const dirty = useMemo(() => {
    if (!initial) return false
    return (
      question.trim() !== (initial.question ?? "").trim() ||
      answer.trim() !== (initial.answer ?? "").trim() ||
      categoryId !== (initial.categoryId ?? "") ||
      status !== (initial.status ?? "ACTIVE")
    )
  }, [initial, question, answer, categoryId, status])

  const canSave = useMemo(() => {
    return question.trim().length >= 5 && answer.trim().length >= 10 && !!categoryId && dirty && !saving
  }, [question, answer, categoryId, dirty, saving])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave || !initial) return

    try {
      setSaving(true)

      // 1) Ana güncelleme (question/answer/categoryId)
      await api<FaqItem>(`/api/admin/faqs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: {
          question: question.trim(),
          answer: answer.trim(),
          categoryId,
        },
      })

      // 2) Status ayrı endpoint (sadece değiştiyse)
      if (status !== (initial.status ?? "ACTIVE")) {
        await api(`/api/admin/faqs/${encodeURIComponent(id)}/status`, {
          method: "PATCH",
          json: { status },
        })
      }

      showToast("success", "Güncellendi", "Değişiklikler kaydedildi.")
      router.push("/admin/sss")
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Bir hata oluştu", detail || err?.message || "Kaydedilemedi.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteThis() {
    try {
      const ok = window.confirm("Bu SSS kaydını silmek istediğine emin misin?")
      if (!ok) return

      await api(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: "DELETE" })

      setPendingDelete({ open: true })
      showToast("success", "SSS silindi", "Listeye yönlendiriliyorsun…", 2200)

      if (undoTimer.current) window.clearTimeout(undoTimer.current)
      undoTimer.current = window.setTimeout(() => {
        setPendingDelete(null)
        router.push("/admin/sss")
      }, 900)
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Bir hata oluştu", detail || err?.message || "Silinemedi.")
    }
  }

  function undoDelete() {
    setPendingDelete(null)
    showToast("info", "Undo desteklenmiyor", "API silme işlemi geri alınamaz.")
  }

  if (tokenMissing) {
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
        Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile
        kaydetmelisin.
      </div>
    )
  }

  if (loading || !initial) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6">
        <div className="text-sm font-semibold text-slate-900">Yükleniyor...</div>
        <div className="mt-1 text-sm text-slate-500">SSS düzenleme formu hazırlanıyor.</div>
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
              href="/admin/sss"
              className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
              title="Geri"
            >
              <ArrowLeft size={18} className="text-slate-700" />
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">SSS Düzenle</h1>
              <p className="text-slate-500 mt-1">Soru-cevap içeriğini güncelle</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={deleteThis}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            title="Sil"
          >
            <Trash2 size={18} className="text-slate-700" />
            Sil
          </button>

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
              <div className="mt-2 text-xs text-slate-500">Minimum 5 karakter.</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Kategori</label>
              <div className="mt-2 relative">
                <Tag size={18} className="absolute left-3 top-3 text-slate-400" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 pl-10 pr-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="">Kategori seç</option>
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
            <div className="mt-2 text-xs text-slate-500">Minimum 10 karakter.</div>
          </div>

          {/* Mobile actions */}
          <div className="sm:hidden flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={deleteThis}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
              title="Sil"
            >
              <Trash2 size={18} className="text-slate-700" />
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
