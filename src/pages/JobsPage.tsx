import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, describeError } from '../api'
import { JobActionButtons, useJobActions } from '../components/JobActions'
import { Pager } from '../components/Pager'
import { Percent, ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { fmtDate, fmtInt } from '../format'
import { useSession } from '../session'
import { isActive, type JobResponse, type PagedResponse } from '../types'

const PAGE_SIZE = 20
const ACCEPT = '.csv,.xlsx,.xls'

export function JobsPage() {
  const session = useSession()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedResponse<JobResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [autoStart, setAutoStart] = useState(true)
  const [progress, setProgress] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        setData(await api.listJobs(page, PAGE_SIZE))
        setError(null)
      } catch (err) {
        setError(describeError(err))
      } finally {
        setLoading(false)
      }
    },
    [page],
  )

  useEffect(() => {
    void load()
  }, [load])

  const hasActive = data?.items.some(j => isActive(j.status)) ?? false
  useEffect(() => {
    if (!hasActive) return
    const timer = setInterval(() => void load(true), 2000)
    return () => clearInterval(timer)
  }, [hasActive, load])

  const { busy, run } = useJobActions(() => load(true))

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setProgress(0)
    try {
      const job = await api.uploadJob(file, setProgress)
      toast.success(`Uploaded ${job.fileName} (${fmtInt(job.totalRows)} rows)`)
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
      try {
        if (autoStart) {
          await api.startJob(job.id)
          toast.success(`Queued: ${job.fileName}`)
        }
      } finally {
        setPage(1)
        await load(true)
      }
    } catch (err) {
      toast.error(describeError(err))
    } finally {
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <>
      <section className="card">
        <h2>Upload a file</h2>
        <form className="upload-form" onSubmit={upload}>
          <input ref={fileInput} type="file" accept={ACCEPT} disabled={uploading} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <label className="check">
            <input type="checkbox" checked={autoStart} disabled={uploading} onChange={e => setAutoStart(e.target.checked)} />
            Start processing right after upload
          </label>
          <button className="btn btn-primary" type="submit" disabled={!file || uploading}>
            {uploading ? (progress < 100 ? `Uploading ${progress}%` : 'Counting rows...') : 'Upload'}
          </button>
        </form>
        {uploading && <ProgressBar percent={progress} status="Queued" />}
        <p className="muted small">CSV or Excel (.csv, .xlsx, .xls). The header must contain name and email columns; phone and city are optional.</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{session.isAdmin ? 'All jobs' : 'My jobs'}</h2>
          <div className="row">
            {hasActive && <span className="live">live</span>}
            <button className="btn" onClick={() => void load()} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {data && data.items.length === 0 && !error && <p className="muted">No jobs yet. Upload a CSV or Excel file to begin.</p>}

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-file">File</th>
                  <th>Status</th>
                  <th className="col-progress">Progress</th>
                  <th className="num">Rows</th>
                  <th className="num">Success</th>
                  <th className="num">Failed</th>
                  <th className="num">Rows/s</th>
                  {session.isAdmin && <th>Owner</th>}
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(job => (
                  <tr key={job.id}>
                    <td>
                      <span className="file-link" title={job.id}>
                        {job.fileName}
                      </span>
                      {job.failureReason && <div className="text-red small">{job.failureReason}</div>}
                    </td>
                    <td>
                      <StatusBadge status={job.status} />
                      {job.cancelRequested && isActive(job.status) && <div className="text-amber small">cancel requested</div>}
                    </td>
                    <td className="col-progress">
                      <div className="progress-cell">
                        <ProgressBar percent={job.percent} status={job.status} />
                        <Percent percent={job.percent} status={job.status} />
                      </div>
                    </td>
                    <td className="num">
                      {fmtInt(job.processedRows)} / {fmtInt(job.totalRows)}
                    </td>
                    <td className="num text-green">{fmtInt(job.successCount)}</td>
                    <td className={job.failureCount > 0 ? 'num text-red' : 'num muted'}>{fmtInt(job.failureCount)}</td>
                    <td className="num">{isActive(job.status) || job.status === 'Completed' ? fmtInt(Math.round(job.rowsPerSecond)) : '-'}</td>
                    {session.isAdmin && <td>{job.ownerUsername ?? '-'}</td>}
                    <td>{fmtDate(job.createdAt)}</td>
                    <td>
                      <div className="row actions">
                        <Link to={`/jobs/${job.id}`} className="btn">
                          View job
                        </Link>
                        <JobActionButtons job={job} busy={busy} run={run} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </section>
    </>
  )
}
