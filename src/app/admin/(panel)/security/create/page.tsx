"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Shield,
  Info,
  BadgeCheck,
  AlertTriangle,
  Undo2,
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

async function apiPost(path: string, body?: any) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && ((data as any).message || (data as any).error)) || `POST ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ================== TYPES ================== */
type SecuritySectionLevel = "ZORUNLU" | "BILGI" | "NOT"

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

function compactArray(lines: string[]) {
  const out: string[] = []
  for (const s of lines) {
    const t = (s || "").trim()
    if (!t) continue
    out.push(t)
  }
  return out
}

function levelMeta(level: SecuritySectionLevel) {
  if (level === "ZORUNLU")
    return {
      label: "Zorunlu",
      pill: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20",
      icon: <AlertTriangle size={16} className="text-rose-600" />,
      hint: "Bu bölüm kritik — kullanıcıya mutlaka gösterilir.",
    }
  if (level === "NOT")
    return {
      label: "Not",
      pill: "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20",
      icon: <Info size={16} className="text-amber-700" />,
      hint: "Bilgilendirici not gibi düşün.",
    }
  return {
    label: "Bilgi",
    pill: "bg-slate-900/5 text-slate-700 ring-1 ring-slate-900/10",
    icon: <BadgeCheck size={16} className="text-slate-700" />,
    hint: "Standart bilgi içeriği.",
  }
}

export default function AdminSecurityCreatePage() {
  const router = useRouter()

  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [level, setLevel] = useState<SecuritySectionLevel>("BILGI")
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [isActive, setIsActive] = useState(true)

  // bullets editor
  const [bulletsText, setBulletsText] = useState("")

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const toastTimer = useRef<number | null>(null)

  const showToast = (next: ToastState, autoCloseMs = 3200) => {
    setToast({ ...next, open: true })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (autoCloseMs > 0) {
      toastTimer.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), autoCloseMs)
    }
  }

  const bulletsPreview = useMemo(() => {
    return compactArray((bulletsText || "").split("\n"))
  }, [bulletsText])

  const canSave = useMemo(() => {
    return category.trim().length > 0 && title.trim().length > 0 && desc.trim().length > 0 && !saving
  }, [category, title, desc, saving])

  async function onSave() {
    const payload = {
      category: category.trim(),
      title: title.trim(),
      desc: desc.trim(),
      bullets: bulletsPreview,
      level,
      sortOrder: Number.isFinite(sortOrder) ? Number(sortOrder) : 0,
      isActive: !!isActive,
    }

    if (!payload.category || !payload.title || !payload.desc) {
      showToast({
        kind: "error",
        title: "Eksik bilgi",
        desc: "Kategori, Başlık ve Açıklama alanları zorunlu.",
      })
      return
    }

    try {
      setSaving(true)
      const created = await apiPost("/api/admin/security", payload)
      showToast({ kind: "success", title: "Kaydedildi", desc: "Yeni güvenlik bölümü oluşturuldu." }, 2200)

      const id = (created as any)?.id
      if (id) {
        router.replace(`/admin/security/${encodeURIComponent(id)}/edit`)
      } else {
        router.replace("/admin/security")
      }
    } catch (e: any) {
      showToast({ kind: "error", title: "Kaydedilemedi", desc: e?.message || "Bir hata oluştu." }, 4800)
    } finally {
      setSaving(false)
    }
  }

  const meta = levelMeta(level)

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/security"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition"
            >
              <ArrowLeft size={18} className="text-slate-700" />
              Geri
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">Yeni Güvenlik Bölümü</h1>
          </div>

          <p className="text-slate-500 mt-2">
            Kategori + başlık + açıklama gir. İstersen maddeleri (bullets) satır satır ekleyebilirsin.
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={!canSave}
          className={clsx(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
            canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="text-orange-300" />}
          Kaydet
        </button>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Bölüm Bilgileri</div>

          <div className="flex items-center gap-2">
            <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", meta.pill)}>
              {meta.icon}
              {meta.label}
            </span>

            <span className="text-xs text-slate-500 hidden md:inline">{meta.hint}</span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-600">
              Kategori <span className="text-orange-600">*</span>
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder='Örn: "Genel", "Toplanan Veriler"'
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="mt-2 text-xs text-slate-500">Liste sayfasında filtre olarak kullanılacak.</div>
          </div>

          {/* Sort + Active */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Sıra (sortOrder)</label>
              <input
                type="number"
                value={Number.isFinite(sortOrder) ? sortOrder : 0}
                onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))}
                className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
              />
              <div className="mt-2 text-xs text-slate-500">Küçük olan üstte görünür.</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Durum</label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={clsx(
                  "mt-2 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border shadow-sm transition",
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-500/30 hover:bg-emerald-700"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                )}
              >
                <Shield size={18} />
                {isActive ? "Aktif" : "Pasif"}
              </button>
              <div className="mt-2 text-xs text-slate-500">Pasif kayıt public listte görünmez.</div>
            </div>
          </div>

          {/* Title */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">
              Başlık <span className="text-orange-600">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Veriler nasıl korunur?"
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Desc */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">
              Açıklama <span className="text-orange-600">*</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Bölüm açıklaması..."
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 resize-y"
            />
            <div className="mt-2 text-xs text-slate-500">
              Kullanıcıya görünen ana açıklama alanı.
            </div>
          </div>

          {/* Level */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Seviye (level)</label>

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["ZORUNLU", "BILGI", "NOT"] as SecuritySectionLevel[]).map((lv) => {
                const m = levelMeta(lv)
                const active = level === lv
                return (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    className={clsx(
                      "rounded-2xl border px-4 py-3 text-left shadow-sm transition",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", active ? "bg-white/10 text-white" : m.pill)}>
                        {m.icon}
                        {m.label}
                      </span>
                      <span className={clsx("text-xs", active ? "text-white/80" : "text-slate-500")}>{m.hint}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bullets */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Maddeler (bullets)</label>
              <button
                type="button"
                onClick={() => setBulletsText("")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-xs font-semibold shadow-sm hover:bg-white transition"
                title="Temizle"
              >
                <Trash2 size={14} className="text-slate-700" />
                Temizle
              </button>
            </div>

            <textarea
              value={bulletsText}
              onChange={(e) => setBulletsText(e.target.value)}
              placeholder={"Her satır bir madde olacak.\nÖrn:\n- Şifreler hashlenir\n- Erişim loglanır\n- Yetkisiz erişim engellenir"}
              rows={6}
              className="mt-2 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/10 resize-y"
            />

            {/* Preview */}
            <div className="mt-3 rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Plus size={14} className="text-slate-600" />
                Önizleme ({bulletsPreview.length})
              </div>

              {bulletsPreview.length === 0 ? (
                <div className="mt-2 text-sm text-slate-500">Henüz madde eklemedin.</div>
              ) : (
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {bulletsPreview.map((b, i) => (
                    <li key={`${b}-${i}`} className="text-sm text-slate-700">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Bu alan opsiyonel. Boş bırakırsan bullets: [] gider.
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-200/70 bg-white/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            <span className="inline-flex items-center gap-2">
              <Info size={14} className="text-slate-500" />
              Zorunlu alanlar: <span className="font-semibold">Kategori, Başlık, Açıklama</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/security"
              className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-50 transition"
            >
              <ArrowLeft size={18} className="text-slate-700" />
              Vazgeç
            </Link>

            <button
              onClick={onSave}
              disabled={!canSave}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
              )}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} className="text-orange-300" />}
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
