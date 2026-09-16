import { createContext, useContext } from 'react'
import type { Session } from './auth'

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used inside a logged-in route')
  return session
}
