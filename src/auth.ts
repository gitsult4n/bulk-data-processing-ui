const TOKEN_KEY = 'bdp.token'
const AUTH_EVENT = 'bdp:auth'

export interface Session {
  token: string
  userId: string
  username: string
  role: string
  isAdmin: boolean
  expiresAt: number
}

const CLAIMS = {
  role: ['role', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
  name: ['unique_name', 'name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
  id: ['nameid', 'sub', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
}

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function claim(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return ''
}

export function sessionFromToken(token: string): Session | null {
  const payload = decodePayload(token)
  if (!payload) return null
  const expiresAt = typeof payload.exp === 'number' ? payload.exp * 1000 : 0
  if (expiresAt && expiresAt <= Date.now()) return null
  const role = claim(payload, CLAIMS.role) || 'User'
  return {
    token,
    userId: claim(payload, CLAIMS.id),
    username: claim(payload, CLAIMS.name) || 'user',
    role,
    isAdmin: role === 'Admin',
    expiresAt,
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable: session lives in memory for this page only */
  }
}

export function saveToken(token: string | null) {
  writeToken(token)
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function loadSession(): Session | null {
  const token = getToken()
  if (!token) return null
  const session = sessionFromToken(token)
  if (!session) writeToken(null)
  return session
}

export function onAuthChange(callback: () => void): () => void {
  window.addEventListener(AUTH_EVENT, callback)
  return () => window.removeEventListener(AUTH_EVENT, callback)
}
