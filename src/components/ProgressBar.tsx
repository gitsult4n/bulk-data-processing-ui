import type { JobStatus } from '../types'

export function ProgressBar({ percent, status, tall = false }: { percent: number; status: JobStatus; tall?: boolean }) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div className={tall ? 'progress progress-tall' : 'progress'} role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} title={`${width}%`}>
      <div className={`progress-fill fill-${status.toLowerCase()}`} style={{ width: `${width}%` }} />
    </div>
  )
}

export function Percent({ percent, status, big = false }: { percent: number; status: JobStatus; big?: boolean }) {
  const value = Math.min(100, Math.max(0, Math.round(percent)))
  return (
    <span className={`${big ? 'percent percent-big' : 'percent'} pct-${status.toLowerCase()}`} aria-live={big ? 'polite' : undefined}>
      {value}%
    </span>
  )
}
