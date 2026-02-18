// src/app/admin/kvkk/create/page.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCcw,
  ChevronDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Shield,
  FileText,
  Info,
  UserCheck,
  Database,
  Lock,
  Mail,
  BadgeCheck,
  Sparkles,
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
    const msg = (data && (data.message || data.error)) || `POST ${path} failed`
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

/* ================== TYPES (web KVKK ile aynı) ================== */
type SectionCategory =
  | "Aydınlatma"
  | "Veri Sorumlusu"
  | "İşleme Amaçları"
  | "Aktarım"
  | "Saklama"
  | "Hakların"
  | "Başvuru"
  | "İletişim"

const CATEGORIES: SectionCategory[] = [
  "Aydınlatma",
  "Veri Sorumlusu",
  "İşleme Amaçları",
  "Aktarım",
  "Saklama",
  "Hakların",
  "Başvuru",
  "İletişim",
]

type SectionLevel = "Zorunlu" | "Bilgi" | "Not"

type KvkkSectionForm = {
  id: string // client id
  category: SectionCategory
  title: string
  desc: string
  level: SectionLevel
  bullets: string[] // UI: satır satır
  iconKey: IconKey
}

type IconKey = "file" | "shield" | "database" | "lock" | "info" | "user" | "mail" | "badge" | "sparkles"

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16)
}

function slugifyTR(input: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function iconByKey(k: IconKey) {
  const cls = "h-4 w-4"
  switch (k) {
    case "file":
      return <FileText className={cls} />
    case "shield":
      return <Shield className={cls} />
    case "database":
      return <Database className={cls} />
    case "lock":
      return <Lock className={cls} />
    case "info":
      return <Info className={cls} />
    case "user":
      return <UserCheck className={cls} />
    case "mail":
      return <Mail className={cls} />
    case "badge":
      return <BadgeCheck className={cls} />
    case "sparkles":
      return <Sparkles className={cls} />
    default:
      return <FileText className={cls} />
  }
}

function levelBadge(level: SectionLevel) {
  if (level === "Zorunlu") return "border-orange-400/25 bg-orange-500/10 text-orange-700"
  if (level === "Not") return "border-indigo-400/25 bg-indigo-500/10 text-indigo-700"
  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-700"
}

/* ================== TOAST ================== */
type ToastKind = "success" | "error"
type ToastState = { open: boolean; kind: ToastKind; title: string; desc?: string }

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

/* ================== UI bits ================== */
function SmallLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-light text-slate-500">{children}</div>
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const current = options.find((o) => o.value === value)?.label || value

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex h-[46px] w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm hover:bg-white transition focus:outline-none focus:ring-4 focus:ring-slate-200/60"
      >
        <span className="truncate">{current}</span>
        <ChevronDown className={clsx("h-4 w-4 text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-[280px] overflow-auto p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={clsx(
                  "w-full rounded-xl px-3 py-2 text-left text-sm",
                  opt.value === value ? "bg-slate-900/5 text-slate-900" : "hover:bg-slate-900/5 text-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ================== PAGE ================== */
export default function AdminKvkkCreatePage() {
  const router = useRouter()

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const toastTimer = useRef<number | null>(null)
  const showToast = (next: ToastState, autoCloseMs = 3200) => {
    setToast({ ...next, open: true })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    if (autoCloseMs > 0) {
      toastTimer.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), autoCloseMs)
    }
  }

  const [saving, setSaving] = useState(false)

  // üst meta
  const [title, setTitle] = useState("KVKK Metni")
  const [slug, setSlug] = useState("kvkk")
  const [autoSlug, setAutoSlug] = useState(true)
  const [activateAfterCreate, setActivateAfterCreate] = useState(true)

  // sections (web KVKK gibi)
  const [sections, setSections] = useState<KvkkSectionForm[]>(() => [
    {
      id: uid(),
      category: "Aydınlatma",
      title: "KVKK Aydınlatma Metni (Özet)",
      desc:
        "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, kişisel verilerinin hangi şartlarda işlendiğine ilişkin bilgilendirme amaçlıdır.",
      level: "Bilgi",
      bullets: ["Amaç: şeffaflık", "Kapsam: hizmet kullanıcıları", "Başvuru: aşağıda"],
      iconKey: "file",
    },
    {
      id: uid(),
      category: "Veri Sorumlusu",
      title: "Veri sorumlusu",
      desc: "Şirket unvanı/adresi netleşince burayı doldur.",
      level: "Zorunlu",
      bullets: ["Unvan: ...", "Adres: ...", "E-posta: ..."],
      iconKey: "shield",
    },
  ])

  useEffect(() => {
    if (!autoSlug) return
    setSlug(slugifyTR(title) || "kvkk")
  }, [title, autoSlug])

  const previewCount = useMemo(() => sections.length, [sections])

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        id: uid(),
        category: "Aydınlatma",
        title: "",
        desc: "",
        level: "Bilgi",
        bullets: [],
        iconKey: "file",
      },
    ])
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  function move(id: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((x) => x.id === id)
      if (idx < 0) return prev
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const copy = [...prev]
      const tmp = copy[idx]
      copy[idx] = copy[nextIdx]
      copy[nextIdx] = tmp
      return copy
    })
  }

  function updateSection(id: string, patch: Partial<KvkkSectionForm>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function parseBullets(text: string) {
    return (text || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
  }

  function bulletsToText(arr: string[]) {
    return (arr || []).join("\n")
  }

  function validate() {
    const t = title.trim()
    if (!t) return "Başlık zorunlu."
    if (!slug.trim()) return "Slug zorunlu."
    if (sections.length === 0) return "En az 1 bölüm eklemelisin."
    const bad = sections.find((s) => !s.title.trim() || !s.desc.trim())
    if (bad) return "Bölümlerde başlık ve açıklama zorunlu."
    return null
  }

  async function onSave() {
    const err = validate()
    if (err) {
      showToast({ kind: "error", title: "Eksik bilgi", desc: err })
      return
    }

    try {
      setSaving(true)

      // API’ye göndereceğimiz "content" yapısı:
      // web sayfası: items = content.sections üzerinden render eder.
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        // backend alanın farklıysa uyarlarsın: isActive vs activate endpoint.
        content: {
          sections: sections.map((s) => ({
            id: slugifyTR(s.title) || s.id, // web tarafı anchor id gibi kullanabilir
            category: s.category,
            title: s.title.trim(),
            desc: s.desc.trim(),
            level: s.level,
            bullets: s.bullets,
            iconKey: s.iconKey, // web’de icon map’leriz
          })),
        },
      }

      const created = await apiPost("/api/admin/kvkk", payload)
      const createdId =
        created?.id || created?._id || created?.data?.id || created?.item?.id || created?.kvkk?.id

      if (activateAfterCreate && createdId) {
        try {
          await apiPatch(`/api/admin/kvkk/${encodeURIComponent(createdId)}/activate`)
        } catch {
          // activate başarısız olsa da kaydı oluşturduk, devam.
        }
      }

      showToast({ kind: "success", title: "Kaydedildi", desc: "KVKK içeriği oluşturuldu." })
      router.push("/admin/kvkk")
    } catch (e: any) {
      showToast({ kind: "error", title: "Kaydedilemedi", desc: e?.message || "Bir hata oluştu." })
    } finally {
      setSaving(false)
    }
  }

  function resetDemo() {
    setTitle("KVKK Metni")
    setAutoSlug(true)
    setSlug("kvkk")
    setActivateAfterCreate(true)
    setSections([
      {
        id: uid(),
        category: "Aydınlatma",
        title: "KVKK Aydınlatma Metni (Özet)",
        desc:
          "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, kişisel verilerinin hangi şartlarda işlendiğine ilişkin bilgilendirme amaçlıdır.",
        level: "Bilgi",
        bullets: ["Amaç: şeffaflık", "Kapsam: hizmet kullanıcıları", "Başvuru: aşağıda"],
        iconKey: "file",
      },
      {
        id: uid(),
        category: "Veri Sorumlusu",
        title: "Veri sorumlusu",
        desc: "Şirket unvanı/adresi netleşince burayı doldur.",
        level: "Zorunlu",
        bullets: ["Unvan: ...", "Adres: ...", "E-posta: ..."],
        iconKey: "shield",
      },
    ])
    showToast({ kind: "success", title: "Sıfırlandı" })
  }

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/kvkk"
            className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
            title="Geri"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Yeni KVKK</h1>
            <p className="text-slate-500 mt-1">Web KVKK sayfasındaki alanları buradan dolduracaksın.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDemo}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Sıfırla
          </button>

          <button
            disabled={saving}
            onClick={onSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              saving ? "bg-slate-400 text-white cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Save size={18} className="text-orange-300" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Meta card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <SmallLabel>Üst Başlık</SmallLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: KVKK Aydınlatma Metni"
              className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
            />
          </div>

          <div className="md:col-span-4">
            <div className="flex items-end justify-between gap-3">
              <SmallLabel>Slug</SmallLabel>
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={autoSlug}
                  onChange={(e) => setAutoSlug(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Otomatik
              </label>
            </div>

            <input
              value={slug}
              onChange={(e) => {
                setAutoSlug(false)
                setSlug(e.target.value)
              }}
              placeholder="kvkk"
              className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
            />
            <div className="mt-1 text-[12px] text-slate-500">Web’de URL veya internal id gibi kullanırsın.</div>
          </div>

          <div className="md:col-span-2">
            <SmallLabel>Yayın</SmallLabel>
            <label className="flex h-[46px] w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm">
              <span className="text-sm font-semibold">Aktif</span>
              <input
                type="checkbox"
                checked={activateAfterCreate}
                onChange={(e) => setActivateAfterCreate(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
            </label>
            <div className="mt-1 text-[12px] text-slate-500">Kaydedince aktif olsun mu?</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Bölümler</div>
            <div className="mt-1 text-xs text-slate-500">Web KVKK sayfasında görünen kartlar (sections). Toplam: {previewCount}</div>
          </div>

          <button
            onClick={addSection}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <Plus size={18} className="text-orange-300" />
            Bölüm Ekle
          </button>
        </div>

        <div className="divide-y divide-slate-200/70">
          {sections.map((s, index) => (
            <div key={s.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    <GripVertical className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Bölüm #{index + 1}{" "}
                      <span
                        className={clsx(
                          "ml-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                          levelBadge(s.level)
                        )}
                      >
                        {s.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Kategori + başlık + açıklama + maddeler</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => move(s.id, -1)}
                    disabled={index === 0}
                    className={clsx(
                      "h-10 w-10 rounded-2xl border shadow-sm transition flex items-center justify-center",
                      index === 0
                        ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                        : "bg-white/80 border-slate-200/80 hover:bg-white text-slate-700"
                    )}
                    title="Yukarı"
                  >
                    <ArrowUp size={18} />
                  </button>

                  <button
                    onClick={() => move(s.id, 1)}
                    disabled={index === sections.length - 1}
                    className={clsx(
                      "h-10 w-10 rounded-2xl border shadow-sm transition flex items-center justify-center",
                      index === sections.length - 1
                        ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                        : "bg-white/80 border-slate-200/80 hover:bg-white text-slate-700"
                    )}
                    title="Aşağı"
                  >
                    <ArrowDown size={18} />
                  </button>

                  <button
                    onClick={() => removeSection(s.id)}
                    className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
                    title="Sil"
                  >
                    <Trash2 size={18} className="text-slate-700" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-3">
                  <SmallLabel>Kategori</SmallLabel>
                  <Select
                    value={s.category}
                    onChange={(v) => updateSection(s.id, { category: v as SectionCategory })}
                    options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  />
                </div>

                <div className="md:col-span-3">
                  <SmallLabel>Seviye</SmallLabel>
                  <Select
                    value={s.level}
                    onChange={(v) => updateSection(s.id, { level: v as SectionLevel })}
                    options={[
                      { value: "Zorunlu", label: "Zorunlu" },
                      { value: "Bilgi", label: "Bilgi" },
                      { value: "Not", label: "Not" },
                    ]}
                  />
                </div>

                <div className="md:col-span-3">
                  <SmallLabel>İkon</SmallLabel>
                  <Select
                    value={s.iconKey}
                    onChange={(v) => updateSection(s.id, { iconKey: v as IconKey })}
                    options={[
                      { value: "file", label: "FileText" },
                      { value: "shield", label: "Shield" },
                      { value: "database", label: "Database" },
                      { value: "lock", label: "Lock" },
                      { value: "info", label: "Info" },
                      { value: "user", label: "UserCheck" },
                      { value: "mail", label: "Mail" },
                      { value: "badge", label: "BadgeCheck" },
                      { value: "sparkles", label: "Sparkles" },
                    ]}
                  />
                  <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900/5 ring-1 ring-slate-900/10 px-3 py-2 text-xs text-slate-700">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-900/10">
                      {iconByKey(s.iconKey)}
                    </span>
                    Web kartında bu ikon görünecek.
                  </div>
                </div>

                <div className="md:col-span-12">
                  <SmallLabel>Başlık</SmallLabel>
                  <input
                    value={s.title}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    placeholder="Örn: Başvuru yöntemi"
                    className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                </div>

                <div className="md:col-span-12">
                  <SmallLabel>Açıklama</SmallLabel>
                  <textarea
                    value={s.desc}
                    onChange={(e) => updateSection(s.id, { desc: e.target.value })}
                    placeholder="Kısa açıklama / metin..."
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                </div>

                <div className="md:col-span-12">
                  <SmallLabel>Maddeler (bullets) — her satır 1 madde</SmallLabel>
                  <textarea
                    value={bulletsToText(s.bullets)}
                    onChange={(e) => updateSection(s.id, { bullets: parseBullets(e.target.value) })}
                    placeholder={"• Örn: Unvan: ...\n• Örn: Adres: ...\n• Örn: E-posta: ..."}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    İpucu: Bu alan web KVKK sayfasında check’li liste şeklinde gösterilir.
                  </div>
                </div>
              </div>
            </div>
          ))}

          {sections.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm font-semibold text-slate-900">Henüz bölüm yok</div>
              <div className="mt-1 text-sm text-slate-500">“Bölüm Ekle” ile KVKK kartlarını oluşturmaya başla.</div>
              <div className="mt-4">
                <button
                  onClick={addSection}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus size={18} className="text-orange-300" />
                  Bölüm Ekle
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* API Note */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">Bağlanan API</div>
        <div className="mt-1">
          <span className="font-semibold text-slate-900">POST</span> /api/admin/kvkk{" "}
          <span className="text-slate-500">•</span>{" "}
          <span className="font-semibold text-slate-900">PATCH</span> /api/admin/kvkk/:id/activate (opsiyonel)
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Payload: <span className="font-semibold text-slate-700">content.sections[]</span> içine web KVKK’daki kart verileri gider.
        </div>
      </div>
    </div>
  )
}
