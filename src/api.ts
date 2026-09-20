import { getToken, saveToken } from './auth'
import type { AuditLogResponse, AuthResponse, JobResponse, PagedResponse } from './types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const STATUS_TEXT: Record<number, string> = {
  0: 'Network error. Is the API running?',
  400: 'Bad request.',
  401: 'Not authorized. Please log in again.',
  403: 'Forbidden. Admin role required.',
  404: 'Not found.',
  409: 'Conflict.',
  500: 'Server error.',
}

function errorMessage(status: number, body: string): string {
  const text = body.trim()
  const fallback = STATUS_TEXT[status] ?? `HTTP ${status}`
  if (!text || text.startsWith('<')) return fallback
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return text
  }
  if (typeof json === 'string') return json
  if (json && typeof json === 'object') {
    const problem = json as { errors?: Record<string, string[]>; detail?: string; title?: string }
    if (problem.errors) {
      const messages = Object.values(problem.errors).flat()
      if (messages.length) return messages.join(' ')
    }
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  }
  return fallback
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleUnauthorized(status: number) {
  if (status === 401 && getToken()) saveToken(null)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { ...init, headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) } })
  } catch {
    throw new ApiError(0, STATUS_TEXT[0])
  }
  handleUnauthorized(response.status)
  const text = await response.text()
  if (!response.ok) throw new ApiError(response.status, errorMessage(response.status, text))
  return (text ? JSON.parse(text) : undefined) as T
}

function jsonPost(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export interface AuditQuery {
  jobId?: string
  actorId?: string
  page: number
  pageSize: number
}

export const api = {
  register: (username: string, password: string) =>
    request<{ message: string }>('/api/auth/register', jsonPost({ username, password })),

  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', jsonPost({ username, password })),

  listJobs: (page: number, pageSize: number) =>
    request<PagedResponse<JobResponse>>(`/api/jobs?page=${page}&pageSize=${pageSize}`),

  getJob: (id: string) => request<JobResponse>(`/api/jobs/${id}`),

  startJob: (id: string) => request<void>(`/api/jobs/${id}/start`, { method: 'POST' }),

  cancelJob: (id: string) => request<void>(`/api/jobs/${id}/cancel`, { method: 'POST' }),

  retryJob: (id: string) => request<void>(`/api/jobs/${id}/retry`, { method: 'POST' }),

  listAudit: (query: AuditQuery) => {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
    if (query.jobId) params.set('jobId', query.jobId)
    if (query.actorId) params.set('actorId', query.actorId)
    return request<PagedResponse<AuditLogResponse>>(`/api/audit?${params.toString()}`)
  },

  uploadJob(file: File, onProgress: (percent: number) => void): Promise<JobResponse> {
    return new Promise<JobResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/jobs')
      const token = getToken()
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded * 100) / event.total))
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as JobResponse)
          } catch {
            reject(new ApiError(xhr.status, 'Unexpected response from the API.'))
          }
          return
        }
        handleUnauthorized(xhr.status)
        reject(new ApiError(xhr.status, errorMessage(xhr.status, xhr.responseText)))
      }
      xhr.onerror = () => reject(new ApiError(0, STATUS_TEXT[0]))
      const form = new FormData()
      form.append('file', file)
      xhr.send(form)
    })
  },

  async downloadErrors(id: string): Promise<void> {
    let response: Response
    try {
      response = await fetch(`/api/jobs/${id}/errors`, { headers: authHeaders() })
    } catch {
      throw new ApiError(0, STATUS_TEXT[0])
    }
    handleUnauthorized(response.status)
    if (!response.ok) throw new ApiError(response.status, errorMessage(response.status, await response.text()))
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `job-${id}-errors.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
