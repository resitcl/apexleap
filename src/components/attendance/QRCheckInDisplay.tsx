'use client'

import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, QrCode } from "lucide-react"

export function QRCheckInDisplay() {
  const [token, setToken] = useState("")
  const [expiresIn, setExpiresIn] = useState(60)
  const [appUrl, setAppUrl] = useState("")

  function generateToken() {
    const t = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    setToken(t)
    setExpiresIn(60)
  }

  useEffect(() => {
    setAppUrl(window.location.origin)
    generateToken()
  }, [])

  useEffect(() => {
    if (expiresIn <= 0) { generateToken(); return }
    const timer = setTimeout(() => setExpiresIn((v) => v - 1), 1000)
    return () => clearTimeout(timer)
  }, [expiresIn])

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
        {token && (
          <div className="p-4 bg-white rounded-xl border-2 border-dashed">
            <QRCodeSVG
              value={checkInUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Los alumnos escanean este código para registrar asistencia
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${expiresIn > 15 ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
            <span className="text-xs font-mono">
              Expira en {expiresIn}s
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={generateToken}
        >
          <RefreshCw className="w-4 h-4" />
          Regenerar
        </Button>

        <p className="text-xs text-muted-foreground text-center break-all px-2">
          {checkInUrl}
        </p>
      </CardContent>
    </Card>
  )
}
