"use client"

import React, { useMemo, useRef, useState } from "react"
import clsx from "clsx"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Save,
  RefreshCcw,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Shield,
  BadgeCheck,
  Users,
  TrendingUp,
  Heart,
  MessageSquare,
  Eye,
  Mail,
  ChevronRight,
  BookOpen,
  Scale,
  Lock,
} from "lucide-react"

/* ====================== API ====================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_API_BASE?.trim?.() ||
  (process.env as any)?.EXPO_PUBLIC_API_BASE?.trim?.() ||
  "http://localhost:3002"

function normalizeApiBase(raw?: string) {
  const base = (raw || "").trim() || "http://localhost:3002"
  return base.replace(/\/+$/, "")
}

function getToken(): string {
  if (typeof window === "undefined") return ""
  const keys = ["sv_admin_token", "ADMIN_TOKEN", "token"]

  for (const k of keys) {
    const raw = localStorage.getItem(k)
    if (!raw) continue

    // raw string token
    if (raw.startsWith("eyJ") && raw.length > 20) return raw

    // json parse
    try {
      const obj = JSON.parse(raw)
      const t = obj?.token || obj?.accessToken || obj?.data?.token || obj
      if (typeof t === "string" && t.length > 20) return t
    } catch {
      // ignore
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
  const base = normalizeApiBase(API_BASE)

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
    const msg =
      (data && (data.message || data.error || data?.errors?.[0])) ||
      `POST ${path} failed (${res.status})`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ====================== TYPES ====================== */
type IconKey =
  | "sparkles"
  | "shield"
  | "badge"
  | "users"
  | "trending"
  | "heart"
  | "message"
  | "eye"
  | "mail"
  | "book"
  | "scale"
  | "lock"

type AboutCard = { icon: IconKey; title: string; desc: string }

type AboutContent = {
  // Top band
  topBandTitle: string
  topBandSubtitle: string

  // Brand
  brandTitle: string
  brandSubtitle: string

  // Hero
  heroBadgeDot: boolean
  heroBadgeText: string
  heroTitleLine1: string
  heroTitleLine2: string
  heroDesc: string
  heroCtaPrimaryLabel: string // "Şikayetlere Git"
  heroCtaSecondaryLabel: string // "Şikayet Yaz"
  heroCtaTertiaryLabel: string // "Kuralları Oku"
  heroMiniPills: { icon: IconKey; text: string }[]

  // Right cards
  rightCards: AboutCard[]

  // Values section
  valuesKicker: string // "Değerlerimiz"
  valuesTitle: string
  valuesDesc: string
  valuesLinkLabel: string // "Kurallara git"
  valuesCards: AboutCard[]

  // Contact CTA
  contactTitle: string
  contactDesc: string
  contactPrimaryLabel: string // "İletişim Sayfası"
  contactSecondaryLabel: string // "Şikayet Yaz"

  // Bottom note
  bottomNote: string
}

type ToastKind = "success" | "error"
type ToastState = { open: boolean; kind: ToastKind; title: string; desc?: string }

/* ====================== DEFAULT ====================== */
function defaultContent(): AboutContent {
  return {
    topBandTitle: "Hakkımızda",
    topBandSubtitle: "Deneyim platformu",

    brandTitle: "Deneyim",
    brandSubtitle: "Hakkımızda",

    heroBadgeDot: true,
    heroBadgeText: "Misyonumuz",
    heroTitleLine1: "Deneyimleri görünür kıl,",
    heroTitleLine2: "insanlar yalnız kalmasın",
    heroDesc:
      "Deneyim; kategori bazlı şikayet/deneyim paylaşımlarını daha şeffaf, daha güvenli ve daha çözüm odaklı bir çerçevede bir araya getirmeyi hedefler. Firma hedefleme yok — amaç linç değil, farkındalık ve ortak akıl.",
    heroCtaPrimaryLabel: "Şikayetlere Git",
    heroCtaSecondaryLabel: "Şikayet Yaz",
    heroCtaTertiaryLabel: "Kuralları Oku",
    heroMiniPills: [
      { icon: "eye", text: "Şeffaf metrikler (MVP sonrası)" },
      { icon: "lock", text: "Kişisel veri koruması" },
      { icon: "scale", text: "Adil moderasyon" },
    ],

    rightCards: [
      {
        icon: "shield",
        title: "Güvenli alan",
        desc: "Küfür/hakaret filtreleri, moderasyon kuyruğu ve raporlama mekanizmasıyla içerikler daha temiz kalır.",
      },
      {
        icon: "badge",
        title: "Kategori bazlı yapı",
        desc: "Firma sayfaları yok. İçerik; konu/kategori üzerinden keşfedilir, böylece hedef gösterme azalır.",
      },
      {
        icon: "heart",
        title: "Topluluk gücü",
        desc: "Benzer deneyimler görünür oldukça kullanıcılar yalnız hissetmez; çözüm önerileri öne çıkar.",
      },
    ],

    valuesKicker: "Değerlerimiz",
    valuesTitle: "İlkelerimiz net",
    valuesDesc: "Platformu büyütürken en önce güveni ve kullanıcı faydasını koruyoruz.",
    valuesLinkLabel: "Kurallara git",
    valuesCards: [
      { icon: "lock", title: "Gizlilik", desc: "Kişisel veriler paylaşılmaz. İhlal içeren içerikler kaldırılabilir." },
      { icon: "scale", title: "Adalet", desc: "İçerik değerlendirmesi, kurallara uygunluk üzerinden yapılır." },
      { icon: "message", title: "Çözüm odak", desc: "Hedef: kavga değil, süreç/sonuç paylaşımı ve faydalı öneri." },
      { icon: "trending", title: "Şeffaflık", desc: "İleride şeffaflık raporları ve moderasyon metrikleri yayınlanır (MVP sonrası)." },
    ],

    contactTitle: "İletişim",
    contactDesc: "Öneri, geri bildirim veya iş birliği için bize yaz.",
    contactPrimaryLabel: "İletişim Sayfası",
    contactSecondaryLabel: "Şikayet Yaz",

    bottomNote: "Not: Bu sayfa MVP tasarımıdır. İçerik ve metrikler API bağlanınca dinamikleşir.",
  }
}

/* ====================== TOAST ====================== */
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
          <button onClick={onClose} className="shrink-0 rounded-xl bg-white/10 hover:bg-white/15 px-2 py-1 text-xs font-semibold">
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}

/* ====================== PAGE ====================== */
export default function AdminAboutUsCreatePage() {
  const router = useRouter()

  const [title, setTitle] = useState("Hakkımızda (MVP)")
  const [content, setContent] = useState<AboutContent>(() => defaultContent())
  const [saving, setSaving] = useState(false)

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const tRef = useRef<number | null>(null)
  const showToast = (kind: ToastKind, title: string, desc?: string) => {
    setToast({ open: true, kind, title, desc })
    if (tRef.current) window.clearTimeout(tRef.current)
    tRef.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), 3200)
  }

  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (!content.heroTitleLine1.trim()) return false
    if (!content.heroDesc.trim()) return false
    if (content.rightCards.length === 0) return false
    if (content.valuesCards.length === 0) return false
    return true
  }, [content, title])

  async function onSaveMock() {
    // ✅ ARTIK MOCK DEĞİL — API SAVE
    if (!isValid) {
      showToast("error", "Eksik alan var", "Başlık / hero / kartlar boş olamaz.")
      return
    }

    try {
      setSaving(true)

      const payload = {
        title: title.trim(),
        content, // JSON
      }

      const created = await apiPost("/api/admin/about-us", payload)

      showToast("success", "Kaydedildi", "Hakkımızda içeriği oluşturuldu.")

      const newId = created?.id
      if (newId) {
        router.push(`/admin/about-us/${encodeURIComponent(newId)}/edit`)
        return
      }

      router.push("/admin/about-us")
    } catch (e: any) {
      showToast("error", "Kaydedilemedi", e?.message || "Bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  function onResetDefaults() {
    setContent(defaultContent())
    showToast("success", "Default içerik yüklendi")
  }

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hakkımızda • Yeni İçerik</h1>
          <p className="text-slate-500 mt-1">Webdeki /hakkimizda sayfasının içeriklerini buradan dolduracağız</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <ArrowLeft size={18} className="text-slate-700" />
            Geri
          </button>

          <button
            onClick={onResetDefaults}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition disabled:opacity-60"
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Defaulta Dön
          </button>

          <button
            onClick={onSaveMock}
            disabled={saving}
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

      {/* Title */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
        <div className="text-xs font-semibold text-slate-600 mb-2">Kayıt Başlığı</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Örn: Hakkımızda (Şubat 2026)"
        />
      </div>

      {/* Layout: editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* EDITOR */}
        <div className="lg:col-span-6 space-y-6">
          <Section title="Üst Bant">
            <TwoCol>
              <Field label="Başlık" value={content.topBandTitle} onChange={(v) => setContent((p) => ({ ...p, topBandTitle: v }))} />
              <Field
                label="Alt yazı"
                value={content.topBandSubtitle}
                onChange={(v) => setContent((p) => ({ ...p, topBandSubtitle: v }))}
              />
            </TwoCol>
          </Section>

          <Section title="Navbar Marka">
            <TwoCol>
              <Field label="Marka başlık" value={content.brandTitle} onChange={(v) => setContent((p) => ({ ...p, brandTitle: v }))} />
              <Field
                label="Marka alt"
                value={content.brandSubtitle}
                onChange={(v) => setContent((p) => ({ ...p, brandSubtitle: v }))}
              />
            </TwoCol>
          </Section>

          <Section title="Hero">
            <TwoCol>
              <Field
                label="Badge metni"
                value={content.heroBadgeText}
                onChange={(v) => setContent((p) => ({ ...p, heroBadgeText: v }))}
              />
              <Toggle
                label="Badge nokta (yeşil)"
                value={content.heroBadgeDot}
                onChange={(v) => setContent((p) => ({ ...p, heroBadgeDot: v }))}
              />
            </TwoCol>

            <Field label="Başlık satır 1" value={content.heroTitleLine1} onChange={(v) => setContent((p) => ({ ...p, heroTitleLine1: v }))} />
            <Field label="Başlık satır 2" value={content.heroTitleLine2} onChange={(v) => setContent((p) => ({ ...p, heroTitleLine2: v }))} />
            <TextArea label="Açıklama" value={content.heroDesc} onChange={(v) => setContent((p) => ({ ...p, heroDesc: v }))} />

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600 mb-2">Hero CTA buton metinleri</div>
              <TwoCol>
                <Field
                  label="Primary"
                  value={content.heroCtaPrimaryLabel}
                  onChange={(v) => setContent((p) => ({ ...p, heroCtaPrimaryLabel: v }))}
                />
                <Field
                  label="Secondary"
                  value={content.heroCtaSecondaryLabel}
                  onChange={(v) => setContent((p) => ({ ...p, heroCtaSecondaryLabel: v }))}
                />
              </TwoCol>
              <div className="mt-3">
                <Field
                  label="White (Kurallar)"
                  value={content.heroCtaTertiaryLabel}
                  onChange={(v) => setContent((p) => ({ ...p, heroCtaTertiaryLabel: v }))}
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600 mb-2">Hero mini pill’ler</div>
              <div className="space-y-2">
                {content.heroMiniPills.map((x, idx) => (
                  <div key={idx} className="flex gap-2">
                    <SelectIcon
                      value={x.icon}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          heroMiniPills: p.heroMiniPills.map((m, i) => (i === idx ? { ...m, icon: v } : m)),
                        }))
                      }
                    />
                    <input
                      value={x.text}
                      onChange={(e) => {
                        const v = e.target.value
                        setContent((p) => ({
                          ...p,
                          heroMiniPills: p.heroMiniPills.map((m, i) => (i === idx ? { ...m, text: v } : m)),
                        }))
                      }}
                      className="flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Pill metni"
                    />
                    <IconBtn
                      title="Sil"
                      onClick={() => setContent((p) => ({ ...p, heroMiniPills: p.heroMiniPills.filter((_, i) => i !== idx) }))}
                    >
                      <Trash2 size={18} className="text-slate-700" />
                    </IconBtn>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setContent((p) => ({ ...p, heroMiniPills: [...p.heroMiniPills, { icon: "eye", text: "" }] }))}
                disabled={saving}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
              >
                <Plus size={18} className="text-orange-300" />
                Pill Ekle
              </button>
            </div>
          </Section>

          <Section title="Sağ Kartlar">
            <div className="space-y-3">
              {content.rightCards.map((c, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                  <TwoCol>
                    <SelectIcon
                      value={c.icon}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, icon: v } : x)),
                        }))
                      }
                    />
                    <div className="hidden md:block" />
                  </TwoCol>

                  <div className="mt-3 space-y-2">
                    <Field
                      label="Başlık"
                      value={c.title}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                        }))
                      }
                    />
                    <TextArea
                      label="Açıklama"
                      value={c.desc}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, desc: v } : x)),
                        }))
                      }
                    />
                    <div className="flex justify-end">
                      <IconBtn
                        title="Sil"
                        onClick={() => setContent((p) => ({ ...p, rightCards: p.rightCards.filter((_, i) => i !== idx) }))}
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </IconBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setContent((p) => ({
                  ...p,
                  rightCards: [...p.rightCards, { icon: "shield", title: "", desc: "" }],
                }))
              }
              disabled={saving}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
            >
              <Plus size={18} className="text-orange-300" />
              Kart Ekle
            </button>
          </Section>

          <Section title="Değerler Bölümü">
            <TwoCol>
              <Field
                label="Kicker"
                value={content.valuesKicker}
                onChange={(v) => setContent((p) => ({ ...p, valuesKicker: v }))}
              />
              <Field
                label="Link metni"
                value={content.valuesLinkLabel}
                onChange={(v) => setContent((p) => ({ ...p, valuesLinkLabel: v }))}
              />
            </TwoCol>

            <Field
              label="Başlık"
              value={content.valuesTitle}
              onChange={(v) => setContent((p) => ({ ...p, valuesTitle: v }))}
            />
            <TextArea
              label="Alt açıklama"
              value={content.valuesDesc}
              onChange={(v) => setContent((p) => ({ ...p, valuesDesc: v }))}
            />

            <div className="mt-4 space-y-3">
              {content.valuesCards.map((c, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                  <TwoCol>
                    <SelectIcon
                      value={c.icon}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          valuesCards: p.valuesCards.map((x, i) => (i === idx ? { ...x, icon: v } : x)),
                        }))
                      }
                    />
                    <div className="hidden md:block" />
                  </TwoCol>

                  <div className="mt-3 space-y-2">
                    <Field
                      label="Başlık"
                      value={c.title}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          valuesCards: p.valuesCards.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                        }))
                      }
                    />
                    <TextArea
                      label="Açıklama"
                      value={c.desc}
                      onChange={(v) =>
                        setContent((p) => ({
                          ...p,
                          valuesCards: p.valuesCards.map((x, i) => (i === idx ? { ...x, desc: v } : x)),
                        }))
                      }
                    />

                    <div className="flex justify-end">
                      <IconBtn
                        title="Sil"
                        onClick={() => setContent((p) => ({ ...p, valuesCards: p.valuesCards.filter((_, i) => i !== idx) }))}
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </IconBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setContent((p) => ({
                  ...p,
                  valuesCards: [...p.valuesCards, { icon: "lock", title: "", desc: "" }],
                }))
              }
              disabled={saving}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition disabled:opacity-60"
            >
              <Plus size={18} className="text-orange-300" />
              Değer Kartı Ekle
            </button>
          </Section>

          <Section title="İletişim CTA">
            <Field
              label="Başlık"
              value={content.contactTitle}
              onChange={(v) => setContent((p) => ({ ...p, contactTitle: v }))}
            />
            <Field
              label="Açıklama"
              value={content.contactDesc}
              onChange={(v) => setContent((p) => ({ ...p, contactDesc: v }))}
            />
            <TwoCol>
              <Field
                label="Primary (İletişim)"
                value={content.contactPrimaryLabel}
                onChange={(v) => setContent((p) => ({ ...p, contactPrimaryLabel: v }))}
              />
              <Field
                label="Secondary (Şikayet yaz)"
                value={content.contactSecondaryLabel}
                onChange={(v) => setContent((p) => ({ ...p, contactSecondaryLabel: v }))}
              />
            </TwoCol>
          </Section>

          <Section title="Alt Not">
            <TextArea
              label="Not"
              value={content.bottomNote}
              onChange={(v) => setContent((p) => ({ ...p, bottomNote: v }))}
            />
          </Section>
        </div>

        {/* PREVIEW */}
        <div className="lg:col-span-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 overflow-hidden shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/70">
              <div className="text-sm font-semibold text-slate-900">Web Önizleme (/hakkimizda)</div>
              <Link href="/hakkimizda" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
                Gerçek sayfaya git →
              </Link>
            </div>
            <div className="p-4">
              <WebPreview content={content} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Not</div>
            <div className="mt-1">
              Bu sayfa artık gerçek kaydediyor:
              <span className="font-semibold text-slate-900"> POST /api/admin/about-us</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ====================== PREVIEW UI (same vibe) ====================== */
function WebPreview({ content }: { content: AboutContent }) {
  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[#0B1020] text-slate-100">
      {/* background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.20),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(249,115,22,0.16),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <div className="relative">
        {/* Top band */}
        <div className="border-b border-white/10 bg-[#1F2333] px-4 py-2.5 text-sm">
          {content.topBandTitle} • <span className="ml-2 text-white/70">{content.topBandSubtitle}</span>
        </div>

        {/* Hero */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.26),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.16),transparent_55%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] text-white/85">
                {content.heroBadgeDot ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}
                {content.heroBadgeText}
              </div>

              <div className="mt-4 text-[22px] font-extrabold leading-[1.1] tracking-tight">
                {content.heroTitleLine1}
                <span className="block text-white/85">{content.heroTitleLine2}</span>
              </div>

              <div className="mt-3 text-sm text-white/70 leading-relaxed">{content.heroDesc}</div>

              <div className="mt-4 flex flex-wrap gap-2">
                <PreviewPill variant="secondary">
                  <TrendingUp className="h-4 w-4" />
                  {content.heroCtaPrimaryLabel}
                </PreviewPill>
                <PreviewPill variant="ghost">
                  <MessageSquare className="h-4 w-4" />
                  {content.heroCtaSecondaryLabel}
                </PreviewPill>
                <PreviewPill variant="white">
                  <BookOpen className="h-4 w-4" />
                  {content.heroCtaTertiaryLabel}
                </PreviewPill>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
                {content.heroMiniPills.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                    {renderIcon(p.icon, 16)}
                    {p.text}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right cards */}
          <div className="mt-4 grid grid-cols-1 gap-3">
            {content.rightCards.map((c, i) => (
              <div key={i} className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                    {renderIcon(c.icon, 18)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white/90">{c.title}</div>
                    <div className="mt-1 text-sm text-white/70 leading-relaxed">{c.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white/85">{content.valuesKicker}</div>
                <div className="mt-1 text-[20px] font-extrabold tracking-tight">{content.valuesTitle}</div>
                <div className="mt-2 text-sm text-white/70">{content.valuesDesc}</div>
              </div>
              <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/85">
                {content.valuesLinkLabel} <ChevronRight className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {content.valuesCards.map((c, i) => (
                <div key={i} className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center">
                      {renderIcon(c.icon, 18)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white/90">{c.title}</div>
                      <div className="mt-1 text-sm text-white/70 leading-relaxed">{c.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact CTA */}
          <div className="mt-6 rounded-[22px] border border-white/10 bg-white/5 p-5">
            <div className="text-sm font-semibold text-white/90">{content.contactTitle}</div>
            <div className="mt-1 text-sm text-white/70">{content.contactDesc}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PreviewPill variant="secondary">
                <Mail className="h-4 w-4" />
                {content.contactPrimaryLabel}
              </PreviewPill>
              <PreviewPill variant="ghost">
                <Sparkles className="h-4 w-4" />
                {content.contactSecondaryLabel}
              </PreviewPill>
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-6 border-t border-white/10 pt-4 text-xs text-white/60">{content.bottomNote}</div>
        </div>
      </div>
    </div>
  )
}

function PreviewPill({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: "primary" | "secondary" | "ghost" | "white"
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] focus:outline-none"
  const styles =
    variant === "primary"
      ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white"
      : variant === "secondary"
      ? "bg-emerald-500 text-white"
      : variant === "white"
      ? "bg-white text-black"
      : "border border-white/15 bg-white/10 text-white"
  return <div className={clsx(base, styles)}>{children}</div>
}

/* ====================== SMALL COMPONENTS ====================== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)] p-5">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      />
    </div>
  )
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      />
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={clsx(
          "w-full rounded-2xl border px-3 py-2.5 text-sm font-semibold outline-none transition",
          value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"
        )}
      >
        {value ? "Açık" : "Kapalı"}
      </button>
    </div>
  )
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center"
    >
      {children}
    </button>
  )
}

function SelectIcon({ value, onChange }: { value: IconKey; onChange: (v: IconKey) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">Icon</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as IconKey)}
        className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      >
        <option value="sparkles">sparkles</option>
        <option value="shield">shield</option>
        <option value="badge">badge</option>
        <option value="users">users</option>
        <option value="trending">trending</option>
        <option value="heart">heart</option>
        <option value="message">message</option>
        <option value="eye">eye</option>
        <option value="mail">mail</option>
        <option value="book">book</option>
        <option value="scale">scale</option>
        <option value="lock">lock</option>
      </select>
    </div>
  )
}

function renderIcon(key: IconKey, size = 18) {
  const props = { className: "", size }
  switch (key) {
    case "sparkles":
      return <Sparkles {...props} />
    case "shield":
      return <Shield {...props} />
    case "badge":
      return <BadgeCheck {...props} />
    case "users":
      return <Users {...props} />
    case "trending":
      return <TrendingUp {...props} />
    case "heart":
      return <Heart {...props} />
    case "message":
      return <MessageSquare {...props} />
    case "eye":
      return <Eye {...props} />
    case "mail":
      return <Mail {...props} />
    case "book":
      return <BookOpen {...props} />
    case "scale":
      return <Scale {...props} />
    case "lock":
      return <Lock {...props} />
    default:
      return <Sparkles {...props} />
  }
}
