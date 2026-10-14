import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/auth/me')
      .then((response) => setUser(response.data.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function logIn(credentials) {
    const response = await api.post('/auth/login', credentials)
    setUser(response.data.data.user)
    return response.data.data.user
  }

  async function registerAccount(details) {
    const response = await api.post('/auth/register', details)
    setUser(response.data.data.user)
    return response.data.data.user
  }

  async function logOut() {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  return <SessionContext.Provider value={{ user, loading, logIn, registerAccount, logOut, setUser }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession must be used within SessionProvider.')
  return session
}
