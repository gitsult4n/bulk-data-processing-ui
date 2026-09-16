import { useState } from 'react'
import { api, describeError } from '../api'
import type { JobResponse } from '../types'
import { useSession } from '../session'
import { useToast } from './Toast'

type Action = 'start' | 'cancel' | 'retry' | 'errors'

export function useJobActions(afterChange: () => Promise<void> | void) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  async function run(job: JobResponse, action: Action) {
    setBusy(`${job.id}:${action}`)
    try {
      if (action === 'start') {
        await api.startJob(job.id)
        toast.success(`Queued: ${job.fileName}`)
      } else if (action === 'cancel') {
        await api.cancelJob(job.id)
        toast.success(job.status === 'Queued' ? `Cancelled: ${job.fileName}` : `Cancel requested: ${job.fileName}`)
      } else if (action === 'retry') {
        await api.retryJob(job.id)
        toast.success(`Retry queued: ${job.fileName}`)
      } else {
        await api.downloadErrors(job.id)
        toast.success(`Error report downloaded: ${job.fileName}`)
      }
      if (action !== 'errors') await afterChange()
    } catch (error) {
      toast.error(describeError(error))
    } finally {
      setBusy(null)
    }
  }

  return { busy, run }
}

export function JobActionButtons({ job, busy, run }: { job: JobResponse; busy: string | null; run: (job: JobResponse, action: Action) => void }) {
  const session = useSession()
  const isBusy = (action: Action) => busy === `${job.id}:${action}`
  const anyBusy = busy !== null && busy.startsWith(`${job.id}:`)

  return (
    <div className="row actions">
      {job.status === 'Uploaded' && (
        <button className="btn btn-primary" disabled={anyBusy} onClick={() => run(job, 'start')}>
          {isBusy('start') ? 'Starting...' : 'Start'}
        </button>
      )}
      {(job.status === 'Queued' || job.status === 'Running') && (
        <button className="btn btn-danger" disabled={anyBusy || job.cancelRequested} onClick={() => run(job, 'cancel')}>
          {job.cancelRequested ? 'Cancelling...' : isBusy('cancel') ? 'Cancelling...' : 'Cancel'}
        </button>
      )}
      {session.isAdmin && (job.status === 'Failed' || job.status === 'Cancelled') && (
        <button className="btn btn-primary" disabled={anyBusy} onClick={() => run(job, 'retry')}>
          {isBusy('retry') ? 'Retrying...' : 'Retry'}
        </button>
      )}
      <button className="btn" disabled={anyBusy || job.failureCount === 0} title={job.failureCount === 0 ? 'No failed rows' : 'Download error report (CSV)'} onClick={() => run(job, 'errors')}>
        {isBusy('errors') ? 'Downloading...' : 'Errors CSV'}
      </button>
    </div>
  )
}
