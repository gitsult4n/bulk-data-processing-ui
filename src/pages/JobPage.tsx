import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, describeError } from '../api'
import { JobActionButtons, useJobActions } from '../components/JobActions'
import { Percent, ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/StatusBadge'
import { fmtDate, fmtEta, fmtInt } from '../format'
import { useSession } from '../session'
import { isActive, type AuditLogResponse, type JobResponse } from '../types'

export function JobPage() {
  const { id = '' } = useParams()
  const session = useSession()
  const [job, setJob] = useState<JobResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [audit, setAudit] = useState<AuditLogResponse[] | null>(null)

  const load = useCallback(async () => {
    try {
      setJob(await api.getJob(id))
      setError(null)
    } catch (err) {
      setError(describeError(err))
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const active = job ? isActive(job.status) : false
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => void load(), 2000)
    return () => clearInterval(timer)
  }, [active, load])

  const status = job?.status
  const attempt = job?.attempt
  const cancelRequested = job?.cancelRequested
  useEffect(() => {
    if (!session.isAdmin || !job) return
    let cancelled = false
    api
      .listAudit({ jobId: id, page: 1, pageSize: 50 })
      .then(result => {
        if (!cancelled) setAudit(result.items)
      })
      .catch(() => {
        if (!cancelled) setAudit(null)
      })
    return () => {
      cancelled = true
    }
    // refresh the trail whenever the job moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAdmin, id, status, attempt, cancelRequested, job === null])

  useEffect(() => {
    if (!job) return
    document.title = active ? `${job.percent}% · ${job.fileName}` : `${job.status} · ${job.fileName}`
    return () => {
      document.title = 'Bulk Data Jobs'
    }
  }, [job, active])

  const { busy, run } = useJobActions(load)

  if (error && !job) {
    return (
      <section className="card">
        <Link to="/">&larr; Back to jobs</Link>
        <div className="alert alert-error">{error}</div>
      </section>
    )
  }

  if (!job) {
    return (
      <section className="card">
        <p className="muted">Loading job...</p>
      </section>
    )
  }

  return (
    <>
      <section className="card">
        <Link to="/">&larr; Back to jobs</Link>
        <div className="card-head">
          <div>
            <h2 className="file-title">{job.fileName}</h2>
            <div className="muted small mono">{job.id}</div>
          </div>
          <div className="row">
            {active && <span className="live">live</span>}
            <StatusBadge status={job.status} />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {job.failureReason && <div className="alert alert-error">Failure reason: {job.failureReason}</div>}
        {job.cancelRequested && active && <div className="alert alert-warn">Cancel requested. The worker stops after the current batch.</div>}
        {job.status === 'Completed' && <div className="alert alert-success">Completed: {fmtInt(job.successCount)} rows imported, {fmtInt(job.failureCount)} rejected.</div>}

        <div className="progress-head">
          <Percent percent={job.percent} status={job.status} big />
          <span className="small muted">
            {fmtInt(job.processedRows)} of {fmtInt(job.totalRows)} rows{active && ' · updates every 2s'}
          </span>
        </div>
        <ProgressBar percent={job.percent} status={job.status} tall />

        <div className="stats">
          <Stat label="Total rows" value={fmtInt(job.totalRows)} />
          <Stat label="Processed" value={fmtInt(job.processedRows)} />
          <Stat label="Success" value={fmtInt(job.successCount)} tone="green" />
          <Stat label="Failed" value={fmtInt(job.failureCount)} tone={job.failureCount > 0 ? 'red' : undefined} />
          <Stat label="Rows / second" value={job.rowsPerSecond > 0 ? fmtInt(Math.round(job.rowsPerSecond)) : '-'} />
          <Stat label="ETA" value={fmtEta(job.etaSeconds)} />
          <Stat label="Attempt" value={String(job.attempt)} />
          {session.isAdmin && <Stat label="Owner" value={job.ownerUsername ?? '-'} />}
        </div>

        <div className="stats">
          <Stat label="Created" value={fmtDate(job.createdAt)} />
          <Stat label="Started" value={fmtDate(job.startedAt)} />
          <Stat label="Completed" value={fmtDate(job.completedAt)} />
        </div>

        <JobActionButtons job={job} busy={busy} run={run} />
      </section>

      {session.isAdmin && (
        <section className="card">
          <h2>Audit trail</h2>
          {audit === null && <p className="muted">No audit data.</p>}
          {audit && audit.length === 0 && <p className="muted">No audit entries yet.</p>}
          {audit && audit.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>At</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map(entry => (
                    <tr key={entry.id}>
                      <td className="nowrap">{fmtDate(entry.at)}</td>
                      <td>{entry.actorName}</td>
                      <td>
                        <span className={`action action-${entry.action.toLowerCase()}`}>{entry.action}</span>
                      </td>
                      <td>{entry.details ?? '-'}</td>
                      <td className="muted">{entry.ipAddress ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={tone ? `stat-value text-${tone}` : 'stat-value'}>{value}</div>
    </div>
  )
}
