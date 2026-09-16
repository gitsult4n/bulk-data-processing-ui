import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api, describeError } from '../api'
import { Pager } from '../components/Pager'
import { fmtDate, shortId } from '../format'
import type { AuditLogResponse, PagedResponse } from '../types'

const PAGE_SIZE = 50

export function AuditPage() {
  const [jobIdInput, setJobIdInput] = useState('')
  const [actorIdInput, setActorIdInput] = useState('')
  const [filter, setFilter] = useState({ jobId: '', actorId: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedResponse<AuditLogResponse> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.listAudit({ jobId: filter.jobId || undefined, actorId: filter.actorId || undefined, page, pageSize: PAGE_SIZE }))
      setError(null)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    void load()
  }, [load])

  function applyFilter(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setFilter({ jobId: jobIdInput.trim(), actorId: actorIdInput.trim() })
  }

  function clearFilter() {
    setJobIdInput('')
    setActorIdInput('')
    setPage(1)
    setFilter({ jobId: '', actorId: '' })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Audit log</h2>
        <button className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <form className="filter-form" onSubmit={applyFilter}>
        <label>
          Job id
          <input value={jobIdInput} onChange={e => setJobIdInput(e.target.value)} placeholder="GUID" className="mono" />
        </label>
        <label>
          Actor id
          <input value={actorIdInput} onChange={e => setActorIdInput(e.target.value)} placeholder="GUID" className="mono" />
        </label>
        <button className="btn btn-primary" type="submit">
          Filter
        </button>
        <button className="btn" type="button" onClick={clearFilter}>
          Clear
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {data && data.items.length === 0 && !error && <p className="muted">No audit entries match.</p>}

      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>At</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Job</th>
                <th>Details</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map(entry => (
                <tr key={entry.id}>
                  <td className="nowrap">{fmtDate(entry.at)}</td>
                  <td>
                    <span title={entry.actorId ?? ''}>{entry.actorName}</span>
                  </td>
                  <td>
                    <span className={`action action-${entry.action.toLowerCase()}`}>{entry.action}</span>
                  </td>
                  <td className="mono">
                    {entry.jobId ? (
                      <Link to={`/jobs/${entry.jobId}`} title={entry.jobId}>
                        {shortId(entry.jobId)}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{entry.details ?? '-'}</td>
                  <td className="muted">{entry.ipAddress ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > PAGE_SIZE && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
    </section>
  )
}
