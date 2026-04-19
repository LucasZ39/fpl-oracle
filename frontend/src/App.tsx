import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from './pages/Home'
import PlayerDetail from './pages/PlayerDetail'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-950 text-white">
          <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-xl font-bold text-purple-400">
              FPL Oracle
            </Link>
            <nav className="flex gap-6 text-sm text-gray-400">
              <Link to="/" className="hover:text-white">Differentials</Link>
              <a href="https://github.com/LucasZ39/fpl-oracle" 
                 target="_blank" 
                 className="hover:text-white">GitHub</a>
            </nav>
          </header>
          <main className="max-w-6xl mx-auto px-6 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/players/:id" element={<PlayerDetail />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}