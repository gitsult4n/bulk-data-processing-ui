export type JobStatus = 'Uploaded' | 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled'

export interface JobResponse {
  id: string
  fileName: string
  status: JobStatus
  attempt: number
  totalRows: number
  processedRows: number
  successCount: number
  failureCount: number
  percent: number
  rowsPerSecond: number
  etaSeconds: number | null
  cancelRequested: boolean
  failureReason: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  ownerId: string | null
  ownerUsername: string | null
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type AuditAction =
  | 'UserRegistered'
  | 'UserLoggedIn'
  | 'FileUploaded'
  | 'JobStarted'
  | 'JobCancelRequested'
  | 'JobCancelled'
  | 'JobRetried'
  | 'JobClaimed'
  | 'JobReclaimed'
  | 'JobCompleted'
  | 'JobFailed'
  | 'ErrorReportDownloaded'

export interface AuditLogResponse {
  id: number
  at: string
  actorId: string | null
  actorName: string
  action: AuditAction
  jobId: string | null
  details: string | null
  ipAddress: string | null
}

export interface AuthResponse {
  token: string
  expiresAt: string
}

export function isActive(status: JobStatus): boolean {
  return status === 'Queued' || status === 'Running'
}
