import React from 'react'

type ColsPreset = '1' | '2' | '3' | '4'

interface MasonryGridProps {
  children: React.ReactNode
  /** Preset column layouts: '1-2-2-3-3' means 1 col mobile, 2 cols sm/md, 3 cols lg/xl */
  cols?: `${ColsPreset}-${ColsPreset}-${ColsPreset}-${ColsPreset}-${ColsPreset}`
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

const GRID_PRESETS: Record<string, string> = {
  '1-1-1-2-2': 'grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2',
  '1-2-2-3-3': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3',
  '1-2-3-3-4': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
  '2-2-3-3-4': 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4',
}

const GAP_MAP = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

export function MasonryGrid({
  children,
  cols = '1-2-2-3-3',
  gap = 'md',
  className = '',
}: MasonryGridProps) {
  const gridClasses = [
    'grid',
    GRID_PRESETS[cols],
    GAP_MAP[gap],
    'auto-rows-max',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={gridClasses}>{children}</div>
}
