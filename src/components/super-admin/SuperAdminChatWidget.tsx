'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Bot, User, Loader2, ShieldAlert } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Lista todos los clubes',
  'Créame un nuevo club',
  'Muéstrame los detalles del club Shohoku',
  'Desactiva el club X',
  'Agrega un atleta al club Y',
  '¿Cuántos clubes activos hay?',
]

export function SuperAdminChatWidget() {
  const [isOpen, setIsOpen]       = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(true)
  const pathname  = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)
  const abortRef       = useRef<AbortController | null>(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
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
      const res = await fetch('/api/super-admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: trimmed,
          pagePath: pathname,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: errText || 'Error al conectar.' } : m)
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
      {/* Floating button — red for super-admin */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-red-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        aria-label="Abrir asistente Super Admin"
      >
        {isOpen
          ? <X className="w-5 h-5" />
          : <ShieldAlert className="w-5 h-5" />
        }
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-22 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
          style={{ height: '540px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-100 leading-none">Asistente Super Admin</p>
              <p className="text-xs text-zinc-400 mt-0.5">Acceso total · Puede crear, editar y gestionar</p>
            </div>
            {messages.length > 0 && (
              <button onClick={clearChat} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                Limpiar
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-zinc-950">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-2">
                <div className="w-12 h-12 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20">
                  <Bot className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">¿Qué necesitas gestionar?</p>
                  <p className="text-xs text-zinc-500 mt-1">Tengo acceso a todos los clubes y puedo crear, editar y agregar datos</p>
                </div>
                {!hasApiKey ? (
                  <div className="bg-amber-950/50 border border-amber-700/50 rounded-lg p-3 text-xs text-amber-300 text-left">
                    <strong>Configuración requerida:</strong> Agrega <code className="bg-amber-900/50 px-1 rounded">OPENAI_API_KEY=sk-...</code> en tu archivo <code className="bg-amber-900/50 px-1 rounded">.env.local</code> y reinicia el servidor.
                  </div>
                ) : (
                  <div className="w-full space-y-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
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
                  <div className="w-6 h-6 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-red-400" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-red-700 text-white rounded-tr-sm'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'
                }`}>
                  {msg.content || (
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Procesando...</span>
                    </span>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 p-3 bg-zinc-900 shrink-0">
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Crear club, editar, agregar atleta..."
                disabled={isLoading || !hasApiKey}
                className="flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || !hasApiKey}
                className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center disabled:opacity-40 hover:bg-red-500 transition-colors shrink-0"
              >
                {isLoading
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Send className="w-3.5 h-3.5" />
                }
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-1.5">GPT-4o mini · Acceso completo a la base de datos</p>
          </div>
        </div>
      )}
    </>
  )
}
