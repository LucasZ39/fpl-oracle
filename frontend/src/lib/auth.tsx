import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'fpl-oracle:user'
const USERS_KEY = 'fpl-oracle:users'

export type User = {
  email: string
  displayName: string
  fplId: number | null
}

type StoredUser = User & { passwordHash: string }

type AuthContextValue = {
  user: User | null
  isReady: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => void
  setFplId: (id: number) => void
  clearFplId: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Lightweight hash so we don't store plain text in localStorage.
// This is demo-grade only; real auth needs a server.
function hash(input: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16)
}

function loadUsers(): Record<string, StoredUser> {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveUsers(users: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSession(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setUser(loadSession())
    setIsReady(true)
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const users = loadUsers()
    const key = email.trim().toLowerCase()
    const record = users[key]
    if (!record) throw new Error('No account found for this email')
    if (record.passwordHash !== hash(password)) throw new Error('Incorrect password')
    const next: User = {
      email: record.email,
      displayName: record.displayName,
      fplId: record.fplId
    }
    saveSession(next)
    setUser(next)
  }, [])

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const users = loadUsers()
    const key = email.trim().toLowerCase()
    if (users[key]) throw new Error('Account already exists for this email')
    if (password.length < 6) throw new Error('Password must be at least 6 characters')
    const record: StoredUser = {
      email: key,
      displayName: displayName.trim() || key.split('@')[0],
      fplId: null,
      passwordHash: hash(password)
    }
    users[key] = record
    saveUsers(users)
    const next: User = {
      email: record.email,
      displayName: record.displayName,
      fplId: record.fplId
    }
    saveSession(next)
    setUser(next)
  }, [])

  const signOut = useCallback(() => {
    saveSession(null)
    setUser(null)
  }, [])

  const setFplId = useCallback((id: number) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, fplId: id }
      saveSession(next)
      const users = loadUsers()
      const record = users[prev.email]
      if (record) {
        record.fplId = id
        saveUsers(users)
      }
      return next
    })
  }, [])

  const clearFplId = useCallback(() => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, fplId: null }
      saveSession(next)
      const users = loadUsers()
      const record = users[prev.email]
      if (record) {
        record.fplId = null
        saveUsers(users)
      }
      return next
    })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady,
    signIn,
    signUp,
    signOut,
    setFplId,
    clearFplId
  }), [user, isReady, signIn, signUp, signOut, setFplId, clearFplId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
