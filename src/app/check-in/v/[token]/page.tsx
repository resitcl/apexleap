'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAuth, SignIn } from '@clerk/nextjs'

type Step = 'loading' | 'need_login' | 'locating' | 'submitting' | 'success' | 'error'

export default function QRCheckInPage() {
  const params = useParams()
  const qrToken = params.token as string
  const { isLoaded, isSignedIn } = useAuth()

  const [step, setStep] = useState<Step>('loading')
  const [message, setMessage] = useState('')
  const [athleteName, setAthleteName] = useState('')
  const [venueName, setVenueName] = useState('')
  const [scheduleName, setScheduleName] = useState('')

  const doCheckIn = useCallback(async () => {
    setStep('locating')
    setMessage('Verificando ubicación...')

    let lat: number | undefined
    let lng: number | undefined

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('no-geo')); return }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true,
        })
      })
      lat = position.coords.latitude
      lng = position.coords.longitude
    } catch {
      // Will be validated server-side — if venue has GPS, server will reject
    }

    setStep('submitting')
    setMessage('Registrando asistencia...')

    try {
      const res = await fetch('/api/attendance/check-in/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken, lat, lng }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'not_authenticated') {
          setStep('need_login')
          return
        }
        if (data.alreadyCheckedIn) {
          setStep('success')
          setAthleteName(data.athleteName ?? '')
          setMessage('Ya registraste asistencia hoy')
          return
        }
        setStep('error')
        setMessage(data.error ?? 'Error al registrar asistencia')
      } else {
        setStep('success')
        setAthleteName(data.athleteName ?? '')
        setVenueName(data.venueName ?? '')
        setScheduleName(data.scheduleName ?? '')
        setMessage('¡Asistencia registrada!')
      }
    } catch {
      setStep('error')
      setMessage('Error de conexión. Verifica tu internet.')
    }
  }, [qrToken])

  // Auto-check-in when signed in
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setStep('need_login')
      return
    }
    doCheckIn()
  }, [isLoaded, isSignedIn, doCheckIn])

  const currentTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  const currentDate = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Logo */}
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <span className="text-primary-foreground font-bold text-2xl">AL</span>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="space-y-3">
            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        )}

        {/* Need Login */}
        {step === 'need_login' && (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold">Check-in de Asistencia</p>
              <p className="text-muted-foreground text-sm mt-1">
                Inicia sesión para registrar tu asistencia
              </p>
            </div>
            <div className="flex justify-center">
              <SignIn
                routing="hash"
                forceRedirectUrl={`/check-in/v/${qrToken}`}
                fallbackRedirectUrl={`/check-in/v/${qrToken}`}
                appearance={{
                  elements: {
                    rootBox: 'w-full',
                    card: 'shadow-none border rounded-xl',
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Locating / Submitting */}
        {(step === 'locating' || step === 'submitting') && (
          <div className="space-y-3">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-lg font-semibold">{message}</p>
            {step === 'locating' && (
              <p className="text-sm text-muted-foreground">
                Permite el acceso a tu ubicación cuando el navegador lo solicite
              </p>
            )}
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="space-y-4">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-14 h-14 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">¡Presente!</p>
              {athleteName && <p className="text-xl font-medium mt-2">{athleteName}</p>}
            </div>
            <div className="text-muted-foreground space-y-1">
              <p className="text-lg">{currentTime}</p>
              {venueName && <p className="text-sm">📍 {venueName}</p>}
              {scheduleName && <p className="text-sm">🥋 {scheduleName}</p>}
              <p className="text-xs capitalize">{currentDate}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-xl font-bold text-red-600">Error</p>
            <p className="text-muted-foreground text-sm">{message}</p>
            <button
              onClick={doCheckIn}
              className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-lg"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground/40 pt-4">
          Powered by ApexLeap
        </p>
      </div>
    </div>
  )
}
