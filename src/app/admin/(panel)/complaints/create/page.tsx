// src/app/admin/complaints/create/page.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Eye,
  Info,
  Lock,
  Shield,
  Upload,
  AlertTriangle,
  Sparkles,
} from "lucide-react"

/* ================== CONFIG ================== */
const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3002").replace(/\/+$/, "")

/** Eğer login’de token saklıyorsan ve create’e admin token eklemek istersen */
const TOKEN_KEY = "sv_admin_token"
function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ""
  } catch {
    return ""
  }
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

/* ================== API TYPES ================== */
type ApiCategory = {
  id: string
  name: string
  slug?: string | null
  isActive?: boolean
  sortOrder?: number
}

/* ================== TYPES (UI) ================== */
type Step = 1 | 2 | 3

type ComplaintDraft = {
  categoryId: string | null
  title: string
  detail: string
  anonymous: boolean
  brandName: string
  attachments: File[]
  acceptRules: boolean
}

function formatTR(n: number) {
  try {
    return new Intl.NumberFormat("tr-TR").format(n)
  } catch {
    return String(n)
  }
}

/* ================== PREMIUM ADMIN UI (light) ================== */
function AdminCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl",
        "shadow-[0_14px_50px_rgba(15,23,42,0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

function PillButton({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  disabled?: boolean
  type?: "button" | "submit"
  className?: string
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-55"
  const styles =
    variant === "primary"
      ? "bg-slate-900 text-white shadow-sm hover:bg-slate-800 focus:ring-orange-200/70"
      : variant === "secondary"
        ? "bg-white/80 border border-slate-200/80 text-slate-900 shadow-sm hover:bg-white focus:ring-orange-200/70"
        : "bg-white/60 border border-slate-200/70 text-slate-700 shadow-sm hover:bg-white focus:ring-slate-200"

  return (
    <button type={type} onClick={onClick} className={clsx(base, styles, className)} disabled={disabled}>
      {children}
    </button>
  )
}

function StepperRow({
  n,
  title,
  subtitle,
  active,
  done,
  onClick,
}: {
  n: number
  title: string
  subtitle?: string
  active: boolean
  done: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
        active ? "border-slate-300/60 bg-slate-900/5" : "border-slate-200/70 bg-white/60 hover:bg-white"
      )}
    >
      <div
        className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold",
          done
            ? "bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.35)]"
            : active
              ? "bg-slate-900 text-white"
              : "bg-slate-900/5 text-slate-600"
        )}
      >
        {done ? <Check className="h-4 w-4" /> : n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-[11px] text-slate-500">{subtitle}</div> : null}
      </div>
    </button>
  )
}

function InfoTile({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4">
      <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{desc}</div>
      </div>
    </div>
  )
}

type NoticeKind = "info" | "error" | "success"
function Notice({ kind, children }: { kind: NoticeKind; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-800"
      : kind === "success"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800"
        : "border-slate-200/70 bg-white/60 text-slate-700"

  const Icon = kind === "error" ? AlertTriangle : Info

  return (
    <div className={clsx("mt-4 flex items-start gap-2 rounded-2xl border p-4 text-sm", styles)}>
      <Icon className="mt-0.5 h-4 w-4" />
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

/* ===== Category dropdown (dynamic from backend) ===== */
function CategoryDropdown({
  value,
  options,
  loading,
  onChange,
  label = "Kategori",
}: {
  value: { id: string; name: string } | null
  options: ApiCategory[]
  loading: boolean
  onChange: (v: { id: string; name: string } | null) => void
  label?: string
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

  return (
    <div ref={ref} className="relative">
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
      <button
        type="button"
        onClick={() => !loading && setOpen((s) => !s)}
        className={clsx(
          "flex h-[52px] w-full items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 shadow-sm hover:bg-white focus:outline-none focus:ring-4 focus:ring-orange-200/70",
          loading && "opacity-60 cursor-not-allowed"
        )}
        disabled={loading}
      >
        <span className="truncate">
          {loading ? "Yükleniyor…" : value ? value.name : "Seçiniz…"}
        </span>
        <ChevronDown className={clsx("h-4 w-4 text-slate-500 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
          <div className="max-h-[280px] overflow-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={clsx(
                "w-full rounded-xl px-3 py-2 text-left text-sm",
                !value ? "bg-slate-900/5 text-slate-900" : "hover:bg-slate-50 text-slate-700"
              )}
            >
              Seçiniz…
            </button>

            {options.map((opt) => {
              const active = value?.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange({ id: opt.id, name: opt.name })
                    setOpen(false)
                  }}
                  className={clsx(
                    "w-full rounded-xl px-3 py-2 text-left text-sm",
                    active ? "bg-slate-900/5 text-slate-900" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  {opt.name}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ================== PAGE ================== */
export default function AdminComplaintCreatePage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<ComplaintDraft>({
    categoryId: null,
    title: "",
    detail: "",
    anonymous: false,
    brandName: "",
    attachments: [],
    acceptRules: false,
  })

  // categories from backend
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [catLoading, setCatLoading] = useState(true)

  const selectedCategory = useMemo(() => {
    if (!draft.categoryId) return null
    const c = categories.find((x) => x.id === draft.categoryId)
    return c ? { id: c.id, name: c.name } : null
  }, [draft.categoryId, categories])

  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null)

  const stepTitle = step === 1 ? "Şikayet Detayı" : step === 2 ? "Marka (Opsiyonel)" : "Belge / Onay"

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!draft.categoryId) e.category = "Bir kategori seç."
      if (draft.title.trim().length < 6) e.title = "Başlık en az 6 karakter olmalı."
      if (draft.detail.trim().length < 40) e.detail = "Detay en az 40 karakter olmalı."
    }
    if (step === 3) {
      if (!draft.acceptRules) e.acceptRules = "Devam etmek için kuralları onayla."
    }
    return e
  }, [draft, step])

  const canNext = useMemo(() => {
    if (step === 1) return !errors.category && !errors.title && !errors.detail
    if (step === 2) return true
    if (step === 3) return !errors.acceptRules
    return false
  }, [errors, step])

  const goNext = () => {
    setNotice(null)
    setStep((s) => (Math.min(3, s + 1) as Step))
  }
  const goPrev = () => {
    setNotice(null)
    setStep((s) => (Math.max(1, s - 1) as Step))
  }

  async function fetchCategories() {
    setCatLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" })
      const data = await safeJson(res)
      if (!res.ok) {
        const msg = data?.message || "Kategoriler alınamadı."
        throw new Error(String(msg))
      }
      const list = Array.isArray(data) ? data : (data?.items || [])
      setCategories(list)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setCategories([])
      setNotice({ kind: "error", text: e?.message || "Kategoriler alınamadı." })
    } finally {
      setCatLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
     
  }, [])

  const onSubmit = async () => {
    if (!canNext) return
    setLoadingSubmit(true)
    setNotice(null)

    try {
      if (!draft.categoryId) throw new Error("Kategori seçilmedi.")
      const fd = new FormData()
      fd.append("categoryId", draft.categoryId)
      fd.append("title", draft.title.trim())
      fd.append("detail", draft.detail.trim())
      fd.append("anonymous", draft.anonymous ? "true" : "false")
      fd.append("brandName", draft.brandName.trim())
      fd.append("acceptRules", draft.acceptRules ? "true" : "false")
      for (const f of draft.attachments) fd.append("attachments", f) // backend attachments[] bekliyor

      const token = getToken()

      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: "POST",
        body: fd,
        // Public endpoint, ama istersen admin token ekleyebilirsin:
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })

      const data = await safeJson(res)
      if (!res.ok) {
        const msg =
          data?.message ||
          (Array.isArray(data?.errors) ? data.errors.join(", ") : null) ||
          "Şikayet oluşturulamadı."
        throw new Error(String(msg))
      }

      setNotice({ kind: "success", text: "Şikayet oluşturuldu ✅ (Moderasyon: PENDING)" })

      // küçük bir delay ile listeye dön
      setTimeout(() => {
        router.push("/admin/complaints")
      }, 650)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setNotice({ kind: "error", text: e?.message || "Bir şeyler ters gitti. Lütfen tekrar dene." })
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-slate-700">
            <Sparkles className="h-4 w-4 text-orange-600" />
            Admin • Şikayet Oluştur
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Yeni Şikayet</h1>
          <p className="text-slate-500 mt-1">Kayıt oluşturulur ve moderasyona (PENDING) düşer.</p>
        </div>

        <div className="flex items-center gap-2">
          <PillButton variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Geri
          </PillButton>
          <Link href="/admin/complaints">
            <PillButton variant="secondary">Listeye Dön</PillButton>
          </Link>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT */}
        <AdminCard className="lg:col-span-4">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Akış</div>
                <div className="mt-1 text-xs text-slate-500">
                  {step}/3 • {stepTitle}
                </div>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <StepperRow n={1} title="Şikayet Detayı" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
              <StepperRow n={2} title="Marka" subtitle="opsiyonel" active={step === 2} done={step > 2} onClick={() => setStep(2)} />
              <StepperRow n={3} title="Belge / Onay" active={step === 3} done={false} onClick={() => setStep(3)} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <InfoTile icon={<Lock className="h-4 w-4 text-orange-600" />} title="Kişisel veri paylaşma" desc="Telefon, TC, adres gibi bilgileri yazma." />
              <InfoTile icon={<BadgeCheck className="h-4 w-4 text-blue-600" />} title="Kategori bazlı akış" desc="Paylaşımlar kategoriye göre listelenir." />
              <InfoTile icon={<Eye className="h-4 w-4 text-emerald-600" />} title="Anonim paylaşım" desc="İstersen adın görünmeden yayınlanır." />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-xs text-slate-600">
              <div className="font-semibold text-slate-800">İpucu</div>
              <div className="mt-2 text-[12px]">“Ne oldu / ne zaman / süreç / sonuç” yazarsan moderasyon daha hızlı olur.</div>
            </div>
          </div>
        </AdminCard>

        {/* RIGHT */}
        <AdminCard className="lg:col-span-8">
          <div className="p-5 sm:p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs text-slate-500">Adım {step}/3</div>
                <div className="mt-1 text-[24px] sm:text-[26px] font-semibold tracking-tight text-slate-900">
                  {stepTitle}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {step === 1
                    ? "Detayı doldur, temel burada."
                    : step === 2
                      ? "İstersen marka ekle — zorunlu değil."
                      : "Belgeler opsiyonel. Kuralları onaylayınca kaydedebilirsin."}
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <PillButton variant="ghost" onClick={goPrev} disabled={step === 1}>
                  <ArrowLeft className="h-4 w-4" />
                  Geri
                </PillButton>

                {step < 3 ? (
                  <PillButton variant="primary" onClick={goNext} disabled={!canNext}>
                    Devam Et
                    <ArrowRight className="h-4 w-4" />
                  </PillButton>
                ) : (
                  <PillButton variant="primary" onClick={onSubmit} disabled={!canNext || loadingSubmit}>
                    <Check className="h-4 w-4" />
                    {loadingSubmit ? "Kaydediliyor…" : "Şikayeti Kaydet"}
                  </PillButton>
                )}
              </div>
            </div>

            {notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null}

            {/* STEP CONTENT */}
            <div className="mt-6">
              {/* STEP 1 */}
              {step === 1 ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <CategoryDropdown
                        value={selectedCategory}
                        options={categories}
                        loading={catLoading}
                        onChange={(v) => setDraft((d) => ({ ...d, categoryId: v?.id || null }))}
                        label="Kategori"
                      />
                      {errors.category ? (
                        <div className="mt-2 text-[12px] text-rose-600 font-semibold">{errors.category}</div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
                      <div className="text-[11px] font-semibold text-slate-600">Hızlı özet</div>
                      <div className="mt-2 text-sm text-slate-700">
                        <span className="text-slate-500">Anonim:</span>{" "}
                        <span className="font-semibold text-slate-900">{draft.anonymous ? "Evet" : "Hayır"}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        <span className="text-slate-500">Detay uzunluğu:</span>{" "}
                        <span className="font-semibold text-slate-900">{formatTR(draft.detail.trim().length)} karakter</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-slate-600">Başlık</div>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="Kısa ve net bir başlık yaz…"
                      maxLength={80}
                      className="h-[52px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-200/70"
                    />
                    <div className="mt-2 flex items-center justify-between text-[12px] text-slate-500">
                      <span>6–10 kelime ideal.</span>
                      <span>{formatTR(draft.title.trim().length)} / 80</span>
                    </div>
                    {errors.title ? <div className="mt-2 text-[12px] text-rose-600 font-semibold">{errors.title}</div> : null}
                  </div>

                  <div>
                    <div className="mb-1 text-[11px] font-semibold text-slate-600">Detay</div>
                    <textarea
                      value={draft.detail}
                      onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                      placeholder="Ne oldu? Ne zaman oldu? Süreç nasıl ilerledi? Sonuç neydi?"
                      className="min-h-[180px] w-full resize-none rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-200/70"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1">
                        <Info className="h-4 w-4 text-emerald-600" />
                        Telefon / TC / adres yazma
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1">
                        ★ Metinde marka geçerse yıldızlı gösterilir
                      </span>
                    </div>
                    {errors.detail ? <div className="mt-2 text-[12px] text-rose-600 font-semibold">{errors.detail}</div> : null}
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={draft.anonymous}
                      onChange={(e) => setDraft((d) => ({ ...d, anonymous: e.target.checked }))}
                      className="h-4 w-4 accent-orange-500"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Anonim paylaş</div>
                      <div className="text-[12px] text-slate-500">Adın görünmeden yayınlanır.</div>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* STEP 2 */}
              {step === 2 ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                    <div className="text-sm font-semibold text-slate-900">Marka eklemek ister misin?</div>
                    <div className="mt-1 text-sm text-slate-600">Zorunlu değil. İstersen metinde geçen markayı burada da yazabilirsin.</div>

                    <div className="mt-4">
                      <div className="mb-1 text-[11px] font-semibold text-slate-600">Marka adı (opsiyonel)</div>
                      <input
                        value={draft.brandName}
                        onChange={(e) => setDraft((d) => ({ ...d, brandName: e.target.value }))}
                        placeholder="Örn: ..."
                        className="h-[52px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-200/70"
                      />
                      <div className="mt-2 text-[12px] text-slate-500">Not: Marka alanı bağlam sağlar; kategori bazlı listelenir.</div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <PillButton variant="secondary" onClick={() => setDraft((d) => ({ ...d, brandName: "" }))}>
                        Temizle
                      </PillButton>
                      <div className="text-[12px] text-slate-500">
                        Bu adımı boş geçebilirsin → <span className="text-slate-900 font-semibold">Devam Et</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 text-sm text-slate-600">
                    <div className="font-semibold text-slate-800">Mini kontrol listesi</div>
                    <ul className="mt-3 space-y-2 text-sm">
                      <li>• Başlık net mi?</li>
                      <li>• Tarih / süreç / sonuç var mı?</li>
                      <li>• Kişisel veri yok mu?</li>
                    </ul>
                  </div>
                </div>
              ) : null}

              {/* STEP 3 */}
              {step === 3 ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Belge / ekran görüntüsü ekle</div>
                        <div className="mt-1 text-sm text-slate-600">Opsiyonel. Varsa süreci doğrular, moderasyonu hızlandırır.</div>
                      </div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10">
                        <Upload className="h-5 w-5 text-slate-700" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setDraft((d) => ({ ...d, attachments: files }))
                        }}
                        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
                      />
                      <div className="mt-3 text-[12px] text-slate-500">
                        Seçilen dosyalar: <span className="text-slate-900 font-semibold">{draft.attachments.length}</span>
                      </div>
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/70 p-5">
                    <input
                      type="checkbox"
                      checked={draft.acceptRules}
                      onChange={(e) => setDraft((d) => ({ ...d, acceptRules: e.target.checked }))}
                      className="mt-1 h-4 w-4 accent-orange-500"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        <Link href="/kurallar" className="hover:text-orange-600 underline underline-offset-4">
                          Kuralları
                        </Link>{" "}
                        okudum ve onaylıyorum
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Hakaret / kişisel veri / iftira içerikleri yayına alınmaz. Moderasyon sonrası yayınlanır.
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Ayrıca{" "}
                        <Link href="/kvkk" className="hover:text-orange-600 underline underline-offset-4">
                          KVKK
                        </Link>{" "}
                        metnini inceleyebilirsin.
                      </div>
                      {errors.acceptRules ? (
                        <div className="mt-2 text-[12px] text-rose-600 font-semibold">{errors.acceptRules}</div>
                      ) : null}
                    </div>
                  </label>

                  <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-5">
                    <div className="text-sm font-semibold text-slate-900">Önizleme (özet)</div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                        <div className="text-[12px] text-slate-500">Kategori</div>
                        <div className="mt-1 text-slate-900 font-semibold">{selectedCategory?.name || "—"}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                        <div className="text-[12px] text-slate-500">Anonim</div>
                        <div className="mt-1 text-slate-900 font-semibold">{draft.anonymous ? "Evet" : "Hayır"}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:col-span-2">
                        <div className="text-[12px] text-slate-500">Başlık</div>
                        <div className="mt-1 text-slate-900 font-semibold">{draft.title.trim() || "—"}</div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:col-span-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[12px] text-slate-500">Marka</div>
                            <div className="mt-1 text-slate-900 font-semibold">{draft.brandName.trim() || "—"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[12px] text-slate-500">Dosya</div>
                            <div className="mt-1 text-slate-900 font-semibold">{draft.attachments.length}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:col-span-2">
                        <div className="text-[12px] text-slate-500">Detay</div>
                        <div className="mt-1 line-clamp-4 text-slate-700">{draft.detail.trim() || "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}
