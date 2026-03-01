'use client'

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function CheckInContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"idle" | "locating" | "submitting" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [athleteName, setAthleteName] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("QR inválido o expirado")
      return
    }
    // Auto-start on mount
    handleCheckIn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleCheckIn() {
    setStatus("locating")
    setMessage("Verificando ubicación...")

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocalización no disponible"))
          return
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true,
        })
      })

      setStatus("submitting")
      setMessage("Registrando asistencia...")

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setMessage(data.error ?? "Error al registrar asistencia")
      } else {
        setStatus("success")
        setAthleteName(data.athleteName ?? "")
        setMessage("¡Asistencia registrada!")
      }
    } catch (err) {
      // If geolocation denied, try without GPS
      if ((err as Error).name === "GeolocationPositionError" || typeof (err as { code?: number }).code === "number") {
        setStatus("submitting")
        setMessage("Registrando sin GPS...")
        try {
          const res = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          })
          const data = await res.json()
          if (!res.ok) {
            setStatus("error")
            setMessage(data.error ?? "Error al registrar asistencia")
          } else {
            setStatus("success")
            setAthleteName(data.athleteName ?? "")
            setMessage("¡Asistencia registrada!")
          }
        } catch {
          setStatus("error")
          setMessage("Error de conexión")
        }
      } else {
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Error inesperado")
      }
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Logo */}
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-primary-foreground font-bold text-2xl">AL</span>
        </div>

        {/* Status */}
        <div className="space-y-3">
          {status === "idle" && (
            <div className="space-y-2">
              <p className="text-xl font-semibold">Check-in ApexLeap</p>
              <p className="text-muted-foreground text-sm">Iniciando validación...</p>
            </div>
          )}

          {(status === "locating" || status === "submitting") && (
            <div className="space-y-3">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-lg font-semibold">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-green-600">¡Presente!</p>
              {athleteName && <p className="text-lg font-medium">{athleteName}</p>}
              <p className="text-muted-foreground text-sm">
                {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">❌</span>
              </div>
              <p className="text-xl font-bold text-red-600">Error</p>
              <p className="text-muted-foreground">{message}</p>
              <button
                onClick={handleCheckIn}
                className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckInContent />
    </Suspense>
  )
}
