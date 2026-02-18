"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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

async function apiGet(path: string) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  })
  const data = await safeJson(res)
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `GET ${path} failed`)
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
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `PATCH ${path} failed`)
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

type RulesDoc = {
  id: string
  title: string
  slug?: string | null
  isActive: boolean
  content: { rules?: RuleItem[]; updatedLabel?: string }
}

function uid(prefix = "r") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export default function AdminRulesEditPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState(false)

  const [doc, setDoc] = useState<RulesDoc | null>(null)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [updatedLabel, setUpdatedLabel] = useState("")
  const [rules, setRules] = useState<RuleItem[]>([])

  const canSave = useMemo(() => {
    if (!title.trim()) return false
    if (!rules.length) return false
    for (const r of rules) {
      if (!r.id?.trim() || !r.title?.trim() || !r.desc?.trim()) return false
    }
    return true
  }, [title, rules])

  const dirty = useMemo(() => {
    if (!doc) return false
    const original = {
      title: doc.title || "",
      slug: doc.slug || "",
      updatedLabel: doc.content?.updatedLabel || "",
      rules: doc.content?.rules || [],
    }
    const current = { title, slug, updatedLabel, rules }
    return JSON.stringify(original) !== JSON.stringify(current)
  }, [doc, title, slug, updatedLabel, rules])

  async function load() {
    if (!id) return
    try {
      setLoading(true)
      const data = await apiGet(`/api/admin/rules/${encodeURIComponent(id)}`)
      const item = (data as any)?.item || data
      const d: RulesDoc = item

      setDoc(d)
      setTitle(d.title || "")
      setSlug(d.slug || "")
      setUpdatedLabel(d.content?.updatedLabel || "")
      setRules(Array.isArray(d.content?.rules) ? (d.content.rules as any) : [])
    } catch (e: any) {
      alert(e?.message || "Yüklenemedi")
      router.push("/admin/rules")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

  function removeRule(ruleId: string) {
    setRules((prev) => prev.filter((x) => x.id !== ruleId))
  }

  async function onSave() {
    if (!id || !canSave || saving) return
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
      const data = await apiPatch(`/api/admin/rules/${encodeURIComponent(id)}`, payload)
      const updated = (data as any)?.item || data
      setDoc(updated)
      alert("Kaydedildi ✅")
    } catch (e: any) {
      alert(e?.message || "Kaydedilemedi")
    } finally {
      setSaving(false)
    }
  }

  async function onActivate() {
    if (!id || activating) return
    setActivating(true)
    try {
      const data = await apiPatch(`/api/admin/rules/${encodeURIComponent(id)}/activate`)
      const updated = (data as any)?.item || data
      setDoc(updated)
      alert("Aktif yapıldı ✅")
    } catch (e: any) {
      alert(e?.message || "Aktifleştirilemedi")
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-sm text-slate-600">
        Yükleniyor...
      </div>
    )
  }

  if (!doc) return null

  const active = !!doc.isActive

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
              <h1 className="text-2xl font-semibold tracking-tight">Kurallar Düzenle</h1>
              <p className="text-slate-500 mt-1">ID: {doc.id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!active ? (
            <button
              onClick={onActivate}
              disabled={activating}
              className={clsx(
                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
                activating ? "bg-emerald-200 text-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <Shield size={18} />
              {activating ? "Aktif ediliyor..." : "Aktif Yap"}
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={18} />
              Aktif
            </div>
          )}

          <button
            disabled={!dirty || !canSave || saving}
            onClick={onSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              dirty && canSave && !saving ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500"
            )}
          >
            <Save size={18} className={clsx(dirty && canSave && !saving ? "text-orange-300" : "text-slate-400")} />
            {saving ? "Kaydediliyor..." : dirty ? "Kaydet" : "Kaydedildi"}
          </button>
        </div>
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
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-600">Slug (opsiyonel)</div>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] font-semibold text-slate-600">Son güncelleme etiketi (opsiyonel)</div>
              <input
                value={updatedLabel}
                onChange={(e) => setUpdatedLabel(e.target.value)}
                className="mt-2 h-[46px] w-full rounded-2xl border border-slate-200/80 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-200/70"
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-slate-200/70 bg-white/70 p-5">
          <div className="text-sm font-semibold text-slate-900">Durum</div>
          <div className="mt-2 text-sm text-slate-600 leading-relaxed">
            Aktif olan kayıt web tarafında görünür.
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Son güncelleme: <span className="font-semibold text-slate-900">{new Date(doc.updatedAt).toLocaleString("tr-TR")}</span>
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
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
        <div className="font-semibold text-slate-900">Bağlanan API</div>
        <div className="mt-1">
          <span className="font-semibold text-slate-900">GET</span> /api/admin/rules/:id •{" "}
          <span className="font-semibold text-slate-900">PATCH</span> /api/admin/rules/:id •{" "}
          <span className="font-semibold text-slate-900">PATCH</span> /api/admin/rules/:id/activate
        </div>
      </div>
    </div>
  )
}
