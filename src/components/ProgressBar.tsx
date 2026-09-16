import type { JobStatus } from '../types'

export function ProgressBar({ percent, status, tall = false }: { percent: number; status: JobStatus; tall?: boolean }) {
  const width = Math.min(100, Math.max(0, percent))
  return (
    <div className={tall ? 'progress progress-tall' : 'progress'} title={`${width}%`}>
      <div className={`progress-fill fill-${status.toLowerCase()}`} style={{ width: `${width}%` }} />
    </div>
  )
}
