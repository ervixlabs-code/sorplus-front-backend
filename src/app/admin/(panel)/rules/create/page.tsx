"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Shield,
  BadgeCheck,
  AlertTriangle,
  UserX,
  EyeOff,
  Lock,
  FileText,
  MessageSquareWarning,
  HelpCircle,
  CheckCircle2,
  Info,
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

async function apiPost(path: string, body: any) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `POST ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ================== TYPES ================== */
type RuleCategory =
  | "Genel"
  | "Kişisel Veri & Gizlilik"
  | "Saygı & Dil"
  | "Kanıt & Paylaşım"
  | "Spam & Manipülasyon"
  | "Moderasyon Süreci"
  | "Hukuki"

type RuleLevel = "Zorunlu" | "Öneri" | "Bilgi"

type RuleIconKey =
  | "sparkles"
  | "shield"
  | "badgeCheck"
  | "alertTriangle"
  | "userX"
  | "eyeOff"
  | "lock"
  | "fileText"
  | "messageSquareWarning"
  | "helpCircle"
  | "checkCircle2"
  | "info"

const CATEGORIES: RuleCategory[] = [
  "Genel",
  "Kişisel Veri & Gizlilik",
  "Saygı & Dil",
  "Kanıt & Paylaşım",
  "Spam & Manipülasyon",
  "Moderasyon Süreci",
  "Hukuki",
]

const LEVELS: RuleLevel[] = ["Zorunlu", "Öneri", "Bilgi"]

const ICONS: Array<{ key: RuleIconKey; label: string; Icon: any }> = [
  { key: "sparkles", label: "Sparkles", Icon: Sparkles },
  { key: "shield", label: "Shield", Icon: Shield },
  { key: "badgeCheck", label: "BadgeCheck", Icon: BadgeCheck },
  { key: "alertTriangle", label: "AlertTriangle", Icon: AlertTriangle },
  { key: "userX", label: "UserX", Icon: UserX },
  { key: "eyeOff", label: "EyeOff", Icon: EyeOff },
  { key: "lock", label: "Lock", Icon: Lock },
  { key: "fileText", label: "FileText", Icon: FileText },
  { key: "messageSquareWarning", label: "MessageSquareWarning", Icon: MessageSquareWarning },
  { key: "helpCircle", label: "HelpCircle", Icon: HelpCircle },
  { key: "checkCircle2", label: "CheckCircle2", Icon: CheckCircle2 },
  { key: "info", label: "Info", Icon: Info },
]

type RuleItem = {
  id: string
  category: RuleCategory
  title: string
  desc: string
  level: RuleLevel
  iconKey: RuleIconKey
}

function uid(prefix = "r") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export default function AdminRulesCreatePage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState("Kurallar")
  const [slug, setSlug] = useState("kurallar")
  const [updatedLabel, setUpdatedLabel] = useState("")

  const [rules, setRules] = useState<RuleItem[]>([
    {
      id: "r1",
      category: "Genel",
      title: "Amaç: farkındalık + çözüm odağı",
      desc: "Burası firma hedefleme / linç platformu değil. Kategori bazlı deneyim paylaşımıyla sorunları görünür kılmayı amaçlarız.",
      level: "Bilgi",
      iconKey: "sparkles",
    },
  ])

  const canSave = useMemo(() => {
    if (!title.trim()) return false
    if (!rules.length) return false
    for (const r of rules) {
      if (!r.id.trim() || !r.title.trim() || !r.desc.trim()) return false
    }
    return true
  }, [title, rules])

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        id: uid("r"),
        category: "Genel",
        title: "",
        desc: "",
        level: "Bilgi",
        iconKey: "info",
      },
    ])
  }

  function removeRule(id: string) {
    setRules((prev) => prev.filter((x) => x.id !== id))
  }

  async function onSave() {
    if (!canSave || saving) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || null,
        content: {
          updatedLabel: updatedLabel.trim() || undefined,
          rules: rules.map((r) => ({
            id: r.id.trim(),
            category: r.category,
            title: r.title.trim(),
            desc: r.desc.trim(),
            level: r.level,
            iconKey: r.iconKey,
          })),
        },
      }

      const data = await apiPost("/api/admin/rules", payload)
      const newId = (data as any)?.item?.id
      router.push(newId ? `/admin/rules/${encodeURIComponent(newId)}/edit` : "/admin/rules")
    } catch (e: any) {
      alert(e?.message || "Kaydedilemedi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/rules"
              className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
              title="Geri"
            >
              <ArrowLeft size={18} className="text-slate-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Yeni Kurallar Seti</h1>
              <p className="text-slate-500 mt-1">Web /kurallar sayfası için içerik oluştur</p>
            </div>
          </div>
        </div>

        <button
          disabled={!canSave || saving}
          onClick={onSave}
          className={clsx(
            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
            canSave && !saving ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500"
          )}
        >
          <Save size={18} className={clsx(canSave && !saving ? "text-orange-300" : "text-slate-400")} />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
          <div className="text-sm font-semibold text-slate-900">Genel</div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold text-slate-600">Başlık</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                placeholder="Kurallar"
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-600">Slug (opsiyonel)</div>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                placeholder="kurallar"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] font-semibold text-slate-600">Son güncelleme etiketi (opsiyonel)</div>
              <input
                value={updatedLabel}
                onChange={(e) => setUpdatedLabel(e.target.value)}
                className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                placeholder="10 Şubat 2026"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-slate-200/70 bg-white/70 p-5">
          <div className="text-sm font-semibold text-slate-900">İpucu</div>
          <div className="mt-2 text-sm text-slate-600 leading-relaxed">
            Iconları backend’de <span className="font-semibold text-slate-900">iconKey</span> olarak tutuyoruz. Web sayfası
            mapping ile render edecek.
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Zorunlu: kaldırma/kısıtlama sebebi • Öneri: daha iyi paylaşım • Bilgi: süreç açıklaması
          </div>
        </div>
      </div>

      {/* Rules Editor */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_14px_50px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Kurallar</div>
            <div className="text-xs text-slate-500 mt-1">{rules.length} kural</div>
          </div>

          <button
            onClick={addRule}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <Plus size={18} className="text-orange-300" />
            Kural Ekle
          </button>
        </div>

        <div className="p-5 space-y-4">
          {rules.map((r, idx) => {
            const iconMeta = ICONS.find((x) => x.key === r.iconKey)
            const Icon = iconMeta?.Icon || Info

            return (
              <div key={r.id} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Icon size={18} className="text-slate-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Kural #{idx + 1}</div>
                      <div className="text-xs text-slate-500">id: {r.id}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeRule(r.id)}
                    className="h-10 w-10 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 transition flex items-center justify-center"
                    title="Sil"
                  >
                    <Trash2 size={18} className="text-slate-700" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Kategori</div>
                    <select
                      value={r.category}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, category: e.target.value as any } : x)))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-[11px] font-semibold text-slate-600">Level</div>
                    <select
                      value={r.level}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, level: e.target.value as any } : x)))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                    >
                      {LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <div className="text-[11px] font-semibold text-slate-600">Icon</div>
                    <select
                      value={r.iconKey}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, iconKey: e.target.value as any } : x)))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                    >
                      {ICONS.map((it) => (
                        <option key={it.key} value={it.key}>
                          {it.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <div className="text-[11px] font-semibold text-slate-600">Rule ID</div>
                    <input
                      value={r.id}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, id: e.target.value } : x)))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                      placeholder="r1"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Başlık</div>
                    <input
                      value={r.title}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, title: e.target.value } : x)))
                      }
                      className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                      placeholder="Hakaret, küfür yok"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <div className="text-[11px] font-semibold text-slate-600">Açıklama</div>
                    <textarea
                      value={r.desc}
                      onChange={(e) =>
                        setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, desc: e.target.value } : x)))
                      }
                      className="mt-2 min-h-[92px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
                      placeholder="Küfür/hakaret içeren içerikler kaldırılır..."
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">Kaydetme</div>
        <div className="mt-1">
          <span className="font-semibold text-slate-900">POST</span> /api/admin/rules
        </div>
      </div>
    </div>
  )
}
