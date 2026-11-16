'use client'

import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { acceptMyAgreement } from '@/lib/actions/agreements'

interface Props {
  templateId: string
  /** Versión del documento que se está mostrando; el servidor la valida al aceptar. */
  version: number
  /** Documento ya con los datos del alumno. Es texto plano: se muestra tal cual, sin HTML. */
  content: string
}

/** Documento + casilla "he leído" + botón "Acepto", como unos términos y condiciones. */
export function AgreementAcceptForm({ templateId, version, content }: Props) {
  const router = useRouter()
  const checkboxId = useId()
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAccept() {
    if (!checked || loading) return
    setLoading(true)
    try {
      const result = await acceptMyAgreement(templateId, version)
      if (result.ok) {
        toast.success('Acuerdo aceptado')
      } else {
        toast.error(result.error)
        if (result.outdated) setChecked(false)
      }
      // Con éxito el acuerdo sale de la lista; si quedó desactualizado se carga el texto vigente.
      if (result.ok || result.outdated) router.refresh()
    } catch {
      toast.error('No se pudo registrar tu aceptación. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        tabIndex={0}
        role="document"
        aria-label="Texto del acuerdo"
        className="max-h-80 overflow-y-auto rounded-md border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </div>

      <label htmlFor={checkboxId} className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          disabled={loading}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-primary"
        />
        <span>He leído este documento y lo acepto.</span>
      </label>

      <Button onClick={handleAccept} disabled={!checked || loading} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Acepto
      </Button>
    </div>
  )
}
