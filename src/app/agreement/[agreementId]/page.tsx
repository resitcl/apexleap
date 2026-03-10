'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, CheckCircle, XCircle, Loader2, ExternalLink, Shield } from 'lucide-react'

interface AgreementData {
  id: string
  status: string
  document_content: string
  gestdoc_signing_url: string | null
  signed_at: string | null
  signer_name: string | null
  template: {
    name: string
    description: string | null
  }
  club: {
    name: string
    logo_url: string | null
  }
}

export default function AgreementSignPage() {
  const params = useParams()
  const router = useRouter()
  const agreementId = params.agreementId as string

  const [agreement, setAgreement] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAgreement() {
      try {
        const res = await fetch(`/api/agreements/${agreementId}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Error al cargar el acuerdo')
        }
        const data = await res.json()
        setAgreement(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchAgreement()
  }, [agreementId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Cargando acuerdo...</p>
        </div>
      </div>
    )
  }

  if (error || !agreement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{error || 'Acuerdo no encontrado'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isSigned = agreement.status === 'signed'
  const isPending = agreement.status === 'pending' || agreement.status === 'sent_to_sign'

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          {agreement.club.logo_url && (
            <img 
              src={agreement.club.logo_url} 
              alt={agreement.club.name}
              className="w-20 h-20 mx-auto mb-4 rounded-lg object-cover"
            />
          )}
          <h1 className="text-2xl font-bold">{agreement.club.name}</h1>
          <p className="text-muted-foreground">{agreement.template.name}</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {isSigned ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 py-1.5 px-3">
              <CheckCircle className="w-4 h-4" />
              Firmado el {new Date(agreement.signed_at!).toLocaleDateString('es-CL')}
              {agreement.signer_name && ` por ${agreement.signer_name}`}
            </Badge>
          ) : isPending ? (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1 py-1.5 px-3">
              <FileText className="w-4 h-4" />
              Pendiente de firma
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 py-1.5 px-3">
              <XCircle className="w-4 h-4" />
              {agreement.status === 'rejected' ? 'Rechazado' : 
               agreement.status === 'expired' ? 'Expirado' : 'Cancelado'}
            </Badge>
          )}
        </div>

        {/* Document Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {agreement.template.name}
            </CardTitle>
            {agreement.template.description && (
              <p className="text-sm text-muted-foreground">{agreement.template.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div 
              className="prose prose-sm max-w-none bg-white border rounded-lg p-6"
              dangerouslySetInnerHTML={{ __html: agreement.document_content.replace(/\n/g, '<br/>') }}
            />
          </CardContent>
        </Card>

        {/* Sign Button */}
        {isPending && agreement.gestdoc_signing_url && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Shield className="w-12 h-12 mx-auto text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">Firma con Clave Única</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Al hacer clic serás redirigido a GESTDOC para firmar este documento 
                    utilizando tu Clave Única del Estado de Chile.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="gap-2"
                  onClick={() => window.open(agreement.gestdoc_signing_url!, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Firmar con Clave Única
                </Button>
                <p className="text-xs text-muted-foreground">
                  Tu firma tendrá validez legal según la Ley 19.799
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already Signed */}
        {isSigned && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <h3 className="font-semibold text-lg text-green-800">Documento Firmado</h3>
              <p className="text-sm text-green-700 mt-1">
                Este acuerdo fue firmado exitosamente y tiene validez legal.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
