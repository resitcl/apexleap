'use client'

import { useCallback, useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, QrCode, Loader2 } from "lucide-react"

export function QRCheckInDisplay() {
  const [token, setToken] = useState("")
  const [expiresIn, setExpiresIn] = useState(60)
  const [appUrl, setAppUrl] = useState("")
  const [loading, setLoading] = useState(false)

  const generateToken = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/attendance/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      const data = await res.json()
      if (res.ok && data.token) {
        setToken(data.token)
        setExpiresIn(60)
      }
    } catch {
      // fallback to client-side token if API fails
      setToken(Date.now().toString(36) + Math.random().toString(36).slice(2, 8))
      setExpiresIn(60)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setAppUrl(window.location.origin)
    generateToken()
  }, [generateToken])

  useEffect(() => {
    if (!token) return
    if (expiresIn <= 0) { generateToken(); return }
    const timer = setTimeout(() => setExpiresIn((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [expiresIn, token, generateToken])

  const checkInUrl = `${appUrl}/check-in?token=${token}`

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="w-4 h-4" />
          Check-in QR
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {loading ? (
          <div className="w-[200px] h-[200px] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : token ? (
          <div className="p-4 bg-white rounded-xl border-2 border-dashed">
            <QRCodeSVG value={checkInUrl} size={200} level="M" includeMargin={false} />
          </div>
        ) : null}

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Los alumnos escanean este código para registrar asistencia</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              expiresIn > 20 ? "bg-green-500" : expiresIn > 10 ? "bg-yellow-500" : "bg-red-500"
            } animate-pulse`} />
            <span className="text-xs font-mono">Expira en {expiresIn}s</span>
          </div>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => generateToken()} disabled={loading}>
          <RefreshCw className="w-4 h-4" />
          Regenerar
        </Button>
      </CardContent>
    </Card>
  )
}
