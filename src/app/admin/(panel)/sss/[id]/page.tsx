"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import { ArrowLeft, Pencil, Trash2, RefreshCcw, HelpCircle, Tag, CheckCircle2, CircleSlash } from "lucide-react"

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
  createdAt: string
  updatedAt?: string
}

/* ===================== UI helpers ===================== */
function badgeStatus(status: FaqStatus) {
  return status === "ACTIVE"
    ? "bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15"
    : "bg-slate-900/6 text-slate-600 ring-1 ring-slate-900/10"
}
function labelStatus(status: FaqStatus) {
  return status === "ACTIVE" ? "Aktif" : "Pasif"
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

export default function AdminFaqDetailPage() {
  const router = useRouter()
  const params = useParams()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = String((params as any)?.id ?? "")

  const tokenMissing = !getToken()

  const [cats, setCats] = useState<FaqCategory[]>([])
  const [item, setItem] = useState<FaqItem | null>(null)
  const [loading, setLoading] = useState(true)

  // Toast
  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string, ms = 3800) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), ms)
  }

  const catMap = useMemo(() => {
    const m = new Map<string, string>()
    cats.forEach((c) => m.set(c.id, c.name))
    return m
  }, [cats])

  async function refresh() {
    if (tokenMissing) return
    try {
      setLoading(true)
      const [cc, found] = await Promise.all([
        api<FaqCategory[]>(`/api/admin/faq-categories`, { method: "GET" }),
        api<FaqItem>(`/api/admin/faqs/${encodeURIComponent(id)}`, { method: "GET" }),
      ])
      setCats(cc)
      setItem(found)
    } catch (err: any) {
      const detail =
        err?.data?.message && Array.isArray(err.data.message) ? err.data.message.join(", ") : err?.data?.message
      showToast("error", "Kayıt yüklenemedi", detail || err?.message || "Bir hata oluştu.")
      router.push("/admin/sss")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // “Undo” API’de gerçek değil; UI’yı bozmamak için toast action sadece kapatır.
  const [pendingDelete, setPendingDelete] = useState<{ open: boolean } | null>(null)
  const undoTimer = useRef<number | null>(null)

  async function deleteThis() {
    try {
      // hızlı güvenlik: kullanıcı yanlışlıkla basmasın
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
      showToast("error", "Silinemedi", detail || err?.message || "Bir hata oluştu.")
    }
  }

  function undoDelete() {
    // gerçek undo yok; toast’ı kapatıyoruz
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

  if (loading || !item) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] p-6">
          <div className="text-sm font-semibold text-slate-900">Yükleniyor...</div>
          <div className="mt-1 text-sm text-slate-500">SSS detayı hazırlanıyor.</div>
        </div>
      </div>
    )
  }

  const categoryName = catMap.get(item.categoryId) ?? "—"

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
              <h1 className="text-2xl font-semibold tracking-tight">SSS Detay</h1>
              <p className="text-slate-500 mt-1">Soru-cevap içeriğini görüntüle</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            title="Yenile"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Yenile
          </button>

          <Link
            href={`/admin/sss/${encodeURIComponent(item.id)}/edit`}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
            title="Düzenle"
          >
            <Pencil size={18} />
            Düzenle
          </Link>

          <button
            onClick={deleteThis}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            title="Sil"
          >
            <Trash2 size={18} className="text-slate-700" />
            Sil
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Left: icon + meta */}
            <div className="lg:w-[340px] shrink-0">
              <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-5">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    <HelpCircle size={20} className="text-slate-700" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500">Kayıt ID</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 break-all">{item.id}</div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500 inline-flex items-center gap-2">
                      <Tag size={14} />
                      Kategori
                    </div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-600/10 text-blue-800 ring-1 ring-blue-600/15">
                      {categoryName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-500">Durum</div>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                        badgeStatus(item.status)
                      )}
                    >
                      {item.status === "ACTIVE" ? <CheckCircle2 size={14} /> : <CircleSlash size={14} />}
                      {labelStatus(item.status)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-xs font-semibold text-slate-500">Oluşturulma</div>
                      <div className="text-sm text-slate-700">{item.createdAt ?? "—"}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className="text-xs font-semibold text-slate-500">Güncellenme</div>
                      <div className="text-sm text-slate-700">{item.updatedAt ?? "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile actions */}
              <div className="sm:hidden mt-4 flex items-center gap-2">
                <Link
                  href={`/admin/sss/${encodeURIComponent(item.id)}/edit`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Pencil size={18} />
                  Düzenle
                </Link>

                <button
                  onClick={deleteThis}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
                  title="Sil"
                >
                  <Trash2 size={18} className="text-slate-700" />
                  Sil
                </button>
              </div>
            </div>

            {/* Right: content */}
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                <div className="text-xs font-semibold text-slate-500">Soru</div>
                <div className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{item.question}</div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                <div className="text-xs font-semibold text-slate-500">Cevap</div>
                <div className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {item.answer?.trim() ? item.answer : "—"}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900">İpucu</div>
                <div className="mt-1 text-sm text-slate-600">
                  Kullanıcı dili: kısa, net, aksiyon odaklı. Gerekiyorsa adım adım anlatım ekle.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200/70 bg-white/60">
          <div className="text-sm text-slate-600">
            Bu kayıt <span className="font-semibold text-slate-900">{labelStatus(item.status)}</span> durumda.
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Link
              href={`/admin/sss/${encodeURIComponent(item.id)}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            >
              <Pencil size={18} className="text-slate-700" />
              Düzenle
            </Link>

            <button
              onClick={deleteThis}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
              title="Sil"
            >
              <Trash2 size={18} className="text-slate-700" />
              Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
