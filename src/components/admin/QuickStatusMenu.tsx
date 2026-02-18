"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { PauseCircle, Send, CheckCircle2, XCircle } from "lucide-react"
import type { ComplaintStatus } from "@/components/admin/StatusBadge"

type Props = {
  complaintId: string
  currentStatus: ComplaintStatus
  onChangeStatus: (next: ComplaintStatus) => Promise<void> | void
  size?: number
}

type Action = {
  key: "accept" | "hold" | "reject"
  label: string
  status: ComplaintStatus
  icon: React.ReactNode
  className: string
  hint: string
}

export default function QuickStatusMenu({
  complaintId,
  currentStatus,
  onChangeStatus,
  size = 18,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<null | ComplaintStatus>(null)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const actions: Action[] = useMemo(
    () => [
      {
        key: "accept",
        label: "Yayına Al",
        status: "YAYINDA",
        icon: <CheckCircle2 size={16} />,
        className:
          "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200/70",
        hint: "Şikayet direkt canlıya alınır.",
      },
      {
        key: "hold",
        label: "Beklet",
        status: "INCELEMEDE",
        icon: <PauseCircle size={16} />,
        className:
          "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-200/70",
        hint: "Taslak / incelemede kalır.",
      },
      {
        key: "reject",
        label: "Reddet",
        status: "REDDEDILDI",
        icon: <XCircle size={16} />,
        className:
          "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200/70",
        hint: "Canlıya düşmez.",
      },
    ],
    []
  )

  async function apply(next: ComplaintStatus) {
    if (loading) return
    if (next === currentStatus) {
      setOpen(false)
      return
    }

    setLoading(next)
    try {
      await onChangeStatus(next)
      setOpen(false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={clsx(
          "h-10 w-10 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm hover:bg-white transition flex items-center justify-center",
          open && "ring-2 ring-orange-200"
        )}
        title="Hızlı durum değiştir"
      >
        <Send size={size} className="text-slate-700" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[46px] z-50 w-[260px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
          <div className="px-4 py-3 border-b border-slate-200/70">
            <div className="text-xs font-semibold text-slate-500">
              Hızlı Moderasyon
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              {complaintId}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Mevcut durum:{" "}
              <span className="font-semibold text-slate-800">
                {currentStatus}
              </span>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {actions.map((a) => {
              const isActive = currentStatus === a.status
              const isLoading = loading === a.status

              return (
                <button
                  key={a.key}
                  type="button"
                  disabled={!!loading}
                  onClick={() => apply(a.status)}
                  className={clsx(
                    "w-full rounded-2xl px-3 py-3 text-left transition focus:outline-none focus:ring-4",
                    a.className,
                    isActive && "opacity-90",
                    !!loading && "opacity-80 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex">{a.icon}</span>
                      <span className="text-sm font-semibold">
                        {isLoading ? "Uygulanıyor…" : a.label}
                      </span>
                    </div>

                    <span
                      className={clsx(
                        "text-[11px] font-semibold px-2 py-1 rounded-full",
                        "bg-white/20 text-white"
                      )}
                    >
                      {isActive ? "Seçili" : "Seç"}
                    </span>
                  </div>

                  <div className="mt-1 text-[12px] opacity-90">{a.hint}</div>
                </button>
              )
            })}
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 text-slate-700 px-3 py-2 text-sm font-semibold transition"
            >
              Kapat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
