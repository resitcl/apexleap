'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, Camera, QrCode, ScanLine, 
  CheckCircle, AlertCircle, Loader2 
} from 'lucide-react'
import Link from 'next/link'

export default function QRScannerPage() {
  const router = useRouter()
  const [manualCode, setManualCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Check if camera is available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setHasCamera(true)
    }
  }, [])

  // Start camera scanning
  const startScanning = async () => {
    if (!videoRef.current) return
    
    try {
      setScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      })
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    } catch (err) {
      console.error('Camera error:', err)
      toast.error('No se pudo acceder a la cámara. Usa el código manual.')
      setScanning(false)
    }
  }

  // Stop camera
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  // Scan frame for QR
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || video.readyState !== 4) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Here you would use a QR scanning library like @zxing/library
    // For now, we'll just show the manual entry
  }

  // Submit check-in
  const handleSubmit = async () => {
    if (!manualCode.trim()) {
      toast.error('Ingresa un código de sesión')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: manualCode.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al marcar asistencia')
      }

      toast.success('Asistencia marcada correctamente')
      router.push('/dashboard/athlete/attendance')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al marcar asistencia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard/athlete/attendance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Marcar Asistencia</h1>
        </div>

        {/* Camera Scanner */}
        {hasCamera && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="w-4 h-4" /> Escanear Código QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                {scanning ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 w-full h-full"
                      style={{ display: 'none' }}
                    />
                    {/* Scanner overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-lg">
                        <ScanLine className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 text-white/70" />
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-4 left-1/2 -translate-x-1/2"
                      onClick={stopScanning}
                    >
                      Detener
                    </Button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3">
                    <QrCode className="w-16 h-16" />
                    <p className="text-sm">Cámara no activada</p>
                    <Button onClick={startScanning} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Activar Cámara
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Entry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ScanLine className="w-4 h-4" /> Ingresar Código Manual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Si no puedes escanear el QR, ingresa el código de sesión manualmente:
              </p>
              <Input
                placeholder="Ej: SES-2024-001"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleSubmit}
              disabled={isSubmitting || !manualCode.trim()}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Marcando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Marcar Asistencia</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="bg-muted/50 border-border">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">¿Dónde encuentro el código?</p>
              <p>El código QR o de sesión lo proporciona tu entrenador o staff del club al inicio de cada entrenamiento.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
