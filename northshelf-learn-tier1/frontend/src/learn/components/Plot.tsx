import { useId, useRef, type PointerEvent, type ReactNode } from 'react'
import { niceTicks } from '../plotUtils'

export interface PlotApi {
  sx: (x: number) => number
  sy: (y: number) => number
  x0: number
  x1: number
  y0: number
  y1: number
}

const M = { l: 38, r: 12, t: 10, b: 24 }

/** A small SVG coordinate system. Children are clipped to the plot area. */
export default function Plot({
  xDomain,
  yDomain,
  width = 640,
  height = 320,
  label,
  onDrag,
  children,
}: {
  xDomain: [number, number]
  yDomain: [number, number]
  width?: number
  height?: number
  label: string
  onDrag?: (x: number) => void
  children: (api: PlotApi) => ReactNode
}) {
  const [x0, x1] = xDomain
  const [y0, y1] = yDomain
  const w = width - M.l - M.r
  const h = height - M.t - M.b
  const sx = (x: number) => M.l + ((x - x0) / (x1 - x0)) * w
  const sy = (y: number) => M.t + (1 - (y - y0) / (y1 - y0)) * h
  const clipId = useId().replace(/:/g, '')
  const ref = useRef<SVGSVGElement>(null)

  const xAt = (e: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    return Math.min(x1, Math.max(x0, x0 + ((px - M.l) / w) * (x1 - x0)))
  }

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={`h-auto w-full select-none ${onDrag ? 'cursor-ew-resize touch-pan-y' : ''}`}
      onPointerDown={(e) => {
        if (!onDrag) return
        e.currentTarget.setPointerCapture(e.pointerId)
        onDrag(xAt(e))
      }}
      onPointerMove={(e) => {
        if (onDrag && e.buttons) onDrag(xAt(e))
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={M.l} y={M.t} width={w} height={h} />
        </clipPath>
      </defs>
      {niceTicks(x0, x1).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={M.t + h} className="stroke-line" />
          <text x={sx(t)} y={height - 8} textAnchor="middle" fontSize="10" className="fill-muted">
            {t}
          </text>
        </g>
      ))}
      {niceTicks(y0, y1).map((t) => (
        <g key={`y${t}`}>
          <line x1={M.l} x2={M.l + w} y1={sy(t)} y2={sy(t)} className="stroke-line" />
          <text x={M.l - 6} y={sy(t) + 3} textAnchor="end" fontSize="10" className="fill-muted">
            {t}
          </text>
        </g>
      ))}
      {x0 < 0 && x1 > 0 && <line x1={sx(0)} x2={sx(0)} y1={M.t} y2={M.t + h} className="stroke-line-strong" strokeWidth="1.5" />}
      {y0 < 0 && y1 > 0 && <line x1={M.l} x2={M.l + w} y1={sy(0)} y2={sy(0)} className="stroke-line-strong" strokeWidth="1.5" />}
      <g clipPath={`url(#${clipId})`}>{children({ sx, sy, x0, x1, y0, y1 })}</g>
    </svg>
  )
}
