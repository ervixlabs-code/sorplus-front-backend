/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import clsx from "clsx"
import { ArrowLeft, Check, Sparkles, Trash2 } from "lucide-react"

/** ================== CONFIG ================== */
const API_BASE = (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() || "http://localhost:3002"

type ApiError = Error & { status?: number; data?: any }

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text || null
  }
}

function getToken(): string | null {
  try {
    return (
      localStorage.getItem("sv_admin_token") ||
      localStorage.getItem("ADMIN_TOKEN") ||
      localStorage.getItem("token") ||
      null
    )
  } catch {
    return null
  }
}

async function api<T>(path: string, init?: RequestInit & { json?: any }): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    ...(init?.headers as any),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let body = init?.body
  if ((init as any)?.json !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify((init as any).json)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body,
    cache: "no-store",
  })

  const data = await safeJson(res)

  if (!res.ok) {
    const msg = (data && typeof data === "object" && (data.message || data.error)) || `HTTP ${res.status}`
    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(", ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
}

/** ===== backend route resolver =====
 * Controller: @Controller('admin/categories')
 * Bazı projelerde global prefix '/api' olabiliyor.
 * Bu yüzden önce /api/admin/... dener, 404 ise /admin/... dener.
 */
async function apiAdmin<T>(endpointNoPrefix: string, init?: RequestInit & { json?: any }): Promise<T> {
  const tryPaths = [`/api${endpointNoPrefix}`, `${endpointNoPrefix}`]
  let lastErr: any = null

  for (const p of tryPaths) {
    try {
      return await api<T>(p, init)
    } catch (e: any) {
      lastErr = e
      if (e?.status !== 404) throw e
    }
  }
  throw lastErr
}

/** ================== TYPES ================== */
type ApiCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
  seoText?: string | null
  isActive: boolean
  sortOrder: number
  createdAt?: string | null
  updatedAt?: string | null
}

type Category = {
  id: string
  name: string
  slug: string
  description: string
  seoTitle: string
  seoDescription: string
  seoText: string
  isActive: boolean
  sortOrder: number
  createdAtISO?: string | null
}

function mapCategory(raw: ApiCategory): Category {
  return {
    id: String(raw.id),
    name: String(raw.name || ""),
    slug: String(raw.slug || ""),
    description: String(raw.description || ""),
    seoTitle: String(raw.seoTitle || ""),
    seoDescription: String(raw.seoDescription || ""),
    seoText: String(raw.seoText || ""),
    isActive: Boolean(raw.isActive),
    sortOrder: Number.isFinite(Number(raw.sortOrder)) ? Number(raw.sortOrder) : 0,
    createdAtISO: raw.createdAt ?? null,
  }
}

function formatTR(iso?: string | null) {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function slugifyTR(input: string) {
  const s = (input || "").trim().toLowerCase()
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", "i̇": "i", ö: "o", ş: "s", ü: "u" }

  const normalized = s
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || "kategori"
}

function normalizeText(input: string) {
  const t = (input || "").trim()
  return t.length ? t : ""
}

/** ================== Toast ================== */
type ToastKind = "success" | "error" | "info"
type ToastState = { open: boolean; kind: ToastKind; title: string; desc?: string }

function Toast({ state, onClose }: { state: ToastState; onClose: () => void }) {
  if (!state.open) return null
  const base =
    "fixed z-[100] bottom-4 right-4 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border shadow-[0_16px_60px_rgba(15,23,42,0.22)] backdrop-blur-xl overflow-hidden"
  const style =
    state.kind === "success"
      ? "bg-emerald-600 text-white border-emerald-500/30"
      : state.kind === "error"
      ? "bg-rose-600 text-white border-rose-500/30"
      : "bg-slate-900 text-white border-white/10"

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

/** ================== Page ================== */
export default function AdminCategoryEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = String(params?.id || "")

  const tokenMissing = !getToken()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState<number>(0)

  const [description, setDescription] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoText, setSeoText] = useState("")
  const [createdAtISO, setCreatedAtISO] = useState<string | null>(null)

  const [original, setOriginal] = useState<Category | null>(null)

  const [toast, setToast] = useState<ToastState>({ open: false, kind: "info", title: "" })
  const toastTimer = useRef<number | null>(null)
  function showToast(kind: ToastKind, title: string, desc?: string) {
    setToast({ open: true, kind, title, desc })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 3600)
  }

  async function fetchDetail() {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    try {
      const data = await apiAdmin<ApiCategory>(`/admin/categories/${encodeURIComponent(id)}`, { method: "GET" })
      const c = mapCategory(data)

      setOriginal(c)
      setName(c.name)
      setSlug(c.slug)
      setIsActive(c.isActive)
      setSortOrder(c.sortOrder)
      setDescription(c.description)
      setSeoTitle(c.seoTitle)
      setSeoDescription(c.seoDescription)
      setSeoText(c.seoText)
      setCreatedAtISO(c.createdAtISO ?? null)

      setLoading(false)
    } catch (e: any) {
      if (e?.status === 404) setNotFound(true)
      else showToast("error", "Kategori alınamadı", e?.message || "Bir hata oluştu.")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenMissing) {
      setLoading(false)
      return
    }
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = "Kategori adı en az 2 karakter olmalı."
    if (slug.trim().length < 2) e.slug = "Slug en az 2 karakter olmalı."
    const n = Number(sortOrder)
    if (!Number.isFinite(n) || n < 0) e.sortOrder = "Sıra 0 veya daha büyük olmalı."
    if (seoTitle.trim().length > 70) e.seoTitle = "SEO Title çok uzun (öneri: 50–70 karakter)."
    if (seoDescription.trim().length > 170) e.seoDescription = "SEO Description çok uzun (öneri: 120–160 karakter)."
    return e
  }, [name, slug, sortOrder, seoTitle, seoDescription])

  const isDirty = useMemo(() => {
    if (!original) return false
    return (
      name.trim() !== original.name ||
      slug.trim() !== original.slug ||
      Boolean(isActive) !== Boolean(original.isActive) ||
      Number(sortOrder) !== original.sortOrder ||
      normalizeText(description) !== normalizeText(original.description) ||
      normalizeText(seoTitle) !== normalizeText(original.seoTitle) ||
      normalizeText(seoDescription) !== normalizeText(original.seoDescription) ||
      normalizeText(seoText) !== normalizeText(original.seoText)
    )
  }, [original, name, slug, isActive, sortOrder, description, seoTitle, seoDescription, seoText])

  const canSave = useMemo(
    () => Object.keys(errors).length === 0 && isDirty && !saving && !tokenMissing,
    [errors, isDirty, saving, tokenMissing]
  )

  function onAutoSlug() {
    if (!name.trim()) return
    setSlug(slugifyTR(name))
  }

  async function onSave() {
    if (!original) return
    if (!canSave) {
      showToast("error", "Eksik alan var", "Formu kontrol edip tekrar dene.")
      return
    }

    setSaving(true)
    try {
      // ✅ PartialType(UpdateCategoryDto) → sadece değişen alanları gönderiyoruz
      const payload: any = {}

      if (name.trim() !== original.name) payload.name = name.trim()

      // slug: sadece değiştiyse gönder
      if (slug.trim() !== original.slug) {
        const s = slug.trim()
        // boşsa hiç gönderme, backend dto.slug undefined kalsın
        if (s) payload.slug = s
      }

      if (Boolean(isActive) !== Boolean(original.isActive)) payload.isActive = Boolean(isActive)

      const so = Number(sortOrder)
      if (Number.isFinite(so) && so !== original.sortOrder) payload.sortOrder = so

      const d = normalizeText(description)
      const od = normalizeText(original.description)
      if (d !== od) payload.description = d ? d : null

      const st = normalizeText(seoTitle)
      const ost = normalizeText(original.seoTitle)
      if (st !== ost) payload.seoTitle = st ? st : null

      const sd = normalizeText(seoDescription)
      const osd = normalizeText(original.seoDescription)
      if (sd !== osd) payload.seoDescription = sd ? sd : null

      const stext = normalizeText(seoText)
      const ostext = normalizeText(original.seoText)
      if (stext !== ostext) payload.seoText = stext ? stext : null

      if (Object.keys(payload).length === 0) {
        showToast("info", "Değişiklik yok", "Kaydedilecek bir şey bulamadım.")
        setSaving(false)
        return
      }

      await apiAdmin(`/admin/categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        json: payload,
      })

      showToast("success", "Kaydedildi", "Listeye yönlendiriliyorsun…")
      setTimeout(() => router.push("/admin/categories"), 450)
    } catch (e: any) {
      showToast("error", "Kategori kaydedilemedi", e?.message || "Bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!id) return
    if (!confirm("Bu kategoriyi silmek istediğine emin misin?")) return

    setDeleting(true)
    try {
      await apiAdmin(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" })
      showToast("success", "Kategori silindi", "Listeye yönlendiriliyorsun…")
      setTimeout(() => router.push("/admin/categories"), 450)
    } catch (e: any) {
      showToast("error", "Silme başarısız", e?.message || "Bir hata oluştu.")
    } finally {
      setDeleting(false)
    }
  }

  if (tokenMissing) {
    return (
      <div className="space-y-3">
        <div className="text-xl font-semibold">Admin token bulunamadı</div>
        <div className="text-sm text-slate-600">
          Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token) ile kaydetmelisin.
        </div>
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
        >
          Admin’e dön
        </button>
      </div>
    )
  }

  if (loading) return <div className="text-sm text-slate-600">Yükleniyor…</div>

  if (notFound || !original) {
    return (
      <div className="space-y-3">
        <div className="text-xl font-semibold">Kategori bulunamadı</div>
        <button
          onClick={() => router.push("/admin/categories")}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-slate-800 transition"
        >
          Listeye dön
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toast state={toast} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori Düzenle</h1>
          <p className="text-slate-500 mt-1">
            <span className="font-semibold text-slate-900">{id}</span> • {formatTR(createdAtISO)}
          </p>
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
            onClick={onSave}
            disabled={!canSave}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition",
              canSave ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-500 cursor-not-allowed"
            )}
          >
            <Check size={18} className={clsx(canSave ? "text-orange-300" : "text-slate-400")} />
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className={clsx(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm transition text-white",
              deleting ? "bg-rose-400 cursor-not-allowed" : "bg-rose-600 hover:bg-rose-700"
            )}
            title="Sil"
          >
            <Trash2 size={18} />
            {deleting ? "Siliniyor…" : "Sil"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-[0_14px_50px_rgba(15,23,42,0.08)]">
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Kategori Adı</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Kargo & Lojistik"
                className={clsx(
                  "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                  errors.name ? "border-rose-300" : "border-slate-200/80"
                )}
              />
              {errors.name ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.name}</div> : null}
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs font-semibold text-slate-600">Slug</div>
                <button type="button" onClick={onAutoSlug} className="text-xs font-extrabold text-orange-600 hover:text-orange-500">
                  Otomatik oluştur
                </button>
              </div>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="örn: kargo-lojistik"
                className={clsx(
                  "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                  errors.slug ? "border-rose-300" : "border-slate-200/80"
                )}
              />
              {errors.slug ? <div className="mt-2 text-xs font-semibold text-rose-600">{errors.slug}</div> : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-2">Durum</div>
                <select
                  value={isActive ? "ACTIVE" : "PASSIVE"}
                  onChange={(e) => setIsActive(e.target.value === "ACTIVE")}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="PASSIVE">Pasif</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-2">Sıra</div>
                <input
                  type="number"
                  min={0}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))}
                  className={clsx(
                    "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                    errors.sortOrder ? "border-rose-300" : "border-slate-200/80"
                  )}
                />
                {errors.sortOrder ? (
                  <div className="mt-2 text-xs font-semibold text-rose-600">{errors.sortOrder}</div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 mb-2">Kategori Açıklaması (ops.)</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Kargo firmaları, teslimat, gecikme, iade süreçleri..."
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">SEO Alanları</div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">SEO Title (ops.)</div>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Örn: Kargo & Lojistik Şikayetleri"
                    className={clsx(
                      "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                      errors.seoTitle ? "border-rose-300" : "border-slate-200/80"
                    )}
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    {seoTitle.trim().length}/70
                    {errors.seoTitle ? <span className="ml-2 text-rose-600 font-semibold">{errors.seoTitle}</span> : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">SEO Description (ops.)</div>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    placeholder="Örn: Kargo ve lojistikte yaşanan sorunları okuyun, deneyim paylaşın..."
                    className={clsx(
                      "w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200",
                      errors.seoDescription ? "border-rose-300" : "border-slate-200/80"
                    )}
                  />
                  <div className="mt-1 text-[11px] text-slate-500">
                    {seoDescription.trim().length}/170
                    {errors.seoDescription ? (
                      <span className="ml-2 text-rose-600 font-semibold">{errors.seoDescription}</span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">Sayfa Altı SEO Metni (ops.)</div>
                  <textarea
                    value={seoText}
                    onChange={(e) => setSeoText(e.target.value)}
                    rows={6}
                    placeholder="Bu sayfada kargo süreçleriyle ilgili..."
                    className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200"
                  />
                </div>
              </div>
            </div>

            {!isDirty ? (
              <div className="text-xs text-slate-500">Henüz değişiklik yok.</div>
            ) : (
              <div className="text-xs font-semibold text-orange-600">Değişiklik var • Kaydet butonu aktif</div>
            )}
          </div>

          {/* Right preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Önizleme</div>
                  <div className="mt-1 text-xs text-slate-500">Public listede böyle görünecek</div>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 ring-1 ring-orange-500/15 flex items-center justify-center">
                  <Sparkles size={18} className="text-orange-600" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/80 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{name.trim() || "Kategori Adı"}</div>
                  <div className="mt-1 text-xs text-slate-500">{slug.trim() || "slug"}</div>
                  {description.trim() ? (
                    <div className="mt-3 text-xs text-slate-600 leading-relaxed line-clamp-4">{description.trim()}</div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-400">Açıklama eklenmedi.</div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      isActive
                        ? "bg-emerald-600/10 text-emerald-800 ring-emerald-600/15"
                        : "bg-rose-600/10 text-rose-800 ring-rose-600/15"
                    )}
                  >
                    {isActive ? "Aktif" : "Pasif"}
                  </span>
                  <div className="text-xs font-semibold text-slate-700">Sıra: {Number.isFinite(Number(sortOrder)) ? sortOrder : "—"}</div>
                </div>
              </div>

              {(seoTitle.trim() || seoDescription.trim()) && (
                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-700">SEO Önizleme</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{seoTitle.trim() || name.trim() || "Başlık"}</div>
                  <div className="mt-1 text-xs text-slate-500">{seoDescription.trim() || "Meta description eklenmedi."}</div>
                </div>
              )}

              <div className="mt-4 text-xs text-slate-500">
                Kaydet işlemi API’ye gider: <span className="font-semibold text-slate-900">UpdateCategoryDto (partial)</span>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
