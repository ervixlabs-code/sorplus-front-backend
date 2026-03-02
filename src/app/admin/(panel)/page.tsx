"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

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

export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getToken()

    if (token) {
      // giriş yapılmış
      router.replace("/admin/dashboard")
    } else {
      // login yok
      router.replace("/admin/login")
    }
  }, [router])

  // loading boş ekran (flash olmasın)
  return null
}