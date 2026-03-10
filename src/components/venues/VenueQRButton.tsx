'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { VenueQRCode } from './VenueQRCode'

interface Props {
  venueId: string
  venueName: string
  clubName: string
  clubSlug: string
}

export function VenueQRButton({ venueId, venueName, clubName, clubSlug }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title="QR Check-in">
          <QrCode className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Check-in — {venueName}</DialogTitle>
        </DialogHeader>
        <VenueQRCode 
          venueId={venueId}
          venueName={venueName}
          clubName={clubName}
          clubSlug={clubSlug}
        />
        <p className="text-xs text-muted-foreground text-center">
          Este QR es fijo y detecta automáticamente las sesiones del día
        </p>
      </DialogContent>
    </Dialog>
  )
}
