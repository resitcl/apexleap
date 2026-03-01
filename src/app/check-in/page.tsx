'use client'

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function CheckInContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [step, setStep] = useState<"identify" | "locating" | "submitting" | "success" | "error">("identify")
  const [docNumber, setDocNumber] = useState("")
  const [message, setMessage] = useState("")
  const [athleteName, setAthleteName] = useState("")

  useEffect(() => {
    if (!token) {
      setStep("error")
      setMessage("QR inválido o expirado. Pide un nuevo código al entrenador.")
    }
  }, [token])

  async function handleCheckIn() {
    if (!docNumber.trim()) return
    setStep("locating")
    setMessage("Verificando ubicación...")

    let lat: number | undefined
    let lng: number | undefined

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("no-geo")); return }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 0, enableHighAccuracy: true })
      })
      lat = position.coords.latitude
      lng = position.coords.longitude
    } catch {
      // proceed without GPS
    }

    setStep("submitting")
    setMessage("Registrando asistencia...")

    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, documentNumber: docNumber.trim(), lat, lng }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStep("error")
        setMessage(data.error ?? "Error al registrar asistencia")
      } else {
        setStep("success")
        setAthleteName(data.athleteName ?? "")
        setMessage("¡Asistencia registrada!")
      }
    } catch {
      setStep("error")
      setMessage("Error de conexión")
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
        <div className="space-y-4">
          {step === "identify" && (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-semibold">Check-in ApexLeap</p>
                <p className="text-muted-foreground text-sm mt-1">Ingresa tu RUT o número de documento</p>
              </div>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
                placeholder="Ej: 12345678-9"
                className="w-full text-center text-lg border-2 border-input rounded-xl px-4 py-3 focus:outline-none focus:border-primary bg-background"
                autoFocus
              />
              <button
                onClick={handleCheckIn}
                disabled={!docNumber.trim()}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar Asistencia
              </button>
            </div>
          )}

          {(step === "locating" || step === "submitting") && (
            <div className="space-y-3">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-lg font-semibold">{message}</p>
            </div>
          )}

          {step === "success" && (
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

          {step === "error" && (
            <div className="space-y-3">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-5xl">❌</span>
              </div>
              <p className="text-xl font-bold text-red-600">Error</p>
              <p className="text-muted-foreground">{message}</p>
              <button
                onClick={() => { setStep("identify"); setDocNumber("") }}
                className="mt-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Intentar de nuevo
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
