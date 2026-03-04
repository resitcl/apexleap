'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard':              ['Resumen del día', '¿Quién tiene pagos vencidos?', '¿Cómo funciona esta página?'],
  '/dashboard/athletes':     ['¿Quién no ha pagado?', 'Atletas sin suscripción', '¿Cómo buscar un alumno?'],
  '/dashboard/payments':     ['¿Cuánto se debe en total?', 'Top deudores del club', '¿Cómo registrar un pago?'],
  '/dashboard/subscriptions':['Suscripciones por vencer', '¿Quién lleva más tiempo sin renovar?', 'Tasa de churn'],
  '/dashboard/attendance':   ['¿Quién no vino esta semana?', 'Porcentaje de asistencia', '¿Cómo funciona el check-in?'],
  '/dashboard/documents':    ['Documentos por vencer', '¿Quién no tiene ficha médica?', '¿Cómo subir un documento?'],
  '/dashboard/finances':     ['Resumen de egresos', '¿Cuánto se gastó este mes?', 'Balance del mes'],
  '/dashboard/calendar':     ['Sesiones de hoy', '¿Cómo crear una sesión recurrente?', 'Horario de la semana'],
  '/dashboard/coach':        ['Estado del semáforo', '¿Quién está lesionado?', '¿Cómo citar a un atleta?'],
  '/dashboard/rosters':      ['¿Cómo armar una nómina?', 'Atletas disponibles', 'Exportar PDF de nómina'],
  '/dashboard/competitions':  ['Últimos resultados', '¿Cómo registrar un partido?', 'Historial de competencias'],
  '/dashboard/inventory':    ['Stock bajo', '¿Qué materiales hay disponibles?', 'Agregar equipo'],
}

const DEFAULT_SUGGESTIONS = ['¿Cómo funciona esta página?', '¿Quién tiene pagos vencidos?', 'Resumen del club']

export function ChatWidget() {
  const [isOpen, setIsOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(true)
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const basePath = '/' + pathname.split('/').slice(1, 3).join('/')
  const suggestions = PAGE_SUGGESTIONS[basePath] ?? DEFAULT_SUGGESTIONS

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          pagePath: pathname,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: errText || 'Error al conectar con el asistente.' } : m)
        )
        if (res.status === 503) setHasApiKey(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        )
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: 'Error de conexión. Intenta nuevamente.' } : m)
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, pathname])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setIsLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Abrir asistente IA"
      >
        {isOpen
          ? <X className="w-5 h-5" />
          : <MessageCircle className="w-5 h-5" />
        }
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          style={{ height: '500px' }}>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Asistente del Club</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {PAGE_SUGGESTIONS[basePath] ? `Contexto: ${basePath.split('/').at(-1)}` : 'Pregunta lo que necesites'}
              </p>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
                Limpiar
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">¿En qué puedo ayudarte?</p>
                  <p className="text-xs text-muted-foreground mt-1">Tengo acceso a los datos del club en tiempo real</p>
                </div>
                {!hasApiKey ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 text-left">
                    <strong>Configuración requerida:</strong> Agrega <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY=sk-...</code> en tu archivo <code className="bg-amber-100 px-1 rounded">.env.local</code> y reinicia el servidor.
                  </div>
                ) : (
                  <div className="w-full space-y-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent hover:border-border/80 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {msg.content || (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Pensando...</span>
                    </span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                disabled={isLoading || !hasApiKey}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || !hasApiKey}
                className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
              >
                {isLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">Powered by GPT-4o mini · Datos en tiempo real</p>
          </div>
        </div>
      )}
    </>
  )
}
