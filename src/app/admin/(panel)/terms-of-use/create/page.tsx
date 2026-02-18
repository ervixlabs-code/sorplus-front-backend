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
  ChevronDown,
  GripVertical,
  ArrowUp,
  ArrowDown,
  FileText,
  Shield,
  AlertTriangle,
  UserX,
  MessageSquareWarning,
  EyeOff,
  Lock,
  BadgeCheck,
  HelpCircle,
  Info,
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

/* ================== TYPES ================== */
type SectionCategory =
  | "Genel"
  | "Hesap & Erişim"
  | "İçerik Kuralları"
  | "Sorumluluk"
  | "Moderasyon"
  | "Fikri Mülkiyet"
  | "Yasal"
  | "İletişim"

const CATEGORIES: SectionCategory[] = [
  "Genel",
  "Hesap & Erişim",
  "İçerik Kuralları",
  "Sorumluluk",
  "Moderasyon",
  "Fikri Mülkiyet",
  "Yasal",
  "İletişim",
]

type SectionLevel = "Zorunlu" | "Bilgi" | "Not"
type IconKey =
  | "file"
  | "sparkles"
  | "shield"
  | "alert"
  | "userx"
  | "warning"
  | "eyeoff"
  | "lock"
  | "badge"
  | "help"
  | "info"

type TermsSectionForm = {
  id: string
  category: SectionCategory
  title: string
  desc: string
  level: SectionLevel
  bullets: string[]
  iconKey: IconKey
}

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
    case "sparkles":
      return <Sparkles className={cls} />
    case "shield":
      return <Shield className={cls} />
    case "alert":
      return <AlertTriangle className={cls} />
    case "userx":
      return <UserX className={cls} />
    case "warning":
      return <MessageSquareWarning className={cls} />
    case "eyeoff":
      return <EyeOff className={cls} />
    case "lock":
      return <Lock className={cls} />
    case "badge":
      return <BadgeCheck className={cls} />
    case "help":
      return <HelpCircle className={cls} />
    case "info":
      return <Info className={cls} />
    default:
      return <FileText className={cls} />
  }
}

function levelBadge(level: SectionLevel) {
  if (level === "Zorunlu") return "border-orange-400/25 bg-orange-500/10 text-orange-700"
  if (level === "Not") return "border-indigo-400/25 bg-indigo-500/10 text-indigo-700"
  return "border-emerald-400/25 bg-emerald-500/10 text-emerald-700"
}

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

export default function AdminTermsCreatePage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("Kullanım Şartları")
  const [slug, setSlug] = useState("kullanim-sartlari")
  const [autoSlug, setAutoSlug] = useState(true)
  const [sections, setSections] = useState<TermsSectionForm[]>(() => [
    {
      id: uid(),
      category: "Genel",
      title: "Kapsam ve kabul",
      desc: "Bu Kullanım Şartları, hizmeti ziyaret ettiğinde veya kullandığında geçerli olur.",
      level: "Zorunlu",
      bullets: ["Şartları kabul etmiyorsan hizmeti kullanmamalısın.", "Şartlar güncellenebilir."],
      iconKey: "file",
    },
  ])

  useEffect(() => {
    if (!autoSlug) return
    setSlug(slugifyTR(title) || "kullanim-sartlari")
  }, [title, autoSlug])

  function parseBullets(text: string) {
    return (text || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
  }
  function bulletsToText(arr: string[]) {
    return (arr || []).join("\n")
  }

  function addSection() {
    setSections((prev) => [
      ...prev,
      {
        id: uid(),
        category: "Genel",
        title: "",
        desc: "",
        level: "Bilgi",
        bullets: [],
        iconKey: "file",
      },
    ])
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId))
  }

  function move(sectionId: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((x) => x.id === sectionId)
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

  function updateSection(sectionId: string, patch: Partial<TermsSectionForm>) {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)))
  }

  function validate() {
    if (!title.trim()) return "Başlık zorunlu."
    if (!slug.trim()) return "Slug zorunlu."
    if (sections.length === 0) return "En az 1 bölüm eklemelisin."
    const bad = sections.find((s) => !s.title.trim() || !s.desc.trim())
    if (bad) return "Bölümlerde başlık ve açıklama zorunlu."
    return null
  }

  async function onSave() {
    const err = validate()
    if (err) {
      alert(err)
      return
    }

    try {
      setSaving(true)

      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        content: {
          sections: sections.map((s) => ({
            __clientId: s.id,
            id: slugifyTR(s.title) || s.id,
            category: s.category,
            title: s.title.trim(),
            desc: s.desc.trim(),
            level: s.level,
            bullets: s.bullets,
            iconKey: s.iconKey,
          })),
        },
      }

      const created = await apiPost("/api/admin/terms-of-use", payload)
      const item = created?.item || created?.data || created?.terms || created

      const newId = item?.id
      if (newId) router.push(`/admin/terms-of-use/${encodeURIComponent(newId)}/edit`)
      else router.push("/admin/terms-of-use")
    } catch (e: any) {
      alert(e?.message || "Kaydedilemedi.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/terms-of-use"
            className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
            title="Geri"
          >
            <ArrowLeft size={18} className="text-slate-700" />
          </Link>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Kullanım Şartları Oluştur</h1>
            <p className="text-slate-500 mt-1">Web şartlar sayfasındaki kartları buradan oluştur.</p>
          </div>
        </div>

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

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_14px_50px_rgba(15,23,42,0.08)] p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <SmallLabel>Üst Başlık</SmallLabel>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
            />
          </div>

          <div className="md:col-span-2">
            <SmallLabel>Durum</SmallLabel>
            <div className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm shadow-sm flex items-center justify-between">
              <span className="font-semibold text-slate-900">Yeni</span>
              <span className="text-xs text-slate-500">Pasif</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Bölümler</div>
            <div className="mt-1 text-xs text-slate-500">Kartlar (sections). Toplam: {sections.length}</div>
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
                    onChange={(v) => updateSection(s.id, { level: v as any })}
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
                    onChange={(v) => updateSection(s.id, { iconKey: v as any })}
                    options={[
                      { value: "file", label: "FileText" },
                      { value: "sparkles", label: "Sparkles" },
                      { value: "shield", label: "Shield" },
                      { value: "alert", label: "AlertTriangle" },
                      { value: "userx", label: "UserX" },
                      { value: "warning", label: "MessageSquareWarning" },
                      { value: "eyeoff", label: "EyeOff" },
                      { value: "lock", label: "Lock" },
                      { value: "badge", label: "BadgeCheck" },
                      { value: "help", label: "HelpCircle" },
                      { value: "info", label: "Info" },
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
                    className="h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                </div>

                <div className="md:col-span-12">
                  <SmallLabel>Açıklama</SmallLabel>
                  <textarea
                    value={s.desc}
                    onChange={(e) => updateSection(s.id, { desc: e.target.value })}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                </div>

                <div className="md:col-span-12">
                  <SmallLabel>Maddeler (bullets) — her satır 1 madde</SmallLabel>
                  <textarea
                    value={bulletsToText(s.bullets)}
                    onChange={(e) => updateSection(s.id, { bullets: parseBullets(e.target.value) })}
                    placeholder={"• Örn: Kural 1\n• Örn: Kural 2"}
                    className="min-h-[110px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-200/60"
                  />
                  <div className="mt-2 text-xs text-slate-500">Bu alan web şartlar sayfasında ✓ liste olarak görünür.</div>
                </div>
              </div>
            </div>
          ))}

          {sections.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-sm font-semibold text-slate-900">Henüz bölüm yok</div>
              <div className="mt-1 text-sm text-slate-500">“Bölüm Ekle” ile kartları oluşturmaya başla.</div>
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

      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">Bağlanan API</div>
        <div className="mt-1">
          <span className="font-semibold text-slate-900">POST</span> /api/admin/terms-of-use
        </div>
      </div>
    </div>
  )
}
