'use client'

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { geolocationErrorMessage } from '@/lib/attendance/geolocationClient'

export default function VenueCheckInPage() {
  const params = useParams()
  const venueId = params.venueId as string
  
  const [step, setStep] = useState<"loading" | "identify" | "locating" | "submitting" | "success" | "error">("loading")
  const [docNumber, setDocNumber] = useState("")
  const [message, setMessage] = useState("")
  const [athleteName, setAthleteName] = useState("")
  const [venueName, setVenueName] = useState("")
  const [clubName, setClubName] = useState("")
  const [todaySessions, setTodaySessions] = useState<{ id: string; name: string; start_time: string; end_time: string }[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [requiresGeolocation, setRequiresGeolocation] = useState(false)

  // Fetch venue info and today's sessions
  useEffect(() => {
    async function fetchVenueInfo() {
      try {
        const res = await fetch(`/api/venues/${venueId}/check-in-info`)
        const data = await res.json()
        
        if (!res.ok) {
          setStep("error")
          setMessage(data.error ?? "Sede no encontrada")
          return
        }
        
        setVenueName(data.venueName)
        setClubName(data.clubName)
        setTodaySessions(data.sessions ?? [])
        setRequiresGeolocation(Boolean(data.requiresGeolocation))
        
        // Auto-select if only one session
        if (data.sessions?.length === 1) {
          setSelectedSession(data.sessions[0].id)
        }
        
        setStep("identify")
      } catch {
        setStep("error")
        setMessage("Error al cargar información de la sede")
      }
    }
    
    if (venueId) fetchVenueInfo()
  }, [venueId])

  async function handleCheckIn() {
    if (!docNumber.trim()) return
    if (todaySessions.length > 1 && !selectedSession) {
      setMessage("Selecciona una sesión")
      return
    }
    
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
    } catch (err) {
      if (requiresGeolocation) {
        setStep("error")
        setMessage(geolocationErrorMessage(err))
        return
      }
    }

    setStep("submitting")
    setMessage("Registrando asistencia...")

    try {
      const res = await fetch("/api/attendance/check-in/venue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          venueId,
          scheduleId: selectedSession || todaySessions[0]?.id,
          documentNumber: docNumber.trim(), 
          lat, 
          lng 
        }),
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

  const currentTime = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
  const currentDate = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Logo */}
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <span className="text-primary-foreground font-bold text-2xl">AL</span>
        </div>

        {/* Loading */}
        {step === "loading" && (
          <div className="space-y-3">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        )}

        {/* Identify */}
        {step === "identify" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">{clubName}</p>
              <p className="text-xl font-bold">📍 {venueName}</p>
              <p className="text-sm text-muted-foreground capitalize mt-1">{currentDate}</p>
            </div>

            {todaySessions.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-800 font-medium">No hay sesiones programadas hoy</p>
                <p className="text-yellow-600 text-sm mt-1">Contacta a tu entrenador</p>
              </div>
            ) : (
              <>
                {todaySessions.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selecciona tu sesión:</p>
                    <div className="grid gap-2">
                      {todaySessions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSession(s.id)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            selectedSession === s.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-input hover:border-primary/50'
                          }`}
                        >
                          <p className="font-medium">{s.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {todaySessions.length === 1 && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="font-medium">{todaySessions[0].name}</p>
                    <p className="text-sm text-muted-foreground">
                      {todaySessions[0].start_time.slice(0, 5)} - {todaySessions[0].end_time.slice(0, 5)}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Ingresa tu RUT o documento</p>
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
                    disabled={!docNumber.trim() || (todaySessions.length > 1 && !selectedSession)}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    ✓ Marcar Asistencia
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading states */}
        {(step === "locating" || step === "submitting") && (
          <div className="space-y-3">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-lg font-semibold">{message}</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="space-y-4">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-6xl">✅</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">¡Presente!</p>
              {athleteName && <p className="text-xl font-medium mt-2">{athleteName}</p>}
            </div>
            <div className="text-muted-foreground">
              <p className="text-lg">{currentTime}</p>
              <p className="text-sm">📍 {venueName}</p>
            </div>
            <button
              onClick={() => { setStep("identify"); setDocNumber(""); setAthleteName("") }}
              className="mt-4 px-6 py-2 bg-muted text-foreground rounded-lg font-medium"
            >
              Nuevo check-in
            </button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="space-y-4">
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

        {/* Footer */}
        <p className="text-xs text-muted-foreground/50 pt-4">
          Powered by ApexLeap
        </p>
      </div>
    </div>
  )
}
