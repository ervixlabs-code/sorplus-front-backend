// src/app/admin/page.tsx
"use client"

import React, { useMemo } from "react"
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Sparkles,
  Tag,
  MessageSquareWarning,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import clsx from "clsx"

type Status = "YENI" | "INCELEMEDE" | "YAYINDA" | "COZULDU" | "REDDEDILDI"

const STATUS_LABEL: Record<Status, string> = {
  YENI: "Yeni",
  INCELEMEDE: "İncelemede",
  YAYINDA: "Yayında",
  COZULDU: "Çözüldü",
  REDDEDILDI: "Reddedildi",
}

function StatusBadge({ status }: { status: Status }) {
  const styles =
    status === "COZULDU"
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/15"
      : status === "YAYINDA"
      ? "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/15"
      : status === "INCELEMEDE"
      ? "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/15"
      : status === "REDDEDILDI"
      ? "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/15"
      : "bg-slate-900/6 text-slate-700 ring-1 ring-slate-900/10"

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        styles
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
      <div className="p-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  hint,
  delta,
  icon,
}: {
  title: string
  value: string
  hint: string
  delta: { dir: "up" | "down"; value: string; label: string }
  icon: React.ReactNode
}) {
  const up = delta.dir === "up"
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl p-5 shadow-[0_14px_50px_rgba(15,23,42,0.08)] hover:shadow-[0_20px_70px_rgba(15,23,42,0.12)] transition">
      <div className="flex items-start justify-between">
        <div className="text-xs font-semibold text-slate-600">{title}</div>
        <div className="h-10 w-10 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={clsx(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ring-1",
            up
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15"
              : "bg-rose-500/10 text-rose-700 ring-rose-500/15"
          )}
        >
          {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {delta.value}
        </span>
        <span className="text-slate-500">{delta.label}</span>
      </div>
    </div>
  )
}

/** Super simple “micro chart” bars (no library) */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-12">
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v / max) * 48))
        return (
          <div
            key={i}
            className="w-2.5 rounded-full bg-slate-900/10 overflow-hidden ring-1 ring-slate-900/10"
            title={`${v}`}
          >
            <div
              className="w-full rounded-full bg-orange-500/70"
              style={{ height: h }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboardPage() {
  // Mock dataset — backend gelince burayı API’ye bağlayacağız.
  const mock = useMemo(() => {
    const last7 = [12, 18, 10, 22, 26, 19, 28]
    const categories = [
      { name: "Kargo & Teslimat", count: 94, pct: 32 },
      { name: "Ürün Kalitesi", count: 61, pct: 21 },
      { name: "İade & Değişim", count: 44, pct: 15 },
      { name: "Müşteri Hizmetleri", count: 38, pct: 13 },
      { name: "Ödeme", count: 27, pct: 9 },
      { name: "Diğer", count: 30, pct: 10 },
    ]
    const recent = [
      {
        id: "SV-10241",
        title: "Kargo teslim edilmedi, sistemde teslim görünüyor",
        category: "Kargo & Teslimat",
        status: "INCELEMEDE" as Status,
        createdAt: "Bugün 14:22",
      },
      {
        id: "SV-10240",
        title: "İade süreci 10 gündür ilerlemiyor",
        category: "İade & Değişim",
        status: "YAYINDA" as Status,
        createdAt: "Bugün 13:11",
      },
      {
        id: "SV-10239",
        title: "Ürün görselle tamamen farklı geldi",
        category: "Ürün Kalitesi",
        status: "YENI" as Status,
        createdAt: "Dün 21:48",
      },
      {
        id: "SV-10238",
        title: "Çağrı merkezine ulaşmak imkansız",
        category: "Müşteri Hizmetleri",
        status: "COZULDU" as Status,
        createdAt: "Dün 19:02",
      },
      {
        id: "SV-10237",
        title: "Ödeme çekildi ama sipariş oluşmadı",
        category: "Ödeme",
        status: "INCELEMEDE" as Status,
        createdAt: "2 gün önce",
      },
    ]
    const alerts = [
      {
        icon: <ShieldCheck size={16} className="text-slate-700" />,
        title: "Moderasyon kuyruğu yükseliyor",
        desc: "İncelemede statüsündeki kayıtlar %18 arttı.",
        tone: "amber",
      },
      {
        icon: <Clock size={16} className="text-slate-700" />,
        title: "Ortalama yanıt süresi",
        desc: "Son 7 günde 1.8 gün → hedef: 1.2 gün",
        tone: "slate",
      },
      {
        icon: <Sparkles size={16} className="text-slate-700" />,
        title: "AI etiket önerileri",
        desc: "Yeni şikayetlerde otomatik tag önerisi aktif.",
        tone: "emerald",
      },
    ] as const

    return { last7, categories, recent, alerts }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">
            Moderasyon, kalite ve operasyon metrikleri
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/complaints"
            className="hidden sm:inline-flex items-center justify-center rounded-2xl bg-white/80 border border-slate-200/80 px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white transition"
          >
            Şikayetleri Gör
            <ChevronRight size={18} className="ml-1" />
          </Link>

          <button className="inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition">
            Yeni Şikayet Oluştur
            <span className="ml-2 text-orange-300">+</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Bugün Gelen"
          value="128"
          hint="Son 24 saat"
          delta={{ dir: "up", value: "+12%", label: "düne göre" }}
          icon={<MessageSquareWarning size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Açık Şikayet"
          value="642"
          hint="Yanıt bekliyor"
          delta={{ dir: "down", value: "-6%", label: "son 7 gün" }}
          icon={<Clock size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Çözülen"
          value="311"
          hint="Bu hafta"
          delta={{ dir: "up", value: "+9%", label: "son 7 gün" }}
          icon={<ShieldCheck size={18} className="text-slate-800" />}
        />
        <KpiCard
          title="Ortalama Çözüm"
          value="1.8g"
          hint="Gün bazında"
          delta={{ dir: "down", value: "-0.3g", label: "iyileşme" }}
          icon={<Sparkles size={18} className="text-slate-800" />}
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity / Trend */}
        <Card
          title="Son 7 Gün Trend"
          subtitle="Günlük gelen şikayet sayısı"
          right={
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-slate-900/6 ring-1 ring-slate-900/10 text-slate-700">
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.5)]" />
              Canlı görünüm
            </span>
          }
        >
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Son 7 gün toplam:{" "}
              <span className="font-semibold text-slate-900">
                {mock.last7.reduce((a, b) => a + b, 0)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Tepe gün:{" "}
              <span className="font-semibold text-slate-900">
                {Math.max(...mock.last7)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <MiniBars values={mock.last7} />
            <div className="flex-1 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
              <div className="text-xs font-semibold text-slate-700">
                Bugün hedef
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">
                150
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Hedefe kalan:{" "}
                <span className="font-semibold text-slate-900">22</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-orange-500/80 rounded-full"
                  style={{ width: "85%" }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Categories */}
        <Card
          title="Kategori Dağılımı"
          subtitle="Son 30 gün (toplam 294)"
          right={
            <Link
              href="/admin/categories"
              className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition"
            >
              Yönet →
            </Link>
          }
        >
          <div className="space-y-3">
            {mock.categories.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-9 w-9 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                      <Tag size={16} className="text-slate-800" />
                    </span>
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.count} kayıt</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {c.pct}%
                  </div>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-orange-500/75 rounded-full"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Alerts */}
        <Card title="Operasyon Notları" subtitle="Sistem sağlığı & öneriler">
          <div className="space-y-3">
            {mock.alerts.map((a, i) => (
              <div
                key={i}
                className={clsx(
                  "rounded-2xl border p-4 bg-white/70",
                  a.tone === "amber"
                    ? "border-amber-200/60"
                    : a.tone === "emerald"
                    ? "border-emerald-200/60"
                    : "border-slate-200/70"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-slate-900/5 ring-1 ring-slate-900/10 flex items-center justify-center">
                    {a.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="mt-1 text-xs text-slate-500 leading-relaxed">
                      {a.desc}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Link
              href="/admin/complaints"
              className="inline-flex items-center justify-center w-full rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
            >
              Moderasyon Kuyruğuna Git
              <ChevronRight size={18} className="ml-1" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent complaints */}
      <Card
        title="Son Şikayetler"
        subtitle="Hızlı aksiyon için en yeni kayıtlar"
        right={
          <Link
            href="/admin/complaints"
            className="text-sm font-semibold text-slate-900 hover:text-orange-600 transition"
          >
            Tümünü Gör →
          </Link>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200/70">
          <div className="grid grid-cols-12 bg-slate-50 text-xs font-semibold text-slate-600">
            <div className="col-span-2 px-4 py-3">ID</div>
            <div className="col-span-6 px-4 py-3">Başlık</div>
            <div className="col-span-2 px-4 py-3">Kategori</div>
            <div className="col-span-2 px-4 py-3 text-right">Durum</div>
          </div>

          <div className="divide-y divide-slate-200/70 bg-white/80">
            {mock.recent.map((r) => (
              <Link
                href={`/admin/complaints/${encodeURIComponent(r.id)}`}
                key={r.id}
                className="grid grid-cols-12 items-center hover:bg-slate-50/70 transition"
              >
                <div className="col-span-2 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">
                    {r.id}
                  </div>
                  <div className="text-xs text-slate-500">{r.createdAt}</div>
                </div>

                <div className="col-span-6 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {r.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                    Kullanıcı: anonim • Öncelik: normal
                  </div>
                </div>

                <div className="col-span-2 px-4 py-3">
                  <div className="text-sm text-slate-700">{r.category}</div>
                </div>

                <div className="col-span-2 px-4 py-3 flex justify-end">
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Hızlı aksiyonlar:</span>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition">
            <Clock size={16} className="text-slate-700" />
            İncelemede olanları aç
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-200/80 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-white transition">
            <ShieldCheck size={16} className="text-slate-700" />
            Bugün çözülenleri gör
          </button>
        </div>
      </Card>
    </div>
  )
}
