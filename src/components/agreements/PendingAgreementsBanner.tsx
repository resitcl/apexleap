'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertTriangle, ChevronRight, X } from 'lucide-react'

interface PendingAgreement {
  id: string
  name: string
  description: string | null
}

interface Props {
  agreements: PendingAgreement[]
  athleteId: string
}

export function PendingAgreementsBanner({ agreements, athleteId }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (agreements.length === 0 || dismissed) return null

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-orange-800">
                Acuerdos Pendientes de Firma
              </h3>
              <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                {agreements.length}
              </Badge>
            </div>
            <p className="text-sm text-orange-700 mb-3">
              Debes firmar los siguientes documentos para completar tu inscripción:
            </p>
            <div className="space-y-2">
              {agreements.map(agreement => (
                <Link 
                  key={agreement.id} 
                  href={`/agreement/${agreement.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white border border-orange-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orange-800 truncate">
                      {agreement.name}
                    </p>
                    {agreement.description && (
                      <p className="text-xs text-orange-600 truncate">
                        {agreement.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-orange-400 hover:text-orange-600 hover:bg-orange-100 shrink-0"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
