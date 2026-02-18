// src/components/admin/StatusBadge.tsx
import clsx from "clsx"

export type ComplaintStatus =
  | "YENI"
  | "INCELEMEDE"
  | "YAYINDA"
  | "COZULDU"
  | "REDDEDILDI"

const LABEL: Record<ComplaintStatus, string> = {
  YENI: "Yeni",
  INCELEMEDE: "İncelemede",
  YAYINDA: "Yayında",
  COZULDU: "Çözüldü",
  REDDEDILDI: "Reddedildi",
}

export default function StatusBadge({ status }: { status: ComplaintStatus }) {
  const style =
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
        style
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {LABEL[status]}
    </span>
  )
}
