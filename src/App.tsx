import { useEffect, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { loadSession, onAuthChange, saveToken, type Session } from './auth'
import { ToastProvider } from './components/Toast'
import { AuditPage } from './pages/AuditPage'
import { JobPage } from './pages/JobPage'
import { JobsPage } from './pages/JobsPage'
import { LoginPage } from './pages/LoginPage'
import { SessionContext } from './session'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  useEffect(() => onAuthChange(() => setSession(loadSession())), [])

  useEffect(() => {
    if (!session?.expiresAt) return
    const timer = setTimeout(() => saveToken(null), Math.max(0, session.expiresAt - Date.now()))
    return () => clearTimeout(timer)
  }, [session])

  return (
    <BrowserRouter>
      <ToastProvider>
        {session ? (
          <SessionContext.Provider value={session}>
            <Layout session={session}>
              <Routes>
                <Route path="/" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobPage />} />
                <Route path="/audit" element={session.isAdmin ? <AuditPage /> : <Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </SessionContext.Provider>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </ToastProvider>
    </BrowserRouter>
  )
}

function Layout({ session, children }: { session: Session; children: ReactNode }) {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Bulk Data Jobs
        </Link>
        <nav>
          <NavLink to="/" end>
            Jobs
          </NavLink>
          {session.isAdmin && <NavLink to="/audit">Audit</NavLink>}
        </nav>
        <div className="row user">
          <span>{session.username}</span>
          <span className={`role role-${session.role.toLowerCase()}`}>{session.role}</span>
          <button className="btn btn-ghost" onClick={() => saveToken(null)}>
            Logout
          </button>
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  )
}
