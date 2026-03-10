'use client'

import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Printer, Download, QrCode } from 'lucide-react'

interface Props {
  venueId: string
  venueName: string
  clubName: string
  clubSlug: string
}

export function VenueQRCode({ venueId, venueName, clubName, clubSlug }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  
  // URL fija que reconoce el día automáticamente
  const checkInUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/check-in/venue/${venueId}`
    : `/check-in/venue/${venueId}`

  function handlePrint() {
    const content = printRef.current
    if (!content) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Check-in - ${venueName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 40px;
              background: white;
            }
            .container {
              text-align: center;
              border: 3px solid #000;
              border-radius: 24px;
              padding: 40px;
              max-width: 400px;
            }
            .club-name {
              font-size: 14px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            .venue-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 24px;
            }
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 16px;
              display: inline-block;
              margin-bottom: 24px;
            }
            .instructions {
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .sub-instructions {
              font-size: 14px;
              color: #666;
            }
            .footer {
              margin-top: 24px;
              font-size: 12px;
              color: #999;
            }
            @media print {
              body { padding: 0; }
              .container { border-width: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <p class="club-name">${clubName}</p>
            <h1 class="venue-name">📍 ${venueName}</h1>
            <div class="qr-container">
              ${content.querySelector('canvas')?.outerHTML || ''}
            </div>
            <p class="instructions">Escanea para marcar asistencia</p>
            <p class="sub-instructions">El sistema detecta automáticamente la sesión del día</p>
            <p class="footer">Powered by ApexLeap</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  function handleDownload() {
    const canvas = printRef.current?.querySelector('canvas')
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `qr-${clubSlug}-${venueName.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="space-y-4">
      <div ref={printRef} className="flex flex-col items-center p-6 bg-white rounded-xl border-2 border-dashed">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{clubName}</p>
        <p className="text-lg font-bold mb-4">📍 {venueName}</p>
        <QRCodeCanvas 
          value={checkInUrl} 
          size={180} 
          level="H" 
          marginSize={2}
          imageSettings={{
            src: '/logo.png',
            height: 30,
            width: 30,
            excavate: true,
          }}
        />
        <p className="text-sm font-medium mt-4">Escanea para marcar asistencia</p>
        <p className="text-xs text-muted-foreground">Detecta automáticamente la sesión del día</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handlePrint}>
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleDownload}>
          <Download className="w-4 h-4" />
          Descargar PNG
        </Button>
      </div>
    </div>
  )
}
