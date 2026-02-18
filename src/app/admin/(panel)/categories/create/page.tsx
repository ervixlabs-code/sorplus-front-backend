/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { ArrowLeft, Check, Sparkles } from "lucide-react"
import { useToast } from "@/components/admin/Toast"

/** ================== CONFIG ================== */
const API_BASE =
  (process.env as any)?.NEXT_PUBLIC_ADMIN_API_BASE?.trim() ||
  "http://localhost:3002"

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
    const msg =
      (data && typeof data === "object" && (data.message || data.error)) ||
      `HTTP ${res.status}`

    const err: ApiError = new Error(Array.isArray(msg) ? msg.join(", ") : String(msg))
    err.status = res.status
    err.data = data
    throw err
  }

  return data as T
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
  createdAt?: string
}

/** ================== Helpers ================== */
function slugify(input: string) {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
  return s || "kategori"
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

function normalizeText(input: string) {
  const t = input.trim()
  return t.length ? t : ""
}

export default function AdminCategoryCreatePage() {
  const router = useRouter()
  const { showToast } = useToast()

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState<number>(0)

  const [description, setDescription] = useState("")
  const [seoTitle, setSeoTitle] = useState("")
  const [seoDescription, setSeoDescription] = useState("")
  const [seoText, setSeoText] = useState("")

  const [saving, setSaving] = useState(false)

  // auto slug
  useEffect(() => {
    if (!name.trim()) {
      setSlug("")
      return
    }
    setSlug(slugify(name))
  }, [name])

  const errors = useMemo(() => {
    const e: Record<string, string> = {}
    if (name.trim().length < 2) e.name = "Kategori adı en az 2 karakter olmalı."
    if (slug.trim().length < 2) e.slug = "Slug en az 2 karakter olmalı."
    if (!Number.isFinite(sortOrder)) e.sortOrder = "Sıra geçersiz."
    if (seoTitle.trim().length > 70) e.seoTitle = "SEO Title çok uzun (öneri: 50–70 karakter)."
    if (seoDescription.trim().length > 170) e.seoDescription = "SEO Description çok uzun (öneri: 120–160 karakter)."
    return e
  }, [name, slug, sortOrder, seoTitle, seoDescription])

  const canSave = useMemo(() => Object.keys(errors).length === 0 && !saving, [errors, saving])

  const tokenMissing = !getToken()

  async function onSave() {
    if (!canSave) {
      showToast("error", "Eksik alan var", "Formu kontrol edip tekrar dene.")
      return
    }
    if (tokenMissing) {
      showToast("error", "Admin token yok", "Önce giriş yapıp token’ı localStorage’a yazmalısın.")
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder),
      }

      // opsiyonel alanlar: boşsa göndermeyelim (db'de null kalsın)
      const d = normalizeText(description)
      const st = normalizeText(seoTitle)
      const sd = normalizeText(seoDescription)
      const stext = normalizeText(seoText)

      if (d) payload.description = d
      if (st) payload.seoTitle = st
      if (sd) payload.seoDescription = sd
      if (stext) payload.seoText = stext

      // sortOrder NaN gelirse göndermeyelim
      if (!Number.isFinite(payload.sortOrder)) delete payload.sortOrder

      const created = await api<ApiCategory>(`/api/admin/categories`, {
        method: "POST",
        json: payload,
      })

      showToast(
        "success",
        "Kategori eklendi",
        created?.id ? `ID: ${created.id} • Listeye yönlendiriliyorsun…` : "Listeye yönlendiriliyorsun…"
      )

      setTimeout(() => router.push("/admin/categories"), 450)
    } catch (e: any) {
      showToast("error", "Kategori kaydedilemedi", e?.message || "Bir hata oluştu.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori Ekle</h1>
          <p className="text-slate-500 mt-1">Yeni kategori oluştur</p>
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
        </div>
      </div>

      {tokenMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-900">
          Admin token bulunamadı. Login sonrası token’ı localStorage’a <b>sv_admin_token</b> (veya ADMIN_TOKEN/token)
          ile kaydetmelisin.
        </div>
      ) : null}

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
              <div className="text-xs font-semibold text-slate-600 mb-2">Slug</div>
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
              <div className="mt-2 text-xs text-slate-500">İpucu: Ad değişince otomatik oluşur, istersen elle düzenle.</div>
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
                placeholder="Kategoriyi kısa bir paragrafla anlat (listelerde/SEO’da kullanılabilir)."
                className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200"
              />
              <div className="mt-2 text-xs text-slate-500">Örn: 2–4 cümle ideal. (description)</div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <div className="text-sm font-semibold text-slate-900 mb-3">SEO Alanları</div>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">SEO Title (ops.)</div>
                  <input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Örn: Kargo Şikayetleri ve Çözümleri | Şikayetvar"
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
                    placeholder="Örn: Kargo ve lojistik firmalarıyla yaşadığın sorunları paylaş, çözüm ve destek al…"
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
                    placeholder="Kategori sayfasının altında gösterilecek uzun SEO metni…"
                    className="w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-200"
                  />
                  <div className="mt-2 text-xs text-slate-500">Örn: 1–3 paragraf uzun metin. (seoText)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Önizleme</div>
                  <div className="mt-1 text-xs text-slate-500">Listede böyle görünecek</div>
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

                  <div className="text-xs font-semibold text-slate-700">
                    Sıra: {Number.isFinite(sortOrder) ? sortOrder : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Kaydet dersen kategori <span className="font-semibold text-slate-900">API</span> üzerinden oluşturulur.
                <div className="mt-1 text-slate-400">Tarih: {formatTR(null)} (backend oluşturacak)</div>
              </div>

              {(seoTitle.trim() || seoDescription.trim()) && (
                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                  <div className="text-xs font-semibold text-slate-700">SEO Önizleme</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">{seoTitle.trim() || name.trim() || "Başlık"}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {seoDescription.trim() ||
                      "Meta description girersen Google snippet gibi burada görünecek."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
