"use client"

import React, { useMemo, useRef, useState, useEffect } from "react"
import clsx from "clsx"
import { Save, RefreshCcw, Plus, Trash2, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

/* ====================== API ====================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_API_BASE?.trim?.() ||
  (process.env as any)?.EXPO_PUBLIC_API_BASE?.trim?.() ||
  "http://localhost:3002"

function normalizeBase(raw: string) {
  const b = (raw || "").trim().replace(/\/+$/, "")
  return b
}

function getToken() {
  if (typeof window === "undefined") return ""
  // senin pattern: sv_admin_token / ADMIN_TOKEN / token
  const candidates = ["sv_admin_token", "ADMIN_TOKEN", "token"]
  for (const key of candidates) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    // bazen json string
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
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `GET ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
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

async function apiPatch(path: string, body: any) {
  const token = getToken()
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `PATCH ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ====================== TYPES ====================== */
type Tone = "indigo" | "mint" | "orange"
type IconKey = "shield" | "flag" | "file" | "handshake" | "badge" | "users" | "info" | "sparkles"

type GuideDoDont = { ok: boolean; title: string; desc: string }
type GuideStep = { title: string; desc: string }
type GuideCard = {
  tone: Tone
  icon: IconKey
  title: string
  desc?: string
  body: string
}

type GuideContent = {
  topBandTitle: string
  topBandSubtitle: string

  navBrandTitle: string
  navBrandSubtitle: string

  heroBadge: string
  heroTitle: string
  heroDesc: string
  heroMiniCards: { label: string; value: string }[]

  rightCards: GuideCard[]

  stepsTitle: string
  stepsDesc: string
  steps: GuideStep[]

  doDontTitle: string
  doDontDesc: string
  doDonts: GuideDoDont[]
  doDontTipTitle: string
  doDontTipDesc: string

  communityTitle: string
  communityDesc: string
  communityBullets: string[]

  bottomNote: string
}

type GuideApiItem = {
  id: string
  title: string
  content: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/* ====================== DEFAULT CONTENT ====================== */
function defaultContent(): GuideContent {
  return {
    topBandTitle: "Rehber",
    topBandSubtitle: "Daha kaliteli deneyim paylaşımları için",

    navBrandTitle: "Deneyim",
    navBrandSubtitle: "Rehber",

    heroBadge: "Rehber • kaliteli içerik",
    heroTitle: "İyi bir şikayet nasıl yazılır?",
    heroDesc:
      "Amaç linç değil — süreci görünür kılmak. Ne oldu, ne zaman oldu, hangi adımlar denendi, sonuç ne? Bunları net yazarsan hem okunur hem de fayda sağlar.",
    heroMiniCards: [
      { label: "1) Somut", value: "Tarih • süreç • sonuç" },
      { label: "2) Güvenli", value: "Kişisel veri yok" },
      { label: "3) Saygılı", value: "Hakaret yok" },
    ],

    rightCards: [
      {
        tone: "mint",
        icon: "shield",
        title: "Kişisel veri uyarısı",
        desc: "Telefon, T.C., adres, kart bilgisi, IBAN vb. paylaşma.",
        body:
          "Paylaşımlar moderasyondan geçebilir. En güvenlisi: kişisel veriyi hiç yazmamak. Ekran görüntüsü ekliyorsan da hassas bilgileri kapat.",
      },
      {
        tone: "indigo",
        icon: "flag",
        title: "Ne zaman “bildir” kullanılır?",
        desc: "Spam, hakaret, kişisel veri veya yanlış yönlendirme.",
        body:
          "Topluluk güvenliği için bildirimler önemli. Yanlış bildirimler ise moderasyon yükünü artırır.",
      },
    ],

    stepsTitle: "Adım adım yazım şablonu",
    stepsDesc: "Kopyala-yapıştır mantığında: kısa ve güçlü.",
    steps: [
      { title: "1) Başlık", desc: "“Kargom 10 gündür dağıtıma çıkmadı” gibi net, ölçülebilir." },
      { title: "2) Ne oldu?", desc: "Olayı 3–5 cümleyle özetle." },
      { title: "3) Ne zaman oldu?", desc: "Tarih/hafta aralığı ver. “Dün / bugün” yerine mümkünse gün yaz." },
      { title: "4) Ne denedin?", desc: "Müşteri hizmetleri, kayıt açma, şube, mail vb. adımları madde madde." },
      { title: "5) Beklentin ne?", desc: "“İade / çözüm / net bilgilendirme” gibi somut istek." },
    ],

    doDontTitle: "Yap / Yapma",
    doDontDesc: "Okunurluk + güven için hızlı kontrol.",
    doDonts: [
      { ok: true, title: "Somut anlat", desc: "Tarih, süreç, ekran görüntüsü (kapatılmış verilerle)." },
      { ok: true, title: "Sakin dil kullan", desc: "Duygu olabilir ama hakaret olmamalı." },
      { ok: false, title: "Kişisel veri paylaşma", desc: "Telefon, adres, TC, kart, IBAN vb." },
      { ok: false, title: "Toplu hedef gösterme", desc: "Linç dili yerine süreç/olay anlat." },
    ],
    doDontTipTitle: "Kısa kural",
    doDontTipDesc: "“Okuyan bir yabancı, olayı tek okumada anlayabiliyor mu?”",

    communityTitle: "Topluluk standardı",
    communityDesc: "Herkesin işine yarayan içerik üretelim.",
    communityBullets: [
      "“Ben de yaşadım” yerine bir cümle ekle: Ne zaman, nasıl çözüldü?",
      "Yönlendirme yaparken güvenli ol: kişisel veri isteme/verme yok.",
      "Şikayet çözülürse güncelle: “sonuç” bölümü değer katar.",
    ],

    bottomNote:
      "Not: Rehber zamanla büyüyecek. (MVP sonrası: kategori bazlı örnekler + otomatik kişisel veri maskeleme)",
  }
}

/* ====================== TOAST ====================== */
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

/* ====================== PAGE ====================== */
export default function AdminGuideEditorPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const guideId = sp.get("id") // ?id=xxx

  const [loading, setLoading] = useState<boolean>(!!guideId)
  const [saving, setSaving] = useState<boolean>(false)
  const [title, setTitle] = useState<string>("Rehber İçeriği")
  const [content, setContent] = useState<GuideContent>(() => defaultContent())

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "success", title: "" })
  const tRef = useRef<number | null>(null)
  const showToast = (kind: ToastKind, title: string, desc?: string) => {
    setToast({ open: true, kind, title, desc })
    if (tRef.current) window.clearTimeout(tRef.current)
    tRef.current = window.setTimeout(() => setToast((s) => ({ ...s, open: false })), 3200)
  }

  useEffect(() => {
    let mounted = true

    async function load() {
      if (!guideId) return
      try {
        setLoading(true)
        const data = (await apiGet(`/api/admin/guides/${encodeURIComponent(guideId)}`)) as GuideApiItem
        if (!mounted) return
        setTitle(data?.title || "Rehber İçeriği")
        setContent((data?.content || defaultContent()) as GuideContent)
      } catch (e: any) {
        if (!mounted) return
        showToast("error", "Yüklenemedi", e?.message || "Kayıt okunamadı.")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId])

  const isValid = useMemo(() => {
    if (!title.trim()) return false
    if (!content.heroTitle.trim()) return false
    if (!content.heroDesc.trim()) return false
    if (content.steps.length === 0) return false
    return true
  }, [content, title])

  async function onSave() {
    try {
      if (!isValid) {
        showToast("error", "Eksik alan var", "Title / hero / adımlar boş olamaz.")
        return
      }

      setSaving(true)

      const payload = {
        title: title.trim(),
        content,
      }

      if (!guideId) {
        const created = (await apiPost("/api/admin/guides", payload)) as GuideApiItem
        showToast("success", "Kaydedildi", "Yeni rehber kaydı oluşturuldu.")
        // edit moduna geç
        router.replace(`?id=${encodeURIComponent(created.id)}`)
      } else {
        await apiPatch(`/api/admin/guides/${encodeURIComponent(guideId)}`, payload)
        showToast("success", "Kaydedildi", "Rehber içeriği güncellendi.")
      }
    } catch (e: any) {
      showToast("error", "Bir hata oluştu", e?.message || "Kaydedilemedi.")
    } finally {
      setSaving(false)
    }
  }

  function onResetDefaults() {
    const d = defaultContent()
    setContent(d)
    showToast("success", "Default içerik yüklendi")
  }

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rehber İçeriği</h1>
          <p className="text-slate-500 mt-1">Webdeki /rehber sayfasını buradan yönet</p>
          {guideId ? <div className="mt-1 text-xs text-slate-500">ID: {guideId}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <ArrowLeft size={18} className="text-slate-700" />
            Geri
          </button>

          <Link
            href="/rehber"
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            <Sparkles size={18} className="text-slate-700" />
            Webde Gör
          </Link>

          <button
            onClick={onResetDefaults}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
            disabled={saving}
          >
            <RefreshCcw size={18} className="text-slate-700" />
            Defaulta Dön
          </button>

          <button
            onClick={onSave}
            disabled={saving || loading}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              saving || loading ? "bg-slate-400 text-white cursor-not-allowed" : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <Save size={18} className="text-orange-300" />
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Title input */}
      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5">
        <div className="text-xs font-semibold text-slate-600 mb-2">Kayıt Başlığı</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
          placeholder="Örn: Rehber İçeriği (Şubat 2026)"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-sm text-slate-600">
          Yükleniyor...
        </div>
      ) : (
        /* Editor */
        <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-7 space-y-6">
              {/* Top band */}
              <Section title="Üst Bant">
                <TwoCol>
                  <Field label="Başlık" value={content.topBandTitle} onChange={(v) => setContent((p) => ({ ...p, topBandTitle: v }))} />
                  <Field
                    label="Alt açıklama"
                    value={content.topBandSubtitle}
                    onChange={(v) => setContent((p) => ({ ...p, topBandSubtitle: v }))}
                  />
                </TwoCol>
              </Section>

              {/* Nav brand */}
              <Section title="Navbar Marka">
                <TwoCol>
                  <Field
                    label="Marka başlık"
                    value={content.navBrandTitle}
                    onChange={(v) => setContent((p) => ({ ...p, navBrandTitle: v }))}
                  />
                  <Field
                    label="Marka alt"
                    value={content.navBrandSubtitle}
                    onChange={(v) => setContent((p) => ({ ...p, navBrandSubtitle: v }))}
                  />
                </TwoCol>
              </Section>

              {/* Hero */}
              <Section title="Hero">
                <Field label="Badge" value={content.heroBadge} onChange={(v) => setContent((p) => ({ ...p, heroBadge: v }))} />
                <Field label="Başlık" value={content.heroTitle} onChange={(v) => setContent((p) => ({ ...p, heroTitle: v }))} />
                <TextArea label="Açıklama" value={content.heroDesc} onChange={(v) => setContent((p) => ({ ...p, heroDesc: v }))} />

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600 mb-2">Hero mini kartlar</div>
                  <div className="space-y-2">
                    {content.heroMiniCards.map((x, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          value={x.label}
                          onChange={(e) => {
                            const v = e.target.value
                            setContent((p) => ({
                              ...p,
                              heroMiniCards: p.heroMiniCards.map((m, i) => (i === idx ? { ...m, label: v } : m)),
                            }))
                          }}
                          className="w-44 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                          placeholder="Label"
                        />
                        <input
                          value={x.value}
                          onChange={(e) => {
                            const v = e.target.value
                            setContent((p) => ({
                              ...p,
                              heroMiniCards: p.heroMiniCards.map((m, i) => (i === idx ? { ...m, value: v } : m)),
                            }))
                          }}
                          className="flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                          placeholder="Value"
                        />
                        <button
                          onClick={() => setContent((p) => ({ ...p, heroMiniCards: p.heroMiniCards.filter((_, i) => i !== idx) }))}
                          className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 size={18} className="text-slate-700" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setContent((p) => ({ ...p, heroMiniCards: [...p.heroMiniCards, { label: "", value: "" }] }))}
                    className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                  >
                    <Plus size={18} className="text-orange-300" />
                    Mini Kart Ekle
                  </button>
                </div>
              </Section>

              {/* Steps */}
              <Section title="Adım Adım Şablon">
                <Field label="Başlık" value={content.stepsTitle} onChange={(v) => setContent((p) => ({ ...p, stepsTitle: v }))} />
                <Field label="Alt açıklama" value={content.stepsDesc} onChange={(v) => setContent((p) => ({ ...p, stepsDesc: v }))} />

                <div className="mt-4 space-y-3">
                  {content.steps.map((s, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <Field
                            label={`Adım ${idx + 1} başlık`}
                            value={s.title}
                            onChange={(v) =>
                              setContent((p) => ({
                                ...p,
                                steps: p.steps.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                              }))
                            }
                          />
                          <TextArea
                            label="Açıklama"
                            value={s.desc}
                            onChange={(v) =>
                              setContent((p) => ({
                                ...p,
                                steps: p.steps.map((x, i) => (i === idx ? { ...x, desc: v } : x)),
                              }))
                            }
                          />
                        </div>

                        <button
                          onClick={() => setContent((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))}
                          className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 size={18} className="text-slate-700" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setContent((p) => ({ ...p, steps: [...p.steps, { title: "", desc: "" }] }))}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus size={18} className="text-orange-300" />
                  Adım Ekle
                </button>
              </Section>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-5 space-y-6">
              {/* Right Cards */}
              <Section title="Sağ Kartlar (GlassCard)">
                <div className="text-sm text-slate-600">Buradaki kartlar: “Kişisel veri uyarısı” ve “Bildir” gibi kutular.</div>

                <div className="mt-3 space-y-3">
                  {content.rightCards.map((c, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-2">
                          <TwoCol>
                            <SelectTone
                              value={c.tone}
                              onChange={(v) =>
                                setContent((p) => ({
                                  ...p,
                                  rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, tone: v } : x)),
                                }))
                              }
                            />
                            <SelectIcon
                              value={c.icon}
                              onChange={(v) =>
                                setContent((p) => ({
                                  ...p,
                                  rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, icon: v } : x)),
                                }))
                              }
                            />
                          </TwoCol>

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
                          <Field
                            label="Alt (opsiyonel)"
                            value={c.desc ?? ""}
                            onChange={(v) =>
                              setContent((p) => ({
                                ...p,
                                rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, desc: v } : x)),
                              }))
                            }
                          />
                          <TextArea
                            label="Body"
                            value={c.body}
                            onChange={(v) =>
                              setContent((p) => ({
                                ...p,
                                rightCards: p.rightCards.map((x, i) => (i === idx ? { ...x, body: v } : x)),
                              }))
                            }
                          />
                        </div>

                        <button
                          onClick={() => setContent((p) => ({ ...p, rightCards: p.rightCards.filter((_, i) => i !== idx) }))}
                          className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 size={18} className="text-slate-700" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setContent((p) => ({
                      ...p,
                      rightCards: [...p.rightCards, { tone: "indigo", icon: "info", title: "", desc: "", body: "" }],
                    }))
                  }
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus size={18} className="text-orange-300" />
                  Kart Ekle
                </button>
              </Section>

              {/* Do / Dont */}
              <Section title="Yap / Yapma">
                <Field label="Başlık" value={content.doDontTitle} onChange={(v) => setContent((p) => ({ ...p, doDontTitle: v }))} />
                <Field label="Alt" value={content.doDontDesc} onChange={(v) => setContent((p) => ({ ...p, doDontDesc: v }))} />
                <Field
                  label="Tip başlık"
                  value={content.doDontTipTitle}
                  onChange={(v) => setContent((p) => ({ ...p, doDontTipTitle: v }))}
                />
                <TextArea
                  label="Tip açıklama"
                  value={content.doDontTipDesc}
                  onChange={(v) => setContent((p) => ({ ...p, doDontTipDesc: v }))}
                />

                <div className="mt-3 space-y-2">
                  {content.doDonts.map((d, idx) => (
                    <div key={idx} className="flex gap-2">
                      <select
                        value={d.ok ? "OK" : "NO"}
                        onChange={(e) => {
                          const ok = e.target.value === "OK"
                          setContent((p) => ({
                            ...p,
                            doDonts: p.doDonts.map((x, i) => (i === idx ? { ...x, ok } : x)),
                          }))
                        }}
                        className="w-24 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="OK">Yap</option>
                        <option value="NO">Yapma</option>
                      </select>

                      <input
                        value={d.title}
                        onChange={(e) => {
                          const v = e.target.value
                          setContent((p) => ({
                            ...p,
                            doDonts: p.doDonts.map((x, i) => (i === idx ? { ...x, title: v } : x)),
                          }))
                        }}
                        className="w-48 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Başlık"
                      />
                      <input
                        value={d.desc}
                        onChange={(e) => {
                          const v = e.target.value
                          setContent((p) => ({
                            ...p,
                            doDonts: p.doDonts.map((x, i) => (i === idx ? { ...x, desc: v } : x)),
                          }))
                        }}
                        className="flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Açıklama"
                      />

                      <button
                        onClick={() => setContent((p) => ({ ...p, doDonts: p.doDonts.filter((_, i) => i !== idx) }))}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setContent((p) => ({ ...p, doDonts: [...p.doDonts, { ok: true, title: "", desc: "" }] }))}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus size={18} className="text-orange-300" />
                  Madde Ekle
                </button>
              </Section>

              {/* Community */}
              <Section title="Topluluk Standardı">
                <Field
                  label="Başlık"
                  value={content.communityTitle}
                  onChange={(v) => setContent((p) => ({ ...p, communityTitle: v }))}
                />
                <Field label="Alt" value={content.communityDesc} onChange={(v) => setContent((p) => ({ ...p, communityDesc: v }))} />

                <div className="mt-3 space-y-2">
                  {content.communityBullets.map((b, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={b}
                        onChange={(e) => {
                          const v = e.target.value
                          setContent((p) => ({
                            ...p,
                            communityBullets: p.communityBullets.map((x, i) => (i === idx ? v : x)),
                          }))
                        }}
                        className="flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Madde"
                      />
                      <button
                        onClick={() => setContent((p) => ({ ...p, communityBullets: p.communityBullets.filter((_, i) => i !== idx) }))}
                        className="h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 size={18} className="text-slate-700" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setContent((p) => ({ ...p, communityBullets: [...p.communityBullets, ""] }))}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
                >
                  <Plus size={18} className="text-orange-300" />
                  Madde Ekle
                </button>
              </Section>

              {/* Bottom note */}
              <Section title="Alt Not">
                <TextArea label="Not" value={content.bottomNote} onChange={(v) => setContent((p) => ({ ...p, bottomNote: v }))} />
              </Section>

              <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-900">İpucu</div>
                <div className="mt-1">Backend’e bağlı. Kaydet dediğinde DB’ye yazıyoruz.</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ====================== SMALL COMPONENTS ====================== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SelectTone({ value, onChange }: { value: "indigo" | "mint" | "orange"; onChange: (v: any) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">Tone</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      >
        <option value="indigo">indigo</option>
        <option value="mint">mint</option>
        <option value="orange">orange</option>
      </select>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SelectIcon({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-2">Icon</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-orange-200"
      >
        <option value="shield">shield</option>
        <option value="flag">flag</option>
        <option value="file">file</option>
        <option value="handshake">handshake</option>
        <option value="badge">badge</option>
        <option value="users">users</option>
        <option value="info">info</option>
        <option value="sparkles">sparkles</option>
      </select>
    </div>
  )
}
