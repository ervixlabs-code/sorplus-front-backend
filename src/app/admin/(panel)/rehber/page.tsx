// app/guide/[id]/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  FileText,
  Flag,
  HeartHandshake,
  Info,
  LogIn,
  Plus,
  Search,
  Shield,
  Sparkles,
  Users,
} from "lucide-react"
import Footer from "@/components/Footer"

/* ================== API ================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_API_BASE?.trim?.() ||
  (process.env as any)?.EXPO_PUBLIC_API_BASE?.trim?.() ||
  "http://localhost:3002"

function normalizeBase(raw: string) {
  return (raw || "").trim().replace(/\/+$/, "")
}

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

async function apiGetPublic(path: string) {
  const base = normalizeBase(API_BASE)
  const res = await fetch(`${base}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
  const data = await safeJson(res)
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `GET ${path} failed`
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg))
  }
  return data
}

/* ================== TYPES (frontend editor şeman) ================== */
type Tone = "indigo" | "mint" | "orange"
type IconKey = "shield" | "flag" | "file" | "handshake" | "badge" | "users" | "info" | "sparkles"

type GuideDoDont = { ok: boolean; title: string; desc: string }
type GuideStep = { title: string; desc: string }
type GuideCard = { tone: Tone; icon: IconKey; title: string; desc?: string; body: string }

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
  content: GuideContent
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

/* ================== ICON MAP ================== */
function iconNode(key: IconKey) {
  const cls = "h-5 w-5"
  switch (key) {
    case "shield":
      return <Shield className={cls} />
    case "flag":
      return <Flag className={cls} />
    case "file":
      return <FileText className={cls} />
    case "handshake":
      return <HeartHandshake className={cls} />
    case "badge":
      return <BadgeCheck className={cls} />
    case "users":
      return <Users className={cls} />
    case "info":
      return <Info className={cls} />
    case "sparkles":
    default:
      return <Sparkles className={cls} />
  }
}

/* ================== SMALL UI (rehber page ile aynı) ================== */
function PillButton({
  children,
  onClick,
  href,
  variant = "primary",
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: "primary" | "secondary" | "ghost" | "white"
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-4"
  const styles =
    variant === "primary"
      ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-sm hover:from-indigo-500 hover:to-indigo-700 focus:ring-indigo-200/70"
      : variant === "secondary"
      ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-400 focus:ring-emerald-200/70"
      : variant === "white"
      ? "bg-white text-black shadow-sm hover:bg-white/90 focus:ring-white/30"
      : "border border-white/15 bg-white/10 text-white shadow-sm hover:bg-white/15 focus:ring-white/20"

  if (href) {
    return (
      <Link href={href} className={clsx(base, styles)}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={clsx(base, styles)}>
      {children}
    </button>
  )
}

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
      {icon}
      <span>{label}</span>
    </div>
  )
}

function GlassCard({
  title,
  desc,
  icon,
  tone = "indigo",
  children,
}: {
  title: string
  desc?: string
  icon?: React.ReactNode
  tone?: "indigo" | "mint" | "orange"
  children?: React.ReactNode
}) {
  const toneBg =
    tone === "mint"
      ? "from-emerald-500/20 via-teal-500/10 to-transparent"
      : tone === "orange"
      ? "from-orange-500/18 via-amber-500/10 to-transparent"
      : "from-indigo-500/22 via-violet-500/10 to-transparent"

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_110px_-80px_rgba(0,0,0,0.85)] backdrop-blur">
      <div className={clsx("pointer-events-none absolute inset-0 bg-gradient-to-br", toneBg)} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.20] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="relative flex items-start gap-3">
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90">{title}</div>
          {desc ? <div className="mt-1 text-sm text-white/65">{desc}</div> : null}
        </div>
      </div>

      {children ? <div className="relative mt-5">{children}</div> : null}

      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
    </div>
  )
}

function DoDontItem({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4">
      <div
        className={clsx(
          "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full",
          ok ? "bg-emerald-500/15 text-emerald-200" : "bg-orange-500/15 text-orange-200"
        )}
      >
        {ok ? "✓" : "!"}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white/90">{title}</div>
        <div className="mt-1 text-sm text-white/70">{desc}</div>
      </div>
    </div>
  )
}

/* ================== PAGE ================== */
export default function Page() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ""

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [data, setData] = useState<GuideApiItem | null>(null)

  const goWrite = () => router.push("/sikayet-yaz")
  const goList = () => router.push("/sikayetler")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        router.push("/sikayet-yaz")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router])

  useEffect(() => {
    let mounted = true
    async function run() {
      try {
        setLoading(true)
        setErr(null)

        // ✅ Backend’de bu endpoint olmalı:
        // GET /api/guides/:id  (public)
        const d = (await apiGetPublic(`/api/guides/${encodeURIComponent(id)}`)) as GuideApiItem
        if (!mounted) return
        setData(d)
      } catch (e: any) {
        if (!mounted) return
        setErr(e?.message || "Rehber bulunamadı.")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    if (id) run()
    return () => {
      mounted = false
    }
  }, [id])

  const c = data?.content as GuideContent | undefined

  return (
    <div className="relative min-h-screen bg-[#0B1020] text-slate-100">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.22),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.20),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(249,115,22,0.16),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* TOP INFO BAND */}
      <div className="border-b border-white/10 bg-[#1F2333] text-white">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-6 py-2.5 lg:px-10 2xl:px-14">
          <div className="text-sm">
            {c?.topBandTitle || "Rehber"} •{" "}
            <span className="ml-2 text-white/70">{c?.topBandSubtitle || "Daha kaliteli deneyim paylaşımları için"}</span>
          </div>
          <div className="hidden items-center gap-2 text-sm text-white/80 sm:flex">
            ⌘K / Ctrl+K → <span className="font-semibold text-white">Şikayet Yaz</span>
          </div>
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/10 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between gap-3 px-6 py-4 lg:px-10 2xl:px-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goList}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400 text-slate-900 shadow-sm hover:bg-emerald-300"
              aria-label="Şikayetler"
            >
              <Sparkles className="h-5 w-5" />
            </button>

            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight text-white">{c?.navBrandTitle || "Deneyim"}</div>
              <div className="text-[11px] text-white/60">{c?.navBrandSubtitle || "Rehber"}</div>
            </div>

            <nav className="ml-6 hidden items-center gap-5 text-sm text-white/70 md:flex">
              <button className="hover:text-white" onClick={goList}>
                Şikayetler
              </button>
              <button className="hover:text-white" onClick={goWrite}>
                Şikayet Yaz
              </button>
              <Link className="hover:text-white" href="/rehber">
                Rehber
              </Link>
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="flex items-center overflow-hidden rounded-full border border-white/10 bg-white/10 shadow-sm backdrop-blur">
              <div className="flex items-center gap-2 px-4 text-white/70">
                <Search className="h-4 w-4" />
              </div>
              <input
                placeholder="Rehber içinde ara… (sonraki adım)"
                className="h-[46px] w-[320px] bg-transparent pr-4 text-sm text-white placeholder:text-white/45 focus:outline-none"
                onChange={() => {}}
              />
            </div>

            <PillButton variant="secondary" onClick={goWrite}>
              <Plus className="h-4 w-4" />
              Şikayet Yaz
            </PillButton>

            <PillButton variant="ghost" onClick={() => router.push("/giris")}>
              <LogIn className="h-4 w-4" />
              Giriş Yap / Üye Ol
            </PillButton>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <PillButton variant="secondary" onClick={goWrite}>
              <Plus className="h-4 w-4" />
              Yaz
            </PillButton>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto w-full max-w-screen-2xl px-6 pb-16 pt-8 lg:px-10 2xl:px-14">
        {loading ? (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-6 text-sm text-white/70">Yükleniyor…</div>
        ) : err ? (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold text-white/90">Bulunamadı</div>
            <div className="mt-1 text-sm text-white/70">{err}</div>
            <div className="mt-4">
              <PillButton variant="ghost" onClick={() => router.push("/rehber")}>
                Rehbere dön
              </PillButton>
            </div>
          </div>
        ) : !c ? null : (
          <>
            {/* TOP LINE */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Geri dön
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <MetaPill icon={<Shield className="h-4 w-4 text-emerald-300" />} label="Kişisel veri yok" />
                <MetaPill icon={<BadgeCheck className="h-4 w-4 text-indigo-300" />} label="Kategori bazlı" />
                <MetaPill icon={<Users className="h-4 w-4 text-white/80" />} label="Topluluk odaklı" />
              </div>
            </div>

            {/* HERO + RIGHT CARDS */}
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/5 p-7 shadow-[0_35px_120px_-90px_rgba(0,0,0,0.85)] backdrop-blur">
                  <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.28),transparent_50%),radial-gradient(circle_at_85%_35%,rgba(16,185,129,0.20),transparent_55%),radial-gradient(circle_at_50%_120%,rgba(249,115,22,0.14),transparent_55%)]" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

                  <div className="relative">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[12px] text-white/85 shadow-sm backdrop-blur">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      {c.heroBadge}
                    </div>

                    <h1 className="mt-4 text-[34px] font-semibold tracking-tight text-white md:text-[44px]">{c.heroTitle}</h1>

                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{c.heroDesc}</p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <PillButton variant="secondary" onClick={goWrite}>
                        <Plus className="h-4 w-4" />
                        Şikayet Yaz
                      </PillButton>
                      <PillButton variant="ghost" onClick={goList}>
                        Şikayetleri Gör
                      </PillButton>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {(c.heroMiniCards || []).slice(0, 3).map((m, i) => (
                        <div key={i} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs text-white/60">{m.label || `Kart ${i + 1}`}</div>
                          <div className="mt-1 text-sm font-semibold text-white/90">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-20 -bottom-20 h-44 w-44 rounded-full bg-emerald-500/10 blur-3xl" />
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                {(c.rightCards || []).map((rc, i) => (
                  <GlassCard
                    key={i}
                    tone={rc.tone}
                    icon={iconNode(rc.icon)}
                    title={rc.title}
                    desc={rc.desc}
                  >
                    <div className="text-sm text-white/70">{rc.body}</div>
                  </GlassCard>
                ))}
              </div>
            </div>

            {/* STEPS + DO/DONT */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <GlassCard
                  tone="indigo"
                  icon={<FileText className="h-5 w-5 text-white" />}
                  title={c.stepsTitle}
                  desc={c.stepsDesc}
                >
                  <ol className="space-y-3 text-sm text-white/75">
                    {(c.steps || []).map((s, idx) => (
                      <li key={idx} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        <div className="text-white/90 font-semibold">{s.title || `Adım ${idx + 1}`}</div>
                        <div className="mt-1">{s.desc}</div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <PillButton variant="secondary" onClick={goWrite}>
                      <Plus className="h-4 w-4" /> Bu şablonla yaz
                    </PillButton>
                    <PillButton variant="ghost" onClick={goList}>
                      Örnekleri gör
                    </PillButton>
                  </div>
                </GlassCard>
              </div>

              <div className="lg:col-span-5">
                <GlassCard
                  tone="orange"
                  icon={<HeartHandshake className="h-5 w-5 text-orange-200" />}
                  title={c.doDontTitle}
                  desc={c.doDontDesc}
                >
                  <div className="space-y-3">
                    {(c.doDonts || []).map((d, i) => (
                      <DoDontItem key={i} ok={!!d.ok} title={d.title} desc={d.desc} />
                    ))}
                  </div>

                  <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-white/70" />
                      <div>
                        <div className="font-semibold text-white/85">{c.doDontTipTitle}</div>
                        <div className="mt-1">{c.doDontTipDesc}</div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* COMMUNITY */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                {/* istersen buraya SSS de bağlarız ama editor şemanda yok -> şimdilik kaldırdım */}
                <GlassCard
                  tone="mint"
                  icon={<Users className="h-5 w-5 text-emerald-200" />}
                  title={c.communityTitle}
                  desc={c.communityDesc}
                >
                  <div className="space-y-3 text-sm text-white/75">
                    {(c.communityBullets || []).map((b, i) => (
                      <div key={i} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                        • {b}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-2">
                    <PillButton variant="secondary" onClick={goWrite}>
                      <Plus className="h-4 w-4" />
                      Şikayet Yaz
                    </PillButton>
                    <PillButton variant="ghost" onClick={goList}>
                      Şikayetleri Gör
                    </PillButton>
                  </div>
                </GlassCard>
              </div>

              <div className="lg:col-span-5">
                <GlassCard
                  tone="indigo"
                  icon={<Info className="h-5 w-5 text-indigo-200" />}
                  title="Not"
                  desc="Bu rehber kaydının alt notu"
                >
                  <div className="text-sm text-white/70">{c.bottomNote}</div>
                </GlassCard>
              </div>
            </div>

            {/* BOTTOM NAV */}
            <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center">
              <div className="text-xs text-white/60">{c.bottomNote}</div>
              <div className="flex items-center gap-2">
                <PillButton variant="ghost" onClick={goList}>
                  Şikayetlere dön
                </PillButton>
                <PillButton variant="secondary" onClick={goWrite}>
                  Şikayet Yaz
                </PillButton>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
