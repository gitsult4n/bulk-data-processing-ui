import { useState, type FormEvent } from 'react'
import { api, ApiError, describeError } from '../api'
import { saveToken, sessionFromToken } from '../auth'
import { useToast } from '../components/Toast'

export function LoginPage() {
  const toast = useToast()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') {
        const result = await api.register(username, password)
        toast.success(result.message)
      }
      const auth = await api.login(username, password)
      if (!sessionFromToken(auth.token)) throw new ApiError(0, 'The API returned an invalid token.')
      saveToken(auth.token)
      toast.success(`Welcome, ${username.trim()}`)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  const registering = mode === 'register'

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1 className="brand">Bulk Data Jobs</h1>
        <p className="muted">{registering ? 'Create an account to upload and process files.' : 'Log in to manage your import jobs.'}</p>

        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={registering ? 3 : 1}
            maxLength={registering ? 15 : undefined}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={registering ? 8 : 1}
            maxLength={registering ? 128 : undefined}
            autoComplete={registering ? 'new-password' : 'current-password'}
          />
        </label>
        {registering && <p className="muted small">Username 3 to 15 characters, password 8 to 128 characters.</p>}

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Please wait...' : registering ? 'Register and log in' : 'Log in'}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            setMode(registering ? 'login' : 'register')
            setError(null)
          }}
        >
          {registering ? 'Have an account? Log in' : 'No account? Register'}
        </button>
      </form>
    </div>
  )
}
