'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Maximize2, Minimize2, Trash2, Undo2, Play, Square, Save, FolderOpen, Circle, Minus, Pencil, MousePointer, Eraser, RotateCcw } from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────── */
type Sport = 'basketball' | 'soccer' | 'futsal' | 'volleyball' | 'handball' | 'generic'
type Tool  = 'select' | 'pen' | 'arrow' | 'line' | 'eraser'
interface Pt   { x: number; y: number }        // absolute canvas px
interface Player { id: string; x: number; y: number; team: 'home' | 'away'; num: number }
interface DrawnPath { id: string; tool: 'pen' | 'arrow' | 'line'; pts: Pt[]; color: string; w: number }
interface SavedPlay { id: string; name: string; sport: Sport; players: Player[]; paths: DrawnPath[] }
interface AnimState { playing: boolean; start: Player[]; end: Player[]; progress: number; rafId: number }

const SPORT_LABELS: Record<Sport, string> = {
  basketball: '🏀 Básquet', soccer: '⚽ Fútbol', futsal: '🥅 Futsal',
  volleyball: '🏐 Vóley', handball: '🤾 Handball', generic: '📋 Pizarra',
}

const COLORS = ['#ffffff', '#facc15', '#f87171', '#4ade80', '#60a5fa', '#e879f9', '#fb923c', '#000000']

/* ─── Court drawing helpers ─────────────────────────────────── */
function drawCourt(ctx: CanvasRenderingContext2D, sport: Sport, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  ctx.save()
  if (sport === 'basketball') {
    // Background
    ctx.fillStyle = '#c68642'; ctx.fillRect(0, 0, w, h)
    // Wood lines
    for (let i = 0; i < h; i += 8) {
      ctx.fillStyle = i % 16 === 0 ? '#b87333' : '#c9954a'
      ctx.fillRect(0, i, w, 4)
    }
    // Court lines
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    const p = 20
    ctx.strokeRect(p, p, w - p*2, h - p*2)
    // Center
    ctx.beginPath(); ctx.moveTo(w/2, p); ctx.lineTo(w/2, h - p); ctx.stroke()
    ctx.beginPath(); ctx.arc(w/2, h/2, h*0.13, 0, Math.PI*2); ctx.stroke()
    // Paint areas
    const pw = w * 0.17, ph = h * 0.38
    ctx.strokeRect(p, h/2 - ph/2, pw, ph)
    ctx.strokeRect(w - p - pw, h/2 - ph/2, pw, ph)
    // 3-pt arcs
    ctx.beginPath(); ctx.arc(p + pw*0.3, h/2, h*0.4, -Math.PI/2.1, Math.PI/2.1); ctx.stroke()
    ctx.beginPath(); ctx.arc(w - p - pw*0.3, h/2, h*0.4, Math.PI - Math.PI/2.1, Math.PI + Math.PI/2.1); ctx.stroke()
  } else if (sport === 'soccer' || sport === 'futsal') {
    ctx.fillStyle = '#3d7a3d'; ctx.fillRect(0, 0, w, h)
    // Stripes
    const sw = w / 12
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(i*sw, 0, sw, h) }
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    const p = 18
    ctx.strokeRect(p, p, w - p*2, h - p*2)
    ctx.beginPath(); ctx.moveTo(w/2, p); ctx.lineTo(w/2, h-p); ctx.stroke()
    ctx.beginPath(); ctx.arc(w/2, h/2, h*0.14, 0, Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w/2, h/2 - 4); ctx.lineTo(w/2, h/2 + 4); ctx.stroke()
    // Penalty areas
    const bw = w * 0.1, bh = h * 0.52, gw = w * 0.05, gh = h * 0.24
    ctx.strokeRect(p, h/2 - bh/2, bw, bh)
    ctx.strokeRect(w - p - bw, h/2 - bh/2, bw, bh)
    ctx.strokeRect(p, h/2 - gh/2, gw, gh)
    ctx.strokeRect(w - p - gw, h/2 - gh/2, gw, gh)
    ctx.beginPath(); ctx.arc(p + bw, h/2, h*0.13, -Math.PI/2.5, Math.PI/2.5); ctx.stroke()
    ctx.beginPath(); ctx.arc(w - p - bw, h/2, h*0.13, Math.PI - Math.PI/2.5, Math.PI + Math.PI/2.5); ctx.stroke()
  } else if (sport === 'volleyball') {
    ctx.fillStyle = '#d4a96a'; ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < h; i += 10) {
      ctx.fillStyle = i % 20 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)'
      ctx.fillRect(0, i, w, 5)
    }
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    const p = 20
    ctx.strokeRect(p, p, w - p*2, h - p*2)
    ctx.beginPath(); ctx.moveTo(w/2, p); ctx.lineTo(w/2, h-p); ctx.stroke()
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffffffcc'
    ctx.beginPath(); ctx.moveTo(w/2, p); ctx.lineTo(w/2, h-p); ctx.stroke()
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'
    const att = w * 0.19
    ctx.beginPath(); ctx.moveTo(p + att, p); ctx.lineTo(p + att, h-p); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(w - p - att, p); ctx.lineTo(w - p - att, h-p); ctx.stroke()
  } else if (sport === 'handball') {
    ctx.fillStyle = '#c8a46e'; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
    const p = 18
    ctx.strokeRect(p, p, w - p*2, h - p*2)
    ctx.beginPath(); ctx.moveTo(w/2, p); ctx.lineTo(w/2, h-p); ctx.stroke()
    ctx.beginPath(); ctx.arc(w/2, h/2, h*0.13, 0, Math.PI*2); ctx.stroke()
    const gr = h * 0.48, g6 = h * 0.3
    ctx.beginPath(); ctx.arc(p, h/2, gr, -Math.PI/2.2, Math.PI/2.2); ctx.stroke()
    ctx.beginPath(); ctx.arc(w-p, h/2, gr, Math.PI - Math.PI/2.2, Math.PI + Math.PI/2.2); ctx.stroke()
    ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.arc(p, h/2, gr + h*0.1, -Math.PI/2.2, Math.PI/2.2); ctx.stroke()
    ctx.beginPath(); ctx.arc(w-p, h/2, gr + h*0.1, Math.PI - Math.PI/2.2, Math.PI + Math.PI/2.2); ctx.stroke()
    ctx.setLineDash([])
    const gw = w * 0.04, gh = h * 0.22
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(p - gw, h/2 - gh/2, gw, gh)
    ctx.fillRect(w - p, h/2 - gh/2, gw, gh)
  } else {
    // Generic chalkboard
    ctx.fillStyle = '#1a2e1a'; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
    const grid = 40
    for (let x = 0; x < w; x += grid) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y < h; y += grid) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 3
    ctx.strokeRect(8, 8, w-16, h-16)
  }
  ctx.restore()
}

function drawArrowHead(ctx: CanvasRenderingContext2D, from: Pt, to: Pt) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const len = 14
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - len * Math.cos(angle - 0.4), to.y - len * Math.sin(angle - 0.4))
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - len * Math.cos(angle + 0.4), to.y - len * Math.sin(angle + 0.4))
  ctx.stroke()
}

function drawPaths(ctx: CanvasRenderingContext2D, paths: DrawnPath[], current: { tool: Tool; pts: Pt[]; color: string; w: number } | null) {
  const all = current && current.pts.length > 1
    ? [...paths, { id: 'cur', tool: current.tool as 'pen' | 'arrow' | 'line', pts: current.pts, color: current.color, w: current.w }]
    : paths
  for (const p of all) {
    if (p.pts.length < 2) continue
    ctx.save()
    ctx.strokeStyle = p.color; ctx.lineWidth = p.w
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    if (p.tool === 'pen') {
      ctx.beginPath(); ctx.moveTo(p.pts[0].x, p.pts[0].y)
      for (const pt of p.pts.slice(1)) ctx.lineTo(pt.x, pt.y)
      ctx.stroke()
    } else if (p.tool === 'arrow' || p.tool === 'line') {
      const a = p.pts[0], b = p.pts[p.pts.length - 1]
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      if (p.tool === 'arrow') drawArrowHead(ctx, a, b)
    }
    ctx.restore()
  }
}

function drawPlayers(ctx: CanvasRenderingContext2D, players: Player[], selected: string | null) {
  const R = 16
  for (const p of players) {
    ctx.save()
    const isHome = p.team === 'home'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6
    ctx.fillStyle = isHome ? '#2563eb' : '#dc2626'
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI*2); ctx.fill()
    if (selected === p.id) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(p.x, p.y, R + 2, 0, Math.PI*2); ctx.stroke()
    }
    ctx.shadowBlur = 0
    ctx.fillStyle = '#fff'; ctx.font = `bold ${R * 0.9}px sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(String(p.num), p.x, p.y + 1)
    ctx.restore()
  }
}

/* ─── Main component ─────────────────────────────────────────── */
export function TacticalBoard({ defaultSport = 'basketball' }: { defaultSport?: Sport }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [sport, setSport]       = useState<Sport>(defaultSport)
  const [tool, setTool]         = useState<Tool>('select')
  const [penColor, setPenColor] = useState('#ffffff')
  const [penWidth, setPenWidth] = useState(3)
  const [players, setPlayers]   = useState<Player[]>([])
  const [paths, setPaths]       = useState<DrawnPath[]>([])
  const [undoStack, setUndoStack] = useState<{ players: Player[]; paths: DrawnPath[] }[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [savedPlays, setSavedPlays]     = useState<SavedPlay[]>([])
  const [showSaved, setShowSaved]       = useState(false)

  // Drawing state (mutable refs to avoid re-render during mousemove)
  const drawingRef = useRef<{ active: boolean; tool: Tool; pts: Pt[]; color: string; w: number } | null>(null)
  const dragRef    = useRef<{ active: boolean; id: string; offX: number; offY: number } | null>(null)
  const animRef    = useRef<AnimState>({ playing: false, start: [], end: [], progress: 0, rafId: 0 })
  const [animPlaying, setAnimPlaying] = useState(false)

  // Load saved plays from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tactical_plays')
      if (raw) setSavedPlays(JSON.parse(raw))
    } catch {}
  }, [])

  // Default players based on sport
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const W = canvas.width, H = canvas.height
    const homePts: Pt[] = sport === 'basketball' ? [
      {x:W*0.15,y:H*0.5},{x:W*0.3,y:H*0.3},{x:W*0.3,y:H*0.7},{x:W*0.45,y:H*0.38},{x:W*0.45,y:H*0.62}
    ] : sport === 'volleyball' ? [
      {x:W*0.22,y:H*0.3},{x:W*0.22,y:H*0.5},{x:W*0.22,y:H*0.7},{x:W*0.36,y:H*0.2},{x:W*0.36,y:H*0.5},{x:W*0.36,y:H*0.8}
    ] : [
      {x:W*0.12,y:H*0.5},{x:W*0.25,y:H*0.25},{x:W*0.25,y:H*0.75},{x:W*0.35,y:H*0.4},{x:W*0.35,y:H*0.6},
      {x:W*0.2,y:H*0.38},{x:W*0.2,y:H*0.62},{x:W*0.3,y:H*0.2},{x:W*0.3,y:H*0.8},{x:W*0.4,y:H*0.5},{x:W*0.15,y:H*0.5}
    ]
    const awayPts: Pt[] = homePts.map(p => ({ x: W - p.x, y: p.y }))
    const count = sport === 'basketball' ? 5 : sport === 'volleyball' ? 6 : 11
    const newPlayers: Player[] = [
      ...homePts.slice(0, count).map((p, i) => ({ id: `h${i}`, x: p.x, y: p.y, team: 'home' as const, num: i+1 })),
      ...awayPts.slice(0, count).map((p, i) => ({ id: `a${i}`, x: p.x, y: p.y, team: 'away' as const, num: i+1 })),
    ]
    setPlayers(newPlayers)
    setPaths([])
    setUndoStack([])
  }, [sport])

  // Render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const W = canvas.width, H = canvas.height
    drawCourt(ctx, sport, W, H)
    drawPaths(ctx, paths, drawingRef.current?.active ? drawingRef.current : null)
    drawPlayers(ctx, players, selectedId)
  }, [sport, paths, players, selectedId])

  useEffect(() => { render() }, [render])

  /* ─── Canvas size ─── */
  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current
    if (!canvas || !container) return
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      canvas.width  = r.width
      canvas.height = r.height
      render()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [render])

  /* ─── Coordinate helper ─── */
  function getCanvasPt(e: React.MouseEvent | React.TouchEvent): Pt {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    let cx: number, cy: number
    if ('touches' in e) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY
    } else {
      cx = (e as React.MouseEvent).clientX; cy = (e as React.MouseEvent).clientY
    }
    return { x: (cx - rect.left) * scaleX, y: (cy - rect.top) * scaleY }
  }

  function hitPlayer(pt: Pt): Player | null {
    for (let i = players.length - 1; i >= 0; i--) {
      const p = players[i]
      if (Math.hypot(p.x - pt.x, p.y - pt.y) < 20) return p
    }
    return null
  }

  /* ─── Pointer events ─── */
  function onPointerDown(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const pt = getCanvasPt(e)

    if (tool === 'select') {
      const hit = hitPlayer(pt)
      if (hit) {
        setSelectedId(hit.id)
        dragRef.current = { active: true, id: hit.id, offX: pt.x - hit.x, offY: pt.y - hit.y }
      } else {
        setSelectedId(null)
      }
      return
    }

    if (tool === 'eraser') {
      // Remove path near click
      const canvas = canvasRef.current!
      const ctx = canvas.getContext('2d')!
      // Simple: remove last path (or could do spatial check)
      setPaths(prev => prev.slice(0, -1))
      return
    }

    // Drawing tools
    setUndoStack(prev => [...prev.slice(-19), { players: [...players], paths: [...paths] }])
    drawingRef.current = { active: true, tool, pts: [pt], color: penColor, w: penWidth }
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const pt = getCanvasPt(e)

    if (dragRef.current?.active) {
      const { id, offX, offY } = dragRef.current
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, x: pt.x - offX, y: pt.y - offY } : p))
      return
    }

    if (drawingRef.current?.active) {
      const d = drawingRef.current
      if (d.tool === 'pen') {
        d.pts = [...d.pts, pt]
      } else {
        d.pts = [d.pts[0], pt]
      }
      render()
    }
  }

  function onPointerUp(e: React.MouseEvent | React.TouchEvent) {
    if (dragRef.current?.active) {
      dragRef.current = null; return
    }
    if (drawingRef.current?.active) {
      const d = drawingRef.current
      if (d.pts.length >= 2) {
        const newPath: DrawnPath = { id: Date.now().toString(), tool: d.tool as 'pen'|'arrow'|'line', pts: [...d.pts], color: d.color, w: d.w }
        setPaths(prev => [...prev, newPath])
      }
      drawingRef.current = null
      render()
    }
  }

  /* ─── Animation ─── */
  function startAnimation() {
    const anim = animRef.current
    anim.start = players.map(p => ({ ...p }))
    anim.end   = players.map(p => ({ ...p, x: p.x + (Math.random()-0.5)*80, y: p.y + (Math.random()-0.5)*60 }))
    anim.progress = 0
    anim.playing = true
    setAnimPlaying(true)

    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height

    function step() {
      if (!anim.playing) return
      anim.progress = Math.min(1, anim.progress + 0.016)
      const t = anim.progress < 0.5 ? 2*anim.progress*anim.progress : 1 - Math.pow(-2*anim.progress+2, 2)/2
      const interp = anim.start.map((s, i) => ({
        ...s,
        x: s.x + (anim.end[i].x - s.x) * t,
        y: s.y + (anim.end[i].y - s.y) * t,
      }))
      drawCourt(ctx, sport, W, H)
      drawPaths(ctx, paths, null)
      drawPlayers(ctx, interp, null)
      if (anim.progress < 1) {
        anim.rafId = requestAnimationFrame(step)
      } else {
        anim.playing = false
        setAnimPlaying(false)
        render()
      }
    }
    anim.rafId = requestAnimationFrame(step)
  }

  function stopAnimation() {
    const anim = animRef.current
    anim.playing = false
    cancelAnimationFrame(anim.rafId)
    setAnimPlaying(false)
    render()
  }

  /* ─── Record play (save current positions as animation start) ─── */
  function recordPlay() {
    animRef.current.start = players.map(p => ({ ...p }))
  }

  /* ─── Save / load ─── */
  function savePlay() {
    const name = prompt('Nombre de la jugada:')
    if (!name) return
    const play: SavedPlay = { id: Date.now().toString(), name, sport, players: [...players], paths: [...paths] }
    const updated = [...savedPlays, play]
    setSavedPlays(updated)
    try { localStorage.setItem('tactical_plays', JSON.stringify(updated)) } catch {}
  }

  function loadPlay(play: SavedPlay) {
    setPlayers(play.players)
    setPaths(play.paths)
    setSport(play.sport)
    setShowSaved(false)
  }

  function deletePlay(id: string) {
    const updated = savedPlays.filter(p => p.id !== id)
    setSavedPlays(updated)
    try { localStorage.setItem('tactical_plays', JSON.stringify(updated)) } catch {}
  }

  /* ─── Undo / Clear ─── */
  function undo() {
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    setPlayers(last.players)
    setPaths(last.paths)
    setUndoStack(prev => prev.slice(0, -1))
  }

  function clearBoard() {
    setUndoStack(prev => [...prev.slice(-19), { players: [...players], paths: [...paths] }])
    setPaths([])
  }

  /* ─── Fullscreen ─── */
  function toggleFullscreen() {
    const el = containerRef.current?.parentElement
    if (!isFullscreen) {
      el?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(v => !v)
  }

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  /* ─── Add player ─── */
  function addPlayer(team: 'home' | 'away') {
    const canvas = canvasRef.current!
    const existing = players.filter(p => p.team === team)
    const num = existing.length + 1
    const newP: Player = {
      id: `${team}_${Date.now()}`,
      x: team === 'home' ? canvas.width * 0.25 : canvas.width * 0.75,
      y: canvas.height * 0.5,
      team, num
    }
    setPlayers(prev => [...prev, newP])
  }

  /* ─── Remove selected player ─── */
  function removeSelected() {
    if (!selectedId) return
    setPlayers(prev => prev.filter(p => p.id !== selectedId))
    setSelectedId(null)
  }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Mover' },
    { id: 'pen',    icon: <Pencil className="w-4 h-4" />,       label: 'Dibujar' },
    { id: 'arrow',  icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M14 7l5 5-5 5"/></svg>, label: 'Flecha' },
    { id: 'line',   icon: <Minus className="w-4 h-4" />,        label: 'Línea' },
    { id: 'eraser', icon: <Eraser className="w-4 h-4" />,       label: 'Borrar' },
  ]

  return (
    <div className="flex flex-col h-full gap-2 select-none">
      {/* ── Top toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* Sport selector */}
        <select
          value={sport}
          onChange={e => setSport(e.target.value as Sport)}
          className="text-xs rounded-lg border border-border bg-card px-2 py-1.5 font-medium"
        >
          {(Object.entries(SPORT_LABELS) as [Sport, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <div className="w-px h-6 bg-border" />

        {/* Tools */}
        <div className="flex items-center gap-1">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tool === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => setPenColor(c)} title={c}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${penColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: c === '#000000' ? '#222' : c }} />
          ))}
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Width */}
        <input type="range" min={1} max={8} value={penWidth} onChange={e => setPenWidth(Number(e.target.value))}
          className="w-20 h-1 accent-primary" title="Grosor" />

        <div className="w-px h-6 bg-border" />

        {/* Add players */}
        <button onClick={() => addPlayer('home')} title="Añadir jugador local"
          className="text-xs px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium">
          +🔵
        </button>
        <button onClick={() => addPlayer('away')} title="Añadir jugador visitante"
          className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium">
          +🔴
        </button>
        {selectedId && (
          <button onClick={removeSelected} title="Eliminar jugador seleccionado"
            className="text-xs px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            ✕ jugador
          </button>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <button onClick={undo} title="Deshacer" className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={clearBoard} title="Limpiar trazos" className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={() => { recordPlay(); startAnimation() }}
          disabled={animPlaying}
          title={animPlaying ? 'Reproduciendo…' : 'Reproducir jugada demo'}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${animPlaying ? 'bg-green-600 text-white' : 'bg-muted hover:bg-green-600 hover:text-white'}`}>
          {animPlaying ? <Square className="w-4 h-4" onClick={e => { e.stopPropagation(); stopAnimation() }} /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={savePlay} title="Guardar jugada" className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center">
          <Save className="w-4 h-4" />
        </button>
        <button onClick={() => setShowSaved(v => !v)} title="Ver jugadas guardadas"
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${showSaved ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
          <FolderOpen className="w-4 h-4" />
        </button>
        <button onClick={toggleFullscreen} title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center">
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Board area ── */}
      <div className="flex flex-1 gap-3 min-h-0">
        <div ref={containerRef} className="flex-1 rounded-xl overflow-hidden border border-border shadow-inner cursor-crosshair relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full touch-none"
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            style={{ cursor: tool === 'select' ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair' }}
          />
          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Local
            </span>
            <span className="flex items-center gap-1 bg-black/30 text-white px-2 py-1 rounded-md backdrop-blur-sm">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Visitante
            </span>
            <span className="bg-black/30 text-white/70 px-2 py-1 rounded-md backdrop-blur-sm">
              {animPlaying ? '▶ Animando…' : tool === 'select' ? 'Arrastra jugadores' : `Herramienta: ${TOOLS.find(t=>t.id===tool)?.label}`}
            </span>
          </div>
        </div>

        {/* ── Saved plays panel ── */}
        {showSaved && (
          <div className="w-52 shrink-0 rounded-xl border border-border bg-card flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs font-semibold">Jugadas guardadas</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {savedPlays.length === 0 && (
                <p className="text-xs text-muted-foreground p-2 text-center">Sin jugadas aún.<br />Diseña y guarda una.</p>
              )}
              {savedPlays.map(play => (
                <div key={play.id} className="rounded-lg border border-border bg-background p-2 hover:bg-accent transition-colors">
                  <p className="text-xs font-medium truncate">{play.name}</p>
                  <p className="text-[10px] text-muted-foreground">{SPORT_LABELS[play.sport]}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={() => loadPlay(play)}
                      className="flex-1 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5 hover:opacity-90">
                      Cargar
                    </button>
                    <button onClick={() => deletePlay(play.id)}
                      className="text-[10px] bg-destructive/10 text-destructive rounded px-1.5 py-0.5 hover:bg-destructive/20">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
