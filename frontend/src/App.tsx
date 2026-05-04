import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from './pages/Home'
import PlayerDetail from './pages/PlayerDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ConnectFpl from './pages/ConnectFpl'
import Dashboard from './pages/Dashboard'
import Suggestions from './pages/Suggestions'
import { AuthProvider, useAuth } from './lib/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false }
  }
})

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`
}

function Header() {
  const { user, signOut } = useAuth()
  return (
    <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
      <Link to="/" className="text-xl font-bold text-purple-400 whitespace-nowrap">
        FPL Oracle
      </Link>
      <nav className="flex items-center gap-5 text-sm">
        <NavLink to="/" end className={navLinkClass}>Differentials</NavLink>
        {user && (
          <>
            <NavLink to="/dashboard" className={navLinkClass}>My Squad</NavLink>
            <NavLink to="/suggestions" className={navLinkClass}>Suggestions</NavLink>
          </>
        )}
      </nav>
      <div className="flex items-center gap-3 text-sm">
        {user ? (
          <>
            <span className="hidden sm:inline text-gray-400">
              {user.displayName}
            </span>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={navLinkClass}>Sign in</NavLink>
            <NavLink
              to="/signup"
              className="bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg px-3 py-1.5 text-white"
            >
              Sign up
            </NavLink>
          </>
        )}
      </div>
    </header>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth()
  const location = useLocation()
  if (!isReady) return null
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

function AppShell() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/connect" element={<RequireAuth><ConnectFpl /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/suggestions" element={<RequireAuth><Suggestions /></RequireAuth>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
